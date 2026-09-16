import type { Rule } from 'antd/es/form'
import type { CustomHookDef, FormHookContext } from '../events/types'
import type { FieldSchema, ValidateRule, ValidateTrigger } from '../types/schema'
import type { BuildHookCtx } from './hooksContext'
import { compileFn, isFnSource } from '../events/fnSource'
import { notifyError, warnOnce } from '../events/runHooks'

const FALLBACK_LABEL = '该字段'

/** 手机号：中国大陆手机号（11 位、1 开头、第二位 3-9） */
const PHONE_PATTERN = /^1[3-9]\d{9}$/
/** IPv4：四段 0-255；每段用 (25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d) 约束范围 */
const IPV4_PATTERN = /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/
/**
 * 整数：按字符串内容校验（antd 自带的 type: 'integer' 要求值是 number，
 * 而文本输入框里输入的数字是字符串，用它会恒不通过，故改用 pattern）。
 */
const INTEGER_PATTERN = /^-?\d+$/
const UPPERCASE_PATTERN = /^[A-Z]+$/
const LOWERCASE_PATTERN = /^[a-z]+$/

/**
 * 规则触发时机 → antd 的字段事件名。
 * antd / rc-field-form 过滤规则时比较的是字段事件名（onChange / onBlur），
 * 直接写 'blur' / 'change' 永远匹配不上，规则会静默失效。
 * 'submit' 没有对应事件：提交走全量校验（此时不过滤规则），因此它天然只在提交时生效。
 */
const RULE_TRIGGER_EVENTS: Record<ValidateTrigger, string> = {
  blur: 'onBlur',
  change: 'onChange',
  submit: 'onSubmit',
}

/**
 * Form.Item 需要的 validateTrigger 集合。
 * 规则级 validateTrigger 必须是字段级 validateTrigger 的子集：只声明 blur 的规则，
 * 若字段本身不在 onBlur 校验，这条规则永远不会跑（antd 默认只在 onChange 校验），
 * 所以有 blur 规则时把 onBlur 并进字段级时机，并保留 onChange 这个默认项。
 * submit 不并入：提交本就全量校验，并入反而会给组件挂上无意义的 onSubmit 事件。
 */
export function collectValidateTriggers(rules: ValidateRule[] | undefined): string[] | undefined {
  return (rules || []).some(r => r.trigger === 'blur') ? ['onChange', 'onBlur'] : undefined
}

/**
 * 自定义校验（type: 'validator'）的执行约定：
 * - 钩子拿到 `ctx.payload = { value, formValue }`（value 为字段当前值，formValue 为表单值快照），
 *   与事件钩子同一套 ctx（form / setValue / message / emit 等能力都在）
 * - 返回 `true` / `undefined`（含 null、空串）→ 通过
 * - 返回字符串 → 作为错误消息
 * - 返回 `false` 或其他值 → 用 `${label}校验未通过`
 * - 抛错 → 视为不通过（默认文案），并走与钩子同一条 notifyError 上报路径
 * - 面板配置了 message 时以面板文案为准（antd 用 rule.message 覆盖校验器给出的文案）
 */
export function toAntdRules(
  schema: FieldSchema,
  custom?: Record<string, CustomHookDef>,
  buildCtx?: BuildHookCtx,
): Rule[] {
  const label = schema.label || FALLBACK_LABEL
  const rules = schema.formItem?.rules ?? []

  const result: (Rule | null)[] = []

  // formItem.required 映射为必填规则并置于最前；rules 中已有 required 则不重复
  if (schema.formItem?.required && !rules.some(r => r.type === 'required'))
    result.push({ required: true, message: `${label}不能为空` })

  for (const r of rules) {
    result.push(mapRule(r, label, custom, buildCtx))
  }

  return result.filter((r): r is Rule => r !== null)
}

/** 阈值类规则：value 缺失时没有可校验的边界（形状校验在解析/保存侧拦截），这里跳过并提示一次 */
function thresholdValue(r: ValidateRule): number | null {
  if (typeof r.value === 'number' && Number.isFinite(r.value))
    return r.value
  warnOnce(`threshold:${r.type}`, `[form-designer] 校验规则「${r.type}」缺少数字阈值 value，已跳过该规则`)
  return null
}

function mapRule(r: ValidateRule, label: string, custom?: Record<string, CustomHookDef>, buildCtx?: BuildHookCtx): Rule | null {
  // 未配置 trigger 时不写 validateTrigger：保持 antd 默认（字段级时机），与扩展前的行为一致
  const trigger = r.trigger ? { validateTrigger: RULE_TRIGGER_EVENTS[r.trigger] } : {}
  const text = (fallback: string) => r.message || fallback

  switch (r.type) {
    case 'required':
      return { required: true, message: text(`${label}不能为空`), ...trigger }

    case 'regexp': {
      if (!r.pattern)
        return null
      try {
        return { pattern: new RegExp(r.pattern), message: text(`${label}格式不正确`), ...trigger }
      }
      catch {
        console.warn(`[form-designer] 非法正则表达式：${r.pattern}`)
        return null
      }
    }

    /**
     * 长度规则：钉 type: 'string'（antd 的 type 缺省即 string，钉住更直白），
     * 由 async-validator 的 range 规则比较字符数（按码点计数），与数组长度无关。
     * len = 精确长度，minLen / maxLen = 长度上下限，与下面按数值语义落地的 min / max 区分开。
     */
    case 'len':
    case 'minLen':
    case 'maxLen': {
      const value = thresholdValue(r)
      if (value === null)
        return null
      const bound = r.type === 'len' ? { len: value } : (r.type === 'minLen' ? { min: value } : { max: value })
      const fallback = r.type === 'len'
        ? `${label}长度必须为 ${value}`
        : (r.type === 'minLen' ? `${label}长度不能少于 ${value}` : `${label}长度不能超过 ${value}`)
      return { type: 'string', ...bound, message: text(fallback), ...trigger }
    }

    /**
     * 数值范围：antd 的 min / max 既可作用于数值也可作用于字符串长度（取决于 type），
     * 字符串长度已由 minLen / maxLen 覆盖，所以这里按「数值大小」的常规预期落地：
     * 钉 type: 'number' 会同时要求值是 number 类型，仅适用于 InputNumber 等数值组件
     * （与下面的 number 规则同一前提）。
     */
    case 'min':
    case 'max': {
      const value = thresholdValue(r)
      if (value === null)
        return null
      const range = r.type === 'min' ? { min: value } : { max: value }
      const fallback = `${label}不能${r.type === 'min' ? '小于' : '大于'} ${value}`
      return { type: 'number', ...range, message: text(fallback), ...trigger }
    }

    case 'phone':
      return { pattern: PHONE_PATTERN, message: text(`${label}格式不正确`), ...trigger }

    case 'ip':
      return { pattern: IPV4_PATTERN, message: text(`${label}不是合法的 IP 地址`), ...trigger }

    case 'integer':
      return { pattern: INTEGER_PATTERN, message: text(`${label}必须为整数`), ...trigger }

    case 'uppercase':
      return { pattern: UPPERCASE_PATTERN, message: text(`${label}只能是大写字母`), ...trigger }

    case 'lowercase':
      return { pattern: LOWERCASE_PATTERN, message: text(`${label}只能是小写字母`), ...trigger }

    case 'validator':
      return mapValidatorRule(r, label, custom, buildCtx, trigger)

    // 注意：type: 'number' 要求值为 number 类型，仅适用于 InputNumber 等数值组件；
    // email / url 按 antd 内置类型校验（值须为字符串，空值由 antd 统一跳过）
    case 'email':
    case 'url':
    case 'number':
      return { type: r.type, message: text(`${label}格式不正确`), ...trigger }

    // 未知类型（理论上已被 parseSchema 拦下）：跳过，而不是造一条 antd 会报「Unknown rule type」的规则
    default:
      warnOnce(`unknown:${String(r.type)}`, `[form-designer] 未知的校验规则类型：${String(r.type)}，已跳过`)
      return null
  }
}

/**
 * 解析自定义校验的可执行来源：内联 fn 优先于按名引用（与 HookRef 同规则）。
 * 缺失或形状/语法不合法时跳过该规则 —— 渲染期不能因为一份坏配置而抛错（画布预览会白屏），
 * 保存与解析侧由 parseSchema 统一拦截。
 */
function resolveValidatorFn(
  r: ValidateRule,
  custom?: Record<string, CustomHookDef>,
): ReturnType<typeof compileFn> | null {
  const inline = r.fn && isFnSource(r.fn) ? r.fn : undefined
  const src = inline ?? (r.hook ? custom?.[r.hook]?.fn : undefined)
  if (!src) {
    if (r.hook)
      warnOnce(`missing:${r.hook}`, `[form-designer] 自定义校验引用了不存在的公共事件：${r.hook}（该规则已跳过）`)
    else
      warnOnce('validator:no-source', '[form-designer] 自定义校验既无 hook 也无合法 fn（该规则已跳过）')
    return null
  }
  try {
    return compileFn(src)
  }
  catch (e) {
    warnOnce(`validator:compile:${r.hook ?? src.body}`, `[form-designer] 自定义校验函数体无法编译，已跳过该规则：${String(e)}`)
    return null
  }
}

function mapValidatorRule(
  r: ValidateRule,
  label: string,
  custom: Record<string, CustomHookDef> | undefined,
  buildCtx: BuildHookCtx | undefined,
  trigger: Record<string, unknown>,
): Rule | null {
  const run = resolveValidatorFn(r, custom)
  if (!run)
    return null

  return {
    validator: async (_rule: unknown, value: unknown) => {
      // 渲染器注入了 ctx 工厂时用完整 ctx（含 form / setValue / message），纯函数级调用退化为最小实现
      const ctx: FormHookContext = buildCtx ? buildCtx() : minimalValidatorCtx()
      ctx.payload = { value, formValue: ctx.values }
      let result: unknown
      try {
        result = await run(ctx)
      }
      catch (e) {
        notifyError(ctx, `自定义校验执行失败：${r.hook ?? '内联函数'}`, e)
        throw new Error(`${label}校验未通过`)
      }
      if (result === true || result === undefined || result === null || result === '')
        return
      throw new Error(typeof result === 'string' ? result : `${label}校验未通过`)
    },
    ...(r.message ? { message: r.message } : {}),
    ...trigger,
  }
}

/** 兜底 message：纯函数级调用没有宿主 <App>，只写日志（真实渲染路径始终由 FormRenderer 注入 ctx） */
function fallbackMessage(text: string | { content: string }) {
  console.warn(`[form-designer] ${typeof text === 'string' ? text : text.content}`)
}

/** 没有渲染器 ctx 时的最小实现：只有 payload 与兜底 message，字段/表单能力缺失 */
function minimalValidatorCtx(): FormHookContext {
  const noop = () => {}
  return {
    form: {} as FormHookContext['form'],
    values: {},
    getValues: () => ({}),
    setValue: noop,
    setValues: noop,
    getField: () => undefined,
    emit: async () => {},
    reload: async () => {},
    message: { success: fallbackMessage, error: fallbackMessage, warning: fallbackMessage, info: fallbackMessage },
  }
}

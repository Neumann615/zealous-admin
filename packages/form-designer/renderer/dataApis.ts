/**
 * 宿主注册的数据接口表：声明式数据来源（`FieldSchema.dataSource`）的**唯一取数入口**。
 *
 * 为什么不让 schema 直接写 URL：鉴权、错误提示、loading 都要走宿主统一的 http 实例，
 * 而表单定义是可导入 / 导出 / 跨环境复制的**数据**，不该携带请求实现。因此本包
 * 不依赖 `@zealous-admin/layout` 与 `src/apis`，也不自行发起任何请求。
 *
 * ```ts
 * // 宿主侧（一次注册，全局可用）
 * registerFormDataApis({
 *   metadata: (params, signal) => getOptionSetByCodeAPI(params.setCode, { signal }),
 *   orgTree: params => getOrgTreeAPI(params),
 * })
 *
 * // 面板的「接口」下拉需要一份名字清单（包不知道宿主注册了哪些名字）
 * setFormDataApiCatalog(['metadata', 'orgTree'])
 * ```
 */

/** 宿主注册的数据接口签名：params 已完成插值；signal 用于取消（可选实现） */
export type FormDataApi = (params: Record<string, any>, signal?: AbortSignal) => Promise<any>

const apis = new Map<string, FormDataApi>()

/** 面板下拉用的名字清单；未设置时为 null（面板退化为自由文本输入并提示） */
let catalog: string[] | null = null

/**
 * 注册数据接口（元数据、组织树、业务查询…），同名覆盖。
 * 只登记函数，不触发任何请求；名字是 schema 里 `dataSource.def.api` / 约定的 `'metadata'` 的取值。
 */
export function registerFormDataApis(map: Record<string, FormDataApi>): void {
  for (const [name, fn] of Object.entries(map))
    apis.set(name, fn)
}

/** 按注册名取数据接口；未注册返回 undefined（调用方按「未注册的数据接口」处理） */
export function getFormDataApi(name: string): FormDataApi | undefined {
  return apis.get(name)
}

/** 提供给「数据来源」面板的接口名清单（可选），仅影响面板下拉，不参与取数 */
export function setFormDataApiCatalog(names: string[]): void {
  catalog = [...names]
}

/** 接口名清单；未设置时返回空数组（面板据此退化为自由文本输入） */
export function getFormDataApiCatalog(): string[] {
  return catalog ? [...catalog] : []
}

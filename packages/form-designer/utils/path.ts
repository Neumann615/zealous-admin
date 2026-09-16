/** 按点分路径读取，如 'props.placeholder' / 'formItem.tooltip' / 'label' */
export function getByPath(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj as any)
}

/**
 * 按名路径读取表单值，如 'province' / 'contact.name' / 'items.0.qty'。
 * 名路径语义与插值 `{{contact.name}}`、联动 `control[].field`、数据源 `watch` 共用这一处实现，
 * 缺失（含中间段不存在）返回 undefined。
 */
export function getByPathName(values: Record<string, any> | undefined, path: string): any {
  if (!values)
    return undefined
  return getByPath(values, path)
}

/** 按点分路径写入（原地修改，调用方负责先克隆） */
export function setByPath(obj: Record<string, any>, path: string, value: any): void {
  const keys = path.split('.')
  let target = obj
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof target[keys[i]] !== 'object' || target[keys[i]] === null)
      target[keys[i]] = {}
    target = target[keys[i]]
  }
  target[keys[keys.length - 1]] = value
}

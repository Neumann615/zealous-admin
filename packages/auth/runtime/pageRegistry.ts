/**
 * 页面组件注册表桥接。
 *
 * 可选的 component key 由主应用的 src/registry/pages.tsx 决定，auth 包不能反向依赖主应用，
 * 因此启动时由主应用调用 registerPageKeys 注入，菜单管理页据此渲染下拉选项。
 */
let pageKeys: string[] = []

export function registerPageKeys(keys: string[]): void {
  pageKeys = [...keys].sort()
}

export function getPageKeys(): string[] {
  return pageKeys
}

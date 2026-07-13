/**
 * 创建 SVG 图标映射工具函数
 * @param svgModules - 通过 import.meta.glob 获取的 SVG 模块对象
 * @returns 图标名称到组件的映射
 *
 * 使用示例：
 * const svgModules = import.meta.glob('/src/assets/icons/*.svg', { eager: true });
 * const iconMap = createIconMap(svgModules);
 */
export function createMenuIconMap(
  svgModules: Record<string, { default?: React.ComponentType<React.SVGProps<SVGSVGElement>> }>,
): Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> {
  const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {}

  Object.keys(svgModules).forEach((path) => {
    // 从路径中提取图标名称
    // 支持多种路径格式：
    // - /src/assets/icons/dashboard.svg -> dashboard
    // - ./icons/user.svg -> user
    // - icons/settings.svg -> settings
    const match = path.match(/([^/\\]+)\.svg$/i)
    if (match && match[1]) {
      const module = svgModules[path]
      if (module?.default) {
        iconMap[match[1]] = module.default
      }
    }
  })

  // 开发环境下输出可用的图标列表
  // @ts-ignore
  if (import.meta.env.DEV) {
    // console.log('[Layout] Available menu icons:', Object.keys(iconMap), iconMap);
  }

  return iconMap
}

export function mergeAttribute(obj1: any, obj2: any) {
  return { ...obj1, ...obj2 }
}

export * from './data'

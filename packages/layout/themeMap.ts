import type { ConfigProviderProps } from 'antd'
import type { ThemeType } from './types/config'
import { useBootstrapTheme, useCartoonTheme, useGlassTheme, useHackerTheme, useIllustrationTheme, useMuiTheme, useShadcnTheme } from '@zealous-admin/theme/index'
import { useMemo } from 'react'
/**
 * 根据主题类型返回对应的 ConfigProvider 配置
 * - default: 返回空对象，由 LayoutProvider 自行控制 themeColor / darkMode
 * - 其他定制主题: 返回完整的自定义 ConfigProviderProps，不可修改颜色/暗色模式
 */
export function useThemeByType(themeType: ThemeType): ConfigProviderProps {
  // 始终调用全部 Hook（符合 React Hooks 规则）
  const defaultConfig = useMemo(() => ({}), [])
  const muiConfig = useMuiTheme()
  const bootstrapConfig = useBootstrapTheme()
  const cartoonConfig = useCartoonTheme()
  const glassConfig = useGlassTheme()
  const illustrationConfig = useIllustrationTheme()
  const shadcnConfig = useShadcnTheme()
  const hackerConfig = useHackerTheme()

  const themeMap: Record<ThemeType, ConfigProviderProps> = {
    default: defaultConfig,
    mui: muiConfig,
    bootstrap: bootstrapConfig,
    glass: glassConfig,
    illustration: illustrationConfig,
    shadcn: shadcnConfig,
    cartoon: cartoonConfig,
    hacker: hackerConfig,
  }

  return themeMap[themeType] || defaultConfig
}
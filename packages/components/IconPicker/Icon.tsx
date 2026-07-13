import type { IconLibraryKey } from './IconPicker'
import { createStyles } from 'antd-style'
import { createElement, memo, useEffect, useMemo, useState } from 'react'

const useStyles = createStyles(({ token }) => ({
  icon: {
    color: token.colorText,
    fontSize: token.fontSizeHeading4,
  },
}))

export interface IconRendererProps {
  value: string
  className?: string
  style?: React.CSSProperties
}

const iconLibraryImports: Record<IconLibraryKey, () => Promise<any>> = {
  ai: () => import('react-icons/ai'),
  bs: () => import('react-icons/bs'),
  bi: () => import('react-icons/bi'),
  ci: () => import('react-icons/ci'),
  cg: () => import('react-icons/cg'),
  di: () => import('react-icons/di'),
  fi: () => import('react-icons/fi'),
  fc: () => import('react-icons/fc'),
  fa: () => import('react-icons/fa'),
  fa6: () => import('react-icons/fa6'),
  gi: () => import('react-icons/gi'),
  go: () => import('react-icons/go'),
  gr: () => import('react-icons/gr'),
  hi: () => import('react-icons/hi'),
  hi2: () => import('react-icons/hi2'),
  im: () => import('react-icons/im'),
  lia: () => import('react-icons/lia'),
  io: () => import('react-icons/io'),
  io5: () => import('react-icons/io5'),
  lu: () => import('react-icons/lu'),
  md: () => import('react-icons/md'),
  pi: () => import('react-icons/pi'),
  rx: () => import('react-icons/rx'),
  ri: () => import('react-icons/ri'),
  si: () => import('react-icons/si'),
  sl: () => import('react-icons/sl'),
  tb: () => import('react-icons/tb'),
  tfi: () => import('react-icons/tfi'),
  ti: () => import('react-icons/ti'),
  vsc: () => import('react-icons/vsc'),
  wi: () => import('react-icons/wi'),
}

interface IconLibraryCache {
  [key: string]: Record<string, React.ComponentType<any>> | null
}

const iconLibraryCache: IconLibraryCache = {}

export const Icon = memo(({ value, className, style }: IconRendererProps) => {
  const { styles, theme } = useStyles()
  const [loadedLibs, setLoadedLibs] = useState<Set<string>>(new Set())

  const { libKey, iconName } = useMemo(() => {
    if (!value)
      return { libKey: null, iconName: null }
    const [lib, name] = value.split(':')
    return { libKey: lib || null, iconName: name || null }
  }, [value])

  useEffect(() => {
    if (!libKey || loadedLibs.has(libKey))
      return

    const cachedLib = iconLibraryCache[libKey]
    if (cachedLib) {
      setLoadedLibs(prev => new Set([...prev, libKey]))
      return
    }

    const importFn = libKey ? iconLibraryImports[libKey as IconLibraryKey] : undefined
    if (!importFn)
      return

    importFn().then((module: any) => {
      const icons = module.default || module
      const filteredIcons: Record<string, React.ComponentType<any>> = {}
      Object.keys(icons).forEach((key) => {
        const icon = icons[key]
        if (typeof icon === 'function') {
          filteredIcons[key] = icon
        }
      })
      iconLibraryCache[libKey] = filteredIcons
      setLoadedLibs(prev => new Set([...prev, libKey]))
    })
  }, [libKey, loadedLibs])

  const iconElement = useMemo(() => {
    if (!libKey || !iconName || !loadedLibs.has(libKey))
      return null

    const lib = iconLibraryCache[libKey]
    if (!lib)
      return null

    const IconComponent = lib[iconName]
    if (!IconComponent || typeof IconComponent !== 'function')
      return null

    const mergedClassName = className ? `${styles.icon} ${className}` : styles.icon
    return createElement(IconComponent, { className: mergedClassName, style })
  }, [libKey, iconName, loadedLibs, className, style, styles.icon, theme])

  return iconElement
})

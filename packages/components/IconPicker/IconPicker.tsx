import { Input, Popover, Spin } from 'antd'
import { createStyles } from 'antd-style'
import { createElement, useCallback, useEffect, useMemo, useState } from 'react'
import { CiSquarePlus } from 'react-icons/ci'
import { TiDelete } from 'react-icons/ti'

export type IconLibraryKey = 'ai' | 'bs' | 'fc' | 'pi' | 'rx' | 'sl' | 'bi' | 'ci' | 'cg' | 'di' | 'fa' | 'fa6' | 'md' | 'io' | 'io5' | 'fi' | 'lu' | 'go' | 'gi' | 'ri' | 'bi' | 'cg' | 'gr' | 'hi' | 'hi2' | 'im' | 'lia' | 'si' | 'tb' | 'tfi' | 'ti' | 'vsc' | 'wi'

interface IconLibrary {
  key: IconLibraryKey
  label: string
  iconCount: number
}

const iconLibraryMap: Record<IconLibraryKey, IconLibrary> = {
  ai: { key: 'ai', label: 'Ant Design Icons', iconCount: 786 },
  bs: { key: 'bs', label: 'Bootstrap Icons', iconCount: 1156 },
  bi: { key: 'bi', label: 'BoxIcons', iconCount: 1534 },
  ci: { key: 'ci', label: 'Circum Icons', iconCount: 480 },
  cg: { key: 'cg', label: 'css.gg', iconCount: 704 },
  di: { key: 'di', label: 'Devicons', iconCount: 192 },
  fi: { key: 'fi', label: 'Feather', iconCount: 286 },
  fc: { key: 'fc', label: 'Flat Color Icons', iconCount: 329 },
  fa: { key: 'fa', label: 'Font Awesome 5', iconCount: 1608 },
  fa6: { key: 'fa6', label: 'Font Awesome 6', iconCount: 2016 },
  gi: { key: 'gi', label: 'Game Icons', iconCount: 4095 },
  go: { key: 'go', label: 'GitHub Octicons', iconCount: 207 },
  gr: { key: 'gr', label: 'Grommet Icons', iconCount: 605 },
  hi: { key: 'hi', label: 'Heroicons', iconCount: 266 },
  hi2: { key: 'hi2', label: 'Heroicons 2', iconCount: 504 },
  im: { key: 'im', label: 'IcoMoon Free', iconCount: 486 },
  lia: { key: 'lia', label: 'Icons8 Line Awesome', iconCount: 1544 },
  io: { key: 'io', label: 'Ionicons 4', iconCount: 1332 },
  io5: { key: 'io5', label: 'Ionicons 5', iconCount: 1332 },
  lu: { key: 'lu', label: 'Lucide', iconCount: 1146 },
  md: { key: 'md', label: 'Material Design Icons', iconCount: 4416 },
  pi: { key: 'pi', label: 'Phosphor Icons', iconCount: 1524 },
  rx: { key: 'rx', label: 'Radix Icons', iconCount: 317 },
  ri: { key: 'ri', label: 'Remix Icons', iconCount: 2271 },
  si: { key: 'si', label: 'Simple Icons', iconCount: 3645 },
  sl: { key: 'sl', label: 'Simple Line Icons', iconCount: 189 },
  tb: { key: 'tb', label: 'Tabler Icons', iconCount: 1921 },
  tfi: { key: 'tfi', label: 'Themify Icons', iconCount: 321 },
  ti: { key: 'ti', label: 'Typicons', iconCount: 336 },
  vsc: { key: 'vsc', label: 'VS Code Icons', iconCount: 1187 },
  wi: { key: 'wi', label: 'Weather Icons', iconCount: 216 },
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

const allLibraryKeys: IconLibraryKey[] = Object.keys(iconLibraryMap) as IconLibraryKey[]

interface IconLibraryCache {
  [key: string]: Record<string, React.ComponentType>
}

const iconLibraryCache: IconLibraryCache = {}

export interface IconPickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  children?: React.ReactNode
  library?: IconLibraryKey[]
  clearable?: boolean
}

const useStyles = createStyles(({ token }) => ({
  trigger: {
    'display': 'flex',
    'alignItems': 'center',
    'justifyContent': 'center',
    'boxSizing': 'border-box',
    'border': `1px solid ${token.colorBorder}`,
    'borderRadius': token.borderRadius,
    'cursor': 'pointer',
    'backgroundColor': token.colorBgContainer,
    'width': 44,
    'height': 44,
    'transition': 'all .3s ease',
    'position': 'relative',
    '&:hover': {
      backgroundColor: token.colorBgTextHover,
    },
  },
  selectedIcon: {
    fontSize: 21,
    color: token.colorText,
  },
  placeholderIcon: {
    color: token.colorTextQuaternary,
    fontSize: 32,
  },
  clearIcon: {
    'position': 'absolute',
    'right': -4,
    'top': -4,
    'width': 16,
    'height': 16,
    'borderRadius': '50%',
    'backgroundColor': token.colorError,
    'color': token.colorWhite,
    'display': 'flex',
    'alignItems': 'center',
    'justifyContent': 'center',
    'cursor': 'pointer',
    'fontSize': 10,
    'boxShadow': '0 2px 8px rgba(0,0,0,0.15)',
    'transition': 'all .2s ease',
    '&:hover': {
      backgroundColor: token.colorErrorHover,
      transform: 'scale(1.1)',
    },
  },
  popoverContent: {
    padding: 0,
    width: 480,
    height: 435,
    overflow: 'hidden',
    display: 'flex',
  },
  librarySidebar: {
    'width': 135,
    'borderRight': `1px solid ${token.colorBorder}`,
    'overflowY': 'auto',
    'backgroundColor': token.colorBgContainer,
    '&::-webkit-scrollbar': {
      width: 0,
      height: 0,
    },
  },
  libraryItem: {
    'padding': `${token.paddingSM}px ${token.paddingSM}px`,
    'cursor': 'pointer',
    'fontSize': token.fontSize,
    'fontWeight': 500,
    'color': token.colorText,
    'transition': 'all .3s ease',
    'position': 'relative',
    '&:hover': {
      backgroundColor: token.colorBgTextHover,
      color: token.colorText,
    },
  },
  libraryItemActive: {
    'backgroundColor': token.colorBgTextHover,
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 4,
      height: '40%',
      backgroundColor: token.colorPrimary,
      borderRadius: 0,
    },
  },
  libraryItemCount: {
    fontSize: token.fontSizeSM,
    color: token.colorTextTertiary,
  },
  iconPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  searchInput: {
    margin: token.paddingSM,
    marginTop: token.paddingSM,
    marginBottom: token.paddingXS,
  },
  iconGrid: {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    gridAutoRows: 'auto',
    gap: token.paddingXS,
    overflowY: 'auto',
    flex: 1,
    padding: `0 ${token.paddingXS}px`,
    alignContent: 'start',
  },
  iconItem: {
    'display': 'flex',
    'alignItems': 'center',
    'justifyContent': 'center',
    'width': '100%',
    'height': 36,
    'borderRadius': token.borderRadiusSM,
    'cursor': 'pointer',
    'fontSize': 21,
    'color': token.colorText,
    'transition': 'all .3s ease',
    '&:hover': {
      backgroundColor: token.colorBgTextHover,
    },
  },
  iconItemSelected: {
    backgroundColor: token.colorBgTextHover,
  },
  loadingContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}))

export function IconPicker({
  value,
  onChange,
  placeholder = '请选择图标',
  children,
  library = allLibraryKeys,
  clearable = false,
}: IconPickerProps) {
  const { styles } = useStyles()
  const [searchText, setSearchText] = useState('')
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(library[0] || 'ai')
  const [loadingLib, setLoadingLib] = useState<string | null>(null)
  const [iconLists, setIconLists] = useState<Record<string, string[]>>({})

  const loadIconLibrary = useCallback(async (libKey: string) => {
    if (iconLibraryCache[libKey]) {
      if (!iconLists[libKey]) {
        const iconNames = Object.keys(iconLibraryCache[libKey]).filter(name =>
          typeof iconLibraryCache[libKey][name] === 'function',
        )
        setIconLists(prev => ({ ...prev, [libKey]: iconNames }))
      }
      return
    }

    setLoadingLib(libKey)
    try {
      const importFn = iconLibraryImports[libKey as IconLibraryKey]
      if (!importFn)
        return

      const module = await importFn()
      const icons = module.default || module
      const filteredIcons: Record<string, React.ComponentType> = {}
      Object.keys(icons).forEach((key) => {
        const icon = icons[key]
        if (typeof icon === 'function') {
          filteredIcons[key] = icon
        }
      })
      iconLibraryCache[libKey] = filteredIcons
      setIconLists(prev => ({ ...prev, [libKey]: Object.keys(filteredIcons) }))
    }
    finally {
      setLoadingLib(null)
    }
  }, [iconLists])

  useEffect(() => {
    loadIconLibrary(activeTab)
  }, [activeTab, loadIconLibrary])

  useEffect(() => {
    if (!value)
      return
    const [libKey] = value.split(':')
    if (libKey && !iconLibraryCache[libKey]) {
      loadIconLibrary(libKey)
    }
  }, [value, loadIconLibrary])

  const currentIconList = iconLists[activeTab] || []

  const filteredIcons = useMemo(() => {
    if (!searchText.trim())
      return currentIconList
    return currentIconList.filter(iconName =>
      iconName.toLowerCase().includes(searchText.toLowerCase()),
    )
  }, [currentIconList, searchText])

  const handleIconClick = (iconName: string) => {
    const newValue = `${activeTab}:${iconName}`
    onChange?.(newValue)
    setOpen(false)
  }

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.('')
  }, [onChange])

  const parseValue = useMemo(() => {
    if (!value)
      return null
    const [libKey, iconName] = value.split(':')
    return { libKey, iconName }
  }, [value])

  const selectedIconElement = useMemo(() => {
    if (!parseValue)
      return null
    const lib = iconLibraryCache[parseValue.libKey as IconLibraryKey]
    if (!lib)
      return null
    const IconComponent = lib[parseValue.iconName]
    if (!IconComponent || typeof IconComponent !== 'function')
      return null
    return createElement(IconComponent, { className: styles.selectedIcon } as any)
  }, [parseValue, styles.selectedIcon, iconLists[parseValue?.libKey as string]])

  const displayValue = useMemo(() => {
    if (!parseValue)
      return null
    return parseValue.iconName.replace(/Outlined$/, '')
  }, [parseValue])

  const popoverContent = (
    <div className={styles.popoverContent}>
      <div className={styles.librarySidebar}>
        {library.map((libKey) => {
          const lib = iconLibraryMap[libKey]
          const count = iconLists[libKey]?.length || lib.iconCount
          return (
            <div
              key={libKey}
              className={`${styles.libraryItem} ${activeTab === libKey ? styles.libraryItemActive : ''}`}
              onClick={() => setActiveTab(libKey)}
            >
              <div style={{ lineHeight: 1.2 }}>{lib.label}</div>
              <div className={styles.libraryItemCount}>
                {count}
                {' '}
                icons
              </div>
            </div>
          )
        })}
      </div>
      <div className={styles.iconPanel}>
        <div className={styles.searchInput}>
          <Input
            placeholder="搜索图标"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>
        {loadingLib === activeTab
          ? (
              <div className={styles.loadingContainer}>
                <Spin />
              </div>
            )
          : (
              <div className={styles.iconGrid}>
                {filteredIcons.map((iconName) => {
                  const lib = iconLibraryCache[activeTab]
                  const IconComponent = lib?.[iconName]
                  const isSelected = value === `${activeTab}:${iconName}`
                  return (
                    <div
                      key={iconName}
                      className={`${styles.iconItem} ${isSelected ? styles.iconItemSelected : ''}`}
                      onClick={() => handleIconClick(iconName)}
                      title={iconName}
                    >
                      {IconComponent && typeof IconComponent === 'function' && <IconComponent />}
                    </div>
                  )
                })}
              </div>
            )}
      </div>
    </div>
  )

  return (
    <Popover
      styles={{
        container: {
          padding: 0,
        },
        content: {
          height: '100%',
        },
      }}
      content={popoverContent}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      arrow={false}
    >
      {children || (
        <div className={styles.trigger} title={displayValue || placeholder}>
          {selectedIconElement || (
            <CiSquarePlus className={styles.placeholderIcon} />
          )}
          {clearable && value && (
            <TiDelete className={styles.clearIcon} onClick={handleClear} />
          )}
        </div>
      )}
    </Popover>
  )
}

import type React from 'react'
import { ZIcon } from '@zealous-admin/components/index'
import { memo, useMemo } from 'react'

interface MenuIconProps {
  icon: string
  className?: string
  style?: React.CSSProperties
  size?: number | string
  color?: string
}

export const MenuIcon = memo((props: MenuIconProps) => {
  if (!props.icon) {
    return null
  }

  const mergedStyle = useMemo<React.CSSProperties | undefined>(() => {
    const s: React.CSSProperties = { ...props.style }
    if (props.size) {
      s.fontSize = typeof props.size === 'number' ? props.size : props.size
    }
    if (props.color) {
      s.color = props.color
    }
    return Object.keys(s).length > 0 ? s : undefined
  }, [props.style, props.size, props.color])

  return <ZIcon value={props.icon} className={props.className} style={mergedStyle} />
})

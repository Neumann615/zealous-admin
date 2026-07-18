import type React from 'react'
import { ZaIcon } from '@zealous-admin/components/index'
import { createStyles } from 'antd-style'
import { memo, useMemo } from 'react'

const useStyles = createStyles(({ css }) => ({
  wrapper: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease-in-out;

    .ant-menu-item:hover &,
    .ant-menu-submenu-title:hover & {
      transform: scale(1.25);
    }
  `,
}))

interface MenuIconProps {
  icon: string
  className?: string
  style?: React.CSSProperties
  size?: number | string
  color?: string
  /** 右侧间距，用于拉开图标与文本的距离 */
  gap?: number
}

export const MenuIcon = memo((props: MenuIconProps) => {
  const { styles } = useStyles()

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

  const wrapperStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (props.gap) {
      return { marginRight: props.gap }
    }
    return undefined
  }, [props.gap])

  return (
    <span className={styles.wrapper} style={wrapperStyle}>
      <ZaIcon value={props.icon} className={props.className} style={mergedStyle} />
    </span>
  )
})

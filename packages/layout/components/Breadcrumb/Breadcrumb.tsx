import { Breadcrumb as AntBreadcrumb } from 'antd'
import { createStyles } from 'antd-style'
import { useControlTab } from '../../hooks/useControlTab'
import { useAppStore } from '../../store/index'
import { useTopBarStore } from '../../store/topBar'

const useStyles = createStyles(({ token, css }) => ({
  breadcrumbModern: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: token.paddingSM,
    borderRadius: token.borderRadiusLG,
    flexWrap: 'wrap',
    viewTransitionName: 'none',
  },
  breadcrumbChip: css`
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    height: 36px;
    font-size: ${token.fontSize}px;
    background-color: ${token.colorBgContainerDisabled};
    color: ${token.colorTextTertiary};
    transition: all 0.3s ease;
    white-space: nowrap;
    user-select: none;
  `,
  breadcrumbChipHoverable: css`
    cursor: pointer;
    &:hover {
      color: ${token.colorText};
    }
  `,
  breadcrumbChipActive: css`
    color: ${token.colorText};
  `,
  breadcrumbChipHasNext: css`
    clip-path: polygon(
      0% 0%,
      85% 0%,
      100% 50%,
      85% 100%,
      0% 100%
    ) !important;
    padding: 0 16px 0 12px;
    border-top-left-radius: ${token.borderRadius}px;
    border-bottom-left-radius: ${token.borderRadius}px;
  `,
  breadcrumbChipHasPrev: css`
    clip-path: polygon(
      0% 0%,
      100% 0%,
      100% 100%,
      0% 100%,
      15% 50%
    ) !important;
    padding: 0 12px 0 16px;
    border-top-right-radius: ${token.borderRadius}px;
    border-bottom-right-radius: ${token.borderRadius}px;
  `,
  breadcrumbChipHasBoth: css`
    padding:0 16px;
    clip-path: polygon(
      0% 0%,
      85% 0%,
      100% 50%,
      85% 100%,
      0% 100%,
      15% 50%
    ) !important;
  `,
  breadcrumbDefault: css`
    padding: 0 ${token.paddingSM}px;
    height: 36px;
    display: flex;
    align-items: center;
    & .ant-breadcrumb {
      font-size: ${token.fontSize}px;
    }
  `,
}))

export function Breadcrumb() {
  const { breadcrumbList, toolbar } = useTopBarStore()
  const appStore = useAppStore()
  const { openTab } = useControlTab()
  const { styles } = useStyles()
  const isEnableBreadcrumb = toolbar?.breadcrumb?.isEnableBreadcrumb ?? true
  const breadcrumbStyle = toolbar?.breadcrumb?.style ?? 'modern'

  if (!isEnableBreadcrumb)
    return null

  if (breadcrumbStyle === 'modern') {
    return (
      <div className={styles.breadcrumbModern}>
        {breadcrumbList.slice(appStore.homePage.isEnableHomePage ? 0 : 1).map((menuItem: any, _index: number, arr: any[]) => {
          const isLast = _index === arr.length - 1
          const hasChildren = menuItem?.children?.length > 0
          const isClickable = !hasChildren
          let chipClass = `${styles.breadcrumbChip} ${styles.breadcrumbChipHoverable}`
          if (isLast) {
            chipClass += ` ${styles.breadcrumbChipActive}`
          }
          if (_index > 0 && _index < arr.length - 1) {
            chipClass += ` ${styles.breadcrumbChipHasBoth}`
          }
          else if (_index === 0) {
            chipClass += ` ${styles.breadcrumbChipHasNext}`
          }
          else if (_index === arr.length - 1) {
            chipClass += ` ${styles.breadcrumbChipHasPrev}`
          }
          return (
            <div
              key={menuItem.key}
              className={chipClass}
              onClick={() => {
                if (!isLast && isClickable) {
                  openTab(menuItem)
                }
              }}
            >
              {menuItem.label}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={styles.breadcrumbDefault}>
      <AntBreadcrumb
        items={breadcrumbList.slice(appStore.homePage.isEnableHomePage ? 0 : 1).map((menuItem: any, _index: number, arr: any[]) => {
          const hasChildren = menuItem?.children?.length > 0
          const isLast = _index === arr.length - 1
          return {
            title: menuItem.label,
            onClick: hasChildren ? undefined : isLast ? undefined : () => openTab(menuItem),
          }
        })}
      >
      </AntBreadcrumb>
    </div>
  )
}

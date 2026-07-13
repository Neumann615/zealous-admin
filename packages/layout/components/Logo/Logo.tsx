import type { CSSProperties } from 'react'
import { createStyles } from 'antd-style'
import { useShallow } from 'zustand/react/shallow'
import { useControlTab } from '../../hooks/useControlTab'
import { useAppStore } from '../../store/index'

interface LogoProps {
  size?: number
  onClick?: () => void
  style?: CSSProperties
}

const useStyles = createStyles(({ css }) => ({
  logo: css`
    display: inline-block;
    cursor: pointer;
    flex-shrink: 0;
  `,
}))

export function Logo({ size = 30 }: LogoProps) {
  const { styles, theme } = useStyles()
  const { isEnableHomePage } = useAppStore(
    useShallow((state: any) => ({
      name: state.name,
      isEnableHomePage: state.homePage.isEnableHomePage,
    })),
  )
  const { openTab } = useControlTab()

  function toHomePage() {
    if (isEnableHomePage) {
      openTab({ key: '/' })
    }
  }

  return (
    <div
      className={styles.logo}
      style={{ width: size, height: size, cursor: isEnableHomePage ? 'pointer' : 'default' }}
      onClick={toHomePage}
    >
      <svg
        viewBox="105 90 380 400"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* 字母 Z - 使用背景色 */}
        <path
          d="M 150 130
             L 440 130
             M 440 130
             L 150 450
             M 150 450
             L 440 450"
          stroke="#2C2C38"
          strokeWidth="60"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
        {/* 字母 A（等腰三角形，中间挖出倒扣等边三角形镂空）- 使用主题色 */}
        <path
          d="M 300 135
             L 170 430
             L 430 430
             Z
             M 235 285
             L 365 285
             L 300 398
             Z"
          fill={theme.colorPrimary}
          stroke={theme.colorPrimary}
          strokeWidth="10"
          strokeLinejoin="round"
          fillRule="evenodd"
        />
      </svg>
    </div>
  )
}

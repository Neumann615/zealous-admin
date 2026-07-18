import type React from 'react'
import { StopOutlined } from '@ant-design/icons'
import { ZPatternBg } from '@zealous-admin/components'
import { createStyles } from 'antd-style'
import { useMobileDetect } from '../../hooks/useMobileDetect'
import { useAppStore } from '../../store/index'

const useStyles = createStyles(({ token, css }) => ({
  container: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${token.marginLG}px;
    padding: ${token.paddingXL}px;
  `,
  icon: css`
    font-size: 60px;
    color: ${token.colorText};
  `,
  text: css`
    font-size: ${token.fontSizeHeading4}px;
    color: ${token.colorTextDescription};
    text-align: center;
    line-height: 1.6;
  `,
}))

interface MobileBlockProps {
  children: React.ReactNode
}

/**
 * 移动端访问控制包裹组件
 * 当 isEnableMobileAccess 关闭且检测到移动设备时，渲染禁止访问提示页面；
 * 否则正常渲染 children。
 */
export function MobileBlock({ children }: MobileBlockProps) {
  const { styles } = useStyles()
  const isMobile = useMobileDetect()
  const isEnableMobileAccess = useAppStore(state => state.isEnableMobileAccess)

  // 移动端禁止访问：展示提示页面
  if (!isEnableMobileAccess && isMobile) {
    return (
      <ZPatternBg
        pattern="grid"
        size={26}
        animationDirection="up"
        maskDirection="all"
        style={{ height: '100vh' }}
      >
        <div className={styles.container}>
          <StopOutlined className={styles.icon} />
          <span className={styles.text}>
            抱歉，本网站不支持移动设备访问，请切换到桌面设备
          </span>
        </div>
      </ZPatternBg>
    )
  }

  return <>{children}</>
}
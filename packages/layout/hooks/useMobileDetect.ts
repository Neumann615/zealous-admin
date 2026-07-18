import { useEffect, useState } from 'react'

/**
 * 检测当前设备是否为移动端
 * - UA 匹配移动设备关键词
 * - 屏幕宽度 < 768px（平板/手机断点）
 */
export function isMobileDevice(): boolean {
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )
  const narrowScreen = window.innerWidth < 700
  return mobileUA || narrowScreen
}

/**
 * 响应式移动端检测 hook
 * 初始检测 + 监听 window resize 动态更新
 */
export function useMobileDetect(): boolean {
  const [isMobile, setIsMobile] = useState(() => isMobileDevice())

  useEffect(() => {
    const handleResize = () => setIsMobile(isMobileDevice())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isMobile
}

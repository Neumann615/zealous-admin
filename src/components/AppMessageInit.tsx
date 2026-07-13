import { App } from 'antd'
import { useEffect } from 'react'
import { setGlobalMessage, setGlobalModal } from '@/utils/appMessage'

/** 将 antd App 的 message 和 modal 实例注入全局引用，供 http.ts 等非组件环境使用 */
export function AppMessageInit({ children }: { children: React.ReactNode }) {
  const { message, modal } = App.useApp()
  useEffect(() => {
    setGlobalMessage(message)
    setGlobalModal(modal)
  }, [message, modal])
  return <>{children}</>
}

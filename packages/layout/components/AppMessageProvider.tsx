import { App } from 'antd'
import { useEffect } from 'react'
import { setGlobalMessage, setGlobalModal } from '../utils/appMessage'

export function AppMessageProvider({ children }: { children: React.ReactNode }) {
  const { message, modal } = App.useApp()

  useEffect(() => {
    setGlobalMessage(message)
    setGlobalModal(modal)
  }, [message, modal])

  return <>{children}</>
}
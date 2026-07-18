import { App } from 'antd'

export function useAppMessage() {
  const { message, modal } = App.useApp()
  return { message, modal }
}
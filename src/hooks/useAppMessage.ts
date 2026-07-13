import { App } from 'antd'

/** 获取主题同步的 message + modal 实例，替代静态 message.xxx() 和 Modal.confirm() */
export function useAppMessage() {
  const { message, modal } = App.useApp()
  return { message, modal }
}

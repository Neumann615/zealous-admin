/**
 * 全局 message / modal 引用 — 用于 http.ts 等非组件环境
 * 由 AppMessageInit 组件在挂载时注入
 */

let messageApi: any = null
let modalApi: any = null

export function setGlobalMessage(api: any) {
  messageApi = api
}

export function getGlobalMessage() {
  return messageApi
}

export function setGlobalModal(api: any) {
  modalApi = api
}

export function getGlobalModal() {
  return modalApi
}

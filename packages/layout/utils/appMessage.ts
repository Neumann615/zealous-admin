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
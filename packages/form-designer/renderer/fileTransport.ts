/** 表单值中持久化的文件引用：只存元数据，原始内容由服务端按 objectId 保存 */
export interface FormFileValue {
  objectId: string
  fileName: string
  fileSize: number
  fileType: string
}

export interface FormFileTransport {
  upload: (file: File, signal?: AbortSignal) => Promise<FormFileValue>
  download?: (file: FormFileValue) => Promise<void> | void
}

let transport: FormFileTransport | undefined

/** 宿主注入上传实现；schema 本身不携带 URL、token 或请求实现 */
export function registerFormFileTransport(next: FormFileTransport): void {
  transport = next
}

export function getFormFileTransport(): FormFileTransport | undefined {
  return transport
}

export function clearFormFileTransport(): void {
  transport = undefined
}

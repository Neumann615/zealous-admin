// vite-env.d.ts

interface ImportMetaEnv {
  DEV: any
  /** 后端API基础路径 */
  readonly VITE_BASE_SERVER_URL: string
  /** 是否使用OSS对象存储 */
  readonly VITE_USE_OSS: string
  /** OSS上传路径 */
  readonly VITE_OSS_UPLOAD_URL: string
  /** Minio上传相对路径 */
  readonly VITE_MINIO_UPLOAD_URL: string
  /** 监控采集 SDK 的应用标识 */
  readonly VITE_MONITOR_APP_ID?: string
  /** 监控采集入口，缺省时取 VITE_BASE_SERVER_URL + /monitor/collect */
  readonly VITE_MONITOR_REPORT_URL?: string
}
/** 扩展import.meta对象类型 */
interface ImportMeta {
  readonly env: ImportMetaEnv
  /** vite 的模块批量导入，用于按菜单 path 回落查找约定式页面 */
  glob: (pattern: string | string[]) => Record<string, () => Promise<{ default: any }>>
}

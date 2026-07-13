export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export function success<T>(data: T, message = '操作成功'): ApiResponse<T> {
  return { code: 200, message, data }
}

export function failed(message = '操作失败'): ApiResponse<null> {
  return { code: 500, message, data: null }
}

export function unauthorized(message = '暂未登录或 token 已过期'): ApiResponse<null> {
  return { code: 401, message, data: null }
}

export function forbidden(message = '没有相关权限'): ApiResponse<null> {
  return { code: 403, message, data: null }
}

export function validateFailed(message = '参数验证失败'): ApiResponse<null> {
  return { code: 404, message, data: null }
}

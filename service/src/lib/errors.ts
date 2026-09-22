export class BusinessError extends Error {
  constructor(
    message: string,
    public readonly code = 500,
  ) {
    super(message)
    this.name = 'BusinessError'
  }
}

export class NotFoundError extends BusinessError {
  constructor(message = '资源不存在') {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends BusinessError {
  constructor(message = '资源已存在') {
    super(message, 409)
    this.name = 'ConflictError'
  }
}

export class BadRequestError extends BusinessError {
  constructor(message = '请求参数错误') {
    super(message, 400)
    this.name = 'BadRequestError'
  }
}

export class UnauthorizedError extends BusinessError {
  constructor(message = '暂未登录或 token 已过期') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}

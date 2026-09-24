import type { CommonResult } from '../types/common'
import axios from 'axios'
import { logoutAction } from '../hooks/useAuth'
import { useAppStore } from '../store/app'
import { useReLoginStore } from '../store/reLogin'
import { useUserStore } from '../store/user'
import { getGlobalMessage } from './appMessage'

// 创建axios实例
const http = axios.create({
  baseURL: import.meta.env.VITE_BASE_SERVER_URL,
  timeout: 5000,
})

// axios请求拦截器
http.interceptors.request.use(
  (config) => {
    // 使用getState()获取store状态，避免在非组件环境中调用Hook
    const token = useUserStore.getState().token
    if (token) {
      config.headers.Authorization = `${token}`
    }
    return config
  },
  e => Promise.reject(e),
)

// axios响应拦截器
http.interceptors.response.use(
  (response) => {
    // 文件下载绕过业务响应包裹，直接把 AxiosResponse 交给调用方取 Blob
    if (response.config.responseType === 'blob') {
      return response
    }
    const res: CommonResult<unknown> = response.data
    if (res.code !== 200) {
      // code为非200是抛错，这里统一处理提示信息
      getGlobalMessage()?.error(res.message, 3)
      return Promise.reject(new Error(res.message))
    }
    else {
      // 返回响应JSON中的data属性，不包括message和code
      return response.data
    }
  },
  (error) => {
    // 网络错误/超时时没有 response，直接解构会在这里二次抛错，掩盖真实原因
    const response = error.response
    const data = response?.data as CommonResult<unknown> | undefined
    getGlobalMessage()?.error(data?.message || error.message || '请求失败', 3)
    if (response?.status === 401 || data?.code === 401) {
      const expireMode = useAppStore.getState().account.expireMode
      // 延时让用户先看到错误提示，再执行后续操作
      setTimeout(() => {
        if (expireMode === 'logout') {
          logoutAction()
        }
        else {
          useReLoginStore.getState().show()
        }
      }, 2000)
    }
    return Promise.reject(error)
  },
)

export default http

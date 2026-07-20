import type { CommonResult } from '@/types/common'
import axios from 'axios'
import { useUserStore } from '@/store/mall/user'
import { getGlobalMessage, getGlobalModal } from '@/utils/appMessage'

// 创建axios实例
const http = axios.create({
  baseURL: import.meta.env.VITE_BASE_SERVER_URL,
  timeout: 5000,
})

// axios请求拦截器
http.interceptors.request.use(
  (config) => {
    // 使用getState()获取store状态，避免在非组件环境中调用Hook
    const userStore = useUserStore.getState()
    const token = userStore.userInfo.token
    if (token) {
      config.headers.Authorization = token
    }
    return config
  },
  e => Promise.reject(e),
)

// axios响应拦截器
http.interceptors.response.use(
  (response) => {
    const res: CommonResult<unknown> = response.data
    if (res.code !== 200) {
      // code为非200是抛错，这里统一处理提示信息
      getGlobalMessage()?.error(res.message, 3)
      // 401:未登录;
      if (res.code === 401) {
        getGlobalModal()?.confirm({
          title: '确定登出',
          content: '你已被登出，可以取消继续留在该页面，或者重新登录',
          okText: '重新登录',
          cancelText: '取消',
          onOk() {
            // 使用getState()获取store状态，避免在非组件环境中调用Hook
            const userStore = useUserStore.getState()
            userStore.fedLogout()
            // 为了重新实例化router对象 避免bug
            location.reload()
          },
        })
      }
      return Promise.reject(new Error(res.message))
    }
    else {
      // 返回响应JSON中的data属性，不包括message和code
      return response.data
    }
  },
  (error) => {
    // 全局处理异常请求
    getGlobalMessage()?.error(error.message, 3)
    return Promise.reject(error)
  },
)

export default http

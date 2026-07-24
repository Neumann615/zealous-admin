import { create } from 'zustand'

interface ReLoginState {
  visible: boolean
  show: () => void
  hide: () => void
}

/** 控制 401 重新登录弹窗的显示 */
export const useReLoginStore = create<ReLoginState>(set => ({
  visible: false,
  show: () => set({ visible: true }),
  hide: () => set({ visible: false }),
}))

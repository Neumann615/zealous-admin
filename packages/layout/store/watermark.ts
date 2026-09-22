import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import defaultSetting from '../defaultSetting'
import { useUserStore } from './user'

export const useWatermarkStore = create(
  persist(
    () => ({
      content: [defaultSetting.app.name],
      fontSize: 20,
      width: 180,
      height: 100,
      rotate: -30,
      gap: [100, 60],
      zIndex: 9,
    }),
    {
      name: `${defaultSetting.app.storagePrefix}watermark`,
      storage: defaultSetting.app.isEnableMemory
        ? createJSONStorage(() =>
            defaultSetting.app.storageType === 'local'
              ? localStorage
              : sessionStorage,
          )
        : undefined,
    },
  ),
)

// 登录后自动将当前用户名追加到水印文案（用户信息为异步获取，需订阅响应式更新）
useUserStore.subscribe((state, prevState) => {
  const userName = state.userInfo?.nickName || state.userInfo?.username || ''
  const prevUserName = prevState.userInfo?.nickName || prevState.userInfo?.username || ''
  if (userName === prevUserName)
    return
  const baseContent = [defaultSetting.app.name]
  useWatermarkStore.setState({
    content: userName ? [...baseContent, userName] : baseContent,
  })
})

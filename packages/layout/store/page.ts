import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import defaultSetting from '../defaultSetting'

export const usePageStore = create(
  persist(
    (set: any) => ({
      ...defaultSetting.page,
      /* 页面加载进度条 */
      globalProgressLoading: false,
      startGlobalProgressLoading: () =>
        set(() => ({ globalProgressLoading: true })),
      stopGlobalProgressLoading: () =>
        set(() => ({ globalProgressLoading: false })),
      /* 页面最大化 */
      isMaximize: false,
      changeIsMaximize: () =>
        set((state: any) => ({ isMaximize: !state.isMaximize })),
      enterMaximize: () => set(() => ({ isMaximize: true })),
      exitMaximize: () => set(() => ({ isMaximize: false })),
    }),
    {
      name: `${defaultSetting.app.storagePrefix}page`,
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

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
      /* 页面刷新 */
      refreshKey: 0,
      refreshPage: () =>
        set((state: any) => ({ refreshKey: state.refreshKey + 1 })),
      /* KeepAlive 缓存管理 */
      cachedPages: [] as string[],
      setCachedPages: (pages: string[]) => set(() => ({ cachedPages: pages })),
      addCachedPage: (pathname: string) =>
        set((state: any) => {
          if (state.cachedPages.includes(pathname))
            return state
          return { cachedPages: [...state.cachedPages, pathname] }
        }),
      removeCachedPage: (pathname: string) =>
        set((state: any) => ({
          cachedPages: state.cachedPages.filter((p: string) => p !== pathname),
        })),
      clearAllCachedPages: () => set(() => ({ cachedPages: [] })),
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

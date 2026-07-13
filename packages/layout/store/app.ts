import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import defaultSetting from '../defaultSetting'

export const useAppStore = create(
  persist(
    () => ({
      ...defaultSetting.app,
    }),
    {
      name: `${defaultSetting.app.storagePrefix}app`,
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

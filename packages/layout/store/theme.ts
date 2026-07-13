import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import defaultSetting from '../defaultSetting'

export const useThemeStore = create(
  persist(
    () => ({
      ...defaultSetting.theme,
    }),
    {
      name: `${defaultSetting.app.storagePrefix}theme`,
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

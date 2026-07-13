import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import defaultSetting from '../defaultSetting'

export const useMenuStore = create(
  persist(
    (set: any) => ({
      ...defaultSetting.menu,
      menuCurrentKeys: [],
      menuData: [],
      mainNavData: [],
      mainNavCurrentKeys: [],
      openKeys: [],
      setMenuData: (data: any[]) => set(() => ({ menuData: data })),
      setMainNavData: (data: any[]) =>
        set(() => ({ mainNavData: data })),
      changeSubMenuCollapse: () =>
        set((state: any) => ({ subMenuCollapse: !state.subMenuCollapse })),
      setMenuCurrentKeys: (keyPath: string[]) =>
        set(() => ({ menuCurrentKeys: keyPath })),
      setMainNavCurrentKeys: (keyPath: string[]) =>
        set(() => ({ mainNavCurrentKeys: keyPath })),
      setOpenKeys: (keyPath: string[]) =>
        set(() => ({ openKeys: keyPath })),
    }),
    {
      name: `${defaultSetting.app.storagePrefix}menu`,
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

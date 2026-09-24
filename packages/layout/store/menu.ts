import type { LayoutConfig, MenuData } from '../types/config'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import defaultSetting from '../defaultSetting'

type MenuState = LayoutConfig['menu'] & {
  // 运行时状态（不持久化）
  mobileDrawerOpen: boolean
  setMobileDrawerOpen: (open: boolean) => void
  menuCurrentKeys: string[]
  menuData: MenuData
  mainNavData: MenuData
  mainNavCurrentKeys: string[]
  openKeys: string[]
  setMenuData: (data: MenuData) => void
  setMainNavData: (data: MenuData) => void
  changeSubMenuCollapse: () => void
  setMenuCurrentKeys: (keyPath: string[]) => void
  setMainNavCurrentKeys: (keyPath: string[]) => void
  setOpenKeys: (keyPath: string[]) => void
}

export const useMenuStore = create<MenuState>()(
  persist(
    set => ({
      ...defaultSetting.menu,
      // 运行时状态（不持久化）
      mobileDrawerOpen: false,
      setMobileDrawerOpen: (open: boolean) => set(() => ({ mobileDrawerOpen: open })),
      menuCurrentKeys: [],
      menuData: [],
      mainNavData: [],
      mainNavCurrentKeys: [],
      openKeys: [],
      setMenuData: (data: MenuData) => set(() => ({ menuData: data })),
      setMainNavData: (data: MenuData) =>
        set(() => ({ mainNavData: data })),
      changeSubMenuCollapse: () =>
        set(state => ({ subMenuCollapse: !state.subMenuCollapse })),
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

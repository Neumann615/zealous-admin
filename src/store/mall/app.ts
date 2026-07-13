import { create } from 'zustand'

interface AppState {
  sidebar: {
    opened: boolean
    withoutAnimation: boolean
  }
  device: string
  toggleSideBar: () => void
  closeSideBar: (withoutAnimation: boolean) => void
  toggleDevice: (deviceType: string) => void
}

export const useMallAppStore = create<AppState>(set => ({
  sidebar: {
    opened: true,
    withoutAnimation: false,
  },
  device: 'desktop',

  toggleSideBar: () =>
    set(state => ({
      sidebar: {
        ...state.sidebar,
        opened: !state.sidebar.opened,
      },
    })),

  closeSideBar: withoutAnimation =>
    set(state => ({
      sidebar: {
        ...state.sidebar,
        opened: false,
        withoutAnimation,
      },
    })),

  toggleDevice: deviceType => set({ device: deviceType }),
}))

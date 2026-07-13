import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import defaultSetting from '../defaultSetting'

export const useTopBarStore = create(
  persist(
    (set: any) => ({
      ...defaultSetting.topBar,
      breadcrumbList: defaultSetting.topBar.toolbar.breadcrumb
        .isEnableBreadcrumb
        ? [
            {
              icon: 'Home',
              id: '/',
              key: '/',
              label: defaultSetting.app.homePage.title,
            },
          ]
        : [],
      setBreadcrumbList: (v: any) => set(() => ({ breadcrumbList: v })),
      tabs: defaultSetting.app.homePage.isEnableHomePage
        ? [
            {
              menuData: {
                icon: 'Home',
                id: '/',
                key: '/',
                title: defaultSetting.app.homePage.title,
              },
              tabId: '/',
              title: defaultSetting.app.homePage.title,
              icon: 'Home',
            },
          ]
        : [],
      nowTab: defaultSetting.app.homePage.isEnableHomePage
        ? {
            tabId: '/',
            title: defaultSetting.app.homePage.title,
            icon: 'Home',
          }
        : {
            tabId: '',
            title: '',
            icon: '',
          },
      setTabs: (v: any) => set(() => ({ tabs: v })),
      setNowTab: (v: any) => set(() => ({ nowTab: v })),
      setFixedTab: (tabId: string) =>
        set((state: any) => ({ tabs: setFixedTabHandler(state.tabs, tabId) })),
      settingsModalOpen: false,
      setSettingsModalOpen: (v: boolean) => set(() => ({ settingsModalOpen: v })),
    }),
    {
      name: `${defaultSetting.app.storagePrefix}topBar`,
      storage: defaultSetting.app.isEnableMemory
        ? createJSONStorage(() =>
            defaultSetting.app.storageType === 'local'
              ? localStorage
              : sessionStorage,
          )
        : undefined,
      // 版本升级时通过 migrate 补充新增的嵌套字段
      version: 1,
      migrate: (persisted: any, _version: number) => {
        if (!persisted.toolbar) {
          persisted.toolbar = {}
        }
        if (!persisted.toolbar.toolbarOrder) {
          persisted.toolbar.toolbarOrder
            = defaultSetting.topBar.toolbar.toolbarOrder
        }
        return persisted
      },
      // 深度合并：确保新增的嵌套字段不会因旧持久化数据缺失而丢失
      merge: (persisted: any, current: any) => ({
        ...current,
        ...persisted,
        toolbar: {
          ...current.toolbar,
          ...(persisted.toolbar || {}),
        },
      }),
    },
  ),
)

function setFixedTabHandler(tabs: any[], tabId: string) {
  tabs.forEach((tabItem: any) => {
    if (tabItem.tabId === tabId) {
      tabItem.isFixed = !tabItem.isFixed
      console.log('更新固定', tabItem)
    }
  })
  tabs.sort((a, b) => b.isFixed - a.isFixed)
  return tabs
}

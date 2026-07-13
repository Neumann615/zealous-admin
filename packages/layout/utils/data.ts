import type {
  ExpireMode,
  LayoutScope,
  TabBarDblClickEventType,
} from '../types/config'
import {
  blue,
  cyan,
  geekblue,
  gold,
  green,
  lime,
  magenta,
  orange,
  purple,
  red,
  volcano,
  yellow,
} from '@ant-design/colors'

export const themeColorList = [
  // "#000",
  blue.primary,
  red.primary,
  volcano.primary,
  green.primary,
  orange.primary,
  yellow.primary,
  cyan.primary,
  geekblue.primary,
  purple.primary,
  magenta.primary,
  lime.primary,
  gold.primary,
]

export const menuFillStyleList = ['none', 'radius']

export const breadcrumbStyleList = [
  {
    label: '默认',
    value: 'default',
  },
  {
    label: '时尚',
    value: 'modern',
  },
]

export const topBarPositionList = [
  {
    label: '默认',
    value: 'static',
  },
  {
    label: '固定',
    value: 'fixed',
  },
  {
    label: '粘性',
    value: 'sticky',
  },
]

export const tabBarPositionList = [
  {
    label: '默认',
    value: 'static',
  },
  {
    label: '固定',
    value: 'fixed',
  },
  {
    label: '粘性',
    value: 'sticky',
  },
]

export const tabBarStyleList = [
  {
    label: '默认',
    value: 'default',
  },
  {
    label: '卡片',
    value: 'card',
  },
  {
    label: '方块',
    value: 'block',
  },
]

export const tabBarDblClickEventTypeList: Array<{
  label: string
  value: TabBarDblClickEventType
}> = [
  {
    label: '刷新',
    value: 'refresh',
  },
  {
    label: '关闭',
    value: 'close',
  },
  {
    label: '固定/取消固定',
    value: 'fixed',
  },
  {
    label: '最大化',
    value: 'max',
  },
  {
    label: '打开',
    value: 'open',
  },
]

export const tabBarWidthTypeList = [
  {
    label: '固定',
    value: 'fixed',
  },
  {
    label: '自动',
    value: 'auto',
  },
  {
    label: '自适应（最小宽度）',
    value: 'auto-min',
  },
  {
    label: '自适应（最大宽度）',
    value: 'auto-max',
  },
]

export const expireModeList: Array<{ label: string, value: ExpireMode }> = [
  {
    label: '重定向登录页',
    value: 'logout',
  },
  {
    label: '弹出登录窗口',
    value: 'prompt',
  },
]

export const layoutScopeList: Array<{ label: string, value: LayoutScope }> = [
  {
    label: '内部',
    value: 'inside',
  },
  {
    label: '外部',
    value: 'outside',
  },
]

export const menuActiveStyleList = ['none', 'arrow', 'line', 'dot']

export const storageTypeList = [
  {
    label: '本地存储',
    value: 'local',
  },
  {
    label: '会话存储',
    value: 'session',
  },
]

export const transitionTypeList = [
  {
    label: '滑动',
    value: 'slide-right',
    classNames: {
      appear: 'animate__animated',
      appearActive: 'animate__slideInRight',
      enter: 'animate__animated',
      enterActive: 'animate__slideInRight',
      exit: 'animate__animated',
      exitActive: 'animate__slideOutLeft',
    },
  },
  {
    label: '淡入淡出1',
    value: 'fade-in',
    classNames: {
      appear: 'animate__animated',
      appearActive: 'animate__fadeIn',
      enter: 'animate__animated',
      enterActive: 'animate__fadeIn',
      exit: 'animate__animated',
      exitActive: 'animate__fadeOut',
    },
  },
  {
    label: '淡入淡出2',
    value: 'fade-up',
    classNames: {
      appear: 'animate__animated',
      appearActive: 'animate__fadeInUp',
      enter: 'animate__animated',
      enterActive: 'animate__fadeInUp',
      exit: 'animate__animated',
      exitActive: 'animate__fadeOutDown',
    },
  },
  {
    label: '闪动1',
    value: 'lightspeed-left',
    classNames: {
      appear: 'animate__animated',
      appearActive: 'animate__lightSpeedInLeft',
      enter: 'animate__animated',
      enterActive: 'animate__lightSpeedInLeft',
      exit: 'animate__animated',
      exitActive: 'animate__lightSpeedOutRight',
    },
  },
  {
    label: '滚动',
    value: 'roll',
    classNames: {
      appear: 'animate__animated',
      appearActive: 'animate__rollIn',
      enter: 'animate__animated',
      enterActive: 'animate__rollIn',
      exit: 'animate__animated',
      exitActive: 'animate__rollOut',
    },
  },
]

const transitionTypeSet: any = {}
transitionTypeList.forEach((transition: any) => {
  transitionTypeSet[transition.value] = transition.classNames
})

export { transitionTypeSet }

export const menuTypeList = [
  {
    label: '侧边栏模式',
    value: 'side',
  },
  {
    label: '侧边栏精简模式',
    value: 'only-side',
  },
  {
    label: '顶部模式',
    value: 'head',
  },
  {
    label: '顶部精简模式',
    value: 'only-head',
  },
  {
    label: '精简模式（不包含主导航）',
    value: 'simple',
  },
]

export const menuData = []

// ========== cartoonTheme.ts ==========

import type { ConfigProviderProps } from 'antd'
import { theme } from 'antd'
import { createStyles } from 'antd-style'
import { useMemo } from 'react'

const useStyles = createStyles(({ css, token: cssVar }) => {
  // 卡通风格的核心技法：粗边框 + 偏移实色投影（无模糊）
  const cartoonBorder = {
    border: `${cssVar.lineWidth}px ${cssVar.lineType} ${cssVar.colorBorder}`,
  }

  const cartoonBox = {
    ...cartoonBorder,
    boxShadow: `4px 4px 0 ${cssVar.colorBorder}`,
  }

  return {
    cartoonBorder,
    cartoonBox,

    // 按钮：偏移投影 + 按下时投影消失（下沉感）
    buttonRoot: css({
      ...cartoonBox,
      'fontWeight': 700,
      'textTransform': 'uppercase' as const,
      'letterSpacing': '0.5px',
      'transition': 'all 0.1s ease',

      '&:hover': {
        transform: 'translate(-1px, -1px)',
        boxShadow: `6px 6px 0 ${cssVar.colorBorder}`,
      },

      '&:active': {
        transform: 'translate(2px, 2px)',
        boxShadow: `1px 1px 0 ${cssVar.colorBorder}`,
      },
    }),

    // 卡片
    cardRoot: css({
      ...cartoonBox,
      borderRadius: cssVar.borderRadius,
    }),

    // 弹窗
    modalContainer: css({
      ...cartoonBox,
    }),

    modalHeader: css({
      borderBottom: `${cssVar.lineWidth}px ${cssVar.lineType} ${cssVar.colorBorder}`,
    }),

    modalFooter: css({
      borderTop: `${cssVar.lineWidth}px ${cssVar.lineType} ${cssVar.colorBorder}`,
    }),

    // 下拉/选择器弹出层
    popupBox: css({
      ...cartoonBox,
      borderRadius: cssVar.borderRadiusLG,
      backgroundColor: cssVar.colorBgContainer,

      ul: {
        paddingInline: 0,
      },
    }),

    // 输入框
    inputRoot: css({
      ...cartoonBox,
      'boxShadow': `2px 2px 0 ${cssVar.colorBorder}`,

      '&:hover': {
        borderColor: cssVar.colorPrimary,
      },

      '&:focus-within': {
        boxShadow: `3px 3px 0 ${cssVar.colorPrimary}`,
        borderColor: cssVar.colorPrimary,
      },
    }),

    // 进度条
    progressRail: css({
      ...cartoonBorder,
      boxShadow: `2px 2px 0 ${cssVar.colorBorder}`,
    }),

    progressTrack: css({
      border: 'none',
    }),

    // 开关
    switchRoot: css({
      ...cartoonBorder,
      boxShadow: `2px 2px 0 ${cssVar.colorBorder}`,
    }),

    // 标签页触发
    segmentedRoot: css({
      ...cartoonBorder,
      'borderRadius': cssVar.borderRadius,
      'background': cssVar.colorBgLayout,

      '& .ant-segmented-thumb': {
        ...cartoonBox,
        boxShadow: `none !important`,
      },
    }),

    // InputNumber 加减按钮小一点
    inputNumberActions: css({
      width: 12,
    }),
  }
})

export function useCartoonTheme() {
  const { styles } = useStyles()

  return useMemo<ConfigProviderProps>(
    () => ({
      theme: {
        algorithm: theme.defaultAlgorithm,
        token: {
          // ===== 调色板 =====
          colorPrimary: '#FF6B6B', // 珊瑚红 — 主色调
          colorSuccess: '#51CF66', // 鲜绿
          colorWarning: '#FFD43B', // 明黄
          colorError: '#FF6B6B', // 和主色统一
          colorInfo: '#74C0FC', // 天蓝
          colorBorder: '#2D3436', // 深炭色 — 卡通描边线
          colorBorderSecondary: '#636E72',

          colorText: '#2D3436',
          colorTextSecondary: '#636E72',
          colorTextTertiary: '#B2BEC3',

          colorBgBase: '#FFF9F0', // 暖奶油底色
          colorBgContainer: '#FFFFFF',
          colorBgLayout: '#FFF5E6',
          colorBgElevated: '#FFFFFF',

          // ===== 描边 =====
          lineWidth: 3,
          lineWidthBold: 3,

          // ===== 圆角 =====
          borderRadius: 14,
          borderRadiusLG: 20,
          borderRadiusSM: 8,
          borderRadiusXS: 4,

          // ===== 尺寸 =====
          controlHeight: 40,
          controlHeightSM: 34,
          controlHeightLG: 48,
          fontSize: 15,
          fontWeightStrong: 700,

          // ===== 投影 =====
          boxShadow: '4px 4px 0 #2D3436',
          boxShadowSecondary: '6px 6px 0 #2D3436',
        },
        components: {
          Button: {
            primaryShadow: 'none',
            dangerShadow: 'none',
            defaultShadow: 'none',
            fontWeight: 700,
          },
          Modal: {
            boxShadow: 'none',
          },
          Card: {
            boxShadow: '4px 4px 0 #2D3436',
            colorBgContainer: '#FFF5EE',
          },
          Tooltip: {
            colorBorder: '#2D3436',
            colorBgSpotlight: '#2D3436',
            borderRadius: 8,
          },
          Select: {
            optionSelectedBg: '#FFE3E3',
          },
          Slider: {
            dotBorderColor: '#FF6B6B',
            dotActiveBorderColor: '#FF6B6B',
            colorPrimaryBorder: '#FF6B6B',
            colorPrimaryBorderHover: '#FF8787',
            railBg: '#FFE3E3',
            trackBg: '#FF6B6B',
            trackHoverBg: '#FF8787',
          },
          Notification: {
            colorSuccessBg: '#EBFBEE',
            colorErrorBg: '#FFF0F0',
            colorInfoBg: '#E7F5FF',
            colorWarningBg: '#FFF9DB',
          },
          Layout: {
            bodyBg: '#FFF9F0',
            footerBg: '#FFF9F0',
            headerBg: '#FF6B6B',
            headerColor: '#FFFFFF',
            siderBg: '#2D3436',
            triggerBg: '#555C60',
            triggerColor: '#FFFFFF',
          },
          Menu: {
            activeBarBorderWidth: 0,
            itemBg: 'transparent',
            subMenuItemBg: 'transparent',
            darkItemBg: '#2D3436',
            darkSubMenuItemBg: '#2D3436',
          },
          Progress: {
            circleTextColor: '#2D3436',
            defaultColor: '#FF6B6B',
            remainingColor: '#FFE3E3',
          },
          Segmented: {
            trackBg: '#FFF9F0',
            itemSelectedBg: '#FFFFFF',
          },
        },
      },
      // ===== 组件级 classNames =====
      button: {
        classNames: {
          root: styles.buttonRoot,
        },
      },
      modal: {
        classNames: {
          container: styles.modalContainer,
          header: styles.modalHeader,
          footer: styles.modalFooter,
        },
      },
      card: {
        classNames: {
          root: styles.cardRoot,
        },
      },
      alert: {
        className: styles.cartoonBorder,
      },
      colorPicker: {
        arrow: false,
        classNames: {
          root: styles.cartoonBox,
        },
      },
      popover: {
        classNames: {
          container: styles.cartoonBox,
        },
      },
      tooltip: {
        arrow: false,
        classNames: {
          container: styles.cartoonBox,
        },
      },
      dropdown: {
        classNames: {
          root: styles.popupBox,
        },
      },
      select: {
        classNames: {
          root: styles.cartoonBox,
          popup: {
            root: styles.popupBox,
          },
        },
      },
      input: {
        classNames: {
          root: styles.inputRoot,
        },
      },
      inputNumber: {
        classNames: {
          root: styles.inputRoot,
          actions: styles.inputNumberActions,
        },
      },
      switch: {
        classNames: {
          root: styles.switchRoot,
        },
      },
      progress: {
        classNames: {
          rail: styles.progressRail,
          track: styles.progressTrack,
        },
        styles: {
          rail: { height: 18 },
          track: { height: 12 },
        },
      },
      segmented: {
        className: styles.segmentedRoot,
      },
    }),
    [styles],
  )
}

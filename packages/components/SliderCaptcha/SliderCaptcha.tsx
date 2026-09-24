import type { ActionType } from 'rc-slider-captcha'
import { createStyles } from 'antd-style'
import createPuzzle from 'create-puzzle'
import RcSliderCaptcha from 'rc-slider-captcha'
import { useMemo, useRef } from 'react'
import { useT } from '../locale'
// @ts-ignore
import bg1 from './bg1.jpg'
// @ts-ignore
import bg2 from './bg2.jpg'
// @ts-ignore
import bg3 from './bg3.png'

// 默认背景图片列表
const defaultBgImages = [bg1, bg2, bg3]

type CaptchaType = 'slider' | 'embed' | 'float'

export interface RemoteSliderCaptchaConfig {
  request: () => Promise<{ bgUrl: string, puzzleUrl: string }>
  verify: (data: { x: number, y: number, duration: number, trail: Array<[number, number]> }) => Promise<boolean>
}

interface SliderCaptchaProps {
  type?: CaptchaType
  onVerify?: (success: boolean) => void
  bgSize?: { width: number, height: number }
  tipText?: {
    default?: string
    moving?: string
    error?: string
    success?: string
  }
  className?: string
  /** 自定义背景图片，可以是单个图片路径或图片数组，不传则使用默认图片 */
  bgImages?: string | string[]
  /** 服务端拼图验证：挑战与答案均由后端持有，前端只回传拖拽轨迹 */
  remote?: RemoteSliderCaptchaConfig
  puzzleSize?: { width?: number, height?: number, left?: number, top?: number }
  actionRef?: { current: ActionType | undefined }
}

const useStyles = createStyles(({ token, css }) => ({
  container: css`
        background-color: ${token.colorBgContainer};
        box-sizing: border-box;
        padding: ${token.paddingContentHorizontalSM}px;
        border-radius: ${token.borderRadius}px;
    `,
  sliderCaptcha: {
    '--rcsc-primary': token.colorPrimary,
    '--rcsc-primary-light': token.colorPrimaryBg,
    '--rcsc-error': token.colorError,
    '--rcsc-error-light': token.colorErrorBg,
    '--rcsc-success': token.colorSuccess,
    '--rcsc-success-light': token.colorSuccessBg,
    '--rcsc-border-color': token.colorBorderSecondary,
    '--rcsc-bg-color': token.colorBgContainer,
    '--rcsc-text-color': token.colorTextBase,
    '--rcsc-button-bg-color': token.colorBgContainerDisabled,
  },
  refreshButton: css`
        margin-top: ${token.marginSM}px;
    `,
}))

export function SliderCaptcha({
  type = 'slider',
  bgSize = { width: 384, height: 216 },
  tipText,
  className,
  bgImages,
  onVerify,
  remote,
  puzzleSize,
  actionRef,
}: SliderCaptchaProps) {
  const { styles, cx } = useStyles()
  const internalActionRef = useRef<ActionType | undefined>(undefined)
  const offsetXRef = useRef(0)
  const t = useT()

  const defaultTipText = useMemo(() => ({
    default: t('component.sliderCaptcha.tip.default'),
    moving: t('component.sliderCaptcha.tip.moving'),
    error: t('component.sliderCaptcha.tip.error'),
    success: t('component.sliderCaptcha.tip.success'),
    ...tipText,
  }), [t, tipText])

  const availableImages = useMemo(() => {
    if (!bgImages) {
      return defaultBgImages
    }
    return Array.isArray(bgImages) ? bgImages : [bgImages]
  }, [bgImages])

  const handleVerify = async (data: any) => {
    try {
      if (remote) {
        const verified = await remote.verify({
          x: data.x,
          y: data.y,
          duration: data.duration,
          trail: data.trail,
        })
        if (!verified)
          throw new Error(t('component.sliderCaptcha.verifyFailed'))

        onVerify?.(true)
        return Promise.resolve()
      }

      const tolerance = 5
      if (type === 'slider') {
        // 纯滑块验证：拖动到最右边
        // 滑块宽度约 60px，正确位置 = 容器宽度 - 滑块宽度
        const correctX = bgSize.width - 60
        if (Math.abs(data.x - correctX) <= tolerance) {
          onVerify?.(true)
          return Promise.resolve()
        }
        throw new Error(t('component.sliderCaptcha.verifyFailed'))
      }
      else {
        // 拼图验证：检查位置是否匹配
        if (data.x >= offsetXRef.current - tolerance && data.x < offsetXRef.current + tolerance) {
          onVerify?.(true)
          return Promise.resolve()
        }
        throw new Error(t('component.sliderCaptcha.verifyFailed'))
      }
    }
    catch (error) {
      onVerify?.(false)
      return Promise.reject(error instanceof Error ? error : new Error(String(error)))
    }
  }

  const handleRequest = async (): Promise<{ bgUrl: string, puzzleUrl: string }> => {
    if (remote)
      return remote.request()

    // 随机选择一张图片
    const randomImage = availableImages[Math.floor(Math.random() * availableImages.length)]
    const res = await createPuzzle(randomImage, {
      format: 'blob',
      quality: 1,
      imageWidth: bgSize.width,
      imageHeight: bgSize.height,
    })
    offsetXRef.current = res.x
    return {
      bgUrl: res.bgUrl,
      puzzleUrl: res.puzzleUrl,
    }
  }

  return (
    <div className={cx(styles.container, className)}>
      {type === 'slider'
        ? (
            <RcSliderCaptcha
              className={styles.sliderCaptcha}
              actionRef={actionRef ?? internalActionRef}
              mode="slider"
              showRefreshIcon={false}
              bgSize={bgSize}
              puzzleSize={puzzleSize}
              tipText={defaultTipText}
              onVerify={handleVerify}
              errorHoldDuration={1500}
            />
          )
        : (
            <RcSliderCaptcha
              className={styles.sliderCaptcha}
              actionRef={actionRef ?? internalActionRef}
              mode={type}
              showRefreshIcon={true}
              bgSize={bgSize}
              puzzleSize={puzzleSize}
              tipText={defaultTipText}
              onVerify={handleVerify}
              errorHoldDuration={1500}
              request={handleRequest}
            />
          )}
      {/* <Button
                className={styles.refreshButton}
                onClick={() => (actionRef ?? internalActionRef).current?.refresh()}
            >
                点击重置
            </Button> */}
    </div>
  )
}

export default SliderCaptcha

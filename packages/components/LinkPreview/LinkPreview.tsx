import { Popover, Spin } from 'antd'
import { createStyles } from 'antd-style'
import { useEffect, useState } from 'react'

export interface LinkPreviewProps {
  url: string
  children: React.ReactNode
  width?: number
  height?: number
  className?: string
}

interface PreviewData {
  publisher: string
  logo: string
  url: string
  screenshot: string
}

const useStyles = createStyles(({ token, css }) => ({
  container: css`
    color: ${token.colorLink};
    cursor: pointer;

    &:hover {
      color: ${token.colorLinkHover};
    }
  `,
  previewWrapper: css`
    width: 100%;
    height: 100%;
    background: ${token.colorBgContainer};
    border-radius: ${token.borderRadiusSM}px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `,
  previewImage: css`
    flex: 1;
    height: 50px;
    display: block;
    object-fit: fill;
    width: 100%;
    border: none;
  `,
  placeholderImage: css`
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      135deg,
      ${token.colorBgContainer} 0%,
      ${token.colorBgLayout} 100%
    );
    border: 1px dashed ${token.colorBorder};
  `,
  placeholderIcon: css`
    font-size: ${token.fontSizeXL}px;
    color: ${token.colorTextDisabled};
  `,
  previewInfo: css`
    padding: 2px ${token.paddingXS}px;
    background: ${token.colorBgContainer};
  `,
  previewTitle: css`
    font-size: ${token.fontSize}px;
    color: ${token.colorTextBase};
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  previewUrl: css`
    display: flex;
    align-items: center;
    gap: 4px;
  `,
  previewPublisher: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextTertiary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  favicon: css`
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    display: block;
    object-fit: cover;
    border: none;
  `,
  loading: css`
    padding: ${token.paddingLG}px;
    display: flex;
    align-items: center;
    justify-content: center;
  `,
}))

export function LinkPreview({ url, children, className }: LinkPreviewProps) {
  const width = 200
  const height = 160
  const { styles, cx } = useStyles()
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [imageError, setImageError] = useState(false)

  const fetchPreview = async () => {
    setLoading(true)
    setImageError(false)
    try {
      const response = await fetch(
        `https://api.microlink.io?url=${encodeURIComponent(url)}&meta=true&screenshot=true`,
      )
      const data = await response.json()
      console.log('LinkData', data)
      if (data.data) {
        setPreviewData({
          screenshot: data.data.screenshot?.url || '',
          url: data.data.url || url,
          logo: data.data.logo?.url || '',
          publisher: data.data.publisher || '',
        })
      }
    }
    catch (error) {
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPreview()
  }, [url])

  const previewContent = loading
    ? (
        <div className={cx(styles.previewWrapper, styles.loading)}>
          <Spin />
        </div>
      )
    : previewData
      ? (
          <div className={styles.previewWrapper}>
            {imageError || !previewData.screenshot
              ? (
                  <div className={cx(styles.placeholderImage)} style={{ height }}>
                    <span className={styles.placeholderIcon}>🌐</span>
                  </div>
                )
              : (
                  <img
                    src={previewData.screenshot}
                    alt={previewData.publisher}
                    className={styles.previewImage}
                    height={height}
                    onError={() => setImageError(true)}
                  />
                )}
            <div className={styles.previewInfo}>
              <div className={styles.previewTitle} title={previewData.publisher}>
                {previewData.publisher}
              </div>
              <div className={styles.previewUrl} title={previewData.url}>
                <img
                  src={previewData.logo}
                  alt={previewData.logo}
                  className={styles.favicon}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
                <div className={styles.previewPublisher}>{previewData.url}</div>
              </div>
            </div>
          </div>
        )
      : null

  return (
    <Popover
      styles={{
        container: {
          width,
          height,
          padding: 0,
        },
        content: {
          height: '100%',
        },
      }}
      content={previewContent}
      placement="top"
      trigger="hover"
      arrow={false}
      mouseEnterDelay={0.15}
      mouseLeaveDelay={0.15}
    >
      <span className={cx(styles.container, className)}>{children}</span>
    </Popover>
  )
}

export default LinkPreview

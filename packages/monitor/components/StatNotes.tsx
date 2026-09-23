import { InfoCircleOutlined } from '@ant-design/icons'
import { createStyles } from 'antd-style'

const useStyles = createStyles(({ token, css }) => ({
  wrap: css`
    display: flex;
    align-items: flex-start;
    gap: ${token.marginXS}px;
    padding: ${token.paddingXS}px ${token.paddingSM}px;
    border-radius: ${token.borderRadius}px;
    background: ${token.colorFillQuaternary};
    font-size: ${token.fontSizeSM}px;
    line-height: 1.6;
    color: ${token.colorTextSecondary};
  `,
  icon: css`
    margin-top: 3px;
    color: ${token.colorTextTertiary};
  `,
}))

export interface StatNotesProps {
  notes: Array<string | false | null | undefined>
}

/** 口径说明：把「这个数字是怎么算出来的」摆在明面上，避免误读 */
export function StatNotes({ notes }: StatNotesProps) {
  const { styles } = useStyles()
  const items = notes.filter(Boolean) as string[]
  if (!items.length)
    return null
  return (
    <div className={styles.wrap}>
      <InfoCircleOutlined className={styles.icon} />
      <span>{items.join(' ')}</span>
    </div>
  )
}
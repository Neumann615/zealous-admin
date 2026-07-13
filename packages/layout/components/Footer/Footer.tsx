import { createStyles } from 'antd-style'
import { useAppStore } from '../../store/index'

const useStyles = createStyles(({ token, css }) => ({
  footer: {
    width: '100%',
    height: '50px',
    boxSizing: 'border-box',
    color: token.colorTextSecondary,
    backgroundColor: token.colorBgBase,
    fontSize: token.fontSizeSM,
    fontWeight: 500,
    borderTop: `1px solid ${token.colorBorderSecondary}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  company: css`
    margin-left:${token.marginXS}px;
    `,
  website: css`
    transition: all .2s;
     cursor:pointer;
     :hover{
        transition: all .2s;
        color:${token.colorTextBase};
     }
    `,
}))

export function Footer() {
  const { copyright } = useAppStore()
  const { isEnableCopyright, date, company, website } = copyright
  const { styles } = useStyles()
  const fullYear = new Date().getFullYear()
  return isEnableCopyright
    ? (
        <div className={styles.footer}>
          <span>
            Copyright ©
            {date}
            -
            {fullYear}
          </span>
          <span
            onClick={() => {
              if (!website?.length)
                return
              window.open(website)
            }}
            className={`${styles.company} ${website?.length ? styles.website : ''}`}
          >
            {company}
            版权所有
          </span>
        </div>
      )
    : null
}

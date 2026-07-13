import { SettingOutlined } from '@ant-design/icons'
import { createStyles } from 'antd-style'
import { useTopBarStore } from '../../store/index'
import { ConfigPanel } from '../ConfigPanel/ConfigPanel'

const useStyles = createStyles(({ token, css }) => {
  return {
    setting: css`
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      right: 0;
      top: 50%;
      box-sizing: border-box;
      background-color: ${token.colorPrimary};
      border-radius: ${token.borderRadius};
      cursor: pointer;
      border-radius: 8px 0 0 8px;
      z-index: 99999;
    `,
  }
})

export function Setting() {
  const isDev = true
  const topBarStore = useTopBarStore()
  const { styles } = useStyles()

  const showDrawer = () => {
    topBarStore.setSettingsModalOpen(true)
  }

  const onClose = () => {
    topBarStore.setSettingsModalOpen(false)
  }

  return isDev
    ? (
        <div className={styles.setting}>
          <SettingOutlined
            className="infinite-rotate"
            style={{ fontSize: 26, color: '#fff' }}
            onClick={showDrawer}
          />
          <ConfigPanel
            open={topBarStore.settingsModalOpen}
            onClose={onClose}
          />
        </div>
      )
    : null
}
import { useControlTab, useUserStore } from '@zealous-admin/layout/index'
import { Button, Card, Descriptions } from 'antd'
import { createStyles } from 'antd-style'

const useStyles = createStyles(({ token }) => ({
  wrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: token.colorBgBase,
  },
  header: {
    'backgroundColor': token.colorBgBase,
    'borderBottom': `1px solid ${token.colorBorderSecondary}`,
    'padding': `${token.paddingLG}px`,
    '& h2': {
      margin: 0,
      fontSize: token.fontSizeXL,
      fontWeight: token.fontWeightStrong,
      color: token.colorText,
    },
    '& p': {
      margin: '8px 0 0',
      fontSize: token.fontSizeSM,
      color: token.colorTextSecondary,
    },
  },
  content: {
    flex: 1,
    padding: `${token.paddingLG}px`,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: token.paddingLG,
  },
}))

export default function RouteParamsA() {
  const { styles } = useStyles()
  const { openTab } = useControlTab()
  const { userInfo } = useUserStore()

  const handleJump = () => {
    const params = new URLSearchParams({
      nickName: userInfo?.nickName || userInfo?.username || '',
      email: userInfo?.email || '',
    })
    openTab({
      key: `/demo/route-params/detail?${params.toString()}`,
      label: '路由传参详情',
    })
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2>路由传参 - A 页面</h2>
        <p>点击按钮跳转到详情页，携带当前用户信息</p>
      </div>

      <div className={styles.content}>
        <Card title="当前用户信息">
          <Descriptions bordered column={1}>
            <Descriptions.Item label="昵称">
              {userInfo?.nickName || userInfo?.username || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              {userInfo?.email || 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="操作">
          <Button type="primary" size="large" onClick={handleJump}>
            跳转到详情页（携带用户信息）
          </Button>
        </Card>
      </div>
    </div>
  )
}

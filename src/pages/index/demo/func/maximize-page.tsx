import { FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons'
import { useMaximize } from '@zealous-admin/layout/index'
import { Button, Card, Space, Tag } from 'antd'
import { createStyles } from 'antd-style'

const useStyles = createStyles(({ token, css }) => ({
  wrapper: css`
    padding: 40px;
    max-width: 1200px;
    margin: 0 auto;
  `,
  header: css`
    text-align: center;
    margin-bottom: 48px;
  `,
  title: css`
    font-size: 32px;
    font-weight: 600;
    margin: 0 0 8px;
    color: ${token.colorTextHeading};
  `,
  desc: css`
    color: ${token.colorTextSecondary};
    margin: 0 0 24px;
  `,
  demoBox: css`
    background: ${token.colorFillContent};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    padding: 60px 20px;
    text-align: center;
    transition: all 0.3s;
  `,
  hint: css`
    color: ${token.colorTextSecondary};
    font-size: 14px;
    margin-top: 16px;
  `,
}))

export default function MaximizePage() {
  const { styles } = useStyles()
  const { isMaximize, enterMaximize, exitMaximize, toggleMaximize } = useMaximize()

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Tag style={{ marginBottom: 12, borderRadius: 99 }}>页面最大化</Tag>
        <h1 className={styles.title}>内容区全屏示例</h1>
        <p className={styles.desc}>
          点击下方按钮进入全屏模式，内容区将覆盖整个窗口，侧边栏和顶栏被遮罩
        </p>
        <Space>
          <Button
            type="primary"
            icon={<FullscreenOutlined />}
            onClick={enterMaximize}
          >
            进入全屏
          </Button>
          <Button
            icon={<FullscreenExitOutlined />}
            onClick={exitMaximize}
          >
            退出全屏
          </Button>
          <Button onClick={toggleMaximize}>
            切换全屏
          </Button>
        </Space>
      </div>

      <div className={styles.demoBox}>
        <p style={{ fontSize: 48, margin: 0 }}>
          {isMaximize ? '🔲' : '📄'}
        </p>
        <p style={{ fontSize: 18, fontWeight: 500, margin: '16px 0 8px' }}>
          当前状态：
          {isMaximize ? '全屏模式' : '正常模式'}
        </p>
        <p className={styles.hint}>
          {isMaximize
            ? '右上角退出按钮可返回正常模式，也可点击下方按钮退出'
            : '点击"进入全屏"按钮，内容区将铺满整个浏览器窗口'}
        </p>
      </div>
    </div>
  )
}

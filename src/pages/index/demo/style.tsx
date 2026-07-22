import {
  BgColorsOutlined,
  BulbOutlined,
  EyeOutlined,
  LayoutOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { useLayoutSetting } from '@zealous-admin/layout/index'
import { Button, Card, Space, Tag } from 'antd'
import { createStyles } from 'antd-style'

const useStyles = createStyles(({ token, css }) => ({
  container: css`
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
  description: css`
    color: ${token.colorTextSecondary};
    margin: 0 0 24px;
  `,
  cardGrid: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  `,
  cardContent: css`
    text-align: left;
    line-height: 1.6;
  `,
  iconBoxPrimary: css`
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: ${token.marginMD}px;
    background-color: ${token.colorPrimaryBg};
  `,
  cardTitle: css`
    font-size: 14px;
    font-weight: 500;
    color: ${token.colorText};
    margin: 0;
  `,
  cardDesc: css`
    margin: 0;
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  iconPrimary: css`
    color: ${token.colorPrimary};
    font-size: 18px;
  `,
  iconLogo: css`
    font-size: 14px;
    color: ${token.colorPrimary};
  `,
}))

export default function Style() {
  const { styles, theme } = useStyles()
  const { randomStyle } = useLayoutSetting()

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Tag
          icon={<BulbOutlined className={styles.iconLogo} />}
          style={{
            marginBottom: theme.marginMD,
            padding: '6px 12px',
            borderRadius: '99px',
          }}
        >
          风格实验室
        </Tag>
        <h1 className={styles.title}>随机切换风格</h1>
        <p className={styles.description}>
          一键体验框架的所有视觉风格组合，包括主题配色、菜单模式、圆角样式等
        </p>
        <Space>
          <Button type="primary" onClick={randomStyle}>
            立即切换
          </Button>
        </Space>
      </div>

      <div className={styles.cardGrid}>
        <Card>
          <div className={styles.cardContent}>
            <div className={styles.iconBoxPrimary}>
              <BgColorsOutlined className={styles.iconPrimary} />
            </div>
            <h3 className={styles.cardTitle}>多主题切换</h3>
            <p className={styles.cardDesc}>
              支持多配色主题，多种色彩方案随意切换
            </p>
          </div>
        </Card>

        <Card>
          <div className={styles.cardContent}>
            <div className={styles.iconBoxPrimary}>
              <MenuOutlined className={styles.iconPrimary} />
            </div>
            <h3 className={styles.cardTitle}>菜单模式</h3>
            <p className={styles.cardDesc}>
              侧边栏、顶部、精简等多种菜单布局模式
            </p>
          </div>
        </Card>

        <Card>
          <div className={styles.cardContent}>
            <div className={styles.iconBoxPrimary}>
              <LayoutOutlined className={styles.iconPrimary} />
            </div>
            <h3 className={styles.cardTitle}>灵活配置</h3>
            <p className={styles.cardDesc}>面包屑、标签栏等细节可自由调整</p>
          </div>
        </Card>

        <Card>
          <div className={styles.cardContent}>
            <div className={styles.iconBoxPrimary}>
              <EyeOutlined className={styles.iconPrimary} />
            </div>
            <h3 className={styles.cardTitle}>视觉风格</h3>
            <p className={styles.cardDesc}>亮色、暗色、紧凑等多种视觉样式</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

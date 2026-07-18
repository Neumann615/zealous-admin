import { Avatar, Card, Col, Form, InputNumber, Row, Select, Switch } from 'antd'
import { createStyles } from 'antd-style'
import { useState } from 'react'
import { Marquee } from './Marquee'

const directionOptions = [
  { label: '横向', value: 'horizontal' },
  { label: '竖向', value: 'vertical' },
]

const useStyles = createStyles(({ token, css }) => ({
  wrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: token.colorBgLayout,
  },
  header: {
    'backgroundColor': token.colorBgContainer,
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
    gap: `${token.paddingLG}px`,
  },
  demoArea: {
    flex: 1,
    maxHeight: '600px',
    overflow: 'hidden',
  },
  reviewCard: {
    padding: token.paddingSM,
    borderRadius: token.borderRadiusLG,
    width: 265,
    flexShrink: 0,
    backgroundColor: token.colorBgElevated,
    border: `1px solid ${token.colorBorderSecondary}`,
    boxSizing: 'border-box',
    height: 160,
  },
  reviewCardHover: {
    'cursor': 'pointer',
    '&:hover': {
      backgroundColor: token.colorBgTextHover,
    },
  },
  avatar: {
    width: 32,
    height: 32,
  },
  userName: {
    fontSize: token.fontSizeHeading5,
    fontWeight: token.fontWeightStrong,
    color: token.colorTextBase,
  },
  reviewContent: {
    fontSize: token.fontSize,
    color: token.colorTextSecondary,
    marginTop: token.marginXS,
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  specialDemo: {
    width: '80%',
    margin: '0 auto',
    height: 380,
    overflow: 'hidden',
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: `${token.borderRadiusLG}px`,
    position: 'relative',
  },
  gradientOverlayVertical: css`
        pointer-events: none;
        position: absolute;
        inset: 0;
        background: linear-gradient(to bottom, transparent 0%, transparent 30%, ${token.colorBgContainer} 100%);
    `,
}))

const reviews = [
  { name: 'w***@qq.com', content: '这套组件库的设计风格非常现代化，API 设计清晰易懂，文档也很详细，上手非常快。团队使用下来整体体验很棒，大大提升了开发效率，推荐给所有前端开发者使用。' },
  { name: 'z***@163.com', content: '组件质量很高，性能优化做得很好，在复杂场景下依然保持流畅的用户体验。特别是表格组件和表单组件，功能强大且易于定制，非常适合企业级应用开发。' },
  { name: 'l***@gmail.com', content: '非常喜欢这个组件库的设计系统，主题定制能力很强，很容易适配我们的产品风格。暗色模式和亮色模式切换流畅，动画效果精致，用户体验非常好。' },
  { name: 'm***@126.com', content: '团队协作效率提升很多，组件复用性强，大大减少了重复开发的工作量。代码结构清晰，易于维护，新成员能够快速上手，是一个非常成熟的组件库。' },
  { name: 'k***@aliyun.com', content: '技术支持响应及时，社区活跃，遇到问题能很快找到解决方案。更新频率稳定，bug修复及时，是一个值得信赖的开源项目。' },
  { name: 's***@msn.com', content: 'TypeScript 类型定义非常完善，开发体验很好，减少了很多类型错误。智能提示准确，类型安全有保障，强烈推荐 TypeScript 项目使用。' },
  { name: 'h***@qq.com', content: '移动端适配做得很棒，响应式设计让我们的应用在各种设备上都有很好的表现。无论是手机、平板还是桌面端，都能提供一致的用户体验。' },
  { name: 'g***@hotmail.com', content: '组件的可访问性做得很好，符合 WCAG 标准，对我们的无障碍需求支持很到位。键盘导航、屏幕阅读器支持都很完善，是一个负责任的组件库。' },
]

export function MarqueeDemo() {
  const { styles } = useStyles()
  const [duration, setDuration] = useState(30)
  const [gap, setGap] = useState(16)
  const [repeat, setRepeat] = useState(2)
  const [reverse, setReverse] = useState(false)
  const [pauseOnHover, setPauseOnHover] = useState(false)
  const [gradient, setGradient] = useState(true)
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal')
  const [renderKey, setRenderKey] = useState(0)

  const forceUpdate = () => setRenderKey(prev => prev + 1)

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2>跑马灯</h2>
        <p>ZaMarquee</p>
      </div>

      <div className={styles.content}>
        <Card>
          <Form layout="vertical">
            <Row gutter={24}>
              <Col span={6}>
                <Form.Item label="动画时长 (秒)">
                  <InputNumber
                    value={duration}
                    onChange={(v) => {
                      setDuration(v || 30)
                      forceUpdate()
                    }}
                    min={5}
                    max={120}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="子项间距 (px)">
                  <InputNumber
                    value={gap}
                    onChange={(v) => {
                      setGap(v || 16)
                      forceUpdate()
                    }}
                    min={8}
                    max={40}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="重复次数">
                  <InputNumber
                    value={repeat}
                    onChange={(v) => {
                      setRepeat(v || 2)
                      forceUpdate()
                    }}
                    min={2}
                    max={5}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="滚动方向">
                  <Select
                    value={direction}
                    onChange={(v) => {
                      setDirection(v)
                      forceUpdate()
                    }}
                    options={directionOptions}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="反向滚动">
                  <Switch
                    checked={reverse}
                    onChange={(v) => {
                      setReverse(v)
                      forceUpdate()
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="悬停暂停">
                  <Switch
                    checked={pauseOnHover}
                    onChange={(v) => {
                      setPauseOnHover(v)
                      forceUpdate()
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="渐变蒙层">
                  <Switch
                    checked={gradient}
                    onChange={(v) => {
                      setGradient(v)
                      forceUpdate()
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <div className={styles.demoArea}>
            <Marquee
              key={renderKey}
              duration={duration}
              gap={gap}
              repeat={repeat}
              direction={direction}
              reverse={reverse}
              pauseOnHover={pauseOnHover}
              gradient={gradient}
            >
              {reviews.map((review, index) => (
                <div key={index} className={`${styles.reviewCard} ${styles.reviewCardHover}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar
                      className={styles.avatar}
                      src={`https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${review.name}`}
                    />
                    <span className={styles.userName}>{review.name}</span>
                  </div>
                  <p className={styles.reviewContent}>{review.content}</p>
                </div>
              ))}
            </Marquee>
          </div>
        </Card>
        <Card title="特殊示例">
          <div className={styles.specialDemo}>
            <div>
              {Array.from({ length: 4 }, (_, i) => (
                <Marquee
                  key={i}
                  pauseOnHover={false}
                  reverse={i % 2 === 0}
                  repeat={4}
                  duration={110}
                  gradient={false}
                  style={{
                    transform: `translateY(${(i - 1) * 4.5 - 10}rem) rotate(-16deg)`,
                    width: '150%',
                    margin: '-48px',
                  }}
                >
                  {(i % 2 === 0 ? reviews.slice(0, 4) : reviews.slice(4)).map((review, index) => (
                    <div key={index} className={styles.reviewCard}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar
                          className={styles.avatar}
                          src={`https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${review.name}`}
                        />
                        <span className={styles.userName}>{review.name}</span>
                      </div>
                      <p className={styles.reviewContent}>{review.content}</p>
                    </div>
                  ))}
                </Marquee>
              ))}
            </div>
            <div className={styles.gradientOverlayVertical}></div>
          </div>
        </Card>
      </div>
    </div>
  )
}

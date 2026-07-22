import {
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
} from 'antd'
import { createStyles } from 'antd-style'
import { useState } from 'react'
import { SparklesText } from './SparklesText'

type SparkleShape = 'star' | 'four-point-star' | 'flower'
type AnimationSpeed = 'fast' | 'medium' | 'slow'

const shapeOptions = [
  { label: '四角星', value: 'four-point-star' },
  { label: '五角星', value: 'star' },
  { label: '花朵', value: 'flower' },
]

const speedOptions = [
  { label: '快速', value: 'fast' },
  { label: '中等', value: 'medium' },
  { label: '慢速', value: 'slow' },
]

const useStyles = createStyles(({ token }) => ({
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
  },
  demoArea: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: token.colorBgLayout,
    borderRadius: token.borderRadiusLG,
    marginTop: token.marginLG,
    padding: token.paddingLG,
    minHeight: 200,
  },
}))

export function SparklesTextDemo() {
  const { styles } = useStyles()
  const [text, setText] = useState('Zealous-admin是一套好用的后台管理系统模板')
  const [fontSize, setFontSize] = useState(36)
  const [shapes, setShapes] = useState<SparkleShape[]>(['four-point-star'])
  const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>('fast')
  const [renderKey, setRenderKey] = useState(0)

  const forceUpdate = () => setRenderKey(prev => prev + 1)

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2>闪烁文字</h2>
        <p>ZaSparklesText</p>
      </div>

      <div className={styles.content}>
        <Card>
          <Form layout="vertical">
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="文本内容">
                  <Input
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value)
                      forceUpdate()
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="字体大小 (px)">
                  <InputNumber
                    value={fontSize}
                    onChange={(v) => {
                      setFontSize(v || 30)
                      forceUpdate()
                    }}
                    min={12}
                    max={100}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="动画速度">
                  <Select
                    value={animationSpeed}
                    onChange={(v) => {
                      setAnimationSpeed(v)
                      forceUpdate()
                    }}
                    options={speedOptions}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="形状类型">
                  <Checkbox.Group
                    options={shapeOptions}
                    value={shapes}
                    onChange={(values) => {
                      setShapes(values as SparkleShape[])
                      forceUpdate()
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <div className={styles.demoArea}>
            <SparklesText
              key={renderKey}
              text={text}
              fontSize={fontSize}
              shapes={shapes}
              animationSpeed={animationSpeed}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}

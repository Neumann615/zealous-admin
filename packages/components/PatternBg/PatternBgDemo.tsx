import type { AnimationDirection, MaskDirection, PatternType } from './PatternBg'
import {
  Card,
  Col,
  Form,
  InputNumber,
  Row,
  Select,
} from 'antd'
import { createStyles } from 'antd-style'
import { useState } from 'react'
import { PatternBg } from './PatternBg'

const patternOptions = [
  { label: '网格', value: 'grid' },
  { label: '圆点', value: 'dot' },
]

const animationOptions = [
  { label: '向上', value: 'up' },
  { label: '向下', value: 'down' },
  { label: '向左', value: 'left' },
  { label: '向右', value: 'right' },
  { label: '无', value: 'none' },
]

const maskOptions = [
  { label: '全部', value: 'all' },
  { label: '顶部', value: 'top' },
  { label: '底部', value: 'bottom' },
  { label: '左侧', value: 'left' },
  { label: '右侧', value: 'right' },
  { label: '上下', value: 'top-bottom' },
  { label: '左右', value: 'left-right' },
  { label: '无', value: 'none' },
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
    borderRadius: token.borderRadiusLG,
    height: 500,
  },
  card: {
    backgroundColor: token.colorBgContainer,
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${token.colorBorder}`,
    boxShadow: token.boxShadowSecondary,
    padding: token.paddingLG,
    textAlign: 'center',
  },
}))

export function PatternBgDemo() {
  const { styles } = useStyles()
  const [pattern, setPattern] = useState<PatternType>('grid')
  const [size, setSize] = useState(24)
  const [animationDirection, setAnimationDirection] = useState<AnimationDirection>('up')
  const [maskDirection, setMaskDirection] = useState<MaskDirection>('all')
  const [opacity, setOpacity] = useState(0.5)

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2>图案背景</h2>
        <p>ZaPatternBg</p>
      </div>

      <div className={styles.content}>
        <Card>
          <Form>
            <Row gutter={24}>
              <Col>
                <Form.Item label="图案类型">
                  <Select
                    value={pattern}
                    onChange={v => setPattern(v)}
                    options={patternOptions}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col>
                <Form.Item label="图案尺寸 (px)">
                  <InputNumber
                    value={size}
                    onChange={v => setSize(v || 24)}
                    min={8}
                    max={64}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col>
                <Form.Item label="透明度">
                  <InputNumber
                    value={opacity}
                    onChange={v => setOpacity(v || 0.5)}
                    min={0}
                    max={1}
                    step={0.1}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col>
                <Form.Item label="动画方向">
                  <Select
                    value={animationDirection}
                    onChange={v => setAnimationDirection(v)}
                    options={animationOptions}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col>
                <Form.Item label="遮罩方向">
                  <Select
                    value={maskDirection}
                    onChange={v => setMaskDirection(v)}
                    options={maskOptions}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <div className={styles.demoArea}>
            <PatternBg
              pattern={pattern}
              size={size}
              animationDirection={animationDirection}
              maskDirection={maskDirection}
              opacity={opacity}
            >
            </PatternBg>
          </div>
        </Card>
      </div>
    </div>
  )
}
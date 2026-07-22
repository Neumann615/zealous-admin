import { Card, Col, ColorPicker, Form, Input, InputNumber, Row, Select } from 'antd'
import { createStyles } from 'antd-style'
import { useState } from 'react'
import { ShinyText } from './ShinyText'

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

export function ShinyTextDemo() {
  const { styles } = useStyles()
  const [text, setText] = useState('Zealous-admin是一套好用的后台管理系统模板')
  const [fontSize, setFontSize] = useState(36)
  const [speed, setSpeed] = useState<'slow' | 'medium' | 'fast'>('medium')
  const [shinyColor, setShinyColor] = useState<string | undefined>(undefined)
  const [textColor, setTextColor] = useState<string | undefined>(undefined)
  const [renderKey, setRenderKey] = useState(0)

  const forceUpdate = () => setRenderKey(prev => prev + 1)

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2>流光文字</h2>
        <p>ZaShinyText</p>
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
                      setFontSize(v || 24)
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
                    value={speed}
                    onChange={(v) => {
                      setSpeed(v)
                      forceUpdate()
                    }}
                    options={speedOptions}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="文本颜色">
                  <ColorPicker
                    value={textColor}
                    onChange={(c) => {
                      setTextColor(c.toHexString())
                      forceUpdate()
                    }}
                    showText
                    allowClear
                    onClear={() => {
                      setTextColor(undefined)
                      forceUpdate()
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="流光颜色">
                  <ColorPicker
                    value={shinyColor}
                    onChange={(c) => {
                      setShinyColor(c.toHexString())
                      forceUpdate()
                    }}
                    showText
                    allowClear
                    onClear={() => {
                      setShinyColor(undefined)
                      forceUpdate()
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <div className={styles.demoArea}>
            <ShinyText
              key={renderKey}
              text={text}
              fontSize={fontSize}
              speed={speed}
              shinyColor={shinyColor}
              textColor={textColor}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}

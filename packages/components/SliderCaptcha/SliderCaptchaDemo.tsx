import {
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
} from 'antd'
import { createStyles } from 'antd-style'
import { useState } from 'react'
import { SliderCaptcha } from './SliderCaptcha'

type CaptchaType = 'slider' | 'embed' | 'float'

const typeOptions = [
  { label: '纯滑块验证', value: 'slider' },
  { label: '拼图验证', value: 'embed' },
  { label: '触发式拼图验证', value: 'float' },
]

const typeLabels: Record<CaptchaType, string> = {
  slider: '纯滑块验证',
  embed: '拼图验证',
  float: '触发式拼图验证',
}

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
  demoArea: {
    backgroundColor: token.colorBgLayout,
    borderRadius: token.borderRadiusLG,
    padding: token.paddingLG,
    height: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
}))

export function SliderCaptchaDemo() {
  const { styles } = useStyles()
  const [captchaType, setCaptchaType] = useState<CaptchaType>('float')
  const [width, setWidth] = useState(384)
  const [height, setHeight] = useState(216)
  const [defaultTip, setDefaultTip] = useState('请按住滑块，拖动到最右边')
  const [successTip, setSuccessTip] = useState('验证成功')
  const [errorTip, setErrorTip] = useState('验证失败，请重新操作')
  const [renderKey, setRenderKey] = useState(0)
  const [messageApi, contextHolder] = message.useMessage()

  const handleVerify = (success: boolean) => {
    if (success) {
      messageApi.success(`${typeLabels[captchaType]}验证成功`)
    }
    else {
      messageApi.error(`${typeLabels[captchaType]}验证失败，请重试`)
    }
  }

  const handleConfigChange = () => {
    setRenderKey(prev => prev + 1)
  }

  return (
    <div className={styles.wrapper}>
      {contextHolder}
      <div className={styles.header}>
        <h2>滑块验证</h2>
        <p>ZSliderCaptcha</p>
      </div>
      <div className={styles.content}>
        <Card>
          <Row gutter={24}>
            {/* 左侧：表单配置 */}
            <Col span={12}>
              <Form layout="vertical">
                <Form.Item label="验证类型">
                  <Select
                    value={captchaType}
                    onChange={(v) => {
                      setCaptchaType(v as CaptchaType)
                      handleConfigChange()
                    }}
                    options={typeOptions}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="背景宽度 (px)">
                      <InputNumber
                        value={width}
                        onChange={(v) => {
                          setWidth(v || 384)
                          handleConfigChange()
                        }}
                        min={200}
                        max={500}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="背景高度 (px)">
                      <InputNumber
                        value={height}
                        onChange={(v) => {
                          setHeight(v || 216)
                          handleConfigChange()
                        }}
                        min={100}
                        max={300}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="默认提示">
                  <Input
                    value={defaultTip}
                    onChange={(e) => {
                      setDefaultTip(e.target.value)
                      handleConfigChange()
                    }}
                  />
                </Form.Item>
                <Form.Item label="成功提示">
                  <Input
                    value={successTip}
                    onChange={(e) => {
                      setSuccessTip(e.target.value)
                      handleConfigChange()
                    }}
                  />
                </Form.Item>
                <Form.Item label="失败提示">
                  <Input
                    value={errorTip}
                    onChange={(e) => {
                      setErrorTip(e.target.value)
                      handleConfigChange()
                    }}
                  />
                </Form.Item>
              </Form>
            </Col>

            {/* 右侧：演示区域 */}
            <Col span={12}>
              <div className={styles.demoArea}>
                <SliderCaptcha
                  key={renderKey}
                  type={captchaType}
                  bgSize={{ width, height }}
                  tipText={{
                    default: defaultTip,
                    success: successTip,
                    error: errorTip,
                  }}
                  onVerify={handleVerify}
                />
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  )
}

import { ZaSparklesText } from '@zealous-admin/components/index'
import { BorderBeam, Button, Card, Col, Row, Space, Typography } from 'antd'

const { Title, Paragraph, Text } = Typography

const featureScenarios = [
  {
    title: '小型公司',
    desc: '让后端开发人员能在短时间内转型成为全栈开发',
  },
  {
    title: '中小型公司',
    desc: '提高项目开发效率，减轻前端开发人员工作压力',
  },
  {
    title: '项目型公司',
    desc: '应对绝大部分甲方需求，实现高度定制化',
  },
  {
    title: '产品型公司',
    desc: '完善的开发文档和代码注释，为产品保驾护航',
  },
]

export default function HomePage() {
  return (
    <div className="w-full sm:w-[100%] md:w-[100%] lg:w-[80%] xl:w-[70%] mx-auto px-6 py-6">
      <BorderBeam lineWidth={2}>
        <Card>
          <Text type="secondary" className="font-mono" style={{ fontSize: 14, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>
            TypeScript · React 19.2 · Vite 8 · Antd 6 · Tailwindcss
          </Text>
          <Title level={2} style={{ marginTop: 8, marginBottom: 0, lineHeight: 1.3 }}>
            欢迎使用
          </Title>
          <ZaSparklesText text="Zealous-admin" fontSize={60}></ZaSparklesText>
          <Paragraph style={{ marginBottom: 16 }}>
            这是一款开箱即用的 React 管理系统框架，为中后台项目开发提供完整解决方案。
          </Paragraph>
          <Space size="middle">
            <Button type="primary">
              开发文档
            </Button>
            <Button>
              代码仓库
            </Button>
          </Space>
        </Card>
      </BorderBeam>

      <div style={{ marginTop: 32, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ width: 4, height: 16, background: '#1677ff', borderRadius: 2, marginRight: 8 }} />
          <Text style={{ fontSize: 16, fontWeight: 600 }}>应用场景</Text>
        </div>
        <Row gutter={[16, 16]} align="stretch">
          {featureScenarios.map((scenario, index) => (
            <Col key={index} xs={24} sm={12} lg={6}>
              <Card style={{ height: '100%' }}>
                <Text style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 4 }}>{scenario.title}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{scenario.desc}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

    </div>
  )
}

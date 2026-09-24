import type { ArchitectureModule, ArchitectureResponse, DatabaseTable } from '@/apis/systemArchitecture'
import {
  ApartmentOutlined,
  ApiOutlined,
  ClusterOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Button, Card, Col, Descriptions, Drawer, Empty, Row, Space, Spin, Statistic, Table, Tag, Typography } from 'antd'
import { createStyles } from 'antd-style'
import { useEffect, useState } from 'react'
import { getSystemArchitectureAPI } from '@/apis/systemArchitecture'

const { Paragraph, Text } = Typography

const useStyles = createStyles(({ token, css }) => ({
  page: css`
    display: grid;
    gap: ${token.marginMD}px;
  `,
  header: css`
    background: linear-gradient(120deg, ${token.colorPrimaryBg}, ${token.colorBgContainer});
  `,
  headerMain: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: ${token.marginSM}px;
    flex-wrap: wrap;
  `,
  headerTitle: css`
    display: flex;
    align-items: center;
    gap: ${token.marginSM}px;
    margin: 0;
  `,
  headerIcon: css`
    width: 38px;
    height: 38px;
    border-radius: ${token.borderRadiusLG}px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorPrimary};
    background: ${token.colorBgContainer};
    box-shadow: ${token.boxShadowTertiary};
  `,
  metricGrid: css`
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: ${token.marginSM}px;

    @media (max-width: 1200px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    @media (max-width: 720px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  `,
  metric: css`
    .ant-statistic-content-value {
      font-size: ${token.fontSizeLG}px;
    }
  `,
  architectureGrid: css`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: ${token.marginSM}px;

    @media (max-width: 1200px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (max-width: 820px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `,
  moduleStack: css`
    display: grid;
    gap: ${token.marginSM}px;
  `,
  module: css`
    padding: ${token.paddingSM}px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
    background: ${token.colorFillQuaternary};
  `,
  moduleTitle: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: ${token.marginXS}px;
    margin-bottom: ${token.marginXXS}px;
  `,
  moduleText: css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    line-height: 1.5;
    margin: 0;
  `,
  codeText: css`
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
  `,
  flowStack: css`
    display: grid;
    gap: ${token.marginXS}px;
  `,
  flowItem: css`
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr);
    gap: ${token.marginXS}px;
    align-items: start;
  `,
  flowDot: css`
    width: 9px;
    height: 9px;
    margin: 7px auto;
    border-radius: 50%;
    background: ${token.colorPrimary};
    box-shadow: 0 0 0 3px ${token.colorPrimaryBg};
  `,
  flowRail: css`
    width: 1px;
    min-height: 16px;
    margin: auto;
    background: ${token.colorBorderSecondary};
  `,
  domainGrid: css`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: ${token.marginSM}px;

    @media (max-width: 1400px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (max-width: 720px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `,
  domainCard: css`
    height: 100%;
  `,
  designPoint: css`
    position: relative;
    margin: 0 0 ${token.marginXXS}px;
    padding-left: 12px;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    line-height: 1.5;

    &::before {
      position: absolute;
      top: 7px;
      left: 0;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: ${token.colorPrimary};
      content: '';
    }
  `,
  tableChip: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    text-align: left;
  `,
  relation: css`
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
  `,
}))

interface ModuleStyles {
  moduleStack: string
  module: string
  moduleTitle: string
  moduleText: string
  codeText: string
}

function ModuleList({ modules, classes }: { modules: ArchitectureModule[], classes: ModuleStyles }) {
  return (
    <div className={classes.moduleStack}>
      {modules.map(module => (
        <section key={module.name} className={classes.module}>
          <div className={classes.moduleTitle}>
            <Text strong>{module.name}</Text>
            <Tag color="processing">{module.layer}</Tag>
          </div>
          <Paragraph className={classes.moduleText}>{module.responsibility}</Paragraph>
          <Space size={[4, 4]} wrap>
            {module.dependencies.map(dependency => <Tag key={dependency}>{dependency}</Tag>)}
          </Space>
          <div className={classes.codeText}>{module.keyFiles.join('  ·  ')}</div>
        </section>
      ))}
    </div>
  )
}

export default function SystemArchitecturePage() {
  const { styles, theme } = useStyles()
  const [loading, setLoading] = useState(false)
  const [architecture, setArchitecture] = useState<ArchitectureResponse | null>(null)
  const [activeTable, setActiveTable] = useState<DatabaseTable | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const response = await getSystemArchitectureAPI()
      setArchitecture(response.data)
    }
    catch {
      // HTTP 拦截器已统一提示
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const apiColumns = [
    { title: '模块', dataIndex: 'name', width: 220 },
    { title: '路由前缀', dataIndex: 'routePrefix', width: 130, render: (value: string) => <Text code>{value}</Text> },
    { title: '接口数', dataIndex: 'endpointCount', width: 90, align: 'right' as const },
    { title: '权限数', dataIndex: 'permissionCount', width: 90, align: 'right' as const },
  ]

  return (
    <div className={styles.page}>
      <Card className={styles.header} loading={loading && !architecture}>
        <div className={styles.headerMain}>
          <Space direction="vertical" size={4}>
            <div className={styles.headerTitle}>
              <span className={styles.headerIcon}><ClusterOutlined /></span>
              <Typography.Title level={4}>系统架构驾驶舱</Typography.Title>
            </div>
            <Paragraph type="secondary" style={{ margin: 0 }}>
              数据库结构实时来自 SQLite，接口权限实时复用后端权限映射；模块职责为当前代码的架构契约。
            </Paragraph>
          </Space>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            刷新
          </Button>
        </div>
      </Card>

      {architecture && (
        <div className={styles.metricGrid}>
          <Card className={styles.metric}><Statistic title="前端模块" value={architecture.overview.frontendModules} prefix={<ApartmentOutlined />} /></Card>
          <Card className={styles.metric}><Statistic title="后端模块" value={architecture.overview.backendModules} prefix={<DeploymentUnitOutlined />} /></Card>
          <Card className={styles.metric}><Statistic title="数据表" value={architecture.overview.dataTables} prefix={<DatabaseOutlined />} /></Card>
          <Card className={styles.metric}><Statistic title="接口" value={architecture.overview.apiCount} prefix={<ApiOutlined />} /></Card>
          <Card className={styles.metric}><Statistic title="权限标识" value={architecture.overview.permissionCount} /></Card>
        </div>
      )}

      <div className={styles.architectureGrid}>
        <Card title="前端模块分层" size="small">
          {architecture && <ModuleList modules={architecture.frontendModules} classes={styles} />}
        </Card>
        <Card title="核心请求链路" size="small">
          <div className={styles.flowStack}>
            {architecture?.requestFlow.map((node, index) => (
              <div key={node.stage} className={styles.flowItem}>
                <div>
                  {index > 0 && <div className={styles.flowRail} />}
                  <div className={styles.flowDot} />
                </div>
                <div>
                  <Text strong>{node.stage}</Text>
                  <Tag style={{ marginLeft: theme.marginXS }}>{node.owner}</Tag>
                  <Paragraph className={styles.moduleText}>{node.responsibility}</Paragraph>
                  <Text className={styles.relation}>{node.guarantee}</Text>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="后端模块分层" size="small">
          {architecture && <ModuleList modules={architecture.backendModules} classes={styles} />}
        </Card>
      </div>

      <Card title="数据库业务域设计" size="small">
        {architecture
          ? (
              <Row gutter={[12, 12]}>
                {architecture.databaseDomains.map(domain => (
                  <Col key={domain.code} xxl={6} xl={8} lg={12} xs={24}>
                    <Card className={styles.domainCard} size="small" title={domain.name} extra={<Tag>{domain.tables.length} 表</Tag>}>
                      <Paragraph className={styles.moduleText}>{domain.description}</Paragraph>
                      {domain.designPoints.map(point => <Paragraph key={point} className={styles.designPoint}>{point}</Paragraph>)}
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        {domain.tables.map(table => (
                          <Button key={table.name} block size="small" onClick={() => setActiveTable(table)}>
                            <span className={styles.tableChip}>
                              <span>{table.name}</span>
                              <span className={styles.relation}>{table.columns.length} 字段</span>
                            </span>
                          </Button>
                        ))}
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            )
          : <Spin />}
      </Card>

      <Card title="接口权限矩阵" size="small">
        <Table
          rowKey="routePrefix"
          size="small"
          columns={apiColumns}
          dataSource={architecture?.apiMatrix ?? []}
          loading={loading}
          pagination={false}
          expandable={{
            expandedRowRender: module => (
              <Table
                rowKey={endpoint => `${endpoint.method}-${endpoint.path}`}
                size="small"
                pagination={false}
                dataSource={module.endpoints}
                columns={[
                  { title: '方法', dataIndex: 'method', width: 80, render: value => <Tag color={value === 'GET' ? 'blue' : 'green'}>{value}</Tag> },
                  { title: '路径', dataIndex: 'path', render: value => <Text code>{value}</Text> },
                  { title: '所需权限', dataIndex: 'permissions', render: (values: string[]) => <Space size={4} wrap>{values.map(item => <Tag key={item} color="gold">{item}</Tag>)}</Space> },
                ]}
              />
            ),
          }}
        />
      </Card>

      <Drawer
        title={activeTable?.name}
        open={Boolean(activeTable)}
        width={760}
        onClose={() => setActiveTable(null)}
      >
        {activeTable && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label="职责" span={2}>{activeTable.description}</Descriptions.Item>
              <Descriptions.Item label="字段数">{activeTable.columns.length}</Descriptions.Item>
              <Descriptions.Item label="索引数">{activeTable.indexes.length}</Descriptions.Item>
            </Descriptions>
            <Card title="字段" size="small">
              <Table
                rowKey="name"
                size="small"
                pagination={false}
                dataSource={activeTable.columns}
                columns={[
                  { title: '字段', dataIndex: 'name', render: value => <Text code>{value}</Text> },
                  { title: '类型', dataIndex: 'type', width: 100 },
                  { title: '可空', dataIndex: 'nullable', width: 80, render: value => <Tag color={value ? 'default' : 'red'}>{value ? '是' : '否'}</Tag> },
                  { title: '默认值', dataIndex: 'defaultValue', width: 100, render: value => value ?? '-' },
                  { title: '主键', dataIndex: 'primaryKey', width: 70, render: value => value ? <Tag color="blue">PK</Tag> : '-' },
                ]}
              />
            </Card>
            <Card title="索引与约束" size="small">
              {activeTable.indexes.length === 0 && activeTable.foreignKeys.length === 0
                ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无显式索引 / 外键" />
                : (
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      {activeTable.indexes.map(index => (
                        <div key={index.name}>
                          <Text code>{index.name}</Text>
                          <Space size={4} wrap style={{ marginLeft: theme.marginXS }}>
                            {index.unique && <Tag color="purple">唯一</Tag>}
                            {index.partial && <Tag color="cyan">部分索引</Tag>}
                            <Tag>{index.origin}</Tag>
                          </Space>
                          <div className={styles.relation}>{index.columns.join(', ')}</div>
                        </div>
                      ))}
                      {activeTable.foreignKeys.map(key => (
                        <div key={`${key.column}-${key.referenceTable}`}>
                          <Text code>{`${activeTable.name}.${key.column} → ${key.referenceTable}.${key.referenceColumn}`}</Text>
                          <div className={styles.relation}>{`onDelete: ${key.onDelete ?? 'NO ACTION'} / onUpdate: ${key.onUpdate ?? 'NO ACTION'}`}</div>
                        </div>
                      ))}
                    </Space>
                  )}
            </Card>
          </Space>
        )}
      </Drawer>
    </div>
  )
}

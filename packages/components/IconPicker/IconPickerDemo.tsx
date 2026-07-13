import type { IconLibraryKey } from './IconPicker'
import { Button, Card, Checkbox, Col, Form, Input, Row, Select } from 'antd'
import { createStyles } from 'antd-style'
import { useState } from 'react'
import { Icon } from './Icon'
import { IconPicker } from './IconPicker'

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
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: token.colorBgLayout,
    borderRadius: token.borderRadiusLG,
    padding: `${token.paddingLG}px`,
    gap: token.paddingLG,
    height: '100%',
  },
  selectedValue: {
    fontSize: token.fontSizeSM,
    color: token.colorTextSecondary,
    wordBreak: 'break-all',
    textAlign: 'center',
    maxWidth: '100%',
  },
}))

const libraryOptions = [
  { key: 'ai', label: 'Ant Design Icons' },
  { key: 'bs', label: 'Bootstrap Icons' },
  { key: 'bi', label: 'BoxIcons' },
  { key: 'ci', label: 'Circum Icons' },
  { key: 'cg', label: 'css.gg' },
  { key: 'di', label: 'Devicons' },
  { key: 'fi', label: 'Feather' },
  { key: 'fc', label: 'Flat Color Icons' },
  { key: 'fa', label: 'Font Awesome 5' },
  { key: 'fa6', label: 'Font Awesome 6' },
  { key: 'gi', label: 'Game Icons' },
  { key: 'go', label: 'GitHub Octicons' },
  { key: 'gr', label: 'Grommet Icons' },
  { key: 'hi', label: 'Heroicons' },
  { key: 'hi2', label: 'Heroicons 2' },
  { key: 'im', label: 'IcoMoon Free' },
  { key: 'lia', label: 'Icons8 Line Awesome' },
  { key: 'io', label: 'Ionicons 4' },
  { key: 'io5', label: 'Ionicons 5' },
  { key: 'lu', label: 'Lucide' },
  { key: 'md', label: 'Material Design' },
  { key: 'pi', label: 'Phosphor Icons' },
  { key: 'rx', label: 'Radix Icons' },
  { key: 'ri', label: 'Remix Icons' },
  { key: 'si', label: 'Simple Icons' },
  { key: 'sl', label: 'Simple Line Icons' },
  { key: 'tb', label: 'Tabler Icons' },
  { key: 'tfi', label: 'Themify Icons' },
  { key: 'ti', label: 'Typicons' },
  { key: 'vsc', label: 'VS Code Icons' },
  { key: 'wi', label: 'Weather Icons' },
]

export function IconPickerDemo() {
  const { styles } = useStyles()
  const [selectedIcon, setSelectedIcon] = useState<string | undefined>(undefined)
  const [library, setLibrary] = useState<IconLibraryKey[]>(['ai', 'bs', 'wi', 'fi', 'fc'])
  const [clearable, setClearable] = useState(false)
  const [placeholder, setPlaceholder] = useState('请选择图标')
  const [renderKey, setRenderKey] = useState(0)

  const forceUpdate = () => setRenderKey(prev => prev + 1)

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2>图标选择器</h2>
        <p>ZIconPicker</p>
      </div>

      <div className={styles.content}>
        <Card>
          <Row gutter={24} style={{ height: '100%' }}>
            <Col span={10}>
              <Form layout="vertical">
                <Form.Item label="图标库">
                  <Select
                    mode="multiple"
                    value={library}
                    onChange={(v) => {
                      setLibrary(v)
                      forceUpdate()
                    }}
                    options={libraryOptions.map(opt => ({
                      label: opt.label,
                      value: opt.key,
                    }))}
                    style={{ width: '100%' }}
                    placeholder="请选择图标库"
                    maxTagCount="responsive"
                  />
                </Form.Item>
                <Form.Item label="占位提示">
                  <Input
                    value={placeholder}
                    onChange={(e) => {
                      setPlaceholder(e.target.value)
                      forceUpdate()
                    }}
                  />
                </Form.Item>
                <Form.Item label="可清除">
                  <Checkbox
                    checked={clearable}
                    onChange={(e) => {
                      setClearable(e.target.checked)
                      forceUpdate()
                    }}
                  />
                </Form.Item>
              </Form>
            </Col>
            <Col span={14}>
              <div className={styles.demoArea}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <IconPicker
                    key={`default-${renderKey}`}
                    value={selectedIcon}
                    onChange={setSelectedIcon}
                    library={library}
                    clearable={clearable}
                    placeholder={placeholder}
                  />
                  <IconPicker
                    key={`custom-${renderKey}`}
                    value={selectedIcon}
                    onChange={setSelectedIcon}
                    library={library}
                    clearable={clearable}
                  >
                    <Button type="primary" icon={selectedIcon ? <Icon value={selectedIcon} /> : null}>
                      选择图标
                    </Button>
                  </IconPicker>
                  {selectedIcon && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className={styles.selectedValue}>
                        选中值:
                        {' '}
                        <code>{selectedIcon}</code>
                      </div>
                      <Icon value={selectedIcon} />
                    </div>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  )
}

import { Form } from 'antd'
import { createStyles } from 'antd-style'
import { buildFormProps } from '../renderer/formProps'
import { CanvasItem } from './CanvasItem'
import { DropGap } from './DropGap'
import { useDesignerStore } from './store'

const useStyles = createStyles(({ token, css }) => ({
  canvas: css`
    width: 100%;
    min-height: 100%;
    display: flex;
    flex-direction: column;
    background: ${token.colorBgContainer};
    border-radius: ${token.borderRadiusLG}px;
    padding: ${token.paddingLG}px;
    box-shadow: ${token.boxShadowTertiary};
  `,
  empty: css`
    flex: 1;
    display: flex;
    min-height: 300px;

    /* 空态落点撑满整块画布：外层只做布局，虚线框与拖拽高亮交给 DropGap */
    & > div {
      flex: 1;
      height: auto;
      border-radius: ${token.borderRadiusLG}px;
    }
  `,
}))

export function Canvas() {
  const { styles } = useStyles()
  const schema = useDesignerStore(s => s.schema)
  const select = useDesignerStore(s => s.select)

  return (
    <div className={styles.canvas} onClick={() => select(null)}>
      <Form component={false} {...buildFormProps(schema.form)}>
        {schema.children.length === 0
          ? (
              <div className={styles.empty}>
                <DropGap parentId={null} index={0} empty />
              </div>
            )
          : (
              <>
                {schema.children.map((c, i) => (
                  <span key={c.id} style={{ display: 'contents' }}>
                    <DropGap parentId={null} index={i} />
                    <CanvasItem node={c} />
                  </span>
                ))}
                <DropGap parentId={null} index={schema.children.length} />
              </>
            )}
      </Form>
    </div>
  )
}

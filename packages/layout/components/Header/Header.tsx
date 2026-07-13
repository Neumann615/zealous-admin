import { createStyles } from 'antd-style'
import { useTopBarStore } from '../../store/topBar'
import { TabBar } from '../TabBar/TabBar'
import { Toolbar } from '../Toolbar/Toolbar'

const useStyles = createStyles(() => ({
  header: {
    width: '100%',
    height: 'auto',
    boxSizing: 'border-box',
  },
}))

export function Header() {
  const topBarStore = useTopBarStore()
  const { styles } = useStyles()
  return (
    <div className={styles.header}>
      {topBarStore.order.map((item: string, index: number) => {
        if (item === 'TabBar') {
          return <TabBar key={index} />
        }
        else if (item === 'Toolbar') {
          return <Toolbar key={index} />
        }
        return null
      })}
    </div>
  )
}
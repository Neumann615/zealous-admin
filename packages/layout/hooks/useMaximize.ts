import { usePageStore } from '../store/page'

export function useMaximize() {
  const isMaximize = usePageStore((state: any) => state.isMaximize)
  const enterMaximize = usePageStore((state: any) => state.enterMaximize)
  const exitMaximize = usePageStore((state: any) => state.exitMaximize)
  const toggleMaximize = usePageStore((state: any) => state.changeIsMaximize)

  return {
    /** 是否处于全屏状态 */
    isMaximize,
    /** 进入全屏 */
    enterMaximize,
    /** 退出全屏 */
    exitMaximize,
    /** 切换全屏 */
    toggleMaximize,
  }
}

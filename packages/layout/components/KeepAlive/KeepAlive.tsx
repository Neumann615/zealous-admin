import { Activity, forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
// @ts-ignore
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { usePageStore } from '../../store/index'
import { transitionTypeSet } from '../../utils/data'

export interface KeepAliveRef {
  clear: () => void
  remove: (key: string) => void
  getKeys: () => string[]
}

interface KeepAliveProps {
  activeKey: string
  max?: number
  children: React.ReactNode
  include?: (key: string) => boolean
  exclude?: (key: string) => boolean
  transitionTimeout?: number
}

export const KeepAlive = forwardRef<KeepAliveRef, KeepAliveProps>(
  (
    {
      activeKey,
      max = 10,
      children,
      include,
      exclude,
    },
    ref,
  ) => {
    const {
      transitionType,
      startGlobalProgressLoading,
      stopGlobalProgressLoading,
    } = usePageStore()
    const cacheMap = useRef<Map<string, React.ReactNode>>(new Map())
    const order = useRef<string[]>([])
    const nodeRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map())

    // 判断当前路由是否允许缓存
    const allowCache = useMemo(() => {
      if (exclude && exclude(activeKey))
        return false
      if (include && !include(activeKey))
        return false
      return true
    }, [activeKey, include, exclude])

    // ---------- 缓存写入和 LRU 淘汰 ----------
    if (allowCache && children) {
      if (!cacheMap.current.has(activeKey)) {
        cacheMap.current.set(activeKey, children)
        order.current.push(activeKey)
      }
      else {
        // 更新 LRU 顺序（将当前 key 移到最后）
        order.current = order.current.filter(k => k !== activeKey)
        order.current.push(activeKey)
      }
      // 淘汰超出 max 的最旧条目
      while (order.current.length > max) {
        const oldestKey = order.current.shift()!
        cacheMap.current.delete(oldestKey)
        nodeRefs.current.delete(oldestKey)
      }
    }

    // ---------- 构建渲染列表 ----------
    // 1. 所有缓存的条目
    const entries = Array.from(cacheMap.current.entries()) // [key, element][]

    // 2. 如果当前活跃的 key 不在缓存中（即未缓存），则作为临时条目加入
    if (!cacheMap.current.has(activeKey)) {
      entries.push([activeKey, children])
    }

    // 确保每个条目都有对应的 nodeRef
    entries.forEach(([key]) => {
      if (!nodeRefs.current.has(key)) {
        // @ts-ignore
        nodeRefs.current.set(key, { current: null } as React.RefObject<HTMLDivElement>)
      }
    })

    // ---------- 暴露 ref 方法 ----------
    useImperativeHandle(ref, () => ({
      clear: () => {
        cacheMap.current.clear()
        order.current = []
        nodeRefs.current.clear()
      },
      remove: (key: string) => {
        cacheMap.current.delete(key)
        order.current = order.current.filter(k => k !== key)
        nodeRefs.current.delete(key)
      },
      getKeys: () => Array.from(cacheMap.current.keys()),
    }))

    // ---------- 渲染 ----------
    return (
      <TransitionGroup>
        {entries.map(([key, element]) => {
          const isActive = key === activeKey
          const nodeRef = nodeRefs.current.get(key)!
          return (
            <CSSTransition
              key={key}
              nodeRef={nodeRef}
              timeout={500}
              onEntered={isActive ? stopGlobalProgressLoading : undefined}
              onExit={isActive ? startGlobalProgressLoading : undefined}
              unmountOnExit={true}
              mountOnEnter={false}
              in={isActive}
              classNames={transitionTypeSet[transitionType]}
            >
              <div ref={nodeRef}>
                {/* 对缓存条目使用 Activity 保活；临时条目也会被包裹，但失活后会被移除，无影响 */}
                <Activity mode={isActive ? 'visible' : 'hidden'}>
                  {element}
                </Activity>
              </div>
            </CSSTransition>

          )
        })}
      </TransitionGroup>
    )
  },
)
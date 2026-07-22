import { useMaximize } from '@zealous-admin/layout/index'
import { Button } from 'antd'
import { createStyles, useTheme } from 'antd-style'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// ============================================================
// Lambert 等角圆锥投影 (适合中国中纬度东西伸展的版图)
// 标准纬线 25°N / 47°N, 原点 35°N 105°E
// ============================================================
function buildLambertProjector() {
  const DEG = Math.PI / 180
  const φ1 = 25 * DEG
  const φ2 = 47 * DEG
  const φ0 = 35 * DEG
  const λ0 = 105 * DEG

  const n = Math.log(Math.cos(φ1) / Math.cos(φ2))
    / Math.log(Math.tan(Math.PI / 4 + φ2 / 2) / Math.tan(Math.PI / 4 + φ1 / 2))
  const F = (Math.cos(φ1) * Math.pow(Math.tan(Math.PI / 4 + φ1 / 2), n)) / n
  const ρ0 = F / Math.pow(Math.tan(Math.PI / 4 + φ0 / 2), n)

  return (lng: number, lat: number): [number, number] => {
    const φ = lat * DEG
    const λ = lng * DEG
    const ρ = F / Math.pow(Math.tan(Math.PI / 4 + φ / 2), n)
    const x = ρ * Math.sin(n * (λ - λ0))
    const y = ρ0 - ρ * Math.cos(n * (λ - λ0))
    return [x, y]
  }
}

// ============================================================
// 热力图颜色: 基于主题色, 从暗(低值)到亮(高值)
// ============================================================
function heatColor(t: number, baseColor: THREE.Color): number {
  const c = new THREE.Color(baseColor)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, 0.45, 0.07 + t * 0.23)
  return c.getHex()
}

function heatColorHex(t: number, baseColor: THREE.Color): string {
  return new THREE.Color(heatColor(t, baseColor)).getStyle()
}

// ============================================================
// 省份 GDP 模拟数据 (亿元)
// ============================================================
const PROVINCE_GDP: Record<string, number> = {
  '广东省': 124369, '江苏省': 116364, '山东省': 87435, '浙江省': 77715,
  '河南省': 61345, '四川省': 53851, '湖北省': 50013, '福建省': 48810,
  '湖南省': 46063, '上海市': 43215, '安徽省': 43005, '河北省': 40391,
  '北京市': 40269, '陕西省': 32772, '江西省': 32074, '重庆市': 29129,
  '辽宁省': 28975, '云南省': 28954, '广西壮族自治区': 26301,
  '山西省': 23000, '内蒙古自治区': 20500, '贵州省': 20164,
  '新疆维吾尔自治区': 17742, '天津市': 16311, '黑龙江省': 15884,
  '吉林省': 13200, '甘肃省': 11201, '海南省': 6475,
  '宁夏回族自治区': 5069, '青海省': 3615, '西藏自治区': 2139,
  '香港特别行政区': 28000, '澳门特别行政区': 2500, '台湾省': 48000,
}

interface FeatureData {
  name: string
  adcode: string
  polygons: Array<{ outer: Array<[number, number]>, holes: Array<Array<[number, number]>> }>
}

// ============================================================
// 样式
// ============================================================
const useStyles = createStyles(({ css, token }) => ({
  outer: css`
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
  `,
  wrapper: css`
    width: 100%; height: 100%; position: relative; overflow: hidden;
    background: ${token.colorBgLayout}; cursor: grab; flex-shrink: 0;
    &:active { cursor: grabbing; }
  `,
  tooltip: css`
    position: absolute; pointer-events: none; z-index: 10;
    background: ${token.colorBgElevated}; color: ${token.colorText};
    padding: 6px 12px; border-radius: ${token.borderRadius}px;
    font-size: 13px; font-weight: 600;
    border: 1px solid ${token.colorPrimaryBorder};
    white-space: nowrap;
    transform: translate(-50%, -130%);
    box-shadow: ${token.boxShadowSecondary};
    &::after {
      content: ''; position: absolute; bottom: -5px; left: 50%;
      transform: translateX(-50%);
      border-left: 5px solid transparent; border-right: 5px solid transparent;
      border-top: 5px solid ${token.colorBgElevated};
    }
  `,
  tooltipValue: css`
    margin-left: 8px; color: ${token.colorPrimary}; font-weight: 700;
    font-variant-numeric: tabular-nums;
  `,
  backBtn: css`
    position: absolute; top: 12px; left: 12px; z-index: 10;
  `,
  levelTitle: css`
    position: absolute; top: 12px; right: 12px; z-index: 10;
    background: ${token.colorBgElevated}DD;
    padding: 4px 12px; border-radius: ${token.borderRadius}px;
    font-size: 13px; font-weight: 600; color: ${token.colorTextSecondary};
    border: 1px solid ${token.colorBorderSecondary};
  `,
  legend: css`
    position: absolute; bottom: 12px; left: 12px; z-index: 10;
    display: flex; align-items: center; gap: 8px;
    font-size: 11px; color: ${token.colorTextSecondary};
    background: ${token.colorBgElevated}DD;
    padding: 6px 12px; border-radius: ${token.borderRadius}px;
    border: 1px solid ${token.colorBorderSecondary};
    font-variant-numeric: tabular-nums;
  `,
  legendBar: css`
    width: 120px; height: 8px; border-radius: 4px;
  `,
  hint: css`
    position: absolute; bottom: 12px; right: 12px; z-index: 10;
    font-size: 11px; color: ${token.colorTextTertiary};
    background: ${token.colorBgElevated}AA;
    padding: 4px 10px; border-radius: ${token.borderRadius}px;
  `,
}))

// ============================================================
// 组件
// ============================================================
export default function Dashboard2() {
  const { styles } = useStyles()
  const theme = useTheme()
  const { enterMaximize } = useMaximize()
  const containerRef = useRef<HTMLDivElement>(null)

  const [tooltip, setTooltip] = useState<{ name: string, value?: number, x: number, y: number } | null>(null)
  const [level, setLevel] = useState<'national' | 'provincial'>('national')
  const [currentName, setCurrentName] = useState('')
  const [legend, setLegend] = useState({ min: 0, max: 100 })

  // 供 "返回" 按钮调用
  const renderGeoRef = useRef<(adcode: string, name?: string) => void>(() => {})
  // 供事件处理器读取当前层级 (避免闭包陷阱)
  const levelRef = useRef<'national' | 'provincial'>('national')
  const currentAdcodeRef = useRef('100000')
  const currentNameRef = useRef('')

  useEffect(() => { levelRef.current = level }, [level])

  // ============================================================
  // 场景初始化 (theme 变化时重建)
  // ============================================================
  useEffect(() => {
    const el = containerRef.current
    if (!el)
      return
    const W = el.clientWidth
    const H = el.clientHeight
    let cleanup = false

    // ---- 颜色 ----
    const bgColor = new THREE.Color(theme.colorBgLayout)
    const borderColor = new THREE.Color(theme.colorBorderSecondary).getHex()
    const hoverColor = new THREE.Color(theme.colorPrimary).getHex()
    const baseColor = new THREE.Color(theme.colorPrimary)

    // ---- Scene / 光照 ----
    const scene = new THREE.Scene()
    scene.background = bgColor
    scene.add(new THREE.AmbientLight(0x8899AA, 0.6))
    const dl = new THREE.DirectionalLight(0xFFFFFF, 0.75)
    dl.position.set(5, 12, 8); scene.add(dl)
    const dl2 = new THREE.DirectionalLight(0x8899CC, 0.25)
    dl2.position.set(-3, 5, -4); scene.add(dl2)

    // ---- 相机 (正上方俯视) ----
    const cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 50)
    cam.position.set(0, 14, 0)
    cam.up.set(0, 0, 1)
    cam.lookAt(0, 0, 0)

    // ---- Renderer ----
    const rdr = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    rdr.setSize(W, H)
    rdr.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(rdr.domElement)

    // ---- OrbitControls ----
    const controls = new OrbitControls(cam, rdr.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enableRotate = false // 禁止旋转, 仅保留平移和缩放
    controls.target.set(0, 0, 0)
    controls.minZoom = 0.4
    controls.maxZoom = 8
    controls.update()

    // ---- 地图根节点 ----
    const root = new THREE.Group()
    scene.add(root)
    let allMeshes: THREE.Mesh[] = []
    const hoveredRef = { current: null as THREE.Mesh | null }
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    // ---- 清空 Group (释放显存) ----
    function clearGroup(g: THREE.Group) {
      while (g.children.length > 0) {
        const child = g.children[0]
        g.remove(child)
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry?.dispose()
          const mat = child.material
          if (mat instanceof THREE.Material)
            mat.dispose()
          else if (Array.isArray(mat))
            mat.forEach(m => m.dispose())
        }
      }
    }

    // ---- 渲染地理数据 (全国 / 省级可复用) ----
    function renderGeo(adcode: string, name?: string) {
      currentAdcodeRef.current = adcode
      currentNameRef.current = name || ''
      const url = `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`

      fetch(url)
        .then(r => r.json())
        .then((geo: any) => {
          if (cleanup)
            return

          const features: FeatureData[] = geo.features
            .filter((f: any) => f.properties?.name)
            .map((f: any) => {
              const geoms = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
              return {
                name: f.properties.name,
                adcode: f.properties.adcode?.toString() || '',
                polygons: geoms.map((rg: any[]) => ({ outer: rg[0], holes: rg.slice(1) })),
              }
            })

          if (features.length === 0)
            return

          // ===== Lambert 投影 =====
          const project = buildLambertProjector()

          // 第一遍: 投影所有点, 计算边界
          let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity
          features.forEach(f => f.polygons.forEach(poly => poly.outer.forEach(([lng, lat]) => {
            const [x, y] = project(lng, lat)
            if (x < minX) minX = x; if (x > maxX) maxX = x
            if (y < minY) minY = y; if (y > maxY) maxY = y
          })))

          const dw = maxX - minX || 1
          const dh = maxY - minY || 1
          const scale = 7.0 / Math.max(dw, dh)
          // rotateX(-π/2) 使 shape y → 3D -z, 配合相机 up=(0,0,1) 会导致
          // 东西、南北同时反转 (等效 180° 翻转), 对 x/y 同时取反可恢复东右北上
          const cx = (minX + maxX) / 2 * scale
          const cy = (minY + maxY) / 2 * scale
          const toXY = (lng: number, lat: number): [number, number] => {
            const [x, y] = project(lng, lat)
            return [cx - x * scale, cy - y * scale]
          }

          // ===== 热力图数据 =====
          const isNational = adcode === '100000'
          const dataMap: Record<string, number> = {}
          let minVal = Infinity; let maxVal = -Infinity

          if (isNational) {
            features.forEach(f => {
              const v = PROVINCE_GDP[f.name] ?? 0
              dataMap[f.name] = v
              if (v < minVal) minVal = v
              if (v > maxVal) maxVal = v
            })
          }
          else {
            // 省级: 生成随机模拟数据
            features.forEach(f => {
              const v = Math.round(Math.random() * 9000 + 500)
              dataMap[f.name] = v
              if (v < minVal) minVal = v
              if (v > maxVal) maxVal = v
            })
          }

          // ===== 清空旧数据 =====
          clearGroup(root)
          allMeshes = []
          if (hoveredRef.current) {
            hoveredRef.current = null
            setTooltip(null)
          }

          // ===== 创建 3D 网格 =====
          const EXTRUDE_DEPTH = 0.18

          features.forEach(feat => {
            const value = dataMap[feat.name] ?? 0
            const t = maxVal > minVal ? (value - minVal) / (maxVal - minVal) : 0.5
            const color = heatColor(t, baseColor)

            feat.polygons.forEach(polyData => {
              const outer = polyData.outer
              if (outer.length < 3)
                return
              try {
                const shape = new THREE.Shape()
                const [sx, sy] = toXY(outer[0][0], outer[0][1])
                shape.moveTo(sx, sy)
                for (let i = 1; i < outer.length; i++) {
                  const [x, y] = toXY(outer[i][0], outer[i][1])
                  shape.lineTo(x, y)
                }
                shape.closePath()

                polyData.holes.forEach(hole => {
                  if (hole.length < 3)
                    return
                  const hp = new THREE.Path()
                  const [hx, hy] = toXY(hole[0][0], hole[0][1])
                  hp.moveTo(hx, hy)
                  for (let i = 1; i < hole.length; i++) {
                    const [x, y] = toXY(hole[i][0], hole[i][1])
                    hp.lineTo(x, y)
                  }
                  hp.closePath()
                  shape.holes.push(hp)
                })

                const geom = new THREE.ExtrudeGeometry(shape, {
                  depth: EXTRUDE_DEPTH,
                  bevelEnabled: true,
                  bevelThickness: 0.012,
                  bevelSize: 0.012,
                  bevelSegments: 2,
                })
                geom.rotateX(-Math.PI / 2)
                geom.translate(0, -EXTRUDE_DEPTH, 0)

                const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 })
                const mesh = new THREE.Mesh(geom, mat)
                mesh.userData = { name: feat.name, adcode: feat.adcode, value, originalColor: color }
                root.add(mesh)
                allMeshes.push(mesh)

                // 边界线
                const edges = new THREE.EdgesGeometry(geom, 15)
                root.add(new THREE.LineSegments(
                  edges,
                  new THREE.LineBasicMaterial({ color: borderColor, transparent: true, opacity: 0.5, depthTest: true }),
                ))
              }
              catch { /* skip */ }
            })
          })

          // ===== 重置相机视角 =====
          cam.position.set(0, 14, 0)
          cam.up.set(0, 0, 1)
          cam.lookAt(0, 0, 0)
          controls.target.set(0, 0, 0)
          controls.update()

          // ===== 更新 UI 状态 =====
          setLegend({ min: minVal, max: maxVal })
          if (isNational) {
            setLevel('national')
            setCurrentName('')
          }
          else {
            setLevel('provincial')
            setCurrentName(name || '')
          }
        })
        .catch(err => console.warn('Geo fetch failed:', err))
    }

    renderGeoRef.current = renderGeo

    // ---- 鼠标悬停 ----
    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, cam)
      const intersects = raycaster.intersectObjects(allMeshes, false)

      if (hoveredRef.current) {
        const p = hoveredRef.current
        ;(p.material as THREE.MeshStandardMaterial).color.setHex(p.userData.originalColor)
        ;(p.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000)
        hoveredRef.current = null
        setTooltip(null)
      }

      if (intersects.length > 0) {
        const obj = intersects[0].object as THREE.Mesh
        if (obj.userData.name) {
          ;(obj.material as THREE.MeshStandardMaterial).color.setHex(hoverColor)
          ;(obj.material as THREE.MeshStandardMaterial).emissive.setHex(
            new THREE.Color(hoverColor).multiplyScalar(0.3).getHex(),
          )
          hoveredRef.current = obj
          setTooltip({
            name: obj.userData.name,
            value: obj.userData.value,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          })
        }
      }
    }
    el.addEventListener('mousemove', onMouseMove)

    // ---- 点击下钻 (区分点击与拖拽) ----
    let mouseDownPos: { x: number, y: number } | null = null
    const onMouseDown = (e: MouseEvent) => { mouseDownPos = { x: e.clientX, y: e.clientY } }
    const onMouseUp = (e: MouseEvent) => {
      if (!mouseDownPos)
        return
      const dx = e.clientX - mouseDownPos.x
      const dy = e.clientY - mouseDownPos.y
      mouseDownPos = null
      if (Math.sqrt(dx * dx + dy * dy) > 5)
        return // 拖拽, 非点击

      if (levelRef.current !== 'national')
        return // 仅全国级可下钻

      const rect = el.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, cam)
      const intersects = raycaster.intersectObjects(allMeshes, false)
      if (intersects.length > 0) {
        const obj = intersects[0].object as THREE.Mesh
        const adcode = obj.userData.adcode
        if (adcode && adcode !== '100000')
          renderGeo(adcode, obj.userData.name)
      }
    }
    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('mouseup', onMouseUp)

    // ---- 动画循环 ----
    function anim() {
      if (cleanup)
        return
      requestAnimationFrame(anim)
      controls.update()
      rdr.render(scene, cam)
    }
    anim()

    // ---- 初始加载 (保留当前层级, 用于 theme 切换后恢复) ----
    renderGeo(currentAdcodeRef.current, currentNameRef.current)

    // ---- Resize ----
    const onResize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      cam.aspect = w / h
      cam.updateProjectionMatrix()
      rdr.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cleanup = true
      controls.dispose()
      window.removeEventListener('resize', onResize)
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('mouseup', onMouseUp)
      clearGroup(root)
      rdr.dispose()
      if (el.contains(rdr.domElement))
        el.removeChild(rdr.domElement)
    }
  }, [theme])

  const handleBack = () => renderGeoRef.current('100000')

  // 图例渐变色
  const baseColor = new THREE.Color(theme.colorPrimary)
  const legendDark = heatColorHex(0, baseColor)
  const legendBright = heatColorHex(1, baseColor)

  // 省名简化
  const shortName = (name: string) =>
    name.replace('特别行政区', '').replace('壮族自治区', '').replace('回族自治区', '')
      .replace('维吾尔自治区', '').replace('自治区', '').replace('省', '').replace('市', '')

  const fmtVal = (v: number) => v >= 10000 ? `${(v / 10000).toFixed(2)}万亿` : `${v}亿`

  return (
    <div className={styles.outer}>
      <div className={styles.wrapper} ref={containerRef} onDoubleClick={enterMaximize}>
        {/* 返回按钮 */}
        {level === 'provincial' && (
          <Button className={styles.backBtn} onClick={handleBack} size="small">
            ← 返回全国
          </Button>
        )}

        {/* 当前层级标题 */}
        <div className={styles.levelTitle}>
          {level === 'national' ? '全国 GDP 热力图' : `${shortName(currentName)} · 区县分布`}
        </div>

        {/* 图例 */}
        <div className={styles.legend}>
          <span>{fmtVal(legend.min)}</span>
          <div
            className={styles.legendBar}
            style={{ background: `linear-gradient(to right, ${legendDark}, ${legendBright})` }}
          />
          <span>{fmtVal(legend.max)}</span>
        </div>

        {/* 操作提示 */}
        <div className={styles.hint}>
          {level === 'national' ? '🖱 点击省份下钻 · 拖拽旋转 · 滚轮缩放' : '拖拽旋转 · 滚轮缩放'}
        </div>

        {/* 悬停提示 */}
        {tooltip && (
          <div className={styles.tooltip} style={{ left: tooltip.x, top: tooltip.y }}>
            {shortName(tooltip.name)}
            {tooltip.value != null && (
              <span className={styles.tooltipValue}>{fmtVal(tooltip.value)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

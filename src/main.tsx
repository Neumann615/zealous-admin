import { initMonitor } from '@zealous-admin/monitor-sdk/index'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import App from './App'

// 本后台自身即被监控对象：在 React 挂载前安装采集器，确保首屏性能与早期异常不丢
try {
  initMonitor({
    appId: import.meta.env.VITE_MONITOR_APP_ID || 'zealous-admin',
    reportUrl: import.meta.env.VITE_MONITOR_REPORT_URL || `${import.meta.env.VITE_BASE_SERVER_URL}/monitor/collect`,
    source: 'zealous-admin',
  })
}
catch (error) {
  // 监控不能反噬宿主应用：初始化失败只告警，不阻断渲染
  console.warn('[monitor] SDK 初始化失败，已跳过采集', error)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Router>
    <App />
  </Router>,
)

setTimeout(() => {
  const el = document.getElementById('app-loading')
  if (el) {
    // 先淡出（触发 CSS transition），再移除
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 1600)
  }
}, 500)

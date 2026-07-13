import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import App from './App'

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

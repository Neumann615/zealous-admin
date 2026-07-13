import { NavLink } from 'react-router-dom'

export default function NoMatch() {
  return (
    <div className="flex-center">
      <h1>当前页面不存在</h1>
      <NavLink to="/">首页</NavLink>
    </div>
  )
}

import { Layout } from '@zealous-admin/layout/index'
import { useMemo } from 'react'
import { useUserStore } from '@/store/mall/user'

export default function Home() {
  const userInfo = useUserStore(state => state.userInfo)
  const userLogout = useUserStore(state => state.userLogout)

  const layoutUserInfo = useMemo(() => ({
    username: userInfo.username,
    email: userInfo.email,
    avatar: userInfo.avatar,
    nickName: userInfo.nickName,
  }), [userInfo.username, userInfo.email, userInfo.avatar, userInfo.nickName])

  const handleLogout = async () => {
    await userLogout()
    // 清除所有 zustand 持久化配置（app/menu/topBar/theme/page 等）
    const keys = Object.keys(localStorage).filter(k => k.startsWith('zealous-admin-'))
    keys.forEach(k => localStorage.removeItem(k))
    // 硬刷新确保所有 store 恢复到初始状态
    window.location.replace('/login')
  }

  return <Layout userInfo={layoutUserInfo} onLogout={handleLogout} />
}
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <h1>ようこそ！</h1>
      <p style={{ color: '#888' }}>{user?.email}</p>
      <button
        onClick={handleSignOut}
        style={{ background: '#ff4d6d', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '1rem', padding: '0.6rem 1.5rem' }}
      >
        ログアウト
      </button>
    </div>
  )
}

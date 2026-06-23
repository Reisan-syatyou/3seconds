import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import styles from './BottomNav.module.css'

export default function BottomNav() {
  const { pathname } = useLocation()
  const { user } = useAuth()

  return (
    <nav className={styles.nav}>
      <Link to="/" className={`${styles.item} ${pathname === '/' ? styles.active : ''}`}>
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
        <span>フィード</span>
      </Link>

      <Link to="/search" className={`${styles.item} ${pathname === '/search' ? styles.active : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="22" height="22">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <span>検索</span>
      </Link>

      <Link to="/upload" className={`${styles.item} ${pathname === '/upload' ? styles.active : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        <span>投稿</span>
      </Link>

      <Link
        to="/profile"
        className={`${styles.item} ${pathname === '/profile' ? styles.active : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>
        <span>プロフィール</span>
      </Link>
    </nav>
  )
}

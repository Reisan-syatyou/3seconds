import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import styles from './AuthPage.module.css'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password !== confirm) {
      return setError('パスワードが一致しません')
    }
    if (password.length < 6) {
      return setError('パスワードは6文字以上にしてください')
    }

    setLoading(true)
    const { error } = await signUp(email, password)
    if (error) {
      setError(error.message)
    } else {
      setMessage('確認メールを送信しました。メールをご確認ください。')
      setTimeout(() => navigate('/login'), 3000)
    }
    setLoading(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>3s</div>
          <h1 className={styles.title}>新規登録</h1>
        </div>
        <p className={styles.subtitle}>3秒でつながる、3秒で伝わる</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">メールアドレス</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="6文字以上"
              required
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirm">パスワード（確認）</label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {message && <p className={styles.success}>{message}</p>}

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? '登録中...' : 'アカウント作成'}
          </button>
        </form>

        <p className={styles.footer}>
          すでにアカウントをお持ちの方は{' '}
          <Link to="/login">ログイン</Link>
        </p>
      </div>
    </div>
  )
}

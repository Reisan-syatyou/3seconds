import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import styles from './SearchPage.module.css'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const navigate = useNavigate()

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${q.trim()}%`)
      .limit(30)
    setResults(data ?? [])
    setSearched(true)
    setSearching(false)
  }, [])

  function handleChange(e) {
    const q = e.target.value
    setQuery(q)
    handleSearch(q)
  }

  return (
    <div className={styles.page}>
      <div className={styles.searchBar}>
        <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          className={styles.input}
          type="text"
          placeholder="ユーザーを検索..."
          value={query}
          onChange={handleChange}
          autoFocus
        />
        {query && (
          <button className={styles.clearBtn} onClick={() => { setQuery(''); setResults([]); setSearched(false) }}>
            ✕
          </button>
        )}
      </div>

      <div className={styles.results}>
        {searching && <p className={styles.hint}>検索中...</p>}
        {!searching && searched && results.length === 0 && (
          <p className={styles.hint}>「{query}」に一致するユーザーが見つかりません</p>
        )}
        {!searching && !searched && (
          <p className={styles.hint}>ユーザー名で検索してみよう</p>
        )}
        {results.map(u => (
          <div
            key={u.id}
            className={styles.userRow}
            onClick={() => navigate(`/profile/${u.id}`)}
          >
            <div className={styles.avatar}>
              {u.avatar_url
                ? <img src={u.avatar_url} alt={u.username} className={styles.avatarImg} />
                : <span>{u.username?.[0]?.toUpperCase() ?? '?'}</span>
              }
            </div>
            <span className={styles.username}>@{u.username}</span>
            <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}

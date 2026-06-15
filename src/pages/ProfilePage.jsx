import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const { userId } = useParams()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const targetId = userId ?? user?.id

  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePost, setActivePost] = useState(null)

  useEffect(() => {
    if (!targetId) return
    Promise.all([
      supabase.from('profiles').select('*').eq('id', targetId).single(),
      supabase.from('posts').select('*').eq('user_id', targetId).order('created_at', { ascending: false })
    ]).then(([{ data: p }, { data: v }]) => {
      setProfile(p)
      setPosts(v ?? [])
      setLoading(false)
    })
  }, [targetId])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const isOwn = user?.id === targetId

  if (loading) return (
    <div className={styles.center}>
      <p>読み込み中...</p>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt={profile.username} />
            : <span>{profile?.username?.[0]?.toUpperCase() ?? '?'}</span>
          }
        </div>
        <h2 className={styles.username}>@{profile?.username ?? 'unknown'}</h2>
        {profile?.bio && <p className={styles.bio}>{profile.bio}</p>}
        <p className={styles.postCount}>{posts.length} 投稿</p>

        {isOwn && (
          <button className={styles.signOutBtn} onClick={handleSignOut}>
            ログアウト
          </button>
        )}
      </div>

      {posts.length === 0 ? (
        <p className={styles.empty}>まだ投稿がありません</p>
      ) : (
        <div className={styles.grid}>
          {posts.map(post => (
            <div
              key={post.id}
              className={styles.thumb}
              onClick={() => setActivePost(post)}
            >
              <video
                src={post.video_url}
                muted
                playsInline
                preload="metadata"
                className={styles.thumbVideo}
              />
            </div>
          ))}
        </div>
      )}

      {activePost && (
        <div className={styles.modal} onClick={() => setActivePost(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <video
              src={activePost.video_url}
              autoPlay
              loop
              controls
              playsInline
              className={styles.modalVideo}
            />
            {activePost.caption && (
              <p className={styles.modalCaption}>{activePost.caption}</p>
            )}
            <button className={styles.closeBtn} onClick={() => setActivePost(null)}>
              閉じる
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

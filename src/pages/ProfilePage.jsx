import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'
import styles from './ProfilePage.module.css'

function EditModal({ profile, userId, onSave, onClose }) {
  const [username, setUsername] = useState(profile?.username ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    if (!username.trim()) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('profiles')
      .update({ username: username.trim(), bio: bio.trim() })
      .eq('id', userId)
    if (err) {
      setError('保存に失敗しました')
      setSaving(false)
    } else {
      onSave({ username: username.trim(), bio: bio.trim() })
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.editModal} onClick={e => e.stopPropagation()}>
        <h3 className={styles.editTitle}>プロフィールを編集</h3>
        <form onSubmit={handleSave}>
          <label className={styles.editLabel}>ユーザー名</label>
          <input
            className={styles.editInput}
            value={username}
            onChange={e => setUsername(e.target.value)}
            maxLength={30}
            required
          />
          <label className={styles.editLabel}>bio</label>
          <textarea
            className={styles.editTextarea}
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={150}
            rows={3}
            placeholder="自己紹介を書いてください"
          />
          {error && <p className={styles.editError}>{error}</p>}
          <div className={styles.editBtns}>
            <button type="button" className={styles.editCancelBtn} onClick={onClose}>キャンセル</button>
            <button type="submit" className={styles.editSaveBtn} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { userId } = useParams()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const targetId = userId ?? user?.id

  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePost, setActivePost] = useState(null)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const isOwn = user?.id === targetId

  useEffect(() => {
    if (!targetId) return
    async function load() {
      const [
        { data: p },
        { data: v },
        { count: followers },
        { count: following },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', targetId).single(),
        supabase.from('posts').select('*').eq('user_id', targetId).order('created_at', { ascending: false }),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetId),
      ])
      setProfile(p)
      setPosts(v ?? [])
      setFollowerCount(followers ?? 0)
      setFollowingCount(following ?? 0)

      if (user && !isOwn) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', targetId)
          .maybeSingle()
        setIsFollowing(!!followData)
      }
      setLoading(false)
    }
    load()
  }, [targetId, user?.id, isOwn])

  const handleFollow = useCallback(async () => {
    if (!user) return
    const nowFollowing = !isFollowing
    setIsFollowing(nowFollowing)
    setFollowerCount(c => c + (nowFollowing ? 1 : -1))
    if (nowFollowing) {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId })
    } else {
      await supabase.from('follows').delete().match({ follower_id: user.id, following_id: targetId })
    }
  }, [user, isFollowing, targetId])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  if (loading) return (
    <div className={styles.center}><p>読み込み中...</p></div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          <div className={styles.avatarInner}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profile.username} />
              : <span>{profile?.username?.[0]?.toUpperCase() ?? '?'}</span>
            }
          </div>
        </div>
        <h2 className={styles.username}>@{profile?.username ?? 'unknown'}</h2>
        {profile?.bio && <p className={styles.bio}>{profile.bio}</p>}

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{posts.length}</span>
            <span className={styles.statLabel}>投稿</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{followerCount}</span>
            <span className={styles.statLabel}>フォロワー</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{followingCount}</span>
            <span className={styles.statLabel}>フォロー中</span>
          </div>
        </div>

        {isOwn ? (
          <div className={styles.btnRow}>
            <button className={styles.editBtn} onClick={() => setShowEditModal(true)}>
              プロフィールを編集
            </button>
            <button className={styles.signOutBtn} onClick={handleSignOut}>
              ログアウト
            </button>
          </div>
        ) : (
          <button
            className={`${styles.followBtn} ${isFollowing ? styles.followBtnActive : ''}`}
            onClick={handleFollow}
          >
            {isFollowing ? 'フォロー中' : 'フォロー'}
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

      {showEditModal && (
        <EditModal
          profile={profile}
          userId={user.id}
          onSave={newProfile => {
            setProfile(prev => ({ ...prev, ...newProfile }))
            setShowEditModal(false)
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}

      <BottomNav />
    </div>
  )
}

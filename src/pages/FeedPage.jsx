import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'
import styles from './FeedPage.module.css'

function CommentSheet({ postId, user, onClose, onCountChange }) {
  const [comments, setComments] = useState([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    async function fetchComments() {
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(username)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      setComments(data ?? [])
      setLoading(false)
    }
    fetchComments()
    setTimeout(() => inputRef.current?.focus(), 350)
  }, [postId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!body.trim() || !user || submitting) return
    setSubmitting(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: user.id, body: body.trim() })
      .select('*, profiles(username)')
      .single()
    if (!error && data) {
      setComments(prev => [...prev, data])
      onCountChange(postId, 1)
    }
    setBody('')
    setSubmitting(false)
  }

  async function handleDelete(commentId) {
    await supabase.from('comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
    onCountChange(postId, -1)
  }

  return (
    <div className={styles.sheetOverlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.sheetHandle} />
        <h3 className={styles.sheetTitle}>コメント</h3>
        <div className={styles.commentList}>
          {loading ? (
            <p className={styles.sheetEmpty}>読み込み中...</p>
          ) : comments.length === 0 ? (
            <p className={styles.sheetEmpty}>まだコメントがありません</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className={styles.commentItem}>
                <div className={styles.commentAvatar}>
                  {(c.profiles?.username ?? '?')[0].toUpperCase()}
                </div>
                <div className={styles.commentBody}>
                  <span className={styles.commentUser}>@{c.profiles?.username ?? 'unknown'}</span>
                  <p className={styles.commentText}>{c.body}</p>
                </div>
                {user?.id === c.user_id && (
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(c.id)}
                    aria-label="削除"
                  >✕</button>
                )}
              </div>
            ))
          )}
        </div>
        {user ? (
          <form className={styles.commentForm} onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className={styles.commentInput}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="コメントを追加..."
              maxLength={200}
            />
            <button
              type="submit"
              className={styles.commentSend}
              disabled={!body.trim() || submitting}
            >送信</button>
          </form>
        ) : (
          <p className={styles.sheetEmpty} style={{ padding: '12px 16px' }}>
            コメントするにはログインしてください
          </p>
        )}
      </div>
    </div>
  )
}

function VideoCard({ post, likeCount, liked, onToggleLike, commentCount, onOpenComments }) {
  const videoRef = useRef(null)
  const cardRef = useRef(null)
  const [muted, setMuted] = useState(true)
  const [animating, setAnimating] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showIcon, setShowIcon] = useState(false)
  const iconTimerRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!paused) videoRef.current?.play()
        } else {
          videoRef.current?.pause()
          if (videoRef.current) videoRef.current.currentTime = 0
          setPaused(false)
        }
      },
      { threshold: 0.6 }
    )
    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [paused])

  function handleVideoClick() {
    const video = videoRef.current
    if (!video) return
    if (paused) {
      video.play()
      setPaused(false)
    } else {
      video.pause()
      setPaused(true)
    }
    clearTimeout(iconTimerRef.current)
    setShowIcon(true)
    iconTimerRef.current = setTimeout(() => setShowIcon(false), 800)
  }

  function handleLike() {
    setAnimating(true)
    setTimeout(() => setAnimating(false), 350)
    onToggleLike(post.id, liked)
  }

  return (
    <div ref={cardRef} className={styles.card}>
      <video
        ref={videoRef}
        src={post.video_url}
        loop
        muted={muted}
        playsInline
        className={styles.video}
        onClick={handleVideoClick}
      />
      {showIcon && (
        <div className={styles.pauseIcon}>
          {paused ? (
            <svg viewBox="0 0 24 24" fill="white" width="56" height="56">
              <path d="M8 5v14l11-7z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="white" width="56" height="56">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          )}
        </div>
      )}

      <button
        className={styles.muteBtn}
        onClick={() => setMuted(m => !m)}
        aria-label={muted ? 'ミュート解除' : 'ミュート'}
      >
        {muted ? (
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18l1.54 1.54L20.54 18 5.27 2 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        )}
      </button>

      <div className={styles.actions}>
        <button
          className={`${styles.likeBtn} ${liked ? styles.likeBtnActive : ''}`}
          onClick={handleLike}
          aria-label="いいね"
        >
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            className={`${styles.heartIcon} ${animating ? styles.heartPop : ''}`}
            fill={liked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span className={styles.likeCount}>{likeCount > 0 ? likeCount : ''}</span>
        </button>

        <button
          className={styles.commentBtn}
          onClick={() => onOpenComments(post.id)}
          aria-label="コメント"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
          <span className={styles.commentCount}>{commentCount > 0 ? commentCount : ''}</span>
        </button>
      </div>

      <div className={styles.overlay}>
        <Link to={`/profile/${post.user_id}`} className={styles.username}>
          @{post.profiles?.username ?? 'unknown'}
        </Link>
        {post.caption && <p className={styles.caption}>{post.caption}</p>}
      </div>
    </div>
  )
}

export default function FeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [likeCounts, setLikeCounts] = useState({})
  const [likedSet, setLikedSet] = useState(new Set())
  const [commentCounts, setCommentCounts] = useState({})
  const [activeCommentPostId, setActiveCommentPostId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: postsData } = await supabase
        .from('posts')
        .select('*, profiles(username)')
        .order('created_at', { ascending: false })
        .limit(30)

      if (!postsData?.length) { setLoading(false); return }

      const postIds = postsData.map(p => p.id)

      const [{ data: likesData }, { data: commentsData }] = await Promise.all([
        supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
        supabase.from('comments').select('post_id').in('post_id', postIds),
      ])

      const counts = {}
      const myLikes = new Set()
      for (const like of likesData ?? []) {
        counts[like.post_id] = (counts[like.post_id] ?? 0) + 1
        if (like.user_id === user?.id) myLikes.add(like.post_id)
      }

      const cCounts = {}
      for (const c of commentsData ?? []) {
        cCounts[c.post_id] = (cCounts[c.post_id] ?? 0) + 1
      }

      setPosts(postsData)
      setLikeCounts(counts)
      setLikedSet(myLikes)
      setCommentCounts(cCounts)
      setLoading(false)
    }
    load()
  }, [user?.id])

  const handleToggleLike = useCallback(async (postId, isLiked) => {
    if (!user) return
    setLikedSet(prev => {
      const next = new Set(prev)
      isLiked ? next.delete(postId) : next.add(postId)
      return next
    })
    setLikeCounts(prev => ({
      ...prev,
      [postId]: Math.max(0, (prev[postId] ?? 0) + (isLiked ? -1 : 1)),
    }))
    if (isLiked) {
      await supabase.from('likes').delete().match({ post_id: postId, user_id: user.id })
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id })
    }
  }, [user])

  const handleCommentCountChange = useCallback((postId, delta) => {
    setCommentCounts(prev => ({
      ...prev,
      [postId]: Math.max(0, (prev[postId] ?? 0) + delta),
    }))
  }, [])

  if (loading) return (
    <div className={styles.center}>
      <p>読み込み中...</p>
    </div>
  )

  if (posts.length === 0) return (
    <div className={styles.center}>
      <p style={{ color: '#fff', fontSize: '1rem' }}>まだ投稿がありません</p>
      <p style={{ color: '#555', fontSize: '0.875rem', marginTop: '8px' }}>最初の投稿をしてみよう！</p>
      <BottomNav />
    </div>
  )

  return (
    <div className={styles.feed}>
      {posts.map(post => (
        <VideoCard
          key={post.id}
          post={post}
          likeCount={likeCounts[post.id] ?? 0}
          liked={likedSet.has(post.id)}
          onToggleLike={handleToggleLike}
          commentCount={commentCounts[post.id] ?? 0}
          onOpenComments={setActiveCommentPostId}
        />
      ))}
      {activeCommentPostId && (
        <CommentSheet
          postId={activeCommentPostId}
          user={user}
          onClose={() => setActiveCommentPostId(null)}
          onCountChange={handleCommentCountChange}
        />
      )}
      <BottomNav />
    </div>
  )
}

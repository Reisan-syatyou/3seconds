import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'
import styles from './UploadPage.module.css'

const MAX_DURATION = 5

export default function UploadPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    if (!f.type.startsWith('video/')) {
      setError('動画ファイルを選択してください')
      return
    }

    const url = URL.createObjectURL(f)
    const video = document.createElement('video')
    video.src = url
    video.onloadedmetadata = () => {
      if (video.duration > MAX_DURATION) {
        setError(`動画は${MAX_DURATION}秒以内にしてください（現在 ${video.duration.toFixed(1)}秒）`)
        URL.revokeObjectURL(url)
        return
      }
      setFile(f)
      setPreview(url)
      setError('')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) { setError('動画を選択してください'); return }

    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(path)

    const { error: insertError } = await supabase
      .from('posts')
      .insert({ user_id: user.id, video_url: publicUrl, caption: caption.trim() })

    if (insertError) {
      setError(insertError.message)
      setUploading(false)
      return
    }

    navigate('/')
  }

  function reset() {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>動画を投稿</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div
          className={styles.dropzone}
          onClick={() => !preview && inputRef.current?.click()}
        >
          {preview ? (
            <>
              <video
                src={preview}
                className={styles.preview}
                controls
                muted
                playsInline
              />
              <button type="button" className={styles.removeBtn} onClick={reset}>
                削除
              </button>
            </>
          ) : (
            <div className={styles.placeholder}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" width="48" height="48">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
              </svg>
              <span className={styles.placeholderText}>タップして動画を選択</span>
              <span className={styles.hint}>{MAX_DURATION}秒以内</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className={styles.hiddenInput}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="caption">キャプション</label>
          <input
            id="caption"
            type="text"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="何を伝えたい？（任意）"
            maxLength={100}
          />
          <span className={styles.charCount}>{caption.length}/100</span>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.button} disabled={uploading || !file}>
          {uploading ? 'アップロード中...' : '投稿する'}
        </button>
      </form>

      <BottomNav />
    </div>
  )
}

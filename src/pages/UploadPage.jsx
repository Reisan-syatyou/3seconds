import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'
import styles from './UploadPage.module.css'

const MAX_DURATION = 5

function getSupportedMimeType() {
  const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  return types.find(t => MediaRecorder.isTypeSupported(t)) ?? ''
}

function TrimSlider({ duration, start, end, onChange }) {
  const pct = v => (v / duration) * 100
  return (
    <div className={styles.trimSlider}>
      <div
        className={styles.trimFill}
        style={{ left: `${pct(start)}%`, width: `${pct(end - start)}%` }}
      />
      <input
        type="range"
        min={0}
        max={duration}
        step={0.05}
        value={start}
        onChange={e => onChange(Math.min(+e.target.value, end - 0.3), end)}
        className={styles.rangeInput}
        style={{ zIndex: start > duration / 2 ? 5 : 3 }}
      />
      <input
        type="range"
        min={0}
        max={duration}
        step={0.05}
        value={end}
        onChange={e => onChange(start, Math.max(+e.target.value, start + 0.3))}
        className={styles.rangeInput}
        style={{ zIndex: start > duration / 2 ? 3 : 5 }}
      />
    </div>
  )
}

export default function UploadPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const trimVideoRef = useRef(null)

  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [duration, setDuration] = useState(0)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const [showTrim, setShowTrim] = useState(false)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [trimming, setTrimming] = useState(false)
  const [trimmedBlob, setTrimmedBlob] = useState(null)
  const [trimmedPreview, setTrimmedPreview] = useState(null)

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
      setFile(f)
      setPreview(url)
      setDuration(video.duration)
      setTrimStart(0)
      setTrimEnd(Math.min(video.duration, MAX_DURATION))
      setTrimmedBlob(null)
      if (trimmedPreview) URL.revokeObjectURL(trimmedPreview)
      setTrimmedPreview(null)
      setShowTrim(video.duration > MAX_DURATION)
      setError('')
    }
  }

  function handleTrimChange(s, e) {
    const clampedEnd = e - s > MAX_DURATION ? s + MAX_DURATION : e
    setTrimStart(s)
    setTrimEnd(clampedEnd)
    if (trimmedBlob) {
      setTrimmedBlob(null)
      if (trimmedPreview) URL.revokeObjectURL(trimmedPreview)
      setTrimmedPreview(null)
    }
  }

  async function applyTrim() {
    const vid = trimVideoRef.current
    if (!vid) return
    setTrimming(true)
    setError('')

    const captureFn = vid.captureStream?.bind(vid) ?? vid.mozCaptureStream?.bind(vid)
    if (!captureFn) {
      setError('このブラウザはトリミングに対応していません')
      setTrimming(false)
      return
    }

    const mimeType = getSupportedMimeType()
    vid.volume = 0

    try {
      const blob = await new Promise((resolve, reject) => {
        const stream = captureFn()
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
        const chunks = []
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType || 'video/webm' }))
        recorder.onerror = reject

        vid.currentTime = trimStart
        vid.onseeked = () => {
          vid.onseeked = null
          vid.play()
          recorder.start()
          setTimeout(() => {
            recorder.stop()
            vid.pause()
          }, (trimEnd - trimStart) * 1000 + 150)
        }
      })

      const url = URL.createObjectURL(blob)
      setTrimmedBlob(blob)
      setTrimmedPreview(url)
      setShowTrim(false)
    } catch {
      setError('トリミング中にエラーが発生しました')
    } finally {
      setTrimming(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const uploadFile = trimmedBlob
      ? new File([trimmedBlob], `trimmed_${Date.now()}.webm`, { type: trimmedBlob.type })
      : file

    if (!uploadFile) { setError('動画を選択してください'); return }

    if (!trimmedBlob && duration > MAX_DURATION) {
      setError(`動画は${MAX_DURATION}秒以内にしてください。切り抜き機能をご利用ください。`)
      setShowTrim(true)
      return
    }

    setUploading(true)
    setError('')

    const ext = trimmedBlob ? 'webm' : (file.name.split('.').pop() || 'mp4')
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(path, uploadFile, { cacheControl: '3600', upsert: false })

    if (uploadError) { setError(uploadError.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(path)

    const { error: insertError } = await supabase
      .from('posts')
      .insert({ user_id: user.id, video_url: publicUrl, caption: caption.trim() })

    if (insertError) { setError(insertError.message); setUploading(false); return }

    navigate('/')
  }

  function reset() {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    if (trimmedPreview) URL.revokeObjectURL(trimmedPreview)
    setTrimmedPreview(null)
    setTrimmedBlob(null)
    setShowTrim(false)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const displayPreview = trimmedPreview || preview
  const trimDuration = trimEnd - trimStart
  const trimOverLimit = trimDuration > MAX_DURATION

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>動画を投稿</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div
          className={styles.dropzone}
          onClick={() => !displayPreview && inputRef.current?.click()}
        >
          {displayPreview ? (
            <>
              <video src={displayPreview} className={styles.preview} controls muted playsInline />
              {trimmedBlob && <span className={styles.trimBadge}>切り抜き済み</span>}
              <button type="button" className={styles.removeBtn} onClick={reset}>削除</button>
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
          <input ref={inputRef} type="file" accept="video/*" onChange={handleFileChange} className={styles.hiddenInput} />
        </div>

        {preview && !showTrim && (
          <button type="button" className={styles.trimToggleBtn} onClick={() => setShowTrim(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <line x1="6" y1="3" x2="6" y2="21"/><line x1="18" y1="3" x2="18" y2="21"/>
              <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
            </svg>
            動画を切り抜く
          </button>
        )}

        {showTrim && preview && (
          <div className={styles.trimPanel}>
            <div className={styles.trimHeader}>
              <span className={styles.trimLabel}>切り抜き範囲を選択</span>
              <span className={`${styles.trimDuration} ${trimOverLimit ? styles.trimDurationOver : ''}`}>
                {trimDuration.toFixed(1)}s / {MAX_DURATION}s
              </span>
            </div>

            <video
              ref={trimVideoRef}
              src={preview}
              className={styles.trimVideoPreview}
              playsInline
              preload="auto"
            />

            <TrimSlider duration={duration} start={trimStart} end={trimEnd} onChange={handleTrimChange} />

            <div className={styles.trimTimes}>
              <span>{trimStart.toFixed(1)}s</span>
              <span>{trimEnd.toFixed(1)}s</span>
            </div>

            {trimOverLimit && (
              <p className={styles.trimWarning}>{MAX_DURATION}秒以内に収めてください</p>
            )}

            <div className={styles.trimActions}>
              <button type="button" className={styles.trimCancelBtn} onClick={() => setShowTrim(false)}>
                キャンセル
              </button>
              <button
                type="button"
                className={styles.trimConfirmBtn}
                onClick={applyTrim}
                disabled={trimming || trimOverLimit}
              >
                {trimming ? `処理中...` : '切り抜きを確定'}
              </button>
            </div>
          </div>
        )}

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

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Youtube, Play, Pause, Volume2, VolumeX,
  X, ChevronDown, ChevronUp, Film
} from 'lucide-react'

const STORAGE_KEY = 'recall_focus_youtube_url'
const HAS_VIDEO_EVENT = 'recall:focus-video-active'

// Portals normally append to the end of their target node, which makes
// them paint ABOVE everything already there (the standard modal/tooltip
// trick). We want the opposite — the video must sit BEHIND the entire
// app — so instead of portaling into document.body directly, we portal
// into a dedicated node that's inserted as body's very FIRST child.
// With no z-index battle needed at all, plain DOM order then guarantees
// #root (the whole app) paints on top of this video layer.
let videoPortalTarget = null
function getVideoPortalTarget() {
  if (videoPortalTarget && document.body.contains(videoPortalTarget)) {
    return videoPortalTarget
  }
  videoPortalTarget = document.createElement('div')
  videoPortalTarget.id = 'recall-focus-video-layer'
  document.body.insertBefore(videoPortalTarget, document.body.firstChild)
  return videoPortalTarget
}

// FocusVideoBackground and FocusPage are siblings (not parent/child), so
// they can't share state via props. This tiny window-event broadcast lets
// FocusPage know whether a video backdrop is currently showing, so it can
// switch its timer text to a fixed light color with a shadow — the same
// way any video player keeps its UI text legible over unpredictable
// footage regardless of the app's own light/dark theme.
export function useHasFocusVideo() {
  const [hasVideo, setHasVideo] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return !!(saved && extractYouTubeId(saved))
    } catch (_) {
      return false
    }
  })

  useEffect(() => {
    function handler(e) { setHasVideo(!!e.detail) }
    window.addEventListener(HAS_VIDEO_EVENT, handler)
    return () => window.removeEventListener(HAS_VIDEO_EVENT, handler)
  }, [])

  return hasVideo
}

function broadcastHasVideo(hasVideo) {
  window.dispatchEvent(new CustomEvent(HAS_VIDEO_EVENT, { detail: hasVideo }))
}

// Loads the YouTube IFrame Player API script exactly once, even if this
// component mounts multiple times. Returns a promise that resolves once
// window.YT is ready to use.
let ytApiPromise = null
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (ytApiPromise) return ytApiPromise

  ytApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous()
      resolve(window.YT)
    }
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
  })
  return ytApiPromise
}

// Accepts a full YouTube URL (watch, youtu.be, shorts, embed) or a bare
// 11-character video ID and returns just the video ID, or null.
export function extractYouTubeId(input) {
  if (!input) return null
  const trimmed = input.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed

  const patterns = [
    /youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/
  ]
  for (const p of patterns) {
    const m = trimmed.match(p)
    if (m) return m[1]
  }
  return null
}

// Computes an oversized iframe box (in viewport pixels) so a 16:9 video
// always fully covers an arbitrary viewport size, the same way
// `background-size: cover` works for images — center-cropping whichever
// dimension overflows instead of letterboxing.
function useCoverSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })

  useEffect(() => {
    function recalc() {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const videoRatio = 16 / 9
      const viewportRatio = vw / vh
      let width, height
      if (viewportRatio > videoRatio) {
        // Viewport is wider than the video — match width, overflow height
        width = vw
        height = vw / videoRatio
      } else {
        // Viewport is taller/narrower — match height, overflow width
        height = vh
        width = vh * videoRatio
      }
      setSize({ width: Math.ceil(width), height: Math.ceil(height) })
    }
    recalc()
    window.addEventListener('resize', recalc)
    return () => window.removeEventListener('resize', recalc)
  }, [])

  return size
}

export default function FocusVideoBackground() {
  const [expanded, setExpanded] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [videoId, setVideoId] = useState(null)
  const [videoTitle, setVideoTitle] = useState('')
  const [apiReady, setApiReady] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [inputError, setInputError] = useState('')

  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const coverSize = useCoverSize()

  // Restore the last-used video on first mount, but never autoplay sound —
  // visible video is fine to resume, audio should always start muted.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const id = extractYouTubeId(saved)
      if (id) {
        setUrlInput(saved)
        setVideoId(id)
      }
    }
  }, [])

  useEffect(() => {
    loadYouTubeApi().then(() => setApiReady(true))
  }, [])

  // Create/replace the player whenever we have both the API and a video id.
  useEffect(() => {
    if (!apiReady || !videoId || !containerRef.current) return

    setPlayerReady(false)
    if (playerRef.current) {
      try { playerRef.current.destroy() } catch (_) { /* already destroyed */ }
      playerRef.current = null
    }

    playerRef.current = new window.YT.Player(containerRef.current, {
      width: coverSize.width,
      height: coverSize.height,
      videoId,
      playerVars: {
        autoplay: 1,
        mute: 1, // must be set here, not just called reactively in onReady — browsers
                 // evaluate the autoplay-with-sound policy on the initial request itself
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        playsinline: 1,
        loop: 1,
        playlist: videoId, // required by the API for loop:1 to actually loop a single video
        rel: 0
      },
      events: {
        onReady: (e) => {
          setPlayerReady(true)
          e.target.mute() // belt-and-suspenders — keeps state in sync even if autoplay was blocked
          e.target.playVideo()
          try { setVideoTitle(e.target.getVideoData()?.title || '') } catch (_) { /* metadata not ready yet */ }
        },
        onStateChange: (e) => {
          // 1 = playing, 2 = paused, 0 = ended
          if (e.data === 1) setPlaying(true)
          if (e.data === 2) setPlaying(false)
          // onEnded shouldn't normally fire because of loop:1, but if it
          // ever does, restart rather than leaving a frozen frame.
          if (e.data === 0) e.target.playVideo()
        },
        // A small number of browsers still block even muted autoplay until
        // the user has interacted with the page at all. If that happens,
        // reflect it as paused so the play button in the control pill works.
        onAutoplayBlocked: () => setPlaying(false)
      }
    })

    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy() } catch (_) { /* already destroyed */ }
        playerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady, videoId])

  // Keep the existing player's iframe sized to cover the viewport as it
  // resizes, without tearing down and recreating the whole player.
  useEffect(() => {
    if (!playerReady || !playerRef.current) return
    try { playerRef.current.setSize(coverSize.width, coverSize.height) } catch (_) { /* player not ready for resize yet */ }
  }, [coverSize, playerReady])

  const loadVideo = useCallback(() => {
    const id = extractYouTubeId(urlInput)
    if (!id) {
      setInputError('Could not find a video in that link')
      return
    }
    setInputError('')
    localStorage.setItem(STORAGE_KEY, urlInput.trim())
    setVideoId(id)
  }, [urlInput])

  function togglePlay() {
    if (!playerRef.current || !playerReady) return
    if (playing) playerRef.current.pauseVideo()
    else playerRef.current.playVideo()
  }

  function toggleMute() {
    if (!playerRef.current || !playerReady) return
    if (muted) {
      playerRef.current.unMute()
      setMuted(false)
    } else {
      playerRef.current.mute()
      setMuted(true)
    }
  }

  function clearVideo() {
    if (playerRef.current) {
      try { playerRef.current.destroy() } catch (_) { /* already destroyed */ }
      playerRef.current = null
    }
    setVideoId(null)
    setVideoTitle('')
    setUrlInput('')
    setPlaying(false)
    setMuted(true)
    setPlayerReady(false)
    localStorage.removeItem(STORAGE_KEY)
  }

  const hasVideo = !!videoId

  // Single source of truth for the broadcast — fires whenever hasVideo
  // actually changes, regardless of which handler caused it.
  useEffect(() => {
    broadcastHasVideo(hasVideo)
  }, [hasVideo])

  return (
    <>
      {/* Full-viewport video layer — portaled to a node inserted BEFORE
          #root in the DOM, so plain stacking order (no z-index needed)
          puts the entire app, including the timer, on top of it. */}
      {hasVideo && createPortal(
        <div
          aria-hidden="true"
          style={{
            position: 'fixed', inset: 0,
            overflow: 'hidden', background: 'var(--bg-base)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div
            ref={containerRef}
            style={{ width: coverSize.width, height: coverSize.height, flexShrink: 0 }}
          />
          {/* Dimmed overlay so the video reads as a backdrop, not the
              main focus — foreground timer/text stays legible via the
              forced light-text styling applied in FocusPage. */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.62) 100%)'
          }} />
        </div>,
        getVideoPortalTarget()
      )}

      {/* Floating control pill — portaled to document.body the normal
          way (appended last = paints on top), since this is interactive
          UI chrome the user needs to reach regardless of the video. */}
      {createPortal(
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 'var(--z-raised)',
          maxWidth: 320, width: 'calc(100vw - 40px)'
      }}>
        <div
          className="card"
          style={{
            padding: 0, overflow: 'hidden',
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: hasVideo && playing ? '1px solid var(--border-accent)' : undefined
          }}
        >
          <button
            onClick={() => setExpanded(p => !p)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left'
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 'var(--radius-md)',
              background: hasVideo && playing ? 'var(--color-danger-soft)' : 'var(--bg-elevated)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: hasVideo && playing ? 'var(--color-danger)' : 'var(--text-tertiary)',
              flexShrink: 0
            }}>
              {hasVideo && playing ? <Film size={14} /> : <Youtube size={14} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)' }}>
                Background video
              </div>
              <div style={{
                fontSize: '11px', color: 'var(--text-tertiary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {hasVideo
                  ? (videoTitle || (playing ? 'Playing' : 'Paused'))
                  : 'Set a YouTube video as your backdrop'}
              </div>
            </div>

            {hasVideo && playerReady && (
              <>
                <div
                  onClick={e => { e.stopPropagation(); toggleMute() }}
                  className="btn btn-icon btn-sm"
                  style={{ flexShrink: 0 }}
                  title={muted ? 'Unmute' : 'Mute'}
                >
                  {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </div>
                <div
                  onClick={e => { e.stopPropagation(); togglePlay() }}
                  className="btn btn-icon btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  {playing ? <Pause size={13} /> : <Play size={13} />}
                </div>
              </>
            )}

            {expanded ? <ChevronDown size={14} color="var(--text-tertiary)" /> : <ChevronUp size={14} color="var(--text-tertiary)" />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      className="form-input"
                      style={{ flex: 1, height: 34, fontSize: 'var(--text-xs)' }}
                      placeholder="Paste a YouTube link or video ID..."
                      value={urlInput}
                      onChange={e => { setUrlInput(e.target.value); setInputError('') }}
                      onKeyDown={e => { if (e.key === 'Enter') loadVideo() }}
                    />
                    <button className="btn btn-secondary btn-sm" onClick={loadVideo} disabled={!urlInput.trim()}>
                      Set
                    </button>
                  </div>
                  {inputError && (
                    <div style={{ fontSize: '11px', color: 'var(--color-danger)' }}>{inputError}</div>
                  )}
                  {hasVideo && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={clearVideo}
                      style={{ alignSelf: 'flex-start', color: 'var(--text-disabled)' }}
                    >
                      <X size={12} /> Remove background
                    </button>
                  )}
                  <div style={{ fontSize: '11px', color: 'var(--text-disabled)', lineHeight: 1.5 }}>
                    Plays behind your timer for the whole session. Starts muted — unmute any time with the speaker icon above.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>,
      document.body
      )}
    </>
  )
}

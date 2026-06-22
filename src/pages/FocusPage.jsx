import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Square, X, Volume2, VolumeX, BookOpen, Check } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { focusService, dailyStatsService } from '../services/db'
import { format } from 'date-fns'
import FocusVideoBackground, { useHasFocusVideo } from '../components/common/FocusVideoBackground'

const DURATIONS = [
  { label: '25 min', value: 25 * 60 },
  { label: '45 min', value: 45 * 60 },
  { label: '60 min', value: 60 * 60 },
  { label: '90 min', value: 90 * 60 },
]

export default function FocusPage() {
  const { chapters, subjects } = useData()
  const { user } = useAuth()
  const { toast } = useApp()
  const hasVideoBackground = useHasFocusVideo()

  const [phase, setPhase] = useState('setup') // setup | active | complete
  const [selectedDuration, setSelectedDuration] = useState(25 * 60)
  const [selectedChapter, setSelectedChapter] = useState(null)
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [notes, setNotes] = useState('')
  const [muted, setMuted] = useState(false)

  const intervalRef = useRef(null)
  const startTimeRef = useRef(null)

  const tick = useCallback(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        clearInterval(intervalRef.current)
        setRunning(false)
        setPhase('complete')
        if (!muted) playDing()
        return 0
      }
      return prev - 1
    })
    setElapsed(prev => prev + 1)
  }, [muted])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, tick])

  function playDing() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(528, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5)
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 1.5)
    } catch (_) {}
  }

  async function startSession() {
    const { data } = await focusService.create(user.id, {
      chapter_id: selectedChapter?.id || null,
      target_duration: selectedDuration,
      duration: 0,
      started_at: new Date().toISOString()
    })
    setSessionId(data?.id)
    setTimeLeft(selectedDuration)
    setElapsed(0)
    setRunning(true)
    setPhase('active')
  }

  async function endSession(completed = false) {
    setRunning(false)
    if (sessionId) {
      await focusService.complete(sessionId, elapsed, notes)
      await dailyStatsService.upsert(user.id, {
        date: format(new Date(), 'yyyy-MM-dd'),
        revisions: completed ? 1 : 0,
        minutes: Math.round(elapsed / 60),
        chapters: 0
      })
    }
    toast({ title: 'Session saved!', message: `${Math.round(elapsed / 60)} minutes logged` }, 'success')
    setPhase('setup')
    setElapsed(0)
    setTimeLeft(selectedDuration)
    setSessionId(null)
    setNotes('')
  }

  const progress = phase === 'active' ? 1 - timeLeft / selectedDuration : phase === 'complete' ? 1 : 0
  const radius = 120
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  let phaseContent

  // When a video backdrop is playing, force light, shadowed text so it
  // stays legible over unpredictable footage colors, regardless of the
  // app's own light/dark/AMOLED theme (the same approach video players
  // and lock-screen wallpapers use for overlaid UI text).
  const primaryTextStyle = hasVideoBackground
    ? { color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }
    : { color: 'var(--text-primary)' }
  const secondaryTextStyle = hasVideoBackground
    ? { color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }
    : { color: 'var(--text-tertiary)' }

  if (phase === 'active' || phase === 'complete') {
    phaseContent = (
      <div style={{
        minHeight: 'calc(100vh - var(--topbar-height))',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '40px', padding: '40px'
      }}>
        {/* Timer ring */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ position: 'relative', width: 280, height: 280 }}
        >
          <svg width="280" height="280" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="140" cy="140" r={radius} fill="none" stroke={hasVideoBackground ? 'rgba(255,255,255,0.25)' : 'var(--bg-elevated)'} strokeWidth="6" />
            <motion.circle
              cx="140" cy="140" r={radius}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '4px'
          }}>
            {phase === 'complete' ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'var(--color-success-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <Check size={32} color="var(--color-success)" />
              </motion.div>
            ) : (
              <>
                <div style={{ fontSize: '52px', fontWeight: 300, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', ...primaryTextStyle }}>
                  {formatTime(timeLeft)}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', ...secondaryTextStyle }}>
                  {selectedChapter ? selectedChapter.name : 'Free focus'}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Phase label */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.04em', ...primaryTextStyle }}>
            {phase === 'complete' ? '🎉 Session Complete!' : 'Focus Session'}
          </h2>
          <p style={{ marginTop: '6px', ...secondaryTextStyle }}>
            {phase === 'complete'
              ? `You studied for ${Math.round(elapsed / 60)} minutes`
              : `${Math.round(elapsed / 60)} min elapsed · Stay focused`}
          </p>
        </div>

        {/* Controls */}
        {phase === 'active' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setRunning(p => !p)}
              style={{ width: 56, height: 56, borderRadius: '50%', padding: 0, justifyContent: 'center' }}
            >
              {running ? <Pause size={22} /> : <Play size={22} />}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setMuted(p => !p)}
              style={{ width: 48, height: 48, borderRadius: '50%', padding: 0, justifyContent: 'center' }}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              className="btn btn-danger"
              onClick={() => endSession(false)}
              style={{ width: 48, height: 48, borderRadius: '50%', padding: 0, justifyContent: 'center' }}
            >
              <Square size={18} />
            </button>
          </div>
        )}

        {phase === 'complete' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: 360 }}>
            <textarea
              className="form-textarea"
              placeholder="Session notes (optional)..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary btn-lg" style={{ flex: 1 }} onClick={() => { setPhase('setup'); setElapsed(0); setTimeLeft(selectedDuration) }}>
                Discard
              </button>
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => endSession(true)}>
                <Check size={16} /> Save Session
              </button>
            </div>
          </div>
        )}

        {/* Elapsed indicator */}
        {phase === 'active' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', background: 'var(--bg-overlay)',
            border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-full)'
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(elapsed)} elapsed
            </span>
          </div>
        )}
      </div>
    )
  } else {
    // Setup phase
    phaseContent = (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.04em' }}>Focus Mode</h1>
        <p style={{ color: 'var(--text-tertiary)', marginTop: '6px' }}>Distraction-free study session with a timer</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Duration picker */}
        <div className="card">
          <div className="card-header"><span style={{ fontWeight: 700 }}>Session Duration</span></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  onClick={() => setSelectedDuration(d.value)}
                  style={{
                    padding: '16px 8px',
                    borderRadius: 'var(--radius-xl)',
                    border: `2px solid ${selectedDuration === d.value ? 'var(--accent)' : 'var(--border-default)'}`,
                    background: selectedDuration === d.value ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                    color: selectedDuration === d.value ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-md)', fontWeight: 700,
                    transition: 'all var(--duration-fast)'
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Custom:</span>
              <input
                type="number"
                min="1"
                max="300"
                className="form-input"
                style={{ height: 36, width: 80 }}
                value={Math.round(selectedDuration / 60)}
                onChange={e => setSelectedDuration(parseInt(e.target.value) * 60 || 25 * 60)}
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>minutes</span>
            </div>
          </div>
        </div>

        {/* Chapter selector */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 700 }}>Chapter (optional)</span>
            {selectedChapter && (
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedChapter(null)}>
                <X size={13} /> Clear
              </button>
            )}
          </div>
          <div className="card-body">
            {selectedChapter ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px',
                background: 'var(--accent-soft)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255,107,53,0.2)'
              }}>
                <BookOpen size={16} color="var(--accent)" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{selectedChapter.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{selectedChapter.subjects?.name}</div>
                </div>
              </div>
            ) : (
              <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {chapters.slice(0, 20).map(ch => {
                  const sub = subjects.find(s => s.id === ch.subject_id)
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChapter({ ...ch, subjects: sub })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: 'var(--radius-lg)',
                        background: 'none', border: '1px solid transparent',
                        cursor: 'pointer', width: '100%', textAlign: 'left',
                        fontFamily: 'var(--font-sans)', transition: 'all var(--duration-fast)'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent' }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: sub?.color || 'var(--accent)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{sub?.name}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Start button */}
        <motion.button
          className="btn btn-primary btn-xl"
          onClick={startSession}
          whileHover={{ scale: 1.02, boxShadow: 'var(--shadow-accent-lg)' }}
          whileTap={{ scale: 0.98 }}
          style={{ width: '100%', justifyContent: 'center', fontSize: 'var(--text-lg)' }}
        >
          <Play size={20} /> Start {Math.round(selectedDuration / 60)} Minute Session
        </motion.button>
      </div>
    </div>
    )
  }

  return (
    <>
      <FocusVideoBackground />
      <div style={{ position: 'relative', zIndex: 2 }}>
        {phaseContent}
      </div>
    </>
  )
}

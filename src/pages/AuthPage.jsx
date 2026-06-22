import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react'
import { authService } from '../services/auth'
import { useNavigate } from 'react-router-dom'
import RecallMark from '../components/common/RecallMark'

export default function AuthPage() {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ email: '', password: '', fullName: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (mode === 'signin') {
      const { data, error } = await authService.signIn(form.email, form.password)
      if (error) setError(error.message)
      else navigate('/dashboard')
    } else if (mode === 'signup') {
      const { data, error } = await authService.signUp(form.email, form.password, form.fullName)
      if (error) setError(error.message)
      else {
        setSuccess('Account created! Please check your email to verify.')
        setMode('signin')
      }
    } else {
      const { error } = await authService.resetPassword(form.email)
      if (error) setError(error.message)
      else setSuccess('Password reset link sent to your email.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      minHeight: '100dvh',
      display: 'flex',
      background: 'var(--bg-base)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background blobs */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 70% 60% at 10% 0%, rgba(255,107,53,0.10) 0%, transparent 70%),
          radial-gradient(ellipse 50% 40% at 90% 100%, rgba(124,58,237,0.07) 0%, transparent 60%)
        `
      }} />

      {/* Left panel — hero */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '64px',
          borderRight: '1px solid var(--border-subtle)',
          position: 'relative'
        }}
        className="auth-hero"
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '64px' }}>
          <div style={{
            width: 44, height: 44,
            background: 'var(--accent)',
            borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px var(--accent-glow)'
          }}><RecallMark size={22} /></div>
          <span style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
            Recall
          </span>
        </div>

        <div style={{ maxWidth: 440 }}>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '20px' }}
          >
            Master every topic.<br />
            <span style={{ color: 'var(--accent)' }}>Never forget again.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-md)', lineHeight: 1.6, marginBottom: '40px' }}
          >
            A premium spaced repetition system built for serious students. Track revisions, beat forgetting curves, ace competitive exams.
          </motion.p>

          {/* Feature list */}
          {[
            'Smart spaced repetition engine',
            'Beautiful analytics & heatmaps',
            'Focus mode with Pomodoro timer',
            'Real-time multi-device sync'
          ].map((f, i) => (
            <motion.div
              key={f}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.35 }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--accent-soft)',
                border: '1px solid rgba(255,107,53,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
              </div>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{f}</span>
            </motion.div>
          ))}
        </div>

        {/* Decorative stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          style={{ display: 'flex', gap: '12px', marginTop: '48px' }}
        >
          {[
            { label: 'Retention Rate', value: '94%', color: 'var(--color-success)' },
            { label: 'Avg. Streak', value: '47 days', color: 'var(--accent)' },
            { label: 'Students', value: '10K+', color: 'var(--color-info)' }
          ].map(stat => (
            <div key={stat.label} style={{
              padding: '16px 20px',
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              flex: 1
            }}>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: stat.color, letterSpacing: '-0.03em' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Right panel — auth form */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        style={{
          width: 480,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '64px 48px',
          flexShrink: 0
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '8px' }}>
              {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
            </h2>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginBottom: '32px' }}>
              {mode === 'signin' ? 'Sign in to your Recall account' :
               mode === 'signup' ? 'Start your revision journey today' :
               'We\'ll send a reset link to your email'}
            </p>

            {error && (
              <div style={{
                padding: '12px 14px', background: 'var(--color-danger-soft)',
                border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-lg)',
                color: 'var(--color-danger)', fontSize: 'var(--text-sm)', marginBottom: '20px'
              }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{
                padding: '12px 14px', background: 'var(--color-success-soft)',
                border: '1px solid rgba(74,222,128,0.2)', borderRadius: 'var(--radius-lg)',
                color: 'var(--color-success)', fontSize: 'var(--text-sm)', marginBottom: '20px'
              }}>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mode === 'signup' && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="form-input-icon">
                    <User size={16} className="icon" />
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Your name"
                      value={form.fullName}
                      onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="form-input-icon">
                  <Mail size={16} className="icon" />
                  <input
                    className="form-input"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="form-input-icon" style={{ position: 'relative' }}>
                    <Lock size={16} className="icon" />
                    <input
                      className="form-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      required
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      style={{
                        position: 'absolute', right: '12px', top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none',
                        color: 'var(--text-tertiary)', cursor: 'pointer',
                        display: 'flex', padding: 0
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'signin' && (
                <div style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setError(''); setSuccess('') }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 'var(--text-xs)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}
              >
                {loading ? (
                  <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                ) : (
                  <>
                    {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              {mode === 'signin' ? (
                <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                  Don't have an account?{' '}
                  <button onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)' }}>
                    Sign up free
                  </button>
                </span>
              ) : (
                <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                  Already have an account?{' '}
                  <button onClick={() => { setMode('signin'); setError(''); setSuccess('') }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)' }}>
                    Sign in
                  </button>
                </span>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <style>{`
        @media (max-width: 900px) {
          .auth-hero { display: none !important; }
        }
      `}</style>
    </div>
  )
}

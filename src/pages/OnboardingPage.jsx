import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Check, BookOpen, Target, Bell, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { profileService, subjectService, chapterService, revisionService } from '../services/db'
import { useApp } from '../contexts/AppContext'

const SUBJECT_COLORS = ['#FF6B35','#7C3AED','#0EA5E9','#10B981','#F59E0B','#EC4899']

const STEPS = [
  { id: 'welcome', title: 'Welcome to Recall', subtitle: 'Your premium revision companion' },
  { id: 'profile', title: 'Set up your profile', subtitle: 'Tell us about your exam goals' },
  { id: 'subject', title: 'Add your first subject', subtitle: 'What are you studying for?' },
  { id: 'chapter', title: 'Add your first chapter', subtitle: 'Break subjects into chapters' },
  { id: 'done', title: "You're all set!", subtitle: 'Start revising smarter' }
]

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useApp()

  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState({ full_name: '', exam_target: '', exam_date: '' })
  const [subject, setSubject] = useState({ name: '', color: '#FF6B35' })
  const [chapter, setChapter] = useState({ name: '', priority: 'high', difficulty: 'medium', estimated_revision_time: 30 })
  const [saving, setSaving] = useState(false)
  const [createdSubjectId, setCreatedSubjectId] = useState(null)

  async function handleNext() {
    if (step === 1) {
      await profileService.update(user.id, { full_name: profile.full_name, exam_target: profile.exam_target, exam_date: profile.exam_date || null })
    }
    if (step === 2 && subject.name.trim()) {
      const { data } = await subjectService.create(user.id, subject)
      if (data) setCreatedSubjectId(data.id)
    }
    if (step === 3 && chapter.name.trim() && createdSubjectId) {
      setSaving(true)
      const { data } = await chapterService.create(user.id, { ...chapter, subject_id: createdSubjectId, status: 'in_progress' })
      if (data) await revisionService.generateSpacedRevisions(user.id, data.id, new Date().toISOString().split('T')[0])
      setSaving(false)
    }
    if (step === STEPS.length - 1) {
      await profileService.update(user.id, { onboarding_completed: true })
      await refreshProfile()
      toast({ title: 'Welcome to Recall! 🎉', message: 'Start revising smarter today' }, 'success')
      navigate('/dashboard')
      return
    }
    setStep(p => p + 1)
  }

  function canProceed() {
    if (step === 1) return profile.full_name.trim().length > 0
    if (step === 2) return subject.name.trim().length > 0
    if (step === 3) return chapter.name.trim().length > 0
    return true
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(ellipse 80% 60% at 20% 10%, rgba(255,107,53,0.08) 0%, transparent 60%), var(--bg-base)`,
      padding: 'var(--space-6)'
    }}>
      <div style={{ width: '100%', maxWidth: 500 }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '40px' }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{
              flex: 1, height: 3, borderRadius: 'var(--radius-full)',
              background: i <= step ? 'var(--accent)' : 'var(--border-default)',
              transition: 'background var(--duration-slow)'
            }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: [0.4,0,0.2,1] }}
          >
            {step === 0 && (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  style={{ width: 80, height: 80, background: 'var(--accent)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 800, color: '#fff', boxShadow: '0 8px 32px var(--accent-glow)' }}
                >R</motion.div>
                <div>
                  <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '8px' }}>Welcome to Recall</h1>
                  <p style={{ color: 'var(--text-tertiary)', lineHeight: 1.6 }}>The premium revision planner designed for serious students. Let&apos;s set up your workspace in 2 minutes.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
                  {[
                    { icon: BookOpen, title: 'Chapter Tracking', desc: 'Organize all your topics' },
                    { icon: Zap, title: 'Spaced Repetition', desc: 'Science-backed revision' },
                    { icon: Target, title: 'Goal Setting', desc: 'Daily, weekly, monthly' },
                    { icon: Bell, title: 'Smart Reminders', desc: 'Never miss a revision' }
                  ].map(feat => (
                    <div key={feat.title} style={{ padding: '14px', background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', textAlign: 'left' }}>
                      <feat.icon size={18} color="var(--accent)" style={{ marginBottom: '6px' }} />
                      <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{feat.title}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{feat.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '6px' }}>Set up your profile</h2>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>This helps us personalize your experience</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Your Name *</label>
                  <input className="form-input" placeholder="e.g. Arjun Sharma" value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Exam</label>
                  <input className="form-input" placeholder="e.g. JEE Advanced, NEET, UPSC CSE" value={profile.exam_target} onChange={e => setProfile(p => ({ ...p, exam_target: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Exam Date</label>
                  <input className="form-input" type="date" value={profile.exam_date} onChange={e => setProfile(p => ({ ...p, exam_date: e.target.value }))} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '6px' }}>Add your first subject</h2>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>Subjects group related chapters together</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject Name *</label>
                  <input className="form-input" placeholder="e.g. Physics, Mathematics, History" value={subject.name} onChange={e => setSubject(p => ({ ...p, name: e.target.value }))} autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Subject Color</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {SUBJECT_COLORS.map(c => (
                      <button key={c} onClick={() => setSubject(p => ({ ...p, color: c }))}
                        style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: subject.color === c ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', transition: 'all var(--duration-fast)', transform: subject.color === c ? 'scale(1.15)' : '' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '6px' }}>Add your first chapter</h2>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>We&apos;ll auto-generate a spaced repetition schedule</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Chapter Name *</label>
                  <input className="form-input" placeholder="e.g. Newton's Laws of Motion" value={chapter.name} onChange={e => setChapter(p => ({ ...p, name: e.target.value }))} autoFocus />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-select" value={chapter.priority} onChange={e => setChapter(p => ({ ...p, priority: e.target.value }))}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Revision Time (min)</label>
                    <input className="form-input" type="number" min="5" max="300" value={chapter.estimated_revision_time} onChange={e => setChapter(p => ({ ...p, estimated_revision_time: parseInt(e.target.value) || 30 }))} />
                  </div>
                </div>
                <div style={{ padding: '14px', background: 'var(--accent-soft)', border: '1px solid rgba(255,107,53,0.2)', borderRadius: 'var(--radius-xl)' }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--accent)', marginBottom: '4px' }}>✨ Spaced Repetition Schedule</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    We&apos;ll automatically create revision reminders at: <strong>Day 1, 3, 7, 14, 30, 60, 90</strong> — following the Ebbinghaus forgetting curve.
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  style={{ fontSize: '80px' }}
                >🎉</motion.div>
                <div>
                  <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '8px' }}>You&apos;re all set!</h1>
                  <p style={{ color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                    Your workspace is ready. Your spaced repetition schedule has been created. Start revising smarter today!
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', padding: '16px', background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', width: '100%', textAlign: 'left' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: '6px' }}>What&apos;s next:</div>
                    {[
                      '📚 Add more chapters to your subjects',
                      '📅 Check your revision planner daily',
                      '🎯 Set study goals to stay motivated',
                      '⚡ Use Focus Mode for deep work'
                    ].map(item => (
                      <div key={item} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', padding: '4px 0' }}>{item}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '40px' }}>
          {step > 0 && step < STEPS.length - 1 && (
            <button className="btn btn-secondary btn-lg" onClick={() => setStep(p => p - 1)} style={{ gap: '8px' }}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <button
            className="btn btn-primary btn-lg"
            onClick={handleNext}
            disabled={!canProceed() || saving}
            style={{ flex: 1, justifyContent: 'center', gap: '8px' }}
          >
            {saving ? (
              <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            ) : step === STEPS.length - 1 ? (
              <><Check size={16} /> Go to Dashboard</>
            ) : step === 0 ? (
              <>Get Started <ArrowRight size={16} /></>
            ) : step === 2 && !subject.name.trim() ? (
              <>Skip for now <ArrowRight size={16} /></>
            ) : (
              <>Continue <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

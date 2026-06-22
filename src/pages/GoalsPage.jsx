import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Plus, Check, X, Trash2, TrendingUp, Calendar, BookOpen, Clock } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { goalService } from '../services/db'
import { format, addDays, addWeeks, addMonths, differenceInDays } from 'date-fns'

const METRIC_ICONS = { revisions: TrendingUp, study_hours: Clock, chapters: BookOpen, subjects: Target }
const METRIC_LABELS = { revisions: 'Revisions', study_hours: 'Study Hours', chapters: 'Chapters', subjects: 'Subjects' }

export default function GoalsPage() {
  const { goals, loadGoals, dailyStats, studyLogs } = useData()
  const { user } = useAuth()
  const { toast } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState(null)

  async function deleteGoal(id) {
    setDeleting(id)
    await goalService.delete(id)
    await loadGoals()
    toast('Goal deleted', 'success')
    setDeleting(null)
  }

  async function markComplete(goal) {
    await goalService.update(goal.id, { is_completed: true })
    await loadGoals()
    toast({ title: '🎉 Goal achieved!', message: goal.title }, 'success')
  }

  const getProgress = (goal) => {
    if (goal.metric === 'revisions') {
      return dailyStats
        .filter(d => d.date >= goal.start_date && d.date <= goal.end_date)
        .reduce((s, d) => s + (d.revisions_completed || 0), 0)
    }
    if (goal.metric === 'study_hours') {
      return Math.round(dailyStats
        .filter(d => d.date >= goal.start_date && d.date <= goal.end_date)
        .reduce((s, d) => s + (d.study_minutes || 0), 0) / 60 * 10) / 10
    }
    return goal.current_value || 0
  }

  const activeGoals = goals.filter(g => !g.is_completed)
  const completedGoals = goals.filter(g => g.is_completed)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.04em' }}>Goals</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
            {activeGoals.length} active · {completedGoals.length} completed
          </p>
        </div>
        <button className="btn btn-primary btn-md" onClick={() => setShowModal(true)}>
          <Plus size={15} /> New Goal
        </button>
      </div>

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Active</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            <AnimatePresence>
              {activeGoals.map((goal, i) => {
                const progress = getProgress(goal)
                const pct = Math.min(100, Math.round(progress / goal.target_value * 100))
                const daysLeft = differenceInDays(new Date(goal.end_date), new Date())
                const Icon = METRIC_ICONS[goal.metric] || Target
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.06 }}
                    className="card card-hover"
                    style={{ padding: '20px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: 40, height: 40,
                          background: pct >= 100 ? 'var(--color-success-soft)' : 'var(--accent-soft)',
                          borderRadius: 'var(--radius-lg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: pct >= 100 ? 'var(--color-success)' : 'var(--accent)'
                        }}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{goal.title}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                            <span className={`badge ${goal.goal_type === 'daily' ? 'badge-accent' : goal.goal_type === 'weekly' ? 'badge-info' : 'badge-default'}`}>
                              {goal.goal_type}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {pct >= 100 && (
                          <button className="btn btn-sm" onClick={() => markComplete(goal)}
                            style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)', border: 'none', padding: '0 8px', height: 28, borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={12} /> Complete
                          </button>
                        )}
                        <button className="btn btn-icon btn-sm" onClick={() => deleteGoal(goal.id)} disabled={deleting === goal.id}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Progress ring + number */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                      <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                        <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="28" cy="28" r="24" fill="none" stroke="var(--bg-elevated)" strokeWidth="4" />
                          <motion.circle
                            cx="28" cy="28" r="24"
                            fill="none"
                            stroke={pct >= 100 ? 'var(--color-success)' : 'var(--accent)'}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 24}`}
                            strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`}
                            initial={{ strokeDashoffset: `${2 * Math.PI * 24}` }}
                            animate={{ strokeDashoffset: `${2 * Math.PI * 24 * (1 - pct / 100)}` }}
                            transition={{ duration: 1, ease: [0.4,0,0.2,1] }}
                          />
                        </svg>
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 800,
                          color: pct >= 100 ? 'var(--color-success)' : 'var(--text-primary)'
                        }}>{pct}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                          {progress} <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', fontWeight: 400 }}>/ {goal.target_value}</span>
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                          {METRIC_LABELS[goal.metric]}
                        </div>
                      </div>
                    </div>

                    <div className="progress-bar">
                      <motion.div
                        className="progress-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: [0.4,0,0.2,1] }}
                        style={{ background: pct >= 100 ? 'var(--color-success)' : 'var(--accent)' }}
                      />
                    </div>

                    <div style={{ marginTop: '10px', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Ends today' : 'Expired'}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty state */}
      {activeGoals.length === 0 && (
        <div className="empty-state" style={{ marginBottom: '32px' }}>
          <div className="empty-state-icon"><Target size={24} /></div>
          <div className="empty-state-title">No active goals</div>
          <div className="empty-state-desc">Set daily, weekly, or monthly goals to stay motivated and track your progress.</div>
          <button className="btn btn-primary btn-md" onClick={() => setShowModal(true)}><Plus size={15} /> Create Goal</button>
        </div>
      )}

      {/* Completed */}
      {completedGoals.length > 0 && (
        <div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            Completed 🏆
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {completedGoals.slice(0, 5).map(goal => (
              <div key={goal.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                background: 'var(--bg-overlay)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xl)',
                opacity: 0.7
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)' }} />
                <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>{goal.title}</span>
                <span className="badge badge-success">Done</span>
                <button className="btn btn-icon btn-sm" onClick={() => deleteGoal(goal.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <GoalModal
            userId={user?.id}
            onClose={() => setShowModal(false)}
            onSave={() => { loadGoals(); setShowModal(false); toast('Goal created!', 'success') }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function GoalModal({ userId, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '', description: '', goal_type: 'weekly',
    target_value: 10, metric: 'revisions',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addWeeks(new Date(), 1), 'yyyy-MM-dd')
  })
  const [saving, setSaving] = useState(false)

  function handleTypeChange(type) {
    const endMap = {
      daily: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      weekly: format(addWeeks(new Date(), 1), 'yyyy-MM-dd'),
      monthly: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
      custom: form.end_date
    }
    setForm(p => ({ ...p, goal_type: type, end_date: endMap[type] }))
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    await goalService.create(userId, form)
    setSaving(false)
    onSave()
  }

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal modal-md" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontWeight: 700 }}>New Goal</h3>
          <button className="btn btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Goal Title *</label>
            <input className="form-input" placeholder="e.g. Complete 50 revisions this week" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Type</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['daily','weekly','monthly','custom'].map(t => (
                  <button key={t} onClick={() => handleTypeChange(t)}
                    style={{
                      padding: '6px 12px', borderRadius: 'var(--radius-lg)',
                      background: form.goal_type === t ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                      border: `1px solid ${form.goal_type === t ? 'rgba(255,107,53,0.3)' : 'var(--border-default)'}`,
                      color: form.goal_type === t ? 'var(--accent)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-xs)', fontWeight: 600,
                      transition: 'all var(--duration-fast)'
                    }}
                  >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Metric</label>
              <select className="form-select" value={form.metric} onChange={e => setForm(p => ({ ...p, metric: e.target.value }))}>
                <option value="revisions">Revisions</option>
                <option value="study_hours">Study Hours</option>
                <option value="chapters">Chapters</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Target</label>
              <input className="form-input" type="number" min="1" value={form.target_value} onChange={e => setForm(p => ({ ...p, target_value: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input className="form-input" type="date" value={form.end_date} min={form.start_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <input className="form-input" placeholder="Why this goal matters..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-md" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-md" onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Check size={15} />}
            Create Goal
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

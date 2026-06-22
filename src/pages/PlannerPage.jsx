import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, CheckCircle, AlertTriangle,
  ChevronLeft, ChevronRight, Plus, X,
  Check, RotateCcw
} from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { revisionService, dailyStatsService } from '../services/db'
import { format, addDays, parseISO, isToday, isBefore, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'

// BUG FIX: define SkipForwardIcon locally (was imported as 'Skip' from lucide which doesn't exist)
function SkipForwardIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4"/>
      <line x1="19" y1="5" x2="19" y2="19"/>
    </svg>
  )
}

export default function PlannerPage() {
  const { todayRevisions, missedRevisions, upcomingRevisions, chapters, completeRevision, loadTodayRevisions, loadMissedRevisions, loadUpcomingRevisions } = useData()
  const { user } = useAuth()
  const { toast } = useApp()

  const [view, setView] = useState('list')
  const [weekOffset, setWeekOffset] = useState(0)
  const [ratingModal, setRatingModal] = useState(null)
  const [rescheduleModal, setRescheduleModal] = useState(null)
  const [addModal, setAddModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7))
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart) })

  const allRevisions = useMemo(() => {
    if (filterStatus === 'today') return todayRevisions
    if (filterStatus === 'missed') return missedRevisions
    if (filterStatus === 'upcoming') return upcomingRevisions
    return [...missedRevisions, ...todayRevisions, ...upcomingRevisions]
  }, [todayRevisions, missedRevisions, upcomingRevisions, filterStatus])

  const weekRevisions = useMemo(() => {
    return weekDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayRevs = [...todayRevisions, ...missedRevisions, ...upcomingRevisions].filter(r => r.scheduled_date === dateStr)
      return { day, dateStr, revisions: dayRevs }
    })
  }, [weekDays, todayRevisions, missedRevisions, upcomingRevisions])

  async function handleComplete(revision, rating) {
    setRatingModal(null)
    await completeRevision(revision.id, rating)
    await dailyStatsService.upsert(user.id, {
      date: format(new Date(), 'yyyy-MM-dd'),
      revisions: 1,
      minutes: revision.chapters?.estimated_revision_time || 0
    })
    toast('Revision marked complete!', 'success')
  }

  async function handleReschedule(revision, newDate) {
    await revisionService.reschedule(revision.id, newDate)
    setRescheduleModal(null)
    loadTodayRevisions()
    loadMissedRevisions()
    loadUpcomingRevisions()
    toast('Revision rescheduled', 'success')
  }

  async function handleSkip(revisionId) {
    await revisionService.reschedule(revisionId, format(addDays(new Date(), 1), 'yyyy-MM-dd'))
    loadTodayRevisions()
    loadMissedRevisions()
    loadUpcomingRevisions()
    toast('Moved to tomorrow', 'info')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.04em' }}>Revision Planner</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
            {missedRevisions.length > 0 && <span style={{ color: 'var(--color-danger)' }}>{missedRevisions.length} missed · </span>}
            {todayRevisions.length} due today · {upcomingRevisions.length} upcoming
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="tabs" style={{ width: 'auto' }}>
            <button className={`tab-item${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>List</button>
            <button className={`tab-item${view === 'week' ? ' active' : ''}`} onClick={() => setView('week')}>Week</button>
          </div>
          <button className="btn btn-primary btn-md" onClick={() => setAddModal(true)}>
            <Plus size={15} /> Add Revision
          </button>
        </div>
      </div>

      {view === 'list' && (
        <>
          {/* Filter chips */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {[
              { val: 'all', label: `All (${missedRevisions.length + todayRevisions.length + upcomingRevisions.length})` },
              { val: 'missed', label: `Missed (${missedRevisions.length})` },
              { val: 'today', label: `Today (${todayRevisions.length})` },
              { val: 'upcoming', label: `Upcoming (${upcomingRevisions.length})` }
            ].map(f => (
              <button key={f.val} className={`chip${filterStatus === f.val ? ' active' : ''}`} onClick={() => setFilterStatus(f.val)}>
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <AnimatePresence>
              {allRevisions.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state">
                  <div className="empty-state-icon"><Calendar size={24} /></div>
                  <div className="empty-state-title">No revisions here</div>
                  <div className="empty-state-desc">Add chapters and generate spaced revisions to see them here.</div>
                </motion.div>
              ) : (
                allRevisions.map((rev, i) => (
                  <RevisionRow
                    key={rev.id}
                    revision={rev}
                    index={i}
                    onComplete={() => setRatingModal(rev)}
                    onReschedule={() => setRescheduleModal(rev)}
                    onSkip={() => handleSkip(rev.id)}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {view === 'week' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(p => p - 1)}><ChevronLeft size={14} /></button>
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
              {format(weekStart, 'MMM d')} – {format(endOfWeek(weekStart), 'MMM d, yyyy')}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(p => p + 1)}><ChevronRight size={14} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(0)}>Today</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
            {weekRevisions.map(({ day, dateStr, revisions: dayRevs }) => {
              const isCurrentDay = isToday(day)
              const isPast = isBefore(day, new Date()) && !isCurrentDay
              return (
                <div key={dateStr} style={{
                  background: isCurrentDay ? 'var(--accent-soft)' : 'var(--bg-overlay)',
                  border: `1px solid ${isCurrentDay ? 'rgba(255,107,53,0.25)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  opacity: isPast ? 0.7 : 1
                }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {format(day, 'EEE')}
                    </div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: isCurrentDay ? 'var(--accent)' : 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                      {format(day, 'd')}
                    </div>
                    {dayRevs.length > 0 && (
                      <div style={{ fontSize: '10px', color: isCurrentDay ? 'var(--accent)' : 'var(--text-tertiary)', fontWeight: 600, marginTop: '2px' }}>
                        {dayRevs.length} revision{dayRevs.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', minHeight: '80px' }}>
                    {dayRevs.slice(0, 4).map(rev => (
                      <div key={rev.id} style={{
                        padding: '4px 6px',
                        background: rev.chapters?.subjects?.color ? rev.chapters.subjects.color + '22' : 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '10px',
                        color: rev.chapters?.subjects?.color || 'var(--text-secondary)',
                        fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        border: `1px solid ${rev.status === 'completed' ? 'var(--color-success)' : 'transparent'}`
                      }} title={rev.chapters?.name}>
                        {rev.chapters?.name}
                      </div>
                    ))}
                    {dayRevs.length > 4 && (
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textAlign: 'center', paddingTop: '2px' }}>
                        +{dayRevs.length - 4} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Rating modal */}
      <AnimatePresence>
        {ratingModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRatingModal(null)}>
            <motion.div className="modal modal-sm" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 style={{ fontWeight: 700 }}>Rate Recall Quality</h3>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginTop: '2px' }}>{ratingModal.chapters?.name}</p>
                </div>
                <button className="btn btn-icon btn-sm" onClick={() => setRatingModal(null)}><X size={16} /></button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {[
                    { val: 1, label: '😰', desc: 'Blank' },
                    { val: 2, label: '😕', desc: 'Hard' },
                    { val: 3, label: '😐', desc: 'OK' },
                    { val: 4, label: '🙂', desc: 'Good' },
                    { val: 5, label: '😄', desc: 'Perfect' }
                  ].map(r => (
                    <button key={r.val} onClick={() => handleComplete(ratingModal, r.val)}
                      style={{
                        padding: '14px 6px', borderRadius: 'var(--radius-xl)',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                        transition: 'all var(--duration-base) var(--ease-spring)'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.borderColor = 'rgba(255,107,53,0.3)'; e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.transform = '' }}
                    >
                      <span style={{ fontSize: '24px' }}>{r.label}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{r.val}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reschedule modal */}
      <AnimatePresence>
        {rescheduleModal && (
          <RescheduleModal
            revision={rescheduleModal}
            onClose={() => setRescheduleModal(null)}
            onReschedule={handleReschedule}
          />
        )}
      </AnimatePresence>

      {/* Add revision modal */}
      <AnimatePresence>
        {addModal && (
          <AddRevisionModal
            chapters={chapters}
            userId={user?.id}
            onClose={() => setAddModal(false)}
            onSave={() => {
              setAddModal(false)
              loadTodayRevisions()
              loadUpcomingRevisions()
              toast('Revision added', 'success')
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function RevisionRow({ revision, index, onComplete, onReschedule, onSkip }) {
  const ch = revision.chapters
  const sub = ch?.subjects
  // BUG FIX: append T00:00:00 to prevent off-by-one timezone errors on date parsing
  const scheduledDate = parseISO(revision.scheduled_date + 'T00:00:00')
  const isOverdue = isBefore(scheduledDate, new Date()) && !isToday(scheduledDate) && revision.status === 'pending'
  const dueToday = isToday(scheduledDate) && revision.status === 'pending'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 16px',
        background: 'var(--bg-overlay)',
        border: `1px solid ${isOverdue ? 'rgba(248,113,113,0.2)' : dueToday ? 'rgba(255,107,53,0.15)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-xl)',
        transition: 'all var(--duration-base)'
      }}
    >
      <div style={{
        width: 3, height: 44, borderRadius: '2px', flexShrink: 0,
        background: isOverdue ? 'var(--color-danger)' : dueToday ? 'var(--accent)' : 'var(--border-default)'
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ch?.name}
          </span>
          {isOverdue && <span className="badge badge-danger">Overdue</span>}
          {dueToday && <span className="badge badge-accent">Today</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {sub && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: sub.color }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{sub.name}</span>
            </div>
          )}
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>·</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {format(scheduledDate, 'EEE, MMM d')}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>·</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Day +{revision.interval_days}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button className="btn btn-secondary btn-sm" onClick={onSkip} title="Skip to tomorrow">
          <SkipForwardIcon size={13} />
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onReschedule}>
          <RotateCcw size={13} />
        </button>
        <button className="btn btn-primary btn-sm" onClick={onComplete}>
          <CheckCircle size={13} /> Done
        </button>
      </div>
    </motion.div>
  )
}

function RescheduleModal({ revision, onClose, onReschedule }) {
  const [newDate, setNewDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const quickOptions = [
    { label: 'Tomorrow', date: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
    { label: 'In 3 days', date: format(addDays(new Date(), 3), 'yyyy-MM-dd') },
    { label: 'Next week', date: format(addDays(new Date(), 7), 'yyyy-MM-dd') },
    { label: 'In 2 weeks', date: format(addDays(new Date(), 14), 'yyyy-MM-dd') }
  ]
  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal modal-sm" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontWeight: 700 }}>Reschedule Revision</h3>
          <button className="btn btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {quickOptions.map(opt => (
              <button key={opt.label} onClick={() => setNewDate(opt.date)}
                style={{
                  padding: '10px', borderRadius: 'var(--radius-lg)',
                  background: newDate === opt.date ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                  border: `1px solid ${newDate === opt.date ? 'rgba(255,107,53,0.3)' : 'var(--border-default)'}`,
                  color: newDate === opt.date ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 'var(--text-sm)',
                  transition: 'all var(--duration-fast)'
                }}
              >{opt.label}</button>
            ))}
          </div>
          <div className="form-group">
            <label className="form-label">Custom Date</label>
            <input className="form-input" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-md" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-md" onClick={() => onReschedule(revision, newDate)}>
            <Check size={15} /> Reschedule
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function AddRevisionModal({ chapters, userId, onClose, onSave }) {
  const [form, setForm] = useState({ chapter_id: '', scheduled_date: format(new Date(), 'yyyy-MM-dd'), interval_days: 1 })
  const [saving, setSaving] = useState(false)
  async function handleSave() {
    if (!form.chapter_id) return
    setSaving(true)
    await revisionService.create(userId, { ...form, interval_index: 0, is_auto_generated: false })
    setSaving(false)
    onSave()
  }
  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal modal-sm" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontWeight: 700 }}>Add Revision</h3>
          <button className="btn btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Chapter</label>
            <select className="form-select" value={form.chapter_id} onChange={e => setForm(p => ({ ...p, chapter_id: e.target.value }))}>
              <option value="">Select chapter</option>
              {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Scheduled Date</label>
            <input className="form-input" type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Interval (days)</label>
            <input className="form-input" type="number" min="1" value={form.interval_days} onChange={e => setForm(p => ({ ...p, interval_days: parseInt(e.target.value) || 1 }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-md" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-md" onClick={handleSave} disabled={saving || !form.chapter_id}>
            {saving ? <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Check size={15} />}
            Add
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

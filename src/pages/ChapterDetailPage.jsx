import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Clock,
  Star, Plus, Check, Trash2, Zap,
  CheckCircle2, Circle,
  X, Play
} from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { chapterService, topicService, studyLogService, revisionService, dailyStatsService } from '../services/db'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { useData } from '../contexts/DataContext'
import { format, formatDistanceToNow } from 'date-fns'

export default function ChapterDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { toast } = useApp()
  const { loadChapters, loadTodayRevisions, loadStudyLogs } = useData()

  const [chapter, setChapter] = useState(null)
  const [topics, setTopics] = useState([])
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(true)
  const [newTopicName, setNewTopicName] = useState('')
  const [addingTopic, setAddingTopic] = useState(false)
  const [loggingStudy, setLoggingStudy] = useState(false)
  const [logForm, setLogForm] = useState({ log_type: 'revised', duration: 30, quality_rating: 3, notes: '' })
  const [showPlanPanel, setShowPlanPanel] = useState(false)
  const [manualDate, setManualDate] = useState('')
  const [planning, setPlanning] = useState(false)
  const saveTimeout = useRef(null)

  useEffect(() => { loadChapter() }, [id])

  async function loadChapter() {
    setLoading(true)
    const { data } = await chapterService.getById(id)
    if (!data) { navigate('/chapters'); return }
    setChapter(data)
    setNotes(data.notes || '')
    setTopics(data.topics || [])
    setRevisions((data.revisions || []).sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date)))
    setLoading(false)
  }

  function handleNotesChange(val) {
    setNotes(val)
    setNotesSaved(false)
    clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(async () => {
      await chapterService.update(id, { notes: val })
      setNotesSaved(true)
      loadChapters()
    }, 1200)
  }

  async function toggleTopic(topic) {
    const updated = !topic.is_completed
    await topicService.update(topic.id, { is_completed: updated })
    setTopics(prev => prev.map(t => t.id === topic.id ? { ...t, is_completed: updated } : t))
    const completed = topics.filter(t => t.is_completed).length + (updated ? 1 : -1)
    const pct = topics.length ? Math.round(completed / topics.length * 100) : 0
    await chapterService.update(id, { completion_percentage: pct })
    setChapter(prev => ({ ...prev, completion_percentage: pct }))
    loadChapters()
  }

  async function addTopic() {
    if (!newTopicName.trim()) return
    const { data } = await topicService.create(user.id, { chapter_id: id, name: newTopicName.trim(), sort_order: topics.length })
    setTopics(prev => [...prev, data])
    setNewTopicName('')
    setAddingTopic(false)
  }

  async function deleteTopic(topicId) {
    await topicService.delete(topicId)
    setTopics(prev => prev.filter(t => t.id !== topicId))
  }

  async function logStudy() {
    const { data } = await studyLogService.create(user.id, {
      chapter_id: id,
      ...logForm,
      date: format(new Date(), 'yyyy-MM-dd'),
      logged_at: new Date().toISOString()
    })
    if (data) {
      await chapterService.update(id, {
        last_revised_at: new Date().toISOString(),
        total_revisions: (chapter.total_revisions || 0) + 1
      })
      await dailyStatsService.upsert(user.id, {
        date: format(new Date(), 'yyyy-MM-dd'),
        revisions: 1,
        minutes: logForm.duration,
        chapters: 1
      })

      // DSN track (formula method only): logging today's study of this
      // chapter as 'studied' kicks off its own 2^(x-1)-day revision
      // schedule from today, separate from the chapter's SN track.
      if (profile?.revision_method === 'formula' && logForm.log_type === 'studied') {
        await revisionService.generateFormulaRevisions(user.id, id, 'dsn', format(new Date(), 'yyyy-MM-dd'))
        toast('Study logged — DSN revisions scheduled!', 'success')
      } else {
        toast('Study logged!', 'success')
      }

      setLoggingStudy(false)
      loadChapter()
      loadStudyLogs()
      loadChapters()
    }
  }

  async function completeRevision(revisionId, rating) {
    await revisionService.complete(revisionId, rating)
    toast('Revision completed!', 'success')
    loadChapter()
    loadTodayRevisions()
    loadChapters()
  }

  // Re-runs auto-generation for a chapter that already exists — covers
  // the "I skipped auto-generate at creation time" and "I want to also
  // try the other method" cases. Safe to call repeatedly: the unique
  // index backing ON CONFLICT DO NOTHING means re-running the same
  // method just skips dates that already have a revision, rather than
  // creating duplicates.
  async function runAutoGenerate(kind) {
    if (!chapter) return
    setPlanning(true)
    const today = format(new Date(), 'yyyy-MM-dd')
    if (kind === 'ebbinghaus') {
      await revisionService.generateSpacedRevisions(user.id, chapter.id, today)
    } else {
      await revisionService.generateFormulaRevisions(user.id, chapter.id, kind, today)
    }
    toast('Revisions planned!', 'success')
    setPlanning(false)
    setShowPlanPanel(false)
    loadChapter()
    loadTodayRevisions()
  }

  async function addManualRevision() {
    if (!chapter || !manualDate) return
    setPlanning(true)
    const { error } = await revisionService.createManual(user.id, chapter.id, manualDate)
    setPlanning(false)
    if (error) {
      // Most likely cause: a manual revision already exists on this exact
      // date for this chapter (blocked by idx_revisions_unique_auto_schedule).
      toast('Could not add — a revision may already exist on that date', 'error')
      return
    }
    toast('Revision added!', 'success')
    setManualDate('')
    loadChapter()
    loadTodayRevisions()
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
      <div className="loading-spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  if (!chapter) return null

  const subject = chapter.subjects
  const pendingRevisions = revisions.filter(r => r.status === 'pending')
  const completedRevisions = revisions.filter(r => r.status === 'completed')
  const todayRev = revisions.find(r => r.scheduled_date === format(new Date(), 'yyyy-MM-dd') && r.status === 'pending')
  const pct = chapter.completion_percentage || 0

  return (
    <div>
      {/* Back */}
      <button onClick={() => navigate('/chapters')} className="btn btn-ghost btn-sm" style={{ marginBottom: '20px', gap: '6px' }}>
        <ArrowLeft size={14} /> Back to Chapters
      </button>

      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'var(--bg-overlay)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-2xl)',
          padding: '28px',
          marginBottom: '20px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: `linear-gradient(90deg, ${subject?.color || 'var(--accent)'}, ${subject?.color || 'var(--accent)'}88)`
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            {subject && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: subject.color }} />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {subject.name}
                </span>
              </div>
            )}
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em', marginBottom: '12px' }}>
              {chapter.name}
            </h1>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className={`badge badge-priority-${chapter.priority}`}>{chapter.priority} priority</span>
              <span className="badge badge-default">{chapter.difficulty} difficulty</span>
              {chapter.exam_weightage > 0 && (
                <span className="badge badge-default"><Star size={9} /> {chapter.exam_weightage}%</span>
              )}
              {chapter.estimated_revision_time && (
                <span className="badge badge-default"><Clock size={9} /> {chapter.estimated_revision_time} min</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {todayRev && (
              <div style={{
                padding: '12px 16px',
                background: 'var(--accent-soft)',
                border: '1px solid rgba(255,107,53,0.2)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex', flexDirection: 'column', gap: '8px'
              }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Due Today
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[1,2,3,4,5].map(r => (
                    <button
                      key={r}
                      onClick={() => completeRevision(todayRev.id, r)}
                      style={{
                        width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-secondary)', fontWeight: 700, fontSize: '13px',
                        cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        transition: 'all var(--duration-fast)'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textAlign: 'center' }}>Rate recall quality</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn btn-primary btn-md" onClick={() => setLoggingStudy(true)} style={{ gap: '6px' }}>
                <Play size={14} /> Log Study
              </button>
              <button className="btn btn-secondary btn-md" onClick={() => navigate('/focus')} style={{ gap: '6px' }}>
                <Zap size={14} /> Focus Mode
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              Topic completion — {topics.filter(t => t.is_completed).length} / {topics.length}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: pct === 100 ? 'var(--color-success)' : 'var(--text-secondary)' }}>
              {pct}%
            </span>
          </div>
          <div className="progress-bar">
            <motion.div
              className="progress-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: [0.4,0,0.2,1] }}
              style={{ background: pct === 100 ? 'var(--color-success)' : subject?.color || 'var(--accent)' }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Revisions', value: chapter.total_revisions || 0 },
            { label: 'Pending', value: pendingRevisions.length },
            { label: 'Completed', value: completedRevisions.length },
            { label: 'Last Revised', value: chapter.last_revised_at ? formatDistanceToNow(new Date(chapter.last_revised_at), { addSuffix: true }) : 'Never' }
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{s.value}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '20px' }}>
        {['overview', 'topics', 'revisions', 'notes'].map(tab => (
          <button key={tab} className={`tab-item${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

          {activeTab === 'topics' && (
            <div className="card">
              <div className="card-header">
                <span style={{ fontWeight: 700 }}>Topics</span>
                <button className="btn btn-primary btn-sm" onClick={() => setAddingTopic(true)}>
                  <Plus size={13} /> Add Topic
                </button>
              </div>
              <div style={{ padding: '8px' }}>
                {addingTopic && (
                  <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', marginBottom: '4px' }}>
                    <input
                      className="form-input"
                      style={{ height: 36 }}
                      placeholder="Topic name..."
                      value={newTopicName}
                      onChange={e => setNewTopicName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addTopic(); if (e.key === 'Escape') setAddingTopic(false) }}
                      autoFocus
                    />
                    <button className="btn btn-primary btn-sm" onClick={addTopic}><Check size={14} /></button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setAddingTopic(false)}><X size={14} /></button>
                  </div>
                )}
                {topics.length === 0 && !addingTopic ? (
                  <div className="empty-state" style={{ padding: '32px' }}>
                    <div className="empty-state-title">No topics yet</div>
                    <div className="empty-state-desc">Break this chapter into smaller topics for better tracking.</div>
                    <button className="btn btn-primary btn-sm" onClick={() => setAddingTopic(true)}><Plus size={13} /> Add Topic</button>
                  </div>
                ) : (
                  topics.map(topic => (
                    <div key={topic.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 12px', borderRadius: 'var(--radius-lg)',
                      transition: 'background var(--duration-fast)',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <button onClick={() => toggleTopic(topic)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: topic.is_completed ? 'var(--color-success)' : 'var(--border-strong)' }}>
                        {topic.is_completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <span style={{
                        flex: 1, fontSize: 'var(--text-sm)', fontWeight: 500,
                        color: topic.is_completed ? 'var(--text-tertiary)' : 'var(--text-primary)',
                        textDecoration: topic.is_completed ? 'line-through' : 'none'
                      }}>
                        {topic.name}
                      </span>
                      <button onClick={() => deleteTopic(topic.id)} className="btn btn-icon btn-sm" style={{ color: 'var(--text-disabled)', opacity: 0 }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--color-danger)' }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = 0; e.currentTarget.style.color = 'var(--text-disabled)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'revisions' && (
            <div className="card">
              <div className="card-header">
                <span style={{ fontWeight: 700 }}>Revision Schedule</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span className="badge badge-success">{completedRevisions.length} done</span>
                  <span className="badge badge-default">{pendingRevisions.length} pending</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowPlanPanel(p => !p)}>
                    <Plus size={13} /> Plan Revisions
                  </button>
                </div>
              </div>

              {showPlanPanel && (
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Re-run auto-generation, for chapters that skipped it at creation time */}
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Auto-generate
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary btn-sm" disabled={planning} onClick={() => runAutoGenerate('ebbinghaus')}>
                        Ebbinghaus (1,3,7,14,30,60,90d)
                      </button>
                      <button className="btn btn-secondary btn-sm" disabled={planning} onClick={() => runAutoGenerate('sn')}>
                        SN — x² days
                      </button>
                      <button className="btn btn-secondary btn-sm" disabled={planning} onClick={() => runAutoGenerate('dsn')}>
                        DSN — 2^(x-1) days
                      </button>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: '6px' }}>
                      Safe to click even if some of these already exist — duplicates on the same date are skipped automatically.
                    </div>
                  </div>

                  {/* Add one custom date by hand */}
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Add a custom date
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="date"
                        className="form-input"
                        style={{ flex: 1 }}
                        value={manualDate}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        onChange={e => setManualDate(e.target.value)}
                      />
                      <button className="btn btn-primary btn-sm" disabled={!manualDate || planning} onClick={addManualRevision}>
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ padding: '8px' }}>
                {revisions.length === 0 ? (
                  <div className="empty-state" style={{ padding: '32px' }}>
                    <div className="empty-state-title">No revisions scheduled</div>
                    <div className="empty-state-desc">Log a study session, or use Plan Revisions above, to schedule some.</div>
                  </div>
                ) : (
                  revisions.map(rev => {
                    const isPast = new Date(rev.scheduled_date) < new Date() && rev.status === 'pending'
                    const isToday = rev.scheduled_date === format(new Date(), 'yyyy-MM-dd')
                    return (
                      <div key={rev.id} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 12px', borderRadius: 'var(--radius-lg)',
                        marginBottom: '2px',
                        background: isToday ? 'var(--accent-soft)' : '',
                        border: isToday ? '1px solid rgba(255,107,53,0.15)' : '1px solid transparent'
                      }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: rev.status === 'completed' ? 'var(--color-success)' : isPast ? 'var(--color-danger)' : isToday ? 'var(--accent)' : 'var(--border-strong)'
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Day +{rev.interval_days} — {format(new Date(rev.scheduled_date + 'T00:00:00'), 'EEE, MMM d yyyy')}
                            {rev.note_type && (
                              <span className="badge badge-default" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                                {rev.note_type === 'sn' ? `SN · Rep ${rev.formula_x}` :
                                  rev.note_type === 'dsn' ? `DSN · Rep ${rev.formula_x}` :
                                  'Planned'}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                            {rev.status === 'completed' ? `Completed ${format(new Date(rev.completed_at), 'MMM d')} · Rating: ${rev.quality_rating}/5` :
                              isPast ? 'Missed' : isToday ? 'Due today' : 'Upcoming'}
                          </div>
                        </div>
                        <span className={`badge ${rev.status === 'completed' ? 'badge-success' : isPast ? 'badge-danger' : isToday ? 'badge-accent' : 'badge-default'}`}>
                          {rev.status}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="card">
              <div className="card-header">
                <span style={{ fontWeight: 700 }}>Chapter Notes</span>
                <span style={{ fontSize: 'var(--text-xs)', color: notesSaved ? 'var(--color-success)' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {notesSaved ? <><Check size={12} /> Saved</> : <>Saving...</>}
                </span>
              </div>
              <div style={{ padding: '16px' }}>
                <textarea
                  value={notes}
                  onChange={e => handleNotesChange(e.target.value)}
                  placeholder="Write your notes here... Supports Markdown formatting.&#10;&#10;## Key Concepts&#10;- Point 1&#10;- Point 2&#10;&#10;**Important:** Remember this formula..."
                  style={{
                    width: '100%', minHeight: '400px',
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-sm)',
                    lineHeight: 1.7,
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color var(--duration-base)'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                />
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="card">
                <div className="card-header"><span style={{ fontWeight: 700 }}>Quick Stats</span></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { label: 'Revision Score', value: `${Math.min(100, (completedRevisions.length * 15))}%`, color: 'var(--color-success)' },
                    { label: 'Topics Done', value: `${topics.filter(t => t.is_completed).length} / ${topics.length}` },
                    { label: 'Next Revision', value: pendingRevisions[0] ? format(new Date(pendingRevisions[0].scheduled_date + 'T00:00:00'), 'MMM d') : 'None' },
                    { label: 'Study Sessions', value: chapter.total_revisions || 0 }
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>{s.label}</span>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: s.color || 'var(--text-primary)' }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-header"><span style={{ fontWeight: 700 }}>Tags</span></div>
                <div className="card-body">
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(chapter.tags || []).length === 0 ? (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>No tags</span>
                    ) : (
                      chapter.tags.map(tag => <span key={tag} className="chip">{tag}</span>)
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Log Study Modal */}
      <AnimatePresence>
        {loggingStudy && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLoggingStudy(false)}>
            <motion.div className="modal modal-sm" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ fontWeight: 700 }}>Log Study Session</h3>
                <button className="btn btn-icon btn-sm" onClick={() => setLoggingStudy(false)}><X size={16} /></button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Session Type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                      { val: 'studied', label: 'Studied', emoji: '📚' },
                      { val: 'revised', label: 'Revised', emoji: '🔄' },
                      { val: 'quick', label: 'Quick', emoji: '⚡' },
                      { val: 'partial', label: 'Partial', emoji: '📝' },
                      { val: 'completed', label: 'Completed', emoji: '✅' }
                    ].map(opt => (
                      <button key={opt.val} onClick={() => setLogForm(p => ({ ...p, log_type: opt.val }))}
                        style={{
                          padding: '10px 6px', borderRadius: 'var(--radius-lg)',
                          background: logForm.log_type === opt.val ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                          border: `1px solid ${logForm.log_type === opt.val ? 'rgba(255,107,53,0.3)' : 'var(--border-default)'}`,
                          color: logForm.log_type === opt.val ? 'var(--accent)' : 'var(--text-secondary)',
                          cursor: 'pointer', fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-xs)', fontWeight: 600,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                          transition: 'all var(--duration-fast)'
                        }}
                      >
                        <span>{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (minutes)</label>
                  <input className="form-input" type="number" min="1" max="480" value={logForm.duration} onChange={e => setLogForm(p => ({ ...p, duration: parseInt(e.target.value) || 30 }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Quality Rating (1-5)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1,2,3,4,5].map(r => (
                      <button key={r} onClick={() => setLogForm(p => ({ ...p, quality_rating: r }))}
                        style={{
                          flex: 1, padding: '8px', borderRadius: 'var(--radius-md)',
                          background: logForm.quality_rating === r ? 'var(--accent)' : 'var(--bg-elevated)',
                          border: `1px solid ${logForm.quality_rating === r ? 'var(--accent)' : 'var(--border-default)'}`,
                          color: logForm.quality_rating === r ? '#fff' : 'var(--text-secondary)',
                          cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 700
                        }}
                      >{r}</button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes (optional)</label>
                  <textarea className="form-textarea" rows={2} placeholder="What did you focus on?" value={logForm.notes} onChange={e => setLogForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-md" onClick={() => setLoggingStudy(false)}>Cancel</button>
                <button className="btn btn-primary btn-md" onClick={logStudy}>
                  <Check size={15} /> Log Session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

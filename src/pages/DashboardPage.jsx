import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame, BookOpen, CheckCircle, AlertTriangle,
  Calendar, TrendingUp, Clock, Zap,
  ChevronRight, Play, Star, ArrowRight
} from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { dailyStatsService } from '../services/db'
import { format, isTomorrow, parseISO } from 'date-fns'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useNavigate } from 'react-router-dom'

const STAGGER = {
  container: { animate: { transition: { staggerChildren: 0.07 } } },
  item: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4,0,0.2,1] } } }
}

export default function DashboardPage() {
  const { user, profile } = useAuth()
  // BUG FIX: removed unused destructures (studyLogs, loadAll)
  const { todayRevisions, missedRevisions, upcomingRevisions, dailyStats, subjects, chapters, completeRevision } = useData()
  const { toast } = useApp()
  const navigate = useNavigate()
  const [completingId, setCompletingId] = useState(null)
  const [ratingModal, setRatingModal] = useState(null)

  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const todayStats = dailyStats.find(s => s.date === today)
    const streak = profile?.streak_count || 0
    return {
      todayPending: todayRevisions.filter(r => r.status === 'pending').length,
      todayDone: todayStats?.revisions_completed || 0,
      missed: missedRevisions.length,
      streak,
      studyMinutesToday: todayStats?.study_minutes || 0,
    }
  }, [todayRevisions, missedRevisions, dailyStats, profile])

  const chartData = useMemo(() => {
    const last14 = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = format(d, 'yyyy-MM-dd')
      const stat = dailyStats.find(s => s.date === key)
      last14.push({ date: format(d, 'MMM d'), revisions: stat?.revisions_completed || 0 })
    }
    return last14
  }, [dailyStats])

  function handleComplete(revision) {
    setRatingModal(revision)
  }

  async function submitRating(revision, rating) {
    setRatingModal(null)
    setCompletingId(revision.id)
    // BUG FIX: completeRevision already updates dailyStats internally — no duplicate call here
    await completeRevision(revision.id, rating, '')
    // Update daily stats once with full context
    await dailyStatsService.upsert(user.id, {
      date: format(new Date(), 'yyyy-MM-dd'),
      revisions: 1,
      minutes: revision.chapters?.estimated_revision_time || 0
    })
    toast({ title: 'Revision completed!', message: `+${rating * 10} revision score` }, 'success')
    setCompletingId(null)
  }

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em', marginBottom: '6px' }}>
          {greeting}, {profile?.full_name?.split(' ')[0] || 'Student'} 👋
        </h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-base)' }}>
          {stats.todayPending > 0
            ? `You have ${stats.todayPending} revision${stats.todayPending > 1 ? 's' : ''} due today.`
            : "You're all caught up for today. Keep the streak going!"}
        </p>
      </motion.div>

      {/* Top stats row */}
      <motion.div
        variants={STAGGER.container}
        initial="initial"
        animate="animate"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}
      >
        {[
          { icon: Flame, label: 'Day Streak', value: `${stats.streak} days`, color: 'var(--accent)', bg: 'var(--accent-soft)' },
          { icon: CheckCircle, label: 'Done Today', value: stats.todayDone, color: 'var(--color-success)', bg: 'var(--color-success-soft)' },
          { icon: AlertTriangle, label: 'Missed', value: stats.missed, color: stats.missed > 0 ? 'var(--color-danger)' : 'var(--color-success)', bg: stats.missed > 0 ? 'var(--color-danger-soft)' : 'var(--color-success-soft)' },
          { icon: Clock, label: 'Study Time', value: `${stats.studyMinutesToday} min`, color: 'var(--color-info)', bg: 'var(--color-info-soft)' }
        ].map((stat) => (
          <motion.div key={stat.label} variants={STAGGER.item} className="stat-card">
            <div className="stat-card-icon" style={{ background: stat.bg, color: stat.color }}>
              <stat.icon size={18} />
            </div>
            <div className="stat-card-value">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Today's Revisions */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
            <div className="card-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} color="var(--accent)" />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Today's Revisions</span>
                  {stats.todayPending > 0 && <span className="badge badge-accent">{stats.todayPending}</span>}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  {format(new Date(), 'EEEE, MMMM d')}
                </div>
              </div>
              <button onClick={() => navigate('/planner')} className="btn btn-ghost btn-sm" style={{ gap: '4px' }}>
                View all <ChevronRight size={14} />
              </button>
            </div>
            <div style={{ padding: '8px' }}>
              {todayRevisions.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px' }}>
                  <div className="empty-state-icon" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
                    <CheckCircle size={24} />
                  </div>
                  <div className="empty-state-title">All clear!</div>
                  <div className="empty-state-desc">No revisions scheduled for today. Add chapters to start tracking.</div>
                </div>
              ) : (
                <AnimatePresence>
                  {todayRevisions.map((rev, idx) => (
                    <RevisionCard
                      key={rev.id}
                      revision={rev}
                      onComplete={handleComplete}
                      completing={completingId === rev.id}
                      delay={idx * 0.05}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>

          {/* Missed revisions */}
          {missedRevisions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card" style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
              <div className="card-header" style={{ borderColor: 'rgba(248,113,113,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} color="var(--color-danger)" />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Missed Revisions</span>
                  <span className="badge badge-danger">{missedRevisions.length}</span>
                </div>
              </div>
              <div style={{ padding: '8px' }}>
                {missedRevisions.slice(0, 5).map((rev, i) => (
                  <RevisionCard key={rev.id} revision={rev} onComplete={handleComplete} completing={completingId === rev.id} delay={i * 0.05} missed />
                ))}
                {missedRevisions.length > 5 && (
                  <button onClick={() => navigate('/planner')} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                    View {missedRevisions.length - 5} more missed
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Chart */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="var(--accent)" />
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>14-Day Activity</span>
              </div>
            </div>
            <div style={{ padding: '16px 24px 24px' }}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }} axisLine={false} tickLine={false} interval={2} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 10, fontSize: 12, fontFamily: 'var(--font-sans)' }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                    itemStyle={{ color: 'var(--accent)' }}
                  />
                  <Area type="monotone" dataKey="revisions" stroke="var(--accent)" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: 'var(--accent)' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Streak card */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            style={{
              background: 'linear-gradient(135deg, var(--accent) 0%, #FF8C42 60%, #FFB347 100%)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', bottom: -30, right: 30, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Flame size={20} color="rgba(255,255,255,0.9)" />
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Current Streak</span>
              </div>
              <div style={{ fontSize: '52px', fontWeight: 800, color: '#fff', letterSpacing: '-0.05em', lineHeight: 1 }}>
                {stats.streak}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'var(--text-xs)', marginTop: '4px' }}>days in a row</div>
              {profile?.longest_streak > 0 && (
                <div style={{ marginTop: '16px', padding: '8px 12px', background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-lg)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Star size={12} color="rgba(255,255,255,0.8)" />
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>Best: {profile.longest_streak} days</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Upcoming */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="var(--text-secondary)" />
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Upcoming</span>
              </div>
            </div>
            <div style={{ padding: '8px' }}>
              {upcomingRevisions.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                  No upcoming revisions
                </div>
              ) : (
                upcomingRevisions.slice(0, 6).map((rev) => (
                  <div key={rev.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', borderRadius: 'var(--radius-lg)',
                    transition: 'background var(--duration-fast)', cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: rev.chapters?.subjects?.color || 'var(--accent)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rev.chapters?.name}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{rev.chapters?.subjects?.name}</div>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                      {/* BUG FIX: append T00:00:00 to avoid timezone-shifted date parsing */}
                      {isTomorrow(parseISO(rev.scheduled_date + 'T00:00:00')) ? 'Tomorrow' :
                        format(parseISO(rev.scheduled_date + 'T00:00:00'), 'MMM d')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Subjects overview */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} color="var(--text-secondary)" />
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Subjects</span>
              </div>
              <button onClick={() => navigate('/chapters')} className="btn btn-ghost btn-sm"><ArrowRight size={14} /></button>
            </div>
            <div style={{ padding: '8px' }}>
              {subjects.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <button onClick={() => navigate('/chapters')} className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                    Add your first subject
                  </button>
                </div>
              ) : (
                subjects.slice(0, 5).map(sub => {
                  const subChapters = chapters.filter(c => c.subject_id === sub.id)
                  const done = subChapters.filter(c => c.status === 'completed').length
                  const pct = subChapters.length ? Math.round(done / subChapters.length * 100) : 0
                  return (
                    <div key={sub.id} style={{ padding: '10px 12px', borderRadius: 'var(--radius-lg)', marginBottom: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: sub.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{sub.name}</span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{pct}%</span>
                      </div>
                      <div className="progress-bar progress-bar-sm">
                        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: sub.color }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>

          {/* Quick focus */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            onClick={() => navigate('/focus')}
            style={{
              padding: '20px', background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px',
              transition: 'all var(--duration-base) var(--ease-smooth)'
            }}
            whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}
            whileTap={{ scale: 0.98 }}
          >
            <div style={{ width: 44, height: 44, background: 'var(--accent-soft)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
              <Zap size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>Start Focus Session</div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>Deep work mode</div>
            </div>
            <Play size={16} color="var(--accent)" />
          </motion.div>
        </div>
      </div>

      {/* Rating Modal */}
      <AnimatePresence>
        {ratingModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRatingModal(null)}>
            <motion.div className="modal modal-sm" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Rate this revision</h3>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginTop: '2px' }}>{ratingModal.chapters?.name}</p>
                </div>
              </div>
              <div className="modal-body">
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: '20px' }}>How well did you remember this content?</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {[
                    { val: 1, label: 'Blank', color: '#F87171' },
                    { val: 2, label: 'Hard', color: '#FB923C' },
                    { val: 3, label: 'OK', color: '#FBBF24' },
                    { val: 4, label: 'Good', color: '#34D399' },
                    { val: 5, label: 'Perfect', color: '#4ADE80' }
                  ].map(r => (
                    <button key={r.val} onClick={() => submitRating(ratingModal, r.val)}
                      style={{
                        padding: '14px 8px', border: `1.5px solid ${r.color}33`,
                        borderRadius: 'var(--radius-lg)', background: `${r.color}11`,
                        color: r.color, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        transition: 'all var(--duration-fast)'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${r.color}22`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${r.color}11`; e.currentTarget.style.transform = '' }}
                    >
                      <span style={{ fontSize: '20px' }}>{r.val}</span>
                      <span style={{ fontSize: '10px', fontWeight: 500 }}>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function RevisionCard({ revision, onComplete, completing, delay = 0, missed }) {
  const chapter = revision.chapters
  const subject = chapter?.subjects
  const priorityColors = { low: 'var(--priority-low)', medium: 'var(--priority-medium)', high: 'var(--priority-high)', critical: 'var(--priority-critical)' }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10, height: 0 }}
      transition={{ delay, duration: 0.25 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 14px', borderRadius: 'var(--radius-lg)',
        border: '1px solid transparent', marginBottom: '4px',
        transition: 'all var(--duration-fast)'
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
      onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = 'transparent' }}
    >
      <div style={{ width: 3, height: 36, borderRadius: '2px', background: priorityColors[chapter?.priority || 'medium'], flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {chapter?.name}
          </span>
          {missed && <span className="badge badge-danger" style={{ flexShrink: 0 }}>Missed</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: subject?.color || 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{subject?.name}</span>
          {chapter?.estimated_revision_time && (
            <>
              <span style={{ color: 'var(--border-strong)' }}>·</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{chapter.estimated_revision_time} min</span>
            </>
          )}
        </div>
      </div>
      <button className="btn btn-primary btn-sm" onClick={() => onComplete(revision)} disabled={completing} style={{ flexShrink: 0 }}>
        {completing ? <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <CheckCircle size={14} />}
        Done
      </button>
    </motion.div>
  )
}

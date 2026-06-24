import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Calendar
} from 'lucide-react'
import {
  format, addMonths, subMonths, addWeeks, subWeeks,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isBefore,
  isSameDay
} from 'date-fns'
import { revisionService } from '../services/db'
import { useAuth } from '../contexts/AuthContext'

export default function CalendarPage() {
  const { user } = useAuth()
  const [view, setView] = useState('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [allRevisions, setAllRevisions] = useState([])
  const [loadingRevisions, setLoadingRevisions] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)

  // BUG FIX: use useEffect (not useMemo) for async side effects
  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoadingRevisions(true)
    const start = format(subMonths(currentDate, 1), 'yyyy-MM-dd')
    const end = format(addMonths(currentDate, 2), 'yyyy-MM-dd')
    revisionService.getByDateRange(user.id, start, end).then(({ data }) => {
      if (!cancelled) {
        setAllRevisions(data || [])
        setLoadingRevisions(false)
      }
    })
    return () => { cancelled = true }
  }, [user?.id, currentDate])

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate))
    const end = endOfWeek(endOfMonth(currentDate))
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate)
    const end = endOfWeek(currentDate)
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  // BUG FIX: memoize getRevisionsForDay as a stable callback so it can be used in useMemo safely
  const getRevisionsForDay = useCallback((date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return allRevisions.filter(r => r.scheduled_date === dateStr)
  }, [allRevisions])

  const agendaDays = useMemo(() => {
    const days = []
    for (let i = -2; i < 30; i++) {
      const d = new Date(currentDate)
      d.setDate(d.getDate() + i)
      const revs = getRevisionsForDay(d)
      if (revs.length > 0) days.push({ date: d, revisions: revs })
    }
    return days
  }, [currentDate, getRevisionsForDay])

  function navigateDate(dir) {
    if (view === 'month') setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1))
    else if (view === 'week') setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1))
    else setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() + dir * 7); return n })
  }

  const dayRevisions = selectedDay ? getRevisionsForDay(selectedDay) : []

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.04em' }}>Calendar</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
            {format(currentDate, 'MMMM yyyy')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="tabs" style={{ width: 'auto' }}>
            {['month','week','agenda'].map(v => (
              <button key={v} className={`tab-item${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigateDate(-1)}><ChevronLeft size={14} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(new Date())}>Today</button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigateDate(1)}><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDay ? '1fr 300px' : '1fr', gap: '20px' }}>
        {/* Main calendar */}
        <div className="card">
          {/* Day headers - only for month/week views */}
          {view !== 'agenda' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-subtle)' }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="calendar-day-header" style={{ padding: '12px 8px' }}>{d}</div>
              ))}
            </div>
          )}

          {view === 'month' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px', gap: '2px' }}>
              {monthDays.map(day => {
                const revs = getRevisionsForDay(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isPast = isBefore(day, new Date()) && !isToday(day)
                const isSelected = selectedDay && isSameDay(day, selectedDay)
                const completedRevs = revs.filter(r => r.status === 'completed')
                const missedRevs = revs.filter(r => r.status === 'pending' && isPast)
                const pendingRevs = revs.filter(r => r.status === 'pending' && !isPast)

                return (
                  <motion.div
                    key={day.toISOString()}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    style={{
                      minHeight: 90,
                      padding: '8px',
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent-soft)' :
                        isToday(day) ? 'var(--bg-elevated)' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(255,107,53,0.3)' :
                        isToday(day) ? 'var(--border-default)' : 'transparent'}`,
                      opacity: isCurrentMonth ? 1 : 0.3,
                      transition: 'all var(--duration-fast)'
                    }}
                  >
                    <div style={{
                      width: 26, height: 26,
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'var(--text-sm)', fontWeight: isToday(day) ? 800 : 500,
                      color: isToday(day) ? 'var(--accent)' : isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                      marginBottom: '4px'
                    }}>
                      {format(day, 'd')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {pendingRevs.slice(0, 2).map(r => (
                        <div key={r.id} style={{
                          fontSize: '10px', fontWeight: 600,
                          padding: '1px 5px',
                          borderRadius: '3px',
                          background: r.chapters?.subjects?.color ? r.chapters.subjects.color + '28' : 'var(--accent-soft)',
                          color: r.chapters?.subjects?.color || 'var(--accent)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {r.chapters?.name}
                        </div>
                      ))}
                      {missedRevs.length > 0 && (
                        <div style={{
                          fontSize: '10px', fontWeight: 600,
                          padding: '1px 5px', borderRadius: '3px',
                          background: 'var(--color-danger-soft)',
                          color: 'var(--color-danger)'
                        }}>
                          {missedRevs.length} missed
                        </div>
                      )}
                      {completedRevs.length > 0 && (
                        <div style={{
                          fontSize: '10px', fontWeight: 600,
                          padding: '1px 5px', borderRadius: '3px',
                          background: 'var(--color-success-soft)',
                          color: 'var(--color-success)'
                        }}>
                          {completedRevs.length} done
                        </div>
                      )}
                      {revs.length > 3 && (
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', paddingLeft: '4px' }}>
                          +{revs.length - 3} more
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {view === 'week' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px', gap: '4px' }}>
              {weekDays.map(day => {
                const revs = getRevisionsForDay(day)
                const isPast = isBefore(day, new Date()) && !isToday(day)
                return (
                  <div key={day.toISOString()} style={{
                    minHeight: 200,
                    padding: '10px',
                    borderRadius: 'var(--radius-lg)',
                    background: isToday(day) ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                    border: `1px solid ${isToday(day) ? 'rgba(255,107,53,0.2)' : 'var(--border-subtle)'}`
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {format(day, 'EEE')}
                      </div>
                      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: isToday(day) ? 'var(--accent)' : 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                        {format(day, 'd')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {revs.map(r => (
                        <div key={r.id} style={{
                          padding: '5px 7px',
                          borderRadius: 'var(--radius-sm)',
                          background: r.status === 'completed' ? 'var(--color-success-soft)' :
                            isPast && r.status === 'pending' ? 'var(--color-danger-soft)' :
                            r.chapters?.subjects?.color ? r.chapters.subjects.color + '22' : 'var(--bg-overlay)',
                          border: `1px solid ${r.status === 'completed' ? 'rgba(74,222,128,0.2)' :
                            isPast && r.status === 'pending' ? 'rgba(248,113,113,0.2)' : 'var(--border-subtle)'}`,
                          fontSize: '10px', fontWeight: 600,
                          color: r.status === 'completed' ? 'var(--color-success)' :
                            isPast && r.status === 'pending' ? 'var(--color-danger)' :
                            r.chapters?.subjects?.color || 'var(--text-secondary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {r.chapters?.name}
                        </div>
                      ))}
                      {revs.length === 0 && (
                        <div style={{ fontSize: '10px', color: 'var(--text-disabled)', textAlign: 'center', paddingTop: '8px' }}>
                          Free
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {view === 'agenda' && (
            <div style={{ padding: '16px' }}>
              {loadingRevisions ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                  <div className="loading-spinner" />
                </div>
              ) : agendaDays.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px' }}>
                  <div className="empty-state-icon"><Calendar size={24} /></div>
                  <div className="empty-state-title">No upcoming revisions</div>
                  <div className="empty-state-desc">Add chapters and generate revisions to fill your schedule.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {agendaDays.map(({ date, revisions: dayRevs }) => (
                    <div key={date.toISOString()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{
                          width: 36, height: 36,
                          borderRadius: 'var(--radius-lg)',
                          background: isToday(date) ? 'var(--accent)' : 'var(--bg-elevated)',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <div style={{ fontSize: '9px', fontWeight: 600, color: isToday(date) ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {format(date, 'EEE')}
                          </div>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: isToday(date) ? '#fff' : 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                            {format(date, 'd')}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                            {isToday(date) ? 'Today' : format(date, 'EEEE, MMMM d')}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                            {dayRevs.length} revision{dayRevs.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ marginLeft: '48px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {dayRevs.map(rev => {
                          const isPast = isBefore(date, new Date()) && !isToday(date)
                          return (
                            <div key={rev.id} style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '10px 14px',
                              background: 'var(--bg-elevated)',
                              border: `1px solid ${rev.status === 'completed' ? 'rgba(74,222,128,0.2)' :
                                isPast ? 'rgba(248,113,113,0.15)' : 'var(--border-subtle)'}`,
                              borderRadius: 'var(--radius-lg)'
                            }}>
                              <div style={{
                                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                background: rev.status === 'completed' ? 'var(--color-success)' :
                                  isPast ? 'var(--color-danger)' :
                                  rev.chapters?.subjects?.color || 'var(--accent)'
                              }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {rev.chapters?.name}
                                </div>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                                  {rev.chapters?.subjects?.name} · Day +{rev.interval_days}
                                </div>
                              </div>
                              <span className={`badge ${rev.status === 'completed' ? 'badge-success' : isPast ? 'badge-danger' : 'badge-default'}`}>
                                {rev.status === 'completed' ? 'Done' : isPast ? 'Missed' : 'Pending'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Day detail panel */}
        <AnimatePresence>
          {selectedDay && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="card"
              style={{ alignSelf: 'start', position: 'sticky', top: 'calc(var(--topbar-height) + 24px)' }}
            >
              <div className="card-header">
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {isToday(selectedDay) ? 'Today' : format(selectedDay, 'EEEE')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
                    {format(selectedDay, 'MMMM d, yyyy')}
                  </div>
                </div>
                <button className="btn btn-icon btn-sm" onClick={() => setSelectedDay(null)}>
                  <ChevronLeft size={14} />
                </button>
              </div>
              <div style={{ padding: '8px' }}>
                {dayRevisions.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                    No revisions scheduled
                  </div>
                ) : (
                  dayRevisions.map(rev => {
                    const isPast = isBefore(selectedDay, new Date()) && !isToday(selectedDay)
                    return (
                      <div key={rev.id} style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: '6px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-elevated)'
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {rev.chapters?.name}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {rev.chapters?.subjects?.color && (
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: rev.chapters.subjects.color }} />
                          )}
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                            {rev.chapters?.subjects?.name}
                          </span>
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <span className={`badge ${rev.status === 'completed' ? 'badge-success' : isPast ? 'badge-danger' : isToday(selectedDay) ? 'badge-accent' : 'badge-default'}`}>
                            {rev.status === 'completed' ? '✓ Done' : isPast ? 'Missed' : isToday(selectedDay) ? 'Due Today' : 'Scheduled'}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

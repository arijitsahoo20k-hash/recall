import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { TrendingUp, Target, Flame, Clock } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { format, subDays, startOfWeek, eachDayOfInterval } from 'date-fns'

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)', padding: '10px 14px',
      boxShadow: 'var(--shadow-lg)', fontFamily: 'var(--font-sans)'
    }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '6px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: p.color || 'var(--accent)' }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  // BUG FIX: removed unused 'studyLogs' from destructure
  const { dailyStats, subjects, chapters, todayRevisions, missedRevisions } = useData()
  const { profile } = useAuth()
  const [timeRange, setTimeRange] = useState('30')

  const analyticsData = useMemo(() => {
    const days = parseInt(timeRange)
    const end = new Date()
    const start = subDays(end, days)

    const dailyChart = eachDayOfInterval({ start, end }).map(day => {
      const key = format(day, 'yyyy-MM-dd')
      const stat = dailyStats.find(s => s.date === key)
      return {
        date: format(day, days > 14 ? 'MMM d' : 'EEE d'),
        revisions: stat?.revisions_completed || 0,
        minutes: Math.round((stat?.study_minutes || 0) / 60 * 10) / 10
      }
    })

    const subjectRadar = subjects.map(sub => {
      const subChapters = chapters.filter(c => c.subject_id === sub.id)
      const done = subChapters.filter(c => c.status === 'completed').length
      const pct = subChapters.length ? Math.round(done / subChapters.length * 100) : 0
      return { subject: sub.name.substring(0, 8), value: pct, color: sub.color }
    })

    const priorityCounts = { low: 0, medium: 0, high: 0, critical: 0 }
    chapters.forEach(c => { priorityCounts[c.priority] = (priorityCounts[c.priority] || 0) + 1 })
    const priorityPie = Object.entries(priorityCounts).map(([name, value]) => ({
      name, value,
      color: { low: '#4ADE80', medium: '#FBBF24', high: '#FB923C', critical: '#F87171' }[name]
    })).filter(p => p.value > 0)

    // Last 12 weeks heatmap
    const heatmapData = []
    for (let w = 11; w >= 0; w--) {
      const weekStart = startOfWeek(subDays(end, w * 7))
      const week = []
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart)
        day.setDate(day.getDate() + d)
        const key = format(day, 'yyyy-MM-dd')
        const stat = dailyStats.find(s => s.date === key)
        week.push({ date: key, count: stat?.revisions_completed || 0 })
      }
      heatmapData.push(week)
    }

    const totalRevisions = dailyStats.reduce((s, d) => s + (d.revisions_completed || 0), 0)
    const totalMinutes = dailyStats.reduce((s, d) => s + (d.study_minutes || 0), 0)
    const avgDaily = days > 0 ? (totalRevisions / days).toFixed(1) : 0
    const completionRate = chapters.length ? Math.round(chapters.filter(c => c.status === 'completed').length / chapters.length * 100) : 0

    return { dailyChart, subjectRadar, priorityPie, heatmapData, totalRevisions, totalMinutes, avgDaily, completionRate }
  }, [dailyStats, subjects, chapters, timeRange])

  const STAGGER = {
    container: { animate: { transition: { staggerChildren: 0.08 } } },
    item: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35 } } }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.04em' }}>Analytics</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>Your revision performance and insights</p>
        </div>
        <div className="tabs" style={{ width: 'auto' }}>
          {[['7', '7D'], ['30', '30D'], ['90', '90D']].map(([val, label]) => (
            <button key={val} className={`tab-item${timeRange === val ? ' active' : ''}`} onClick={() => setTimeRange(val)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <motion.div variants={STAGGER.container} initial="initial" animate="animate"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { icon: TrendingUp, label: 'Total Revisions', value: analyticsData.totalRevisions, color: 'var(--accent)', bg: 'var(--accent-soft)' },
          { icon: Clock, label: 'Study Hours', value: `${(analyticsData.totalMinutes / 60).toFixed(1)}h`, color: 'var(--color-info)', bg: 'var(--color-info-soft)' },
          { icon: Flame, label: 'Current Streak', value: `${profile?.streak_count || 0}d`, color: 'var(--color-warning)', bg: 'var(--color-warning-soft)' },
          { icon: Target, label: 'Completion', value: `${analyticsData.completionRate}%`, color: 'var(--color-success)', bg: 'var(--color-success-soft)' }
        ].map(stat => (
          <motion.div key={stat.label} variants={STAGGER.item} className="stat-card">
            <div className="stat-card-icon" style={{ background: stat.bg, color: stat.color }}><stat.icon size={18} /></div>
            <div className="stat-card-value">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Daily revisions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
          <div className="card-header"><div style={{ fontWeight: 700 }}>Daily Revisions</div></div>
          <div style={{ padding: '16px 16px 20px' }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={analyticsData.dailyChart} barSize={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }} axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(analyticsData.dailyChart.length / 6) - 1)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }} axisLine={false} tickLine={false} width={25} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Bar dataKey="revisions" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Revisions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Study minutes */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card">
          <div className="card-header"><div style={{ fontWeight: 700 }}>Study Minutes</div></div>
          <div style={{ padding: '16px 16px 20px' }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={analyticsData.dailyChart}>
                <defs>
                  <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }} axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(analyticsData.dailyChart.length / 6) - 1)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }} axisLine={false} tickLine={false} width={25} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Area type="monotone" dataKey="minutes" stroke="#60A5FA" strokeWidth={2} fill="url(#hoursGrad)" name="Minutes" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: subjects.length >= 3 ? '1fr 1fr 1fr' : '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Subject radar — only render when there are enough subjects */}
        {analyticsData.subjectRadar.length >= 3 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card">
            <div className="card-header"><div style={{ fontWeight: 700 }}>Subject Coverage</div></div>
            <div style={{ padding: '16px 16px 20px' }}>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={analyticsData.subjectRadar}>
                  <PolarGrid stroke="var(--border-subtle)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }} />
                  <Radar name="Coverage" dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Priority distribution */}
        {analyticsData.priorityPie.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card">
            <div className="card-header"><div style={{ fontWeight: 700 }}>Priority Split</div></div>
            <div style={{ padding: '16px 16px 20px' }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={analyticsData.priorityPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {analyticsData.priorityPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {analyticsData.priorityPie.map(p => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '2px', background: p.color }} />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{p.name} ({p.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Insights */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card">
          <div className="card-header"><div style={{ fontWeight: 700 }}>Insights</div></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { icon: '🔥', label: 'Study Velocity', value: `${analyticsData.avgDaily} / day`, desc: 'Avg revisions per day' },
              {
                icon: '📊', label: 'Revision Health',
                value: `${Math.min(100, Math.round(
                  (1 - missedRevisions.length / Math.max(1, missedRevisions.length + todayRevisions.length)) * 100
                ))}%`,
                desc: 'Low missed revisions'
              },
              {
                icon: '⚡', label: 'Consistency',
                value: `${Math.round(dailyStats.filter(s => s.streak_day).length / Math.max(1, parseInt(timeRange)) * 100)}%`,
                desc: `Active ${parseInt(timeRange)} days`
              }
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)'
              }}>
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{item.label}</div>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{item.value}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-disabled)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Contribution Heatmap */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="card">
        <div className="card-header">
          <div style={{ fontWeight: 700 }}>Activity Heatmap</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            <span>Less</span>
            {[0,1,2,3,4].map(l => (
              <div key={l} style={{
                width: 10, height: 10, borderRadius: '2px',
                background: l === 0 ? 'var(--bg-elevated)' : `rgba(255,107,53,${l * 0.22})`
              }} />
            ))}
            <span>More</span>
          </div>
        </div>
        <div style={{ padding: '16px 24px 24px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: '3px', minWidth: 'max-content' }}>
            {analyticsData.heatmapData.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {week.map((day, di) => {
                  const level = day.count === 0 ? 0 : day.count <= 2 ? 1 : day.count <= 4 ? 2 : day.count <= 6 ? 3 : 4
                  return (
                    <div
                      key={di}
                      title={`${day.date}: ${day.count} revision${day.count !== 1 ? 's' : ''}`}
                      style={{
                        width: 14, height: 14, borderRadius: '3px',
                        background: level === 0 ? 'var(--bg-elevated)' : `rgba(255,107,53,${level * 0.22 + 0.08})`,
                        cursor: 'pointer',
                        transition: 'transform var(--duration-fast)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.4)'}
                      onMouseLeave={e => e.currentTarget.style.transform = ''}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

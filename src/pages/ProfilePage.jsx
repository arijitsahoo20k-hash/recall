import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Camera, User, Calendar, Target, Flame,
  BookOpen, TrendingUp, Clock, Award, Edit3,
  Check, X, Upload
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { profileService } from '../services/db'
import { useApp } from '../contexts/AppContext'
import { format } from 'date-fns'

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const { subjects, chapters, dailyStats } = useData()
  const { toast } = useApp()
  const fileInputRef = useRef(null)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    exam_target: profile?.exam_target || '',
    exam_date: profile?.exam_date || ''
  })

  async function handleSave() {
    setSaving(true)
    await profileService.update(user.id, form)
    await refreshProfile()
    setSaving(false)
    setEditing(false)
    toast('Profile updated', 'success')
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset so selecting the same file again still fires onChange
    e.target.value = ''
    setUploadingAvatar(true)
    const { error } = await profileService.uploadAvatar(user.id, file)
    if (error) toast('Failed to upload avatar', 'error')
    else {
      await refreshProfile()
      toast('Avatar updated!', 'success')
    }
    setUploadingAvatar(false)
  }

  const stats = {
    streak: profile?.streak_count || 0,
    longestStreak: profile?.longest_streak || 0,
    totalRevisions: profile?.total_revisions || 0,
    subjects: subjects.length,
    chapters: chapters.length,
    studyHours: Math.round((dailyStats.reduce((s, d) => s + (d.study_minutes || 0), 0)) / 60 * 10) / 10,
    completedChapters: chapters.filter(c => c.status === 'completed').length
  }

  const examDaysLeft = profile?.exam_date
    ? Math.max(0, Math.ceil((new Date(profile.exam_date) - new Date()) / 86400000))
    : null

  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{ marginBottom: '20px', overflow: 'visible' }}
      >
        {/* Cover gradient */}
        <div style={{
          height: 120,
          background: 'linear-gradient(135deg, var(--accent) 0%, #FF8C42 50%, #7C3AED 100%)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          position: 'relative'
        }} />

        <div style={{ padding: '0 28px 28px', position: 'relative' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', width: 'fit-content', marginTop: '-44px', marginBottom: '16px' }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'var(--accent)',
              border: '4px solid var(--bg-overlay)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'var(--text-2xl)', fontWeight: 800, color: '#fff',
              overflow: 'hidden', position: 'relative'
            }}>
              {profile?.avatar_url ? (
                <img src={`${profile.avatar_url}?t=${profile.updated_at || ''}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : initials}
              {uploadingAvatar && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div className="loading-spinner" style={{ width: 24, height: 24, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--accent)',
                border: '2px solid var(--bg-overlay)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff'
              }}
            >
              <Camera size={13} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 300 }}>
                  <input className="form-input" style={{ height: 40, fontSize: 'var(--text-xl)', fontWeight: 800 }}
                    placeholder="Your name" value={form.full_name}
                    onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} autoFocus />
                  <input className="form-input" placeholder="Target exam (e.g. JEE, NEET, UPSC)"
                    value={form.exam_target} onChange={e => setForm(p => ({ ...p, exam_target: e.target.value }))} />
                  <div>
                    <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Exam Date</label>
                    <input className="form-input" type="date" value={form.exam_date}
                      onChange={e => setForm(p => ({ ...p, exam_date: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                      {saving ? <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Check size={13} />}
                      Save
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}><X size={13} /></button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
                    {profile?.full_name || 'Student'}
                  </h2>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginTop: '2px' }}>
                    {user?.email}
                  </p>
                  {profile?.exam_target && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      <span className="badge badge-accent">{profile.exam_target}</span>
                      {examDaysLeft !== null && (
                        <span className="badge badge-default">
                          <Calendar size={10} /> {examDaysLeft} days left
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            {!editing && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(true); setForm({ full_name: profile?.full_name || '', exam_target: profile?.exam_target || '', exam_date: profile?.exam_date || '' }) }}>
                <Edit3 size={13} /> Edit
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}
      >
        {[
          { icon: Flame, label: 'Current Streak', value: `${stats.streak}d`, color: 'var(--accent)', bg: 'var(--accent-soft)' },
          { icon: TrendingUp, label: 'Total Revisions', value: stats.totalRevisions, color: 'var(--color-info)', bg: 'var(--color-info-soft)' },
          { icon: Clock, label: 'Study Hours', value: `${stats.studyHours}h`, color: 'var(--color-success)', bg: 'var(--color-success-soft)' },
          { icon: Award, label: 'Best Streak', value: `${stats.longestStreak}d`, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' }
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <div className="stat-card-icon" style={{ background: stat.bg, color: stat.color }}><stat.icon size={18} /></div>
            <div className="stat-card-value">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Subject progress */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card"
        style={{ marginBottom: '20px' }}
      >
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={16} color="var(--text-secondary)" />
            <span style={{ fontWeight: 700 }}>Subject Progress</span>
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {stats.completedChapters} / {stats.chapters} chapters done
          </span>
        </div>
        <div style={{ padding: '16px 24px' }}>
          {subjects.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', padding: '16px' }}>
              No subjects yet
            </div>
          ) : (
            subjects.map(sub => {
              const subChapters = chapters.filter(c => c.subject_id === sub.id)
              const done = subChapters.filter(c => c.status === 'completed').length
              const pct = subChapters.length ? Math.round(done / subChapters.length * 100) : 0
              return (
                <div key={sub.id} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: sub.color }} />
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{sub.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                        {done}/{subChapters.length} chapters
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)' }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <motion.div
                      className="progress-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.2, ease: [0.4,0,0.2,1] }}
                      style={{ background: sub.color }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </motion.div>

      {/* Member since */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          padding: '16px 20px',
          background: 'var(--bg-overlay)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
          <User size={16} />
        </div>
        <div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Account</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Member since {profile?.created_at ? format(new Date(profile.created_at), 'MMMM yyyy') : '—'}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

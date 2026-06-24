import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Palette, Bell, Target, Info,
  Moon, Sun, Monitor, Check, ChevronRight,
  Volume2, Clock
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { profileService } from '../services/db'
import RecallMark from '../components/common/RecallMark'

const ACCENT_PRESETS = [
  { label: 'Ember', color: '#FF6B35' },
  { label: 'Violet', color: '#7C3AED' },
  { label: 'Sky', color: '#0EA5E9' },
  { label: 'Emerald', color: '#10B981' },
  { label: 'Amber', color: '#F59E0B' },
  { label: 'Rose', color: '#F43F5E' },
  { label: 'Indigo', color: '#6366F1' },
  { label: 'Teal', color: '#14B8A6' }
]

function SettingRow({ icon: Icon, title, description, children, onClick, border = true }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 16px',
        borderBottom: border ? '1px solid var(--border-subtle)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background var(--duration-fast)',
        borderRadius: onClick ? 'var(--radius-lg)' : 0
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = 'var(--bg-elevated)' }}
      onMouseLeave={e => { e.currentTarget.style.background = '' }}
    >
      {Icon && (
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-elevated)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)', flexShrink: 0
        }}>
          <Icon size={17} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        {description && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '1px' }}>{description}</div>}
      </div>
      {children}
      {onClick && <ChevronRight size={14} color="var(--text-disabled)" />}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(!value) }}
      style={{
        width: 44, height: 24, borderRadius: 'var(--radius-full)',
        background: value ? 'var(--accent)' : 'var(--bg-float)',
        border: 'none', cursor: 'pointer',
        position: 'relative',
        transition: 'background var(--duration-base) var(--ease-smooth)',
        flexShrink: 0
      }}
    >
      <motion.div
        animate={{ x: value ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{
          width: 20, height: 20, borderRadius: '50%',
          background: '#fff',
          position: 'absolute', top: 2,
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
        }}
      />
    </button>
  )
}

export default function SettingsPage() {
  const { theme, changeTheme, accentColor, changeAccentColor } = useApp()
  const { user, profile, refreshProfile } = useAuth()

  const [notifEnabled, setNotifEnabled] = useState(profile?.notification_enabled ?? true)
  const [dailyGoal, setDailyGoal] = useState(profile?.daily_goal || 5)
  const [revisionMethod, setRevisionMethod] = useState(profile?.revision_method || 'ebbinghaus')

  async function saveSetting(key, value) {
    if (!user) return
    await profileService.update(user.id, { [key]: value })
    await refreshProfile()
  }

  async function requestNotifPermission() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    const enabled = perm === 'granted'
    setNotifEnabled(enabled)
    await saveSetting('notification_enabled', enabled)
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.04em' }}>Settings</h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
          Customize your Recall experience
        </p>
      </div>

      {/* Appearance */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ marginBottom: '16px' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Palette size={15} color="var(--accent)" />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>Appearance</span>
          </div>
        </div>

        {/* Theme selector */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            Theme
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              { val: 'light', label: 'Light', icon: Sun, preview: '#F4F4F8' },
              { val: 'dark', label: 'Dark', icon: Moon, preview: '#0A0A0F' },
              { val: 'amoled', label: 'AMOLED', icon: Monitor, preview: '#000000' }
            ].map(t => (
              <button
                key={t.val}
                onClick={() => changeTheme(t.val)}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-xl)',
                  background: theme === t.val ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                  border: `2px solid ${theme === t.val ? 'var(--accent)' : 'var(--border-default)'}`,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  transition: 'all var(--duration-base)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                }}
              >
                <div style={{
                  width: 40, height: 28,
                  borderRadius: 'var(--radius-sm)',
                  background: t.preview,
                  border: '1px solid var(--border-strong)'
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {theme === t.val && <Check size={11} color="var(--accent)" />}
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: theme === t.val ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {t.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div style={{ padding: '16px' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            Accent Color
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {ACCENT_PRESETS.map(preset => (
              <button
                key={preset.color}
                onClick={() => changeAccentColor(preset.color)}
                title={preset.label}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: preset.color, border: 'none', cursor: 'pointer',
                  outline: accentColor === preset.color ? `3px solid ${preset.color}` : '3px solid transparent',
                  outlineOffset: '2px',
                  transform: accentColor === preset.color ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all var(--duration-base) var(--ease-spring)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {accentColor === preset.color && <Check size={13} color="#fff" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card" style={{ marginBottom: '16px' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={15} color="var(--accent)" />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>Notifications</span>
          </div>
        </div>
        <SettingRow
          icon={Bell}
          title="Browser Notifications"
          description="Get reminded about due revisions"
        >
          <Toggle
            value={notifEnabled}
            onChange={async (v) => {
              if (v) await requestNotifPermission()
              else { setNotifEnabled(false); await saveSetting('notification_enabled', false) }
            }}
          />
        </SettingRow>
        <SettingRow
          icon={Volume2}
          title="Sound Effects"
          description="Play sounds on completion"
          border={false}
        >
          <Toggle value={true} onChange={() => {}} />
        </SettingRow>
      </motion.div>

      {/* Study Preferences */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="card" style={{ marginBottom: '16px' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={15} color="var(--accent)" />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>Study Preferences</span>
          </div>
        </div>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
              <Target size={17} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Daily Revision Goal</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Target revisions per day</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => { const v = Math.max(1, dailyGoal - 1); setDailyGoal(v); saveSetting('daily_goal', v) }}
                style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '16px', fontFamily: 'var(--font-sans)' }}
              >−</button>
              <span style={{ width: 32, textAlign: 'center', fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>{dailyGoal}</span>
              <button
                onClick={() => { const v = Math.min(50, dailyGoal + 1); setDailyGoal(v); saveSetting('daily_goal', v) }}
                style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '16px', fontFamily: 'var(--font-sans)' }}
              >+</button>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
              <Clock size={17} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Revision Scheduling Method</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Applies to new chapters going forward</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={() => { setRevisionMethod('ebbinghaus'); saveSetting('revision_method', 'ebbinghaus') }}
              style={{
                padding: '12px', borderRadius: 'var(--radius-lg)', textAlign: 'left', cursor: 'pointer',
                background: revisionMethod === 'ebbinghaus' ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                border: `1px solid ${revisionMethod === 'ebbinghaus' ? 'rgba(255,107,53,0.3)' : 'var(--border-default)'}`
              }}
            >
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: revisionMethod === 'ebbinghaus' ? 'var(--accent)' : 'var(--text-primary)' }}>
                Ebbinghaus
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                Fixed: 1, 3, 7, 14, 30, 60, 90 days
              </div>
            </button>
            <button
              onClick={() => { setRevisionMethod('formula'); saveSetting('revision_method', 'formula') }}
              style={{
                padding: '12px', borderRadius: 'var(--radius-lg)', textAlign: 'left', cursor: 'pointer',
                background: revisionMethod === 'formula' ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                border: `1px solid ${revisionMethod === 'formula' ? 'rgba(255,107,53,0.3)' : 'var(--border-default)'}`
              }}
            >
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: revisionMethod === 'formula' ? 'var(--accent)' : 'var(--text-primary)' }}>
                x² / 2^(x-1)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                SN + DSN tracks, until your exam date
              </div>
            </button>
          </div>
          {revisionMethod === 'formula' && (
            <div style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: '10px', lineHeight: 1.5 }}>
              SN (chapter short notes) revises at x² days after you create a chapter. DSN (daily/topic short notes) revises at 2^(x-1) days after you log a &ldquo;studied&rdquo; entry on a chapter. Both run until the exam date set in your profile, or 180 days out if none is set.
            </div>
          )}
        </div>
      </motion.div>

      {/* App info */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="card">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={15} color="var(--accent)" />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>About</span>
          </div>
        </div>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 48, height: 48, background: 'var(--accent)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px var(--accent-glow)' }}><RecallMark size={24} /></div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Recall</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Version 1.0.0 · Built with ❤️</div>
          </div>
        </div>
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
            Powered by React, Vite, and Supabase. Built as a premium revision planning tool using spaced repetition methodology — choose between the Ebbinghaus curve or the x² / 2^(x-1) formula method.
          </div>
        </div>
      </motion.div>
    </div>
  )
}

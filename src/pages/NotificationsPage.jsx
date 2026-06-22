import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle, Award, X } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { notificationService } from '../services/db'
import { formatDistanceToNow } from 'date-fns'

const TYPE_CONFIG = {
  info: { icon: Info, color: 'var(--color-info)', bg: 'var(--color-info-soft)' },
  warning: { icon: AlertTriangle, color: 'var(--color-warning)', bg: 'var(--color-warning-soft)' },
  success: { icon: CheckCircle, color: 'var(--color-success)', bg: 'var(--color-success-soft)' },
  reminder: { icon: Bell, color: 'var(--accent)', bg: 'var(--accent-soft)' },
  achievement: { icon: Award, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' }
}

export default function NotificationsPage() {
  const { notifications, loadNotifications } = useData()
  const { user } = useAuth()
  const { toast } = useApp()
  const [filter, setFilter] = useState('all')

  async function markRead(id) {
    await notificationService.markRead(id)
    await loadNotifications()
  }

  async function markAllRead() {
    await notificationService.markAllRead(user.id)
    await loadNotifications()
    toast('All marked as read', 'success')
  }

  async function deleteNotif(id) {
    await notificationService.delete(id)
    await loadNotifications()
  }

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'read') return n.is_read
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.04em' }}>Notifications</h1>
            {unreadCount > 0 && (
              <span className="badge badge-accent">{unreadCount} new</span>
            )}
          </div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
            {notifications.length} total notifications
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="tabs" style={{ marginBottom: '20px', width: 'fit-content' }}>
        {[
          { val: 'all', label: `All (${notifications.length})` },
          { val: 'unread', label: `Unread (${unreadCount})` },
          { val: 'read', label: 'Read' }
        ].map(f => (
          <button key={f.val} className={`tab-item${filter === f.val ? ' active' : ''}`} onClick={() => setFilter(f.val)}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state">
          <div className="empty-state-icon"><Bell size={24} /></div>
          <div className="empty-state-title">No notifications</div>
          <div className="empty-state-desc">
            {filter === 'unread' ? "You're all caught up!" : "Notifications about your revisions will appear here."}
          </div>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <AnimatePresence>
            {filtered.map((notif, i) => {
              const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info
              const Icon = cfg.icon
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  onClick={() => !notif.is_read && markRead(notif.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    padding: '14px 16px',
                    background: notif.is_read ? 'var(--bg-overlay)' : 'var(--accent-soft)',
                    border: `1px solid ${notif.is_read ? 'var(--border-subtle)' : 'rgba(255,107,53,0.15)'}`,
                    borderRadius: 'var(--radius-xl)',
                    cursor: notif.is_read ? 'default' : 'pointer',
                    transition: 'all var(--duration-base)',
                    position: 'relative'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-default)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = notif.is_read ? 'var(--border-subtle)' : 'rgba(255,107,53,0.15)' }}
                >
                  {/* Unread dot */}
                  {!notif.is_read && (
                    <div style={{
                      position: 'absolute', top: 14, right: 14,
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--accent)'
                    }} />
                  )}

                  <div style={{
                    width: 38, height: 38, borderRadius: 'var(--radius-lg)',
                    background: cfg.bg, color: cfg.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon size={18} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0, paddingRight: '32px' }}>
                    <div style={{
                      fontWeight: notif.is_read ? 500 : 700,
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-sm)',
                      marginBottom: '2px'
                    }}>
                      {notif.title}
                    </div>
                    <div style={{
                      color: 'var(--text-secondary)',
                      fontSize: 'var(--text-xs)',
                      lineHeight: 1.5,
                      marginBottom: '6px'
                    }}>
                      {notif.body}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </div>
                  </div>

                  <button
                    onClick={e => { e.stopPropagation(); deleteNotif(notif.id) }}
                    className="btn btn-icon btn-sm"
                    style={{
                      position: 'absolute', bottom: 12, right: 12,
                      opacity: 0, transition: 'opacity var(--duration-fast)',
                      color: 'var(--text-tertiary)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--color-danger)' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = 0 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

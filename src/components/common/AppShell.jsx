import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, Calendar, BarChart3,
  Target, Bell, Settings, ChevronLeft,
  ChevronRight, Search, Timer, LogOut,
  Flame, ListChecks
} from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { authService } from '../../services/auth'
import RecallMark from './RecallMark'

const NAV_SECTIONS = [
  {
    label: 'Core',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/chapters', icon: BookOpen, label: 'Chapters' },
      { to: '/planner', icon: Calendar, label: 'Planner' },
    ]
  },
  {
    label: 'Study',
    items: [
      { to: '/focus', icon: Timer, label: 'Focus Mode' },
      { to: '/calendar', icon: Calendar, label: 'Calendar' },
      { to: '/goals', icon: Target, label: 'Goals' },
      { to: '/todos', icon: ListChecks, label: 'To-Dos' },
    ]
  },
  {
    label: 'Insights',
    items: [
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/notifications', icon: Bell, label: 'Notifications', badge: true },
    ]
  }
]

function getPageTitle(pathname) {
  const map = {
    '/dashboard': 'Dashboard',
    '/chapters': 'Chapters',
    '/planner': 'Revision Planner',
    '/analytics': 'Analytics',
    '/calendar': 'Calendar',
    '/goals': 'Goals',
    '/todos': 'To-Dos',
    '/focus': 'Focus Mode',
    '/notifications': 'Notifications',
    '/profile': 'Profile',
    '/settings': 'Settings'
  }
  // handle dynamic routes like /chapters/:id
  if (pathname.startsWith('/chapters/')) return 'Chapter Detail'
  return map[pathname] || 'Recall'
}

export default function AppShell() {
  const { sidebarCollapsed, setSidebarCollapsed, setCommandOpen } = useApp()
  const { profile } = useAuth()
  const { unreadCount } = useData()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut() {
    await authService.signOut()
    navigate('/auth')
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <motion.aside
        className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}`}
        animate={{ width: sidebarCollapsed ? 68 : 260 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark"><RecallMark size={18} /></div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}
              >
                <span className="sidebar-logo-text">Recall</span>
                <span className="sidebar-logo-version">v1</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search shortcut — only visible when expanded */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: '8px 12px' }}
            >
              <button
                onClick={() => setCommandOpen(true)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  transition: 'all var(--duration-base) var(--ease-smooth)'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
              >
                <Search size={13} />
                <span style={{ flex: 1, textAlign: 'left' }}>Search...</span>
                <span style={{
                  padding: '1px 5px', background: 'var(--bg-base)',
                  border: '1px solid var(--border-default)', borderRadius: '4px',
                  fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-disabled)'
                }}>⌘K</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              {!sidebarCollapsed && (
                <div className="sidebar-section-label">{section.label}</div>
              )}
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <div className="sidebar-item-icon">
                    <item.icon size={18} />
                  </div>
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{ flex: 1 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {item.badge && unreadCount > 0 && !sidebarCollapsed && (
                    <span className="sidebar-item-badge">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {item.badge && unreadCount > 0 && sidebarCollapsed && (
                    <span style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%'
                    }} />
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {/* Streak */}
          <AnimatePresence>
            {!sidebarCollapsed && profile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 12px', background: 'rgba(255,107,53,0.08)',
                  borderRadius: 'var(--radius-lg)', marginBottom: '8px',
                  border: '1px solid rgba(255,107,53,0.12)'
                }}
              >
                <Flame size={16} color="var(--accent)" />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', flex: 1 }}>
                  {profile.streak_count || 0} day streak
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <NavLink
            to="/profile"
            className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
            title={sidebarCollapsed ? 'Profile' : undefined}
          >
            <div className="sidebar-item-icon">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 700, color: '#fff'
                }}>
                  {(profile?.full_name || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <div style={{
                    fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {profile?.full_name || 'Student'}
                  </div>
                  <div style={{
                    fontSize: '10px', color: 'var(--text-disabled)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {profile?.exam_target || 'No exam set'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </NavLink>

          <button
            onClick={handleSignOut}
            className="sidebar-item"
            title={sidebarCollapsed ? 'Sign Out' : undefined}
            style={{ marginTop: '4px', width: '100%', cursor: 'pointer', background: 'none', border: 'none' }}
          >
            <div className="sidebar-item-icon"><LogOut size={16} /></div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1 }}>
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(p => !p)}
          style={{
            position: 'absolute', right: -13, top: '50%', transform: 'translateY(-50%)',
            width: 26, height: 26, borderRadius: '50%',
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-tertiary)', zIndex: 10,
            transition: 'all var(--duration-base) var(--ease-smooth)',
            boxShadow: 'var(--shadow-sm)'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-float)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
        >
          {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </motion.aside>

      {/* Main content area */}
      <main
        className="app-main"
        style={{ marginLeft: sidebarCollapsed ? 68 : 260, transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)' }}
      >
        {/* Topbar */}
        <header
          className="topbar"
          style={{ left: sidebarCollapsed ? 68 : 260, transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {getPageTitle(location.pathname)}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setCommandOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px' }}
            >
              <Search size={13} />
              Search
              <span style={{
                padding: '1px 5px', background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)', borderRadius: '4px',
                fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-disabled)'
              }}>⌘K</span>
            </button>
            <NavLink to="/notifications" className="btn btn-icon" style={{ position: 'relative' }}>
              <Bell size={17} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 8, height: 8, background: 'var(--accent)',
                  borderRadius: '50%', border: '1.5px solid var(--bg-raised)'
                }} />
              )}
            </NavLink>
            <NavLink to="/settings" className="btn btn-icon">
              <Settings size={17} />
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{ flex: 1 }}
          >
            <div className="page-content">
              <Outlet />
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { profileService } from '../services/db'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { user, profile } = useAuth()
  const [theme, setTheme] = useState(() => {
    // BUG FIX: read persisted theme from localStorage on init so it's applied before profile loads
    return localStorage.getItem('ros_theme') || 'dark'
  })
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('ros_accent') || '#FF6B35'
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const toastIdRef = useRef(0)

  // BUG FIX: apply initial theme immediately on mount
  useEffect(() => {
    const t = localStorage.getItem('ros_theme') || 'dark'
    document.documentElement.setAttribute('data-theme', t)
    const a = localStorage.getItem('ros_accent') || '#FF6B35'
    applyAccentColor(a)
  }, [])

  // Apply theme from profile when loaded
  useEffect(() => {
    if (profile?.theme) {
      setTheme(profile.theme)
      document.documentElement.setAttribute('data-theme', profile.theme)
      localStorage.setItem('ros_theme', profile.theme)
    }
    if (profile?.accent_color) {
      setAccentColor(profile.accent_color)
      applyAccentColor(profile.accent_color)
      localStorage.setItem('ros_accent', profile.accent_color)
    }
  }, [profile])

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(prev => !prev)
      }
      if (e.key === 'Escape') setCommandOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function applyAccentColor(color) {
    // BUG FIX: validate color is a proper hex before parsing
    if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) return
    const root = document.documentElement
    const hex = color.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    root.style.setProperty('--accent', color)
    root.style.setProperty('--accent-soft', `rgba(${r},${g},${b},0.12)`)
    root.style.setProperty('--accent-medium', `rgba(${r},${g},${b},0.24)`)
    root.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.4)`)
    root.style.setProperty('--border-accent', `rgba(${r},${g},${b},0.35)`)
    root.style.setProperty('--shadow-accent', `0 4px 24px rgba(${r},${g},${b},0.25)`)
    root.style.setProperty('--shadow-accent-lg', `0 8px 40px rgba(${r},${g},${b},0.3)`)
  }

  async function changeTheme(newTheme) {
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('ros_theme', newTheme)
    if (user) {
      await profileService.update(user.id, { theme: newTheme })
    }
  }

  async function changeAccentColor(color) {
    setAccentColor(color)
    applyAccentColor(color)
    localStorage.setItem('ros_accent', color)
    if (user) {
      await profileService.update(user.id, { accent_color: color })
    }
  }

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastIdRef.current
    const newToast = {
      id,
      title: typeof message === 'string' ? message : message.title,
      message: typeof message === 'object' ? message.message : undefined,
      type
    }
    setToasts(prev => [...prev, newToast])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
    return id
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const value = {
    theme, changeTheme,
    accentColor, changeAccentColor,
    sidebarCollapsed, setSidebarCollapsed,
    commandOpen, setCommandOpen,
    toasts, toast, dismissToast
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}

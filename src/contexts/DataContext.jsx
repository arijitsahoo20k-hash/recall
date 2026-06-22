import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import {
  subjectService, chapterService, revisionService,
  studyLogService, goalService, notificationService,
  dailyStatsService, todoService
} from '../services/db'
import { supabase } from '../services/supabase'
import { format } from 'date-fns'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { user } = useAuth()

  const [subjects, setSubjects] = useState([])
  const [chapters, setChapters] = useState([])
  const [todayRevisions, setTodayRevisions] = useState([])
  const [missedRevisions, setMissedRevisions] = useState([])
  const [upcomingRevisions, setUpcomingRevisions] = useState([])
  const [studyLogs, setStudyLogs] = useState([])
  const [goals, setGoals] = useState([])
  const [notifications, setNotifications] = useState([])
  const [dailyStats, setDailyStats] = useState([])
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)

  // BUG FIX: use a single effect; capture return value of setupRealtimeSubscriptions for cleanup
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    loadAll()
    const cleanup = setupRealtimeSubscriptions()
    return cleanup
  }, [user?.id]) // BUG FIX: depend on user.id not the whole user object to avoid infinite loops

  async function loadAll() {
    setLoading(true)
    await Promise.all([
      loadSubjects(),
      loadChapters(),
      loadTodayRevisions(),
      loadMissedRevisions(),
      loadUpcomingRevisions(),
      loadStudyLogs(),
      loadGoals(),
      loadNotifications(),
      loadDailyStats(),
      loadTodos()
    ])
    setLoading(false)
  }

  async function loadSubjects() {
    if (!user) return
    const { data } = await subjectService.getAll(user.id)
    setSubjects(data || [])
  }

  async function loadChapters() {
    if (!user) return
    const { data } = await chapterService.getAll(user.id)
    setChapters(data || [])
  }

  async function loadTodayRevisions() {
    if (!user) return
    const { data } = await revisionService.getToday(user.id)
    setTodayRevisions(data || [])
  }

  async function loadMissedRevisions() {
    if (!user) return
    const { data } = await revisionService.getMissed(user.id)
    setMissedRevisions(data || [])
  }

  async function loadUpcomingRevisions() {
    if (!user) return
    const { data } = await revisionService.getUpcoming(user.id, 14)
    setUpcomingRevisions(data || [])
  }

  async function loadStudyLogs() {
    if (!user) return
    const { data } = await studyLogService.getAll(user.id, 100)
    setStudyLogs(data || [])
  }

  async function loadGoals() {
    if (!user) return
    const { data } = await goalService.getAll(user.id)
    setGoals(data || [])
  }

  async function loadNotifications() {
    if (!user) return
    const { data } = await notificationService.getAll(user.id)
    setNotifications(data || [])
  }

  async function loadDailyStats() {
    if (!user) return
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 90)
    const { data } = await dailyStatsService.getRange(
      user.id,
      format(start, 'yyyy-MM-dd'),
      format(end, 'yyyy-MM-dd')
    )
    setDailyStats(data || [])
  }

  // To-dos are loaded in full (no date range / limit) so the user
  // can always scroll back and see every to-do they've ever added.
  async function loadTodos() {
    if (!user) return
    const { data } = await todoService.getAll(user.id)
    setTodos(data || [])
  }

  // BUG FIX: return cleanup function so useEffect can call it
  function setupRealtimeSubscriptions() {
    const revisionsChannel = supabase
      .channel(`revisions_changes_${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'revisions',
        filter: `user_id=eq.${user.id}`
      }, () => {
        loadTodayRevisions()
        loadMissedRevisions()
        loadUpcomingRevisions()
      })
      .subscribe()

    const notifChannel = supabase
      .channel(`notifications_changes_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
      })
      .subscribe()

    const todosChannel = supabase
      .channel(`todos_changes_${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'todos',
        filter: `user_id=eq.${user.id}`
      }, () => {
        loadTodos()
      })
      .subscribe()

    // BUG FIX: return cleanup so the effect can unsubscribe on unmount / user change
    return () => {
      supabase.removeChannel(revisionsChannel)
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(todosChannel)
    }
  }

  // BUG FIX: remove duplicate dailyStats upsert — callers handle their own stats update
  const completeRevision = useCallback(async (revisionId, rating, notes = '') => {
    const { data } = await revisionService.complete(revisionId, rating, notes)
    if (data) {
      setTodayRevisions(prev => prev.filter(r => r.id !== revisionId))
      setMissedRevisions(prev => prev.filter(r => r.id !== revisionId))
      await loadDailyStats()
    }
    return data
  }, [user?.id])

  const unreadCount = notifications.filter(n => !n.is_read).length

  const value = {
    subjects, setSubjects, loadSubjects,
    chapters, setChapters, loadChapters,
    todayRevisions, setTodayRevisions, loadTodayRevisions,
    missedRevisions, loadMissedRevisions,
    upcomingRevisions, loadUpcomingRevisions,
    studyLogs, setStudyLogs, loadStudyLogs,
    goals, loadGoals,
    notifications, unreadCount, loadNotifications,
    dailyStats, loadDailyStats,
    todos, loadTodos,
    loading,
    loadAll,
    completeRevision
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used within DataProvider')
  return context
}

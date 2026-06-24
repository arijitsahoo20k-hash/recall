import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { notificationManager } from '../services/notifications'

export function useNotifications() {
  const { user, profile } = useAuth()
  const { todayRevisions, missedRevisions } = useData()
  const initialized = useRef(false)

  // The scheduling effect below only runs once (guarded by initialized.current,
  // since it's setting up a single recurring daily timer, not something that
  // should re-schedule on every render). But the reminder callback it sets up
  // fires hours later — it must read the *current* revisions at fire-time, not
  // whatever they were when the effect first ran. Refs, updated every render,
  // give the callback a live read without needing to re-run the scheduling.
  const todayRevisionsRef = useRef(todayRevisions)
  const missedRevisionsRef = useRef(missedRevisions)
  useEffect(() => {
    todayRevisionsRef.current = todayRevisions
    missedRevisionsRef.current = missedRevisions
  }, [todayRevisions, missedRevisions])

  useEffect(() => {
    if (!user || !profile || initialized.current) return
    if (!profile.notification_enabled) return
    initialized.current = true

    // Request permission on first load
    notificationManager.requestPermission()

    // Schedule daily reminder
    const reminderTime = profile.notification_time || '08:00'
    notificationManager.scheduleDailyReminder(reminderTime, async () => {
      const currentToday = todayRevisionsRef.current
      const currentMissed = missedRevisionsRef.current
      if (currentToday.length > 0) {
        await notificationManager.showRevisionReminder(currentToday[0], user.id)
      }
      if (currentMissed.length > 0) {
        await notificationManager.showMissedRevisions(currentMissed.length, user.id)
      }
    })

    return () => { notificationManager.clearAll() }
  }, [user, profile])
}

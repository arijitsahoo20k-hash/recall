import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { notificationManager } from '../services/notifications'

export function useNotifications() {
  const { user, profile } = useAuth()
  const { todayRevisions, missedRevisions } = useData()
  const initialized = useRef(false)

  useEffect(() => {
    if (!user || !profile || initialized.current) return
    if (!profile.notification_enabled) return
    initialized.current = true

    // Request permission on first load
    notificationManager.requestPermission()

    // Schedule daily reminder
    const reminderTime = profile.notification_time || '08:00'
    notificationManager.scheduleDailyReminder(reminderTime, async () => {
      if (todayRevisions.length > 0) {
        await notificationManager.showRevisionReminder(todayRevisions[0], user.id)
      }
      if (missedRevisions.length > 0) {
        await notificationManager.showMissedRevisions(missedRevisions.length, user.id)
      }
    })

    return () => { notificationManager.clearAll() }
  }, [user, profile])
}

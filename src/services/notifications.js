import { notificationService } from './db'

class NotificationManager {
  constructor() {
    // BUG FIX: guard against Notification API not being available (some browsers/contexts)
    this.permission = (typeof Notification !== 'undefined' ? Notification.permission : 'denied') || 'default'
    this.timers = []
  }

  async requestPermission() {
    if (!('Notification' in window)) return false
    const result = await Notification.requestPermission()
    this.permission = result
    return result === 'granted'
  }

  async showRevisionReminder(revision, userId) {
    if (this.permission !== 'granted') return

    const title = `⏰ Revision Due: ${revision.chapters?.name}`
    const body = `${revision.chapters?.subjects?.name || 'Chapter'} · Day +${revision.interval_days} revision`

    try {
      const notif = new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `revision-${revision.id}`,
        renotify: false,
        requireInteraction: false,
        data: { revisionId: revision.id, path: '/planner' }
      })
      notif.onclick = () => {
        window.focus()
        notif.close()
      }
    } catch (e) {
      console.warn('Push notification failed:', e)
    }

    // Also save to DB
    if (userId) {
      await notificationService.create(userId, {
        title,
        body,
        type: 'reminder',
        action_url: '/planner',
        metadata: { revisionId: revision.id }
      })
    }
  }

  async showMissedRevisions(count, userId) {
    if (this.permission !== 'granted' || count === 0) return
    const title = `📚 ${count} Missed Revision${count > 1 ? 's' : ''}`
    const body = 'You have overdue revisions. Catch up to maintain your streak!'
    try {
      new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        tag: 'missed-revisions',
        requireInteraction: true
      })
    } catch (e) {
      console.warn('Push notification failed:', e)
    }
    if (userId) {
      await notificationService.create(userId, { title, body, type: 'warning' })
    }
  }

  async showStreakWarning(userId) {
    if (this.permission !== 'granted') return
    const title = '🔥 Don\'t break your streak!'
    const body = 'Complete at least one revision today to keep your streak alive.'
    try {
      new Notification(title, { body, icon: '/icons/icon-192x192.png', tag: 'streak-warning' })
    } catch (e) {
      console.warn('Push notification failed:', e)
    }
    if (userId) {
      await notificationService.create(userId, { title, body, type: 'warning' })
    }
  }

  async showAchievement(achievement, userId) {
    const title = `🏆 Achievement Unlocked: ${achievement.title}`
    const body = achievement.description || 'Keep up the great work!'
    try {
      if (this.permission === 'granted') {
        new Notification(title, { body, icon: '/icons/icon-192x192.png', tag: `achievement-${achievement.key}` })
      }
    } catch (e) {
      console.warn('Push notification failed:', e)
    }
    if (userId) {
      await notificationService.create(userId, { title, body, type: 'achievement' })
    }
  }

  scheduleReminder(delayMs, callback) {
    const id = setTimeout(callback, delayMs)
    this.timers.push(id)
    return id
  }

  clearAll() {
    this.timers.forEach(clearTimeout)
    this.timers = []
  }

  scheduleDailyReminder(timeStr, callback) {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const now = new Date()
    const target = new Date()
    target.setHours(hours, minutes, 0, 0)
    if (target <= now) target.setDate(target.getDate() + 1)
    const delay = target - now
    return this.scheduleReminder(delay, callback)
  }
}

export const notificationManager = new NotificationManager()

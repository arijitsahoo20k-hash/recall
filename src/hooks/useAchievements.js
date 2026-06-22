import { useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { achievementService } from '../services/db'
import { notificationManager } from '../services/notifications'
import { ACHIEVEMENT_DEFINITIONS } from '../utils/helpers'

export function useAchievements() {
  const { user } = useAuth()
  const { chapters, dailyStats } = useData()

  const checkAndUnlock = useCallback(async () => {
    if (!user) return

    const { data: existing } = await achievementService.getAll(user.id)
    const unlockedKeys = new Set((existing || []).map(a => a.achievement_key))

    const totalRevisions = dailyStats.reduce((s, d) => s + (d.revisions_completed || 0), 0)
    const streak = dailyStats.filter(d => d.streak_day).length

    const candidates = [
      { key: 'first_revision', condition: totalRevisions >= 1 },
      { key: 'streak_7', condition: streak >= 7 },
      { key: 'streak_30', condition: streak >= 30 },
      { key: 'streak_100', condition: streak >= 100 },
      { key: 'chapters_10', condition: chapters.length >= 10 },
      { key: 'chapters_50', condition: chapters.length >= 50 },
      { key: 'revisions_50', condition: totalRevisions >= 50 },
      { key: 'revisions_100', condition: totalRevisions >= 100 }
    ]

    for (const { key, condition } of candidates) {
      if (condition && !unlockedKeys.has(key)) {
        const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === key)
        if (def) {
          await achievementService.unlock(user.id, {
            achievement_key: key,
            title: def.title,
            description: def.description,
            icon: def.icon
          })
          await notificationManager.showAchievement(def, user.id)
        }
      }
    }
  }, [user, chapters, dailyStats])

  return { checkAndUnlock }
}

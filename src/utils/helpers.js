import { format, formatDistanceToNow, isToday, isYesterday, isTomorrow, parseISO } from 'date-fns'

export function formatDate(date) {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'MMM d, yyyy')
}

export function formatRelative(date) {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function getPriorityWeight(priority) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[priority] || 2
}

export function getDifficultyColor(difficulty) {
  return { easy: '#34D399', medium: '#60A5FA', hard: '#A78BFA', expert: '#F87171' }[difficulty] || '#60A5FA'
}

export function getPriorityColor(priority) {
  return { critical: '#F87171', high: '#FB923C', medium: '#FBBF24', low: '#4ADE80' }[priority] || '#FBBF24'
}

export function calculateRevisionScore(revisions) {
  if (!revisions?.length) return 0
  const completed = revisions.filter(r => r.status === 'completed')
  const avgRating = completed.reduce((s, r) => s + (r.quality_rating || 3), 0) / Math.max(1, completed.length)
  return Math.round((completed.length / revisions.length) * 100 * (avgRating / 5))
}

export function getHeatmapLevel(count) {
  if (count === 0) return 0
  if (count <= 2) return 1
  if (count <= 4) return 2
  if (count <= 6) return 3
  return 4
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

export function debounce(fn, delay) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }
}

export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}

export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function interpolateColor(color1, color2, factor) {
  const hex = c => {
    const v = parseInt(c.replace('#',''), 16)
    return [(v>>16)&255, (v>>8)&255, v&255]
  }
  const c1 = hex(color1), c2 = hex(color2)
  const r = Math.round(c1[0] + (c2[0]-c1[0]) * factor)
  const g = Math.round(c1[1] + (c2[1]-c1[1]) * factor)
  const b = Math.round(c1[2] + (c2[2]-c1[2]) * factor)
  return `rgb(${r},${g},${b})`
}

export const REVISION_INTERVALS = [1, 3, 7, 14, 30, 60, 90]

export const ACHIEVEMENT_DEFINITIONS = [
  { key: 'first_revision', title: 'First Revision', description: 'Completed your first revision!', icon: '🎯' },
  { key: 'streak_7', title: '7-Day Streak', description: 'Maintained a 7-day revision streak', icon: '🔥' },
  { key: 'streak_30', title: '30-Day Streak', description: 'Unstoppable! 30 days straight', icon: '⚡' },
  { key: 'streak_100', title: '100-Day Legend', description: '100 consecutive days of revision', icon: '🏆' },
  { key: 'chapters_10', title: 'Chapter Master', description: 'Added 10 chapters', icon: '📚' },
  { key: 'chapters_50', title: 'Knowledge Base', description: 'Added 50 chapters', icon: '🧠' },
  { key: 'revisions_50', title: 'Revision Pro', description: 'Completed 50 revisions', icon: '✨' },
  { key: 'revisions_100', title: 'Centurion', description: 'Completed 100 revisions', icon: '💯' },
  { key: 'focus_5h', title: 'Deep Worker', description: 'Logged 5 hours in Focus Mode', icon: '🎧' },
  { key: 'perfect_week', title: 'Perfect Week', description: 'Hit all daily goals for 7 days', icon: '⭐' }
]

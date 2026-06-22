import { supabase } from './supabase'
import { format } from 'date-fns'

// ============================================================
// PROFILES
// ============================================================
export const profileService = {
  async get(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
  },

  async update(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  },

  async uploadAvatar(userId, file) {
    const ext = file.name.split('.').pop()
    const timestamp = Date.now()
    const filePath = `${userId}_${timestamp}.${ext}`

    // Remove old avatar files for this user (best-effort, so new upload isn't blocked)
    const { data: existing } = await supabase.storage
      .from('avatars')
      .list('', { search: userId })
    if (existing?.length) {
      const oldPaths = existing.map(f => f.name)
      await supabase.storage.from('avatars').remove(oldPaths)
    }

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: false })
    if (uploadError) return { data: null, error: uploadError }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  }
}

// ============================================================
// SUBJECTS
// ============================================================
export const subjectService = {
  async getAll(userId) {
    const { data, error } = await supabase
      .from('subjects')
      .select(`
        *,
        chapters(count)
      `)
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('sort_order', { ascending: true })
    return { data, error }
  },

  async create(userId, subject) {
    const { data, error } = await supabase
      .from('subjects')
      .insert({ ...subject, user_id: userId })
      .select()
      .single()
    return { data, error }
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('subjects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async delete(id) {
    const { error } = await supabase.from('subjects').delete().eq('id', id)
    return { error }
  }
}

// ============================================================
// CHAPTERS
// ============================================================
export const chapterService = {
  async getAll(userId, subjectId = null) {
    let query = supabase
      .from('chapters')
      .select(`
        *,
        subjects(id, name, color),
        topics(count),
        revisions(count)
      `)
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('sort_order', { ascending: true })

    if (subjectId) query = query.eq('subject_id', subjectId)
    const { data, error } = await query
    return { data, error }
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('chapters')
      .select(`
        *,
        subjects(id, name, color),
        topics(*),
        revisions(*)
      `)
      .eq('id', id)
      .single()
    return { data, error }
  },

  async create(userId, chapter) {
    const { data, error } = await supabase
      .from('chapters')
      .insert({ ...chapter, user_id: userId })
      .select()
      .single()
    return { data, error }
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('chapters')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async delete(id) {
    const { error } = await supabase.from('chapters').delete().eq('id', id)
    return { error }
  },

  async search(userId, query) {
    const { data, error } = await supabase
      .from('chapters')
      .select('*, subjects(name, color)')
      .eq('user_id', userId)
      .or(`name.ilike.%${query}%,notes.ilike.%${query}%`)
      .limit(10)
    return { data, error }
  }
}

// ============================================================
// TOPICS
// ============================================================
export const topicService = {
  async getByChapter(chapterId) {
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('sort_order', { ascending: true })
    return { data, error }
  },

  async create(userId, topic) {
    const { data, error } = await supabase
      .from('topics')
      .insert({ ...topic, user_id: userId })
      .select()
      .single()
    return { data, error }
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('topics')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async delete(id) {
    const { error } = await supabase.from('topics').delete().eq('id', id)
    return { error }
  }
}

// ============================================================
// STUDY LOGS
// ============================================================
export const studyLogService = {
  async getAll(userId, limit = 50) {
    const { data, error } = await supabase
      .from('study_logs')
      .select(`
        *,
        chapters(id, name, subjects(name, color))
      `)
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  async getByDate(userId, date) {
    const { data, error } = await supabase
      .from('study_logs')
      .select(`
        *,
        chapters(id, name, subjects(name, color))
      `)
      .eq('user_id', userId)
      .eq('date', date)
      .order('logged_at', { ascending: false })
    return { data, error }
  },

  async create(userId, log) {
    const { data, error } = await supabase
      .from('study_logs')
      .insert({ ...log, user_id: userId })
      .select()
      .single()
    return { data, error }
  },

  async delete(id) {
    const { error } = await supabase.from('study_logs').delete().eq('id', id)
    return { error }
  }
}

// ============================================================
// REVISIONS
// ============================================================
export const revisionService = {
  async getAll(userId) {
    const { data, error } = await supabase
      .from('revisions')
      .select(`
        *,
        chapters(id, name, priority, difficulty, subjects(id, name, color))
      `)
      .eq('user_id', userId)
      .order('scheduled_date', { ascending: true })
    return { data, error }
  },

  async getToday(userId) {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('revisions')
      .select(`
        *,
        chapters(id, name, priority, difficulty, estimated_revision_time, subjects(id, name, color))
      `)
      .eq('user_id', userId)
      .eq('scheduled_date', today)
      .in('status', ['pending', 'missed'])
      .order('chapters(priority)', { ascending: false })
    return { data, error }
  },

  async getMissed(userId) {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('revisions')
      .select(`
        *,
        chapters(id, name, priority, difficulty, subjects(id, name, color))
      `)
      .eq('user_id', userId)
      .lt('scheduled_date', today)
      .eq('status', 'pending')
      .order('scheduled_date', { ascending: true })
    return { data, error }
  },

  async getUpcoming(userId, days = 7) {
    const today = new Date().toISOString().split('T')[0]
    const future = new Date()
    future.setDate(future.getDate() + days)
    const futureStr = future.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('revisions')
      .select(`
        *,
        chapters(id, name, priority, subjects(id, name, color))
      `)
      .eq('user_id', userId)
      .gt('scheduled_date', today)
      .lte('scheduled_date', futureStr)
      .eq('status', 'pending')
      .order('scheduled_date', { ascending: true })
    return { data, error }
  },

  async create(userId, revision) {
    const { data, error } = await supabase
      .from('revisions')
      .insert({ ...revision, user_id: userId })
      .select()
      .single()
    return { data, error }
  },

  async complete(id, rating, notes = '') {
    const { data, error } = await supabase
      .from('revisions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        quality_rating: rating,
        notes
      })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async reschedule(id, newDate) {
    const { data, error } = await supabase
      .from('revisions')
      .update({ scheduled_date: newDate, status: 'rescheduled' })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async generateSpacedRevisions(userId, chapterId, startDate) {
    const { error } = await supabase.rpc('generate_spaced_revisions', {
      p_user_id: userId,
      p_chapter_id: chapterId,
      p_start_date: startDate
    })
    return { error }
  },

  // Formula method: noteType is 'sn' (chapter short notes, x^2 days) or
  // 'dsn' (daily/topic short notes, 2^(x-1) days). Runs server-side until
  // the user's exam_date (see generate_formula_revisions in schema.sql).
  async generateFormulaRevisions(userId, chapterId, noteType, startDate) {
    const { error } = await supabase.rpc('generate_formula_revisions', {
      p_user_id: userId,
      p_chapter_id: chapterId,
      p_note_type: noteType,
      p_start_date: startDate
    })
    return { error }
  },

  async getByDateRange(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from('revisions')
      .select(`
        *,
        chapters(id, name, subjects(name, color))
      `)
      .eq('user_id', userId)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date', { ascending: true })
    return { data, error }
  }
}

// ============================================================
// GOALS
// ============================================================
export const goalService = {
  async getAll(userId) {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async create(userId, goal) {
    const { data, error } = await supabase
      .from('goals')
      .insert({ ...goal, user_id: userId })
      .select()
      .single()
    return { data, error }
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async delete(id) {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    return { error }
  }
}

// ============================================================
// ACHIEVEMENTS
// ============================================================
export const achievementService = {
  async getAll(userId) {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })
    return { data, error }
  },

  async unlock(userId, achievement) {
    const { data, error } = await supabase
      .from('achievements')
      .upsert({ ...achievement, user_id: userId })
      .select()
      .single()
    return { data, error }
  }
}

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notificationService = {
  async getAll(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    return { data, error }
  },

  async create(userId, notification) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({ ...notification, user_id: userId })
      .select()
      .single()
    return { data, error }
  },

  async markRead(id) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
    return { error }
  },

  async markAllRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
    return { error }
  },

  async delete(id) {
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    return { error }
  }
}

// ============================================================
// FOCUS SESSIONS
// ============================================================
export const focusService = {
  async create(userId, session) {
    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({ ...session, user_id: userId })
      .select()
      .single()
    return { data, error }
  },

  async complete(id, duration, notes = '') {
    const { data, error } = await supabase
      .from('focus_sessions')
      .update({ completed: true, ended_at: new Date().toISOString(), duration, notes })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async getRecent(userId, limit = 20) {
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*, chapters(name, subjects(name))')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit)
    return { data, error }
  }
}

// ============================================================
// TODOS
// All to-dos are kept permanently, stamped with the date they
// were created on, so the user can scroll back and see every
// to-do they've ever added.
// ============================================================
export const todoService = {
  async getAll(userId) {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async create(userId, todo) {
    const { data, error } = await supabase
      .from('todos')
      .insert({
        ...todo,
        user_id: userId,
        date: format(new Date(), 'yyyy-MM-dd')
      })
      .select()
      .single()
    return { data, error }
  },

  async toggle(id, isCompleted) {
    const { data, error } = await supabase
      .from('todos')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null
      })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Deliberately no "delete completed" / cleanup helper — to-dos are
  // meant to be kept forever unless the user explicitly deletes one.
  async delete(id) {
    const { error } = await supabase.from('todos').delete().eq('id', id)
    return { error }
  }
}

// ============================================================
// DAILY STATS
// ============================================================
export const dailyStatsService = {
  async getRange(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
    return { data, error }
  },

  async upsert(userId, stats) {
    const { error } = await supabase.rpc('update_daily_stats', {
      p_user_id: userId,
      p_date: stats.date,
      p_revisions: stats.revisions || 0,
      p_minutes: stats.minutes || 0,
      p_chapters: stats.chapters || 0
    })
    return { error }
  }
}

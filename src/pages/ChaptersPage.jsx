import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, BookOpen, ChevronRight, Search,
  MoreVertical, Trash2, Edit3, Star,
  Layers, Clock, TrendingUp, X, Check
} from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { subjectService, chapterService, revisionService } from '../services/db'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

const SUBJECT_COLORS = ['#FF6B35','#7C3AED','#0EA5E9','#10B981','#F59E0B','#EC4899','#6366F1','#14B8A6']
const PRIORITY_OPTIONS = ['low','medium','high','critical']
const DIFFICULTY_OPTIONS = ['easy','medium','hard','expert']

export default function ChaptersPage() {
  const { subjects, chapters, loadSubjects, loadChapters } = useData()
  const { user, profile } = useAuth()
  const { toast } = useApp()
  const navigate = useNavigate()

  const [selectedSubject, setSelectedSubject] = useState(null)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [sortBy, setSortBy] = useState('sort_order')
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [showChapterModal, setShowChapterModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [editingChapter, setEditingChapter] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)

  const filteredChapters = useMemo(() => {
    let list = selectedSubject ? chapters.filter(c => c.subject_id === selectedSubject) : chapters
    if (search) list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    if (filterPriority) list = list.filter(c => c.priority === filterPriority)
    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'priority') {
        const order = { critical: 0, high: 1, medium: 2, low: 3 }
        return (order[a.priority] || 2) - (order[b.priority] || 2)
      }
      if (sortBy === 'last_revised') return new Date(b.last_revised_at || 0) - new Date(a.last_revised_at || 0)
      return (a.sort_order || 0) - (b.sort_order || 0)
    })
  }, [chapters, selectedSubject, search, filterPriority, sortBy])

  async function deleteSubject(id) {
    if (!window.confirm('Delete this subject and all its chapters?')) return
    await subjectService.delete(id)
    await loadSubjects()
    await loadChapters()
    if (selectedSubject === id) setSelectedSubject(null)
    toast('Subject deleted', 'success')
  }

  async function deleteChapter(id) {
    if (!window.confirm('Delete this chapter and all its revisions?')) return
    await chapterService.delete(id)
    await loadChapters()
    toast('Chapter deleted', 'success')
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>Chapters</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
            {subjects.length} subjects · {chapters.length} chapters
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-md" onClick={() => { setEditingSubject(null); setShowSubjectModal(true) }}>
            <Plus size={15} /> Subject
          </button>
          <button className="btn btn-primary btn-md" onClick={() => { setEditingChapter(null); setShowChapterModal(true) }}>
            <Plus size={15} /> Chapter
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px' }}>
        {/* Subject sidebar */}
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => setSelectedSubject(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', borderRadius: 'var(--radius-lg)',
                background: !selectedSubject ? 'var(--accent-soft)' : 'transparent',
                border: `1px solid ${!selectedSubject ? 'rgba(255,107,53,0.2)' : 'transparent'}`,
                color: !selectedSubject ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)', fontWeight: 600,
                transition: 'all var(--duration-fast)', width: '100%', textAlign: 'left'
              }}
            >
              <Layers size={16} />
              All Subjects
              <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', fontWeight: 500, color: 'inherit', opacity: 0.7 }}>
                {chapters.length}
              </span>
            </button>

            {subjects.map(sub => {
              const count = chapters.filter(c => c.subject_id === sub.id).length
              const isActive = selectedSubject === sub.id
              return (
                <div key={sub.id} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setSelectedSubject(isActive ? null : sub.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px', borderRadius: 'var(--radius-lg)',
                      background: isActive ? sub.color + '18' : 'transparent',
                      border: `1px solid ${isActive ? sub.color + '44' : 'transparent'}`,
                      color: isActive ? sub.color : 'var(--text-secondary)',
                      cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-sm)', fontWeight: 600,
                      transition: 'all var(--duration-fast)', width: '100%', textAlign: 'left'
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-elevated)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: sub.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</span>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, opacity: 0.7 }}>{count}</span>
                    <button
                      onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === `sub-${sub.id}` ? null : `sub-${sub.id}`) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px', display: 'flex', opacity: 0.6 }}
                    >
                      <MoreVertical size={13} />
                    </button>
                  </button>
                  {openMenuId === `sub-${sub.id}` && (
                    <div className="dropdown-menu" style={{ left: 0, right: 'auto', top: 'calc(100% + 4px)', minWidth: 160, zIndex: 200 }}>
                      <button className="dropdown-item" onClick={() => { setEditingSubject(sub); setShowSubjectModal(true); setOpenMenuId(null) }}>
                        <Edit3 size={14} /> Edit
                      </button>
                      <div className="dropdown-separator" />
                      <button className="dropdown-item danger" onClick={() => { deleteSubject(sub.id); setOpenMenuId(null) }}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {subjects.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                No subjects yet.<br />Create one to get started.
              </div>
            )}
          </div>
        </div>

        {/* Chapters list */}
        <div>
          {/* Filters bar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
              <input
                className="form-input"
                style={{ paddingLeft: '38px', height: '38px' }}
                placeholder="Search chapters..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="form-select" style={{ width: 130, height: 38 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="">All Priority</option>
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <select className="form-select" style={{ width: 130, height: 38 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="sort_order">Default</option>
              <option value="name">Name</option>
              <option value="priority">Priority</option>
              <option value="last_revised">Last Revised</option>
            </select>
          </div>

          {/* Chapter cards */}
          <AnimatePresence>
            {filteredChapters.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state">
                <div className="empty-state-icon"><BookOpen size={24} /></div>
                <div className="empty-state-title">No chapters found</div>
                <div className="empty-state-desc">
                  {search ? 'Try a different search term.' : 'Create your first chapter to start tracking revisions.'}
                </div>
                <button className="btn btn-primary btn-md" onClick={() => setShowChapterModal(true)}>
                  <Plus size={15} /> Add Chapter
                </button>
              </motion.div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                {filteredChapters.map((ch, i) => (
                  <ChapterCard
                    key={ch.id}
                    chapter={ch}
                    index={i}
                    onEdit={() => { setEditingChapter(ch); setShowChapterModal(true) }}
                    onDelete={() => deleteChapter(ch.id)}
                    onClick={() => navigate(`/chapters/${ch.id}`)}
                    openMenu={openMenuId === ch.id}
                    onMenuToggle={() => setOpenMenuId(openMenuId === ch.id ? null : ch.id)}
                    onMenuClose={() => setOpenMenuId(null)}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Subject Modal */}
      <AnimatePresence>
        {showSubjectModal && (
          <SubjectModal
            subject={editingSubject}
            userId={user?.id}
            onClose={() => { setShowSubjectModal(false); setEditingSubject(null) }}
            onSave={() => { loadSubjects(); setShowSubjectModal(false); setEditingSubject(null) }}
            toast={toast}
          />
        )}
      </AnimatePresence>

      {/* Chapter Modal */}
      <AnimatePresence>
        {showChapterModal && (
          <ChapterModal
            chapter={editingChapter}
            subjects={subjects}
            userId={user?.id}
            revisionMethod={profile?.revision_method || 'ebbinghaus'}
            defaultSubjectId={selectedSubject}
            onClose={() => { setShowChapterModal(false); setEditingChapter(null) }}
            onSave={() => { loadChapters(); setShowChapterModal(false); setEditingChapter(null) }}
            toast={toast}
          />
        )}
      </AnimatePresence>

      {/* Close menus on outside click */}
      {openMenuId && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpenMenuId(null)} />}
    </div>
  )
}

function ChapterCard({ chapter, index, onEdit, onDelete, onClick, openMenu, onMenuToggle, onMenuClose }) {
  const priorityColors = { low: '#4ADE80', medium: '#FBBF24', high: '#FB923C', critical: '#F87171' }
  const difficultyColors = { easy: '#34D399', medium: '#60A5FA', hard: '#A78BFA', expert: '#F87171' }
  const subject = chapter.subjects
  const pct = chapter.completion_percentage || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      style={{
        background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)', overflow: 'hidden',
        cursor: 'pointer', transition: 'all var(--duration-base) var(--ease-smooth)',
        position: 'relative'
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      {/* Priority stripe */}
      <div style={{ height: 3, background: priorityColors[chapter.priority] || '#FBBF24' }} />

      <div style={{ padding: '16px' }} onClick={onClick}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
            {chapter.name}
          </h3>
          <button
            onClick={e => { e.stopPropagation(); onMenuToggle() }}
            className="btn btn-icon btn-sm"
            style={{ flexShrink: 0, marginTop: '-2px' }}
          >
            <MoreVertical size={14} />
          </button>
        </div>

        {/* Subject tag */}
        {subject && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '12px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: subject.color }} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 500 }}>{subject.name}</span>
          </div>
        )}

        {/* Badges */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <span className={`badge badge-priority-${chapter.priority}`}>{chapter.priority}</span>
          <span className="badge" style={{
            background: difficultyColors[chapter.difficulty] + '18',
            color: difficultyColors[chapter.difficulty]
          }}>
            {chapter.difficulty}
          </span>
          {chapter.exam_weightage > 0 && (
            <span className="badge badge-default">
              <Star size={9} /> {chapter.exam_weightage}%
            </span>
          )}
        </div>

        {/* Progress */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Progress</span>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: pct === 100 ? 'var(--color-success)' : 'var(--text-secondary)' }}>{pct}%</span>
          </div>
          <div className="progress-bar progress-bar-sm">
            <div className="progress-bar-fill" style={{
              width: `${pct}%`,
              background: pct === 100 ? 'var(--color-success)' : subject?.color || 'var(--accent)'
            }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {chapter.estimated_revision_time && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
              <Clock size={11} /> {chapter.estimated_revision_time}m
            </div>
          )}
          {chapter.total_revisions > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
              <TrendingUp size={11} /> {chapter.total_revisions} revisions
            </div>
          )}
          {chapter.last_revised_at && (
            <div style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--text-disabled)' }}>
              {format(new Date(chapter.last_revised_at), 'MMM d')}
            </div>
          )}
        </div>
      </div>

      {/* Dropdown menu */}
      {openMenu && (
        <div
          className="dropdown-menu"
          style={{ right: 12, top: 40, zIndex: 200 }}
          onClick={e => e.stopPropagation()}
        >
          <button className="dropdown-item" onClick={() => { onEdit(); onMenuClose() }}>
            <Edit3 size={14} /> Edit
          </button>
          <button className="dropdown-item" onClick={() => { onClick(); onMenuClose() }}>
            <ChevronRight size={14} /> Open Detail
          </button>
          <div className="dropdown-separator" />
          <button className="dropdown-item danger" onClick={() => { onDelete(); onMenuClose() }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </motion.div>
  )
}

function SubjectModal({ subject, userId, onClose, onSave, toast }) {
  const [form, setForm] = useState({
    name: subject?.name || '',
    color: subject?.color || '#FF6B35',
    description: subject?.description || '',
    exam_weightage: subject?.exam_weightage || 0
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    if (subject) {
      await subjectService.update(subject.id, form)
      toast('Subject updated', 'success')
    } else {
      await subjectService.create(userId, form)
      toast('Subject created', 'success')
    }
    setSaving(false)
    onSave()
  }

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal modal-sm" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontWeight: 700 }}>{subject ? 'Edit Subject' : 'New Subject'}</h3>
          <button className="btn btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Subject Name *</label>
            <input className="form-input" placeholder="e.g. Physics, Mathematics" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {SUBJECT_COLORS.map(color => (
                <button key={color} onClick={() => setForm(p => ({ ...p, color }))}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: color,
                    border: form.color === color ? '3px solid var(--text-primary)' : '2px solid transparent',
                    cursor: 'pointer', transition: 'all var(--duration-fast)',
                    transform: form.color === color ? 'scale(1.15)' : 'scale(1)'
                  }}
                />
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Exam Weightage (%)</label>
            <input className="form-input" type="number" min="0" max="100" placeholder="0" value={form.exam_weightage}
              onChange={e => setForm(p => ({ ...p, exam_weightage: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={2} placeholder="Optional description..." value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-md" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-md" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Check size={15} />}
            {subject ? 'Update' : 'Create'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ChapterModal({ chapter, subjects, userId, revisionMethod = 'ebbinghaus', defaultSubjectId, onClose, onSave, toast }) {
  const [form, setForm] = useState({
    name: chapter?.name || '',
    subject_id: chapter?.subject_id || defaultSubjectId || subjects[0]?.id || '',
    priority: chapter?.priority || 'medium',
    difficulty: chapter?.difficulty || 'medium',
    exam_weightage: chapter?.exam_weightage || 0,
    estimated_revision_time: chapter?.estimated_revision_time || 30,
    notes: chapter?.notes || '',
    tags: (chapter?.tags || []).join(', ')
  })
  const [saving, setSaving] = useState(false)
  const [generateRevisions, setGenerateRevisions] = useState(!chapter)

  async function handleSave() {
    if (!form.name.trim() || !form.subject_id) return
    setSaving(true)
    const payload = {
      name: form.name,
      subject_id: form.subject_id,
      priority: form.priority,
      difficulty: form.difficulty,
      exam_weightage: form.exam_weightage,
      estimated_revision_time: form.estimated_revision_time,
      notes: form.notes,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      status: chapter?.status || 'in_progress',
      first_studied_at: chapter?.first_studied_at || new Date().toISOString()
    }

    let chapterId = chapter?.id
    if (chapter) {
      await chapterService.update(chapter.id, payload)
      toast('Chapter updated', 'success')
    } else {
      const { data } = await chapterService.create(userId, payload)
      chapterId = data?.id
      toast('Chapter created', 'success')
    }

    if (generateRevisions && chapterId && !chapter) {
      const today = new Date().toISOString().split('T')[0]
      if (revisionMethod === 'formula') {
        // SN track: chapter short notes, revised at x^2 days from today.
        await revisionService.generateFormulaRevisions(userId, chapterId, 'sn', today)
      } else {
        await revisionService.generateSpacedRevisions(userId, chapterId, today)
      }
    }

    setSaving(false)
    onSave()
  }

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal modal-md" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontWeight: 700 }}>{chapter ? 'Edit Chapter' : 'New Chapter'}</h3>
          <button className="btn btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Chapter Name *</label>
              <input className="form-input" placeholder="e.g. Newton's Laws of Motion" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Subject *</label>
              <select className="form-select" value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}>
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select className="form-select" value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))}>
                {DIFFICULTY_OPTIONS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Exam Weightage (%)</label>
              <input className="form-input" type="number" min="0" max="100" value={form.exam_weightage}
                onChange={e => setForm(p => ({ ...p, exam_weightage: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Revision Time (min)</label>
              <input className="form-input" type="number" min="5" max="300" value={form.estimated_revision_time}
                onChange={e => setForm(p => ({ ...p, estimated_revision_time: parseInt(e.target.value) || 30 }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Tags</label>
              <input className="form-input" placeholder="formula, important, exam (comma separated)"
                value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={3} placeholder="Key concepts, formulae, important points..."
                value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          {!chapter && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px', background: 'var(--accent-soft)',
                border: '1px solid rgba(255,107,53,0.2)', borderRadius: 'var(--radius-lg)', cursor: 'pointer'
              }}
              onClick={() => setGenerateRevisions(p => !p)}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '4px',
                background: generateRevisions ? 'var(--accent)' : 'transparent',
                border: `2px solid ${generateRevisions ? 'var(--accent)' : 'var(--border-strong)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all var(--duration-fast)'
              }}>
                {generateRevisions && <Check size={11} color="#fff" strokeWidth={3} />}
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {revisionMethod === 'formula' ? 'Auto-generate SN revisions' : 'Auto-generate spaced revisions'}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {revisionMethod === 'formula'
                    ? 'Short-notes revisions at x² days, until your exam date'
                    : 'Create revision schedule: 1, 3, 7, 14, 30, 60, 90 days'}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-md" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-md" onClick={handleSave} disabled={saving || !form.name.trim() || !form.subject_id}>
            {saving ? <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Check size={15} />}
            {chapter ? 'Update' : 'Create Chapter'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

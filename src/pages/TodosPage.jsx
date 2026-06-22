import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ListChecks, Plus, Trash2,
  CheckCircle2, Circle, CalendarDays
} from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { todoService } from '../services/db'
import { formatDate } from '../utils/helpers'

const FILTERS = ['all', 'active', 'completed']

export default function TodosPage() {
  const { todos, loadTodos } = useData()
  const { user } = useAuth()
  const { toast } = useApp()

  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState('all')
  const [busyId, setBusyId] = useState(null)

  const activeTodos = useMemo(() => todos.filter(t => !t.is_completed), [todos])
  const completedTodos = useMemo(() => todos.filter(t => t.is_completed), [todos])

  const visibleTodos = useMemo(() => {
    if (filter === 'active') return activeTodos
    if (filter === 'completed') return completedTodos
    return todos
  }, [todos, filter, activeTodos, completedTodos])

  // Group everything by the date it was added — todos are never
  // deleted automatically, so this naturally becomes a permanent
  // day-by-day history the user can scroll back through forever.
  const grouped = useMemo(() => {
    const map = {}
    for (const t of visibleTodos) {
      const key = t.date || (t.created_at || '').slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(t)
    }
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [visibleTodos])

  async function addTodo() {
    const title = newTitle.trim()
    if (!title || !user || adding) return
    setAdding(true)
    const { error } = await todoService.create(user.id, { title })
    setAdding(false)
    if (error) {
      toast('Could not add to-do', 'error')
      return
    }
    setNewTitle('')
    await loadTodos()
  }

  async function toggleTodo(todo) {
    if (busyId) return
    setBusyId(todo.id)
    await todoService.toggle(todo.id, !todo.is_completed)
    await loadTodos()
    setBusyId(null)
  }

  async function deleteTodo(id) {
    if (busyId) return
    setBusyId(id)
    await todoService.delete(id)
    await loadTodos()
    toast('To-do deleted', 'success')
    setBusyId(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.04em' }}>To-Dos</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
            {activeTodos.length} active · {completedTodos.length} completed · {todos.length} total, kept forever
          </p>
        </div>

        <div className="tabs" style={{ width: 'auto' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              className={`tab-item${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Quick add */}
      <div className="card" style={{ padding: '10px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            placeholder="Add a new to-do and press Enter..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTodo() }}
          />
          <button className="btn btn-primary btn-md" onClick={addTodo} disabled={adding || !newTitle.trim()}>
            {adding ? <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Plus size={15} />}
            Add
          </button>
        </div>
      </div>

      {/* Empty state */}
      {visibleTodos.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><ListChecks size={24} /></div>
          <div className="empty-state-title">
            {filter === 'completed' ? 'Nothing completed yet' : filter === 'active' ? 'No active to-dos' : 'No to-dos yet'}
          </div>
          <div className="empty-state-desc">
            Add a to-do above — every one you create is saved with its date and stays here for you to look back on, whenever you want.
          </div>
        </div>
      )}

      {/* Grouped by date */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <AnimatePresence>
          {grouped.map(([dateKey, items]) => (
            <motion.div
              key={dateKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '10px', color: 'var(--text-tertiary)'
              }}>
                <CalendarDays size={13} />
                <span style={{
                  fontSize: 'var(--text-xs)', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em'
                }}>
                  {formatDate(dateKey)}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-disabled)' }}>
                  ({items.length})
                </span>
              </div>

              <div className="card" style={{ padding: '8px' }}>
                <AnimatePresence>
                  {items.map(todo => (
                    <motion.div
                      key={todo.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -10 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 12px', borderRadius: 'var(--radius-lg)',
                        transition: 'background var(--duration-fast)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <button
                        onClick={() => toggleTodo(todo)}
                        disabled={busyId === todo.id}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          display: 'flex',
                          color: todo.is_completed ? 'var(--color-success)' : 'var(--border-strong)'
                        }}
                      >
                        {todo.is_completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <span style={{
                        flex: 1, fontSize: 'var(--text-sm)', fontWeight: 500,
                        color: todo.is_completed ? 'var(--text-tertiary)' : 'var(--text-primary)',
                        textDecoration: todo.is_completed ? 'line-through' : 'none',
                        wordBreak: 'break-word'
                      }}>
                        {todo.title}
                      </span>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        disabled={busyId === todo.id}
                        className="btn btn-icon btn-sm"
                        style={{ color: 'var(--text-disabled)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-disabled)'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

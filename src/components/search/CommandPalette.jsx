import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, BookOpen, BarChart3, Calendar, Target, Timer, Settings, LayoutDashboard, ArrowRight, ListChecks } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { useNavigate } from 'react-router-dom'
import { chapterService } from '../../services/db'
import { useAuth } from '../../contexts/AuthContext'

const STATIC_COMMANDS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Go to Dashboard', category: 'Navigation', path: '/dashboard', keys: ['G', 'D'] },
  { id: 'chapters', icon: BookOpen, label: 'Go to Chapters', category: 'Navigation', path: '/chapters', keys: ['G', 'C'] },
  { id: 'planner', icon: Calendar, label: 'Go to Planner', category: 'Navigation', path: '/planner', keys: ['G', 'P'] },
  { id: 'analytics', icon: BarChart3, label: 'Go to Analytics', category: 'Navigation', path: '/analytics', keys: ['G', 'A'] },
  { id: 'goals', icon: Target, label: 'Go to Goals', category: 'Navigation', path: '/goals', keys: ['G', 'G'] },
  { id: 'todos', icon: ListChecks, label: 'Go to To-Dos', category: 'Navigation', path: '/todos', keys: ['G', 'T'] },
  { id: 'focus', icon: Timer, label: 'Start Focus Session', category: 'Actions', path: '/focus', keys: ['F'] },
  { id: 'settings', icon: Settings, label: 'Open Settings', category: 'Navigation', path: '/settings', keys: ['G', 'S'] },
]

export default function CommandPalette() {
  const { commandOpen, setCommandOpen } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef(null)
  const searchTimeout = useRef(null)

  useEffect(() => {
    if (commandOpen) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commandOpen])

  useEffect(() => {
    if (!query.trim()) {
      setResults(STATIC_COMMANDS)
      return
    }

    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      const filtered = STATIC_COMMANDS.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase())
      )

      if (user) {
        const { data: chapters } = await chapterService.search(user.id, query)
        const chapterResults = (chapters || []).map(ch => ({
          id: `chapter-${ch.id}`,
          icon: BookOpen,
          label: ch.name,
          sub: ch.subjects?.name,
          category: 'Chapters',
          path: `/chapters/${ch.id}`,
          color: ch.subjects?.color
        }))
        setResults([...filtered, ...chapterResults])
      } else {
        setResults(filtered)
      }
      setSearching(false)
    }, 200)
  }, [query, user])

  useEffect(() => {
    setSelectedIdx(0)
  }, [results])

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); handleSelect(results[selectedIdx]) }
    if (e.key === 'Escape') setCommandOpen(false)
  }

  function handleSelect(item) {
    if (!item) return
    navigate(item.path)
    setCommandOpen(false)
  }

  const grouped = results.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  let flatIdx = 0
  const renderedGroups = Object.entries(grouped).map(([category, items]) => ({
    category,
    items: items.map(item => ({ ...item, flatIdx: flatIdx++ }))
  }))

  return (
    <AnimatePresence>
      {commandOpen && (
        <motion.div
          className="command-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setCommandOpen(false)}
        >
          <motion.div
            className="command-modal"
            initial={{ scale: 0.95, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -10 }}
            transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
            onClick={e => e.stopPropagation()}
          >
            <div className="command-input-wrapper">
              <Search size={18} color="var(--text-tertiary)" />
              <input
                ref={inputRef}
                className="command-input"
                placeholder="Search chapters, pages, actions..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {searching && <div className="loading-spinner" style={{ width: 16, height: 16 }} />}
              <span style={{ fontSize: '11px', color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)', padding: '2px 6px', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>ESC</span>
            </div>

            <div className="command-results">
              {renderedGroups.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                  No results found
                </div>
              ) : (
                renderedGroups.map(({ category, items }) => (
                  <div key={category}>
                    <div className="command-group-label">{category}</div>
                    {items.map(item => (
                      <div
                        key={item.id}
                        className={`command-item${item.flatIdx === selectedIdx ? ' selected' : ''}`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIdx(item.flatIdx)}
                      >
                        <div className="command-item-icon" style={item.color ? { background: item.color + '22', color: item.color } : {}}>
                          <item.icon size={15} />
                        </div>
                        <div className="command-item-text">
                          <div className="command-item-title">{item.label}</div>
                          {item.sub && <div className="command-item-sub">{item.sub}</div>}
                        </div>
                        {item.keys && (
                          <div className="command-kbd">
                            {item.keys.map((k, i) => (
                              <span key={i} className="command-key">{k}</span>
                            ))}
                          </div>
                        )}
                        {item.flatIdx === selectedIdx && (
                          <ArrowRight size={14} color="var(--text-tertiary)" />
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            <div className="command-footer">
              <div className="command-hint">
                <span className="command-key">↑↓</span> navigate
              </div>
              <div className="command-hint">
                <span className="command-key">↵</span> select
              </div>
              <div className="command-hint">
                <span className="command-key">esc</span> close
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { revisionService } from '../services/db'
import { useAuth } from '../contexts/AuthContext'

export function useRevisions() {
  const { user } = useAuth()
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await revisionService.getAll(user.id)
    if (error) setError(error)
    else setRevisions(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const complete = useCallback(async (id, rating, notes = '') => {
    const { data } = await revisionService.complete(id, rating, notes)
    if (data) setRevisions(prev => prev.map(r => r.id === id ? data : r))
    return data
  }, [])

  const reschedule = useCallback(async (id, date) => {
    const { data } = await revisionService.reschedule(id, date)
    if (data) setRevisions(prev => prev.map(r => r.id === id ? data : r))
    return data
  }, [])

  return { revisions, loading, error, reload: load, complete, reschedule }
}

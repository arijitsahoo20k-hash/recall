import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { profileService } from '../services/db'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
        setInitialized(true)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    setLoading(true)
    const { data } = await profileService.get(userId)
    setProfile(data)
    setLoading(false)
    setInitialized(true)
  }

  async function refreshProfile() {
    if (!user) return
    const { data } = await profileService.get(user.id)
    setProfile(data)
  }

  const value = {
    user,
    profile,
    loading,
    initialized,
    refreshProfile,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

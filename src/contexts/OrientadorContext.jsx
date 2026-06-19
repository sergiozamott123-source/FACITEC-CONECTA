import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const OrientadorContext = createContext(null)

export function OrientadorProvider({ children }) {
  const [orientador, setOrientador] = useState(null)
  const [session, setSession] = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchOrientador(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchOrientador(session.user.id)
      else { setOrientador(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchOrientador(userId) {
    setLoading(true)
    const { data, error } = await supabase
      .from('orientador')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle()
    setOrientador(error ? null : (data ?? null))
    setLoading(false)
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
    setOrientador(null)
    setSession(null)
  }

  return (
    <OrientadorContext.Provider value={{ orientador, session, loading, login, logout }}>
      {children}
    </OrientadorContext.Provider>
  )
}

export function useOrientador() {
  const ctx = useContext(OrientadorContext)
  if (!ctx) throw new Error('useOrientador deve ser usado dentro de OrientadorProvider')
  return ctx
}

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AvaliadorContext = createContext(null)

export function AvaliadorProvider({ children }) {
  const [avaliador, setAvaliador] = useState(null)
  const [session, setSession] = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchAvaliador(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchAvaliador(session.user.id)
      else { setAvaliador(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchAvaliador(userId) {
    setLoading(true)
    const { data, error } = await supabase
      .from('avaliador')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle()
    setAvaliador(error ? null : (data ?? null))
    setLoading(false)
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
    setAvaliador(null)
    setSession(null)
  }

  return (
    <AvaliadorContext.Provider value={{ avaliador, session, loading, login, logout }}>
      {children}
    </AvaliadorContext.Provider>
  )
}

export function useAvaliador() {
  const ctx = useContext(AvaliadorContext)
  if (!ctx) throw new Error('useAvaliador deve ser usado dentro de AvaliadorProvider')
  return ctx
}

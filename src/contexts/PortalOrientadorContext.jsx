import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const PortalOrientadorContext = createContext(null)

const SESSION_KEY = 'orientador_session'

export function PortalOrientadorProvider({ children }) {
  const [orientador, setOrientador] = useState(null)
  const [projeto, setProjeto] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchOrientadorByUserId(session.user.id)
      } else {
        const cached = localStorage.getItem(SESSION_KEY)
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            setOrientador(parsed.orientador)
            setProjeto(parsed.projeto)
          } catch {}
        }
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchOrientadorByUserId(session.user.id)
      } else {
        setOrientador(null)
        setProjeto(null)
        localStorage.removeItem(SESSION_KEY)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchOrientadorByUserId(userId) {
    setLoading(true)
    const { data: orData } = await supabase
      .from('orientador')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle()

    if (!orData) { setLoading(false); return }

    const { data: prData } = await supabase
      .from('projeto')
      .select('*')
      .eq('orientador_id', orData.id)
      .eq('status', 'selecionado')
      .maybeSingle()

    setOrientador(orData)
    setProjeto(prData ?? null)
    localStorage.setItem(SESSION_KEY, JSON.stringify({ orientador: orData, projeto: prData }))
    setLoading(false)
  }

  async function login(email, senha) {
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })

    if (authError) {
      throw new Error('E-mail ou senha incorretos.')
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    setOrientador(null)
    setProjeto(null)
    localStorage.removeItem(SESSION_KEY)
  }

  return (
    <PortalOrientadorContext.Provider value={{ orientador, projeto, loading, login, logout, setOrientador }}>
      {children}
    </PortalOrientadorContext.Provider>
  )
}

export function usePortalOrientador() {
  const ctx = useContext(PortalOrientadorContext)
  if (!ctx) throw new Error('usePortalOrientador deve ser usado dentro de PortalOrientadorProvider')
  return ctx
}

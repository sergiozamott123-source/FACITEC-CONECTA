import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const SecretariaAuthContext = createContext(null)

export function SecretariaAuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchRole(session) {
    setLoading(true)
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle()

    setSession(session)
    setRole(data?.role ?? null)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchRole(session)
      else { setLoading(false) }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchRole(session)
      else {
        setSession(null)
        setRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email, senha) {
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })

    if (authError) {
      throw new Error('E-mail ou senha incorretos.')
    }

    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.session.user.id)
      .maybeSingle()

    if (roleRow?.role !== 'secretaria') {
      await supabase.auth.signOut()
      throw new Error('Acesso restrito à Secretaria Executiva. Verifique com o suporte se sua conta está autorizada.')
    }

    setSession(data.session)
    setRole('secretaria')
  }

  async function logout() {
    await supabase.auth.signOut()
    setSession(null)
    setRole(null)
  }

  return (
    <SecretariaAuthContext.Provider value={{ session, role, loading, login, logout }}>
      {children}
    </SecretariaAuthContext.Provider>
  )
}

export function useSecretaria() {
  const ctx = useContext(SecretariaAuthContext)
  if (!ctx) throw new Error('useSecretaria deve ser usado dentro de SecretariaAuthProvider')
  return ctx
}

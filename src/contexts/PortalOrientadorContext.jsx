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

    let prData = null
    if (orData.status === 'substituido') {
      // Orientador já substituído: mantém acesso de consulta ao projeto que
      // ele orientava, mesmo que projeto.orientador_id já aponte para o
      // novo orientador — ver aprovar_substituicao_orientador() e o plano
      // em claude/facitec-conecta-plano-substituicao-orientador.md.
      const { data: histData } = await supabase
        .from('substituicao_orientador')
        .select('projeto_id')
        .eq('orientador_saiu_id', orData.id)
        .order('data_substituicao', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (histData?.projeto_id) {
        const { data: pr } = await supabase
          .from('projeto')
          .select('*, edicao:edicao_id(id, programa_id, ano_referencia, numero_edital)')
          .eq('id', histData.projeto_id)
          .maybeSingle()
        prData = pr ?? null
      }
    } else {
      const { data: pr } = await supabase
        .from('projeto')
        .select('*, edicao:edicao_id(id, programa_id, ano_referencia, numero_edital)')
        .eq('orientador_id', orData.id)
        .eq('status', 'selecionado')
        .maybeSingle()
      prData = pr ?? null
    }

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

  const somenteLeitura = orientador?.status === 'substituido'

  return (
    <PortalOrientadorContext.Provider value={{ orientador, projeto, loading, login, logout, setOrientador, somenteLeitura }}>
      {children}
    </PortalOrientadorContext.Provider>
  )
}

export function usePortalOrientador() {
  const ctx = useContext(PortalOrientadorContext)
  if (!ctx) throw new Error('usePortalOrientador deve ser usado dentro de PortalOrientadorProvider')
  return ctx
}

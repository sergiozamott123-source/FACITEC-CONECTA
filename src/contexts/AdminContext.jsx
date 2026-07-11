import { createContext, useContext, useEffect, useState } from 'react'
import { edicaoService } from '@/lib/db'

const AdminContext = createContext(null)

// programaId é opcional por enquanto (default 'PIBICJR') — passa a vir da rota
// (/admin/:programaSlug/:ano/*) quando o roteamento for generalizado.
export function AdminProvider({ children, programaId = 'PIBICJR' }) {
  const [edicoes, setEdicoes] = useState([])
  const [edicaoSelecionada, setEdicaoSelecionada] = useState(null)
  const programaSelecionado = programaId

  useEffect(() => {
    let cancelado = false
    edicaoService.list(programaId).then(({ data }) => {
      if (cancelado || !data) return
      setEdicoes(data)
      const ativa = data.find((e) => e.status === 'ativo') ?? data[0] ?? null
      setEdicaoSelecionada(ativa)
    }).catch(() => {})
    return () => { cancelado = true }
  }, [programaId])

  return (
    <AdminContext.Provider value={{ programaSelecionado, edicoes, edicaoSelecionada, setEdicaoSelecionada }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider')
  return ctx
}

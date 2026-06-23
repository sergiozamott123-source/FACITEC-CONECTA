import { createContext, useContext, useEffect, useState } from 'react'
import { edicaoService } from '@/lib/db'

const AdminContext = createContext(null)

export function AdminProvider({ children }) {
  const [edicoes, setEdicoes] = useState([])
  const [edicaoSelecionada, setEdicaoSelecionada] = useState(null)
  const programaSelecionado = 'PIBICJR'

  useEffect(() => {
    edicaoService.list().then(({ data }) => {
      if (!data) return
      setEdicoes(data)
      const ativa = data.find((e) => e.status === 'ativo') ?? data[0] ?? null
      setEdicaoSelecionada(ativa)
    }).catch(() => {})
  }, [])

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

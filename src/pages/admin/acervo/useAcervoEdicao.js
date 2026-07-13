import { useCallback, useEffect, useState } from 'react'
import { edicaoService } from '@/lib/db'

// Busca a edição legada uma única vez — reaproveitado pelas 4 páginas de
// entidade (Projetos/Orientadores/Bolsistas/Inscritos), que só precisam do
// cabeçalho (programa/ano), não da lista completa de projetos/documentos.
export function useAcervoEdicao(edicaoId) {
  const [edicao, setEdicao] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEdicao(await edicaoService.get(edicaoId))
    } catch (err) {
      setError(err.message ?? 'Erro ao carregar edição.')
    } finally {
      setLoading(false)
    }
  }, [edicaoId])

  useEffect(() => { carregar() }, [carregar])

  return { edicao, loading, error }
}

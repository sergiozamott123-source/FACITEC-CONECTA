import { useState, useEffect, useCallback } from 'react'

export function useTable(fetchFn) {
  const [data, setData] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      setData(result.data ?? [])
      setCount(result.count ?? result.data?.length ?? 0)
    } catch (e) {
      setError(e.message ?? 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [fetchFn])

  useEffect(() => { load() }, [load])

  return { data, count, loading, error, reload: load }
}

export function useCrud(service) {
  const [saving, setSaving] = useState(false)
  const [crudError, setCrudError] = useState(null)

  const run = async (fn) => {
    setSaving(true)
    setCrudError(null)
    try {
      const result = await fn()
      return result
    } catch (e) {
      setCrudError(e.message ?? 'Erro na operação')
      throw e
    } finally {
      setSaving(false)
    }
  }

  const create = (payload) => run(() => service.create(payload))
  const update = (id, payload) => run(() => service.update(id, payload))
  const remove = (id) => run(() => service.remove(id))

  return { saving, crudError, create, update, remove }
}

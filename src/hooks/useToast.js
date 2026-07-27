import { useCallback, useState } from 'react'

// Toast simples e local à página — mesmo padrão já usado em BolsistaDetalhe.jsx,
// só extraído pra hook por ser reaproveitado em várias telas do Acervo.
export function useToast() {
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  return { toast, showToast }
}

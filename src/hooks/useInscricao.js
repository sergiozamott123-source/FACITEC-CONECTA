import { useState, useEffect, useRef, useCallback } from 'react'
import { inscricaoService } from '@/lib/inscricaoService'

export const INITIAL_FORM = {
  orientador: { nome_completo: '', email: '', cpf: '', telefone: '', titulacao: '', instituicao: '' },
  projeto: {
    titulo: '', eixo_tematico: '', objetivos: '',
    ineditismo_inedito: 'sim', ineditismo_diferencial: '',
    c1_relevancia: '', c2_impacto: '', c3_viabilidade: '', c4_inovacao: '',
  },
  documentos: { pdf_projeto: '', diploma: '' },
}

export function useInscricao(userId) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [rascunhoRecuperado, setRascunhoRecuperado] = useState(false)
  const debounceTimer = useRef(null)

  // Carrega rascunho existente ao obter userId
  useEffect(() => {
    if (!userId) { setIsLoading(false); return }
    setIsLoading(true)
    inscricaoService.getRascunho(userId)
      .then(rascunho => {
        if (rascunho?.dados) {
          const d = rascunho.dados
          setFormData(prev => ({
            orientador: { ...prev.orientador, ...d.orientador },
            projeto:    { ...prev.projeto,    ...d.projeto },
            documentos: { ...prev.documentos, ...d.documentos },
          }))
          const savedStep = rascunho.etapa_atual ?? 1
          setStep(savedStep < 99 ? savedStep : 4)
          setRascunhoRecuperado(true)
        }
      })
      .catch(err => console.warn('Erro ao carregar rascunho:', err.message))
      .finally(() => setIsLoading(false))
  }, [userId])

  // Salva imediatamente (usado ao avançar etapa)
  const saveNow = useCallback(async (data, etapaAtual) => {
    if (!userId) return
    clearTimeout(debounceTimer.current)
    setSaveError(null)
    setIsSaving(true)
    try {
      await inscricaoService.upsertRascunho(userId, data, etapaAtual)
    } catch (err) {
      setSaveError(err.message)
      console.warn('Falha ao salvar rascunho:', err.message)
    } finally {
      setIsSaving(false)
    }
  }, [userId])

  // Salva com debounce 1,5s (usado ao digitar nos campos)
  const saveDebounced = useCallback((data, etapaAtual) => {
    if (!userId) return
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => saveNow(data, etapaAtual), 1500)
  }, [userId, saveNow])

  const updateSection = useCallback((section, values) => {
    setFormData(prev => {
      const next = { ...prev, [section]: { ...prev[section], ...values } }
      saveDebounced(next, step)
      return next
    })
  }, [step, saveDebounced])

  // Avança/retrocede etapa com salvamento imediato
  const goTo = useCallback(async (n) => {
    setStep(n)
    await saveNow(formData, n)
  }, [formData, saveNow])

  const next = useCallback(() => goTo(Math.min(step + 1, 4)), [step, goTo])
  const prev = useCallback(() => goTo(Math.max(step - 1, 1)), [step, goTo])

  const handleUpload = useCallback(async (campo, file) => {
    const path = await inscricaoService.uploadArquivo(userId, campo, file)
    setFormData(prev => {
      const next = { ...prev, documentos: { ...prev.documentos, [campo]: path } }
      saveNow(next, step)
      return next
    })
  }, [userId, step, saveNow])

  const handleRemoveDoc = useCallback((campo) => {
    setFormData(prev => {
      const next = { ...prev, documentos: { ...prev.documentos, [campo]: '' } }
      saveDebounced(next, step)
      return next
    })
  }, [step, saveDebounced])

  const submit = useCallback(async () => {
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      return await inscricaoService.submeter(userId, formData)
    } catch (err) {
      setSubmitError(err.message)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [userId, formData])

  return {
    step, formData, isSaving, saveError, isLoading,
    isSubmitting, submitError, rascunhoRecuperado,
    updateSection, goTo, next, prev, handleUpload, handleRemoveDoc, submit,
  }
}

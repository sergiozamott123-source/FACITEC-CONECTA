import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useInscricao } from '@/hooks/useInscricao'
import { InscricaoLayout } from '@/components/inscricao/InscricaoLayout'
import { StepIndicator } from '@/components/inscricao/StepIndicator'
import { Step1Orientador } from '@/components/inscricao/steps/Step1Orientador'
import { Step2Projeto } from '@/components/inscricao/steps/Step2Projeto'
import { Step3Documentos } from '@/components/inscricao/steps/Step3Documentos'
import { Step4Revisao } from '@/components/inscricao/steps/Step4Revisao'
import { Button } from '@/components/ui/button'
import { ErrorAlert, LoadingState } from '@/components/common/FormField'
import { Loader2, RotateCcw } from 'lucide-react'

const TOTAL_STEPS = 4

const VALIDATIONS = {
  1: (f) => {
    const e = {}
    if (!f.orientador.nome_completo?.trim()) e.nome_completo = 'Campo obrigatório'
    if (!f.orientador.email?.trim()) e.email = 'Campo obrigatório'
    if (!f.orientador.cpf?.trim()) e.cpf = 'Campo obrigatório'
    if (!f.orientador.titulacao) e.titulacao = 'Campo obrigatório'
    if (!f.orientador.instituicao?.trim()) e.instituicao = 'Campo obrigatório'
    return e
  },
  2: (f) => {
    const e = {}
    if (!f.projeto.titulo?.trim()) e.titulo = 'Campo obrigatório'
    if (!f.projeto.eixo_tematico) e.eixo_tematico = 'Campo obrigatório'
    if (!f.projeto.objetivos?.trim()) e.objetivos = 'Campo obrigatório'
    if (f.projeto.ineditismo_inedito === 'nao' && !f.projeto.ineditismo_diferencial?.trim())
      e.ineditismo_diferencial = 'Campo obrigatório quando o projeto já foi apresentado ao FACITEC'
    if (!f.projeto.c1_relevancia?.trim()) e.c1_relevancia = 'Campo obrigatório'
    if (!f.projeto.c2_impacto?.trim()) e.c2_impacto = 'Campo obrigatório'
    if (!f.projeto.c3_viabilidade?.trim()) e.c3_viabilidade = 'Campo obrigatório'
    if (!f.projeto.c4_inovacao?.trim()) e.c4_inovacao = 'Campo obrigatório'
    return e
  },
  3: (f) => {
    const e = {}
    if (!f.documentos.pdf_projeto) e.pdf_projeto = 'Documento obrigatório'
    return e
  },
}

export function FormularioInscricao() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [stepErrors, setStepErrors] = useState({})

  const {
    step, formData, isSaving, saveError, isLoading, isSubmitting, submitError,
    rascunhoRecuperado, updateSection, goTo, next, prev, handleUpload, handleRemoveDoc, submit,
  } = useInscricao(userId)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/inscricao'); return }
      setUserId(session.user.id)
      setAuthLoading(false)
    })
  }, [navigate])

  const handleNext = () => {
    const validate = VALIDATIONS[step]
    if (validate) {
      const errs = validate(formData)
      if (Object.keys(errs).length > 0) {
        setStepErrors(errs)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
    }
    setStepErrors({})
    next()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    try {
      const result = await submit()
      navigate('/inscricao/confirmacao', { state: result })
    } catch {}
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/inscricao')
  }

  if (authLoading || isLoading) {
    return (
      <InscricaoLayout>
        <div className="bg-white rounded-xl p-12 flex items-center justify-center">
          <LoadingState />
        </div>
      </InscricaoLayout>
    )
  }

  return (
    <InscricaoLayout>
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-white/70 text-sm">Inscrição PibicJr</p>
          <div className="flex items-center gap-4">
            {isSaving && (
              <span className="flex items-center gap-1.5 text-white/60 text-xs">
                <Loader2 className="w-3 h-3 animate-spin" />
                Salvando...
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="text-white/60 hover:text-white text-xs underline underline-offset-2"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8">
          <StepIndicator current={step} />

          {rascunhoRecuperado && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-800">
              <RotateCcw className="w-4 h-4 shrink-0" />
              Rascunho recuperado — continue de onde parou.
            </div>
          )}

          {submitError && (
            <div className="mb-4">
              <ErrorAlert message={submitError} />
            </div>
          )}

          {saveError && (
            <div className="mb-4">
              <ErrorAlert message={`Falha ao salvar rascunho: ${saveError}`} />
            </div>
          )}

          {step === 1 && (
            <Step1Orientador
              data={formData.orientador}
              onChange={v => updateSection('orientador', v)}
              errors={stepErrors}
            />
          )}
          {step === 2 && (
            <Step2Projeto
              data={formData.projeto}
              onChange={v => updateSection('projeto', v)}
              errors={stepErrors}
            />
          )}
          {step === 3 && (
            <Step3Documentos
              data={formData.documentos}
              onUpload={handleUpload}
              onRemove={handleRemoveDoc}
              errors={stepErrors}
            />
          )}
          {step === 4 && (
            <Step4Revisao formData={formData} onGoTo={goTo} />
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button variant="outline" onClick={prev} disabled={step === 1}>
              Anterior
            </Button>

            <span className="text-xs text-muted-foreground hidden sm:block">
              Etapa {step} de {TOTAL_STEPS}
            </span>

            {step < TOTAL_STEPS ? (
              <Button onClick={handleNext}>
                Próximo
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </span>
                ) : 'Enviar Inscrição'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </InscricaoLayout>
  )
}

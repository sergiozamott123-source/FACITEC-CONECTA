import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { FormField, Input, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { useCrud } from '@/hooks/useTable'
import { orientadorService, documentoAcervoService } from '@/lib/db'
import { useAcervoEdicao } from './useAcervoEdicao'
import { AcervoEdicaoHeader } from './AcervoEdicaoHeader'
import { DocumentosCell } from './DocumentosCell'
import { ImportarPlanilhaModal } from './ImportarPlanilhaModal'

const CAMPOS_IMPORTACAO = [
  { key: 'nome_completo', label: 'Nome completo' },
  { key: 'email', label: 'E-mail' },
]

const EMPTY_FORM = { nome_completo: '', email: '' }

function CadastroOrientadorLegadoModal({ open, onClose, onCreated, edicaoId }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const { saving, crudError, create } = useCrud(orientadorService)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome_completo.trim()) return
    try {
      await create({
        nome_completo: form.nome_completo.trim(),
        email: form.email.trim() || null,
        edicao_id: edicaoId,
      })
      setForm(EMPTY_FORM)
      onCreated()
    } catch { /* crudError exibido no formulário */ }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cadastrar orientador legado" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Cadastro leve para dados históricos — só o nome é obrigatório.
        </p>
        <FormField label="Nome completo" required>
          <Input value={form.nome_completo} onChange={set('nome_completo')} />
        </FormField>
        <FormField label="E-mail">
          <Input type="email" value={form.email} onChange={set('email')} />
        </FormField>
        <ErrorAlert message={crudError} />
        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button type="submit" size="sm" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function AcervoOrientadores() {
  const { edicaoId } = useParams()
  const { edicao, loading: loadingEdicao, error: erroEdicao } = useAcervoEdicao(edicaoId)

  const [orientadores, setOrientadores] = useState([])
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalImportarAberto, setModalImportarAberto] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [orientadoresRes, docsRes] = await Promise.all([
        orientadorService.list(edicaoId),
        documentoAcervoService.listPorEdicao(edicaoId),
      ])
      setOrientadores(orientadoresRes.data)
      setDocs(docsRes.data)
    } catch (err) {
      setError(err.message ?? 'Erro ao carregar orientadores.')
    } finally {
      setLoading(false)
    }
  }, [edicaoId])

  useEffect(() => { carregar() }, [carregar])

  const recarregarDocs = useCallback(async () => {
    const { data } = await documentoAcervoService.listPorEdicao(edicaoId)
    setDocs(data)
  }, [edicaoId])

  const docsPorOrientador = useCallback(
    (orientadorId) => docs.filter((d) => d.entidade_tipo === 'orientador' && d.entidade_id === orientadorId),
    [docs]
  )

  if (loadingEdicao || loading) return <LoadingState />
  if (erroEdicao) return <ErrorAlert message={erroEdicao} />
  if (error) return <ErrorAlert message={error} />
  if (!edicao) return <EmptyState message="Edição não encontrada." />

  return (
    <div className="space-y-6">
      <AcervoEdicaoHeader
        edicao={edicao}
        acaoLabel="Novo orientador legado"
        acaoIcon={Plus}
        onAcao={() => setModalAberto(true)}
        acaoSecundariaLabel="Importar planilha"
        acaoSecundariaIcon={Upload}
        onAcaoSecundaria={() => setModalImportarAberto(true)}
      />

      {orientadores.length === 0 ? (
        <EmptyState message="Nenhum orientador cadastrado nesta edição ainda." />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Nome</th>
                <th className="text-left font-medium px-4 py-2.5">E-mail</th>
                <th className="text-left font-medium px-4 py-2.5">Documentos</th>
              </tr>
            </thead>
            <tbody>
              {orientadores.map((o) => (
                <tr key={o.id} className="border-t border-border align-top">
                  <td className="px-4 py-2.5 font-medium text-foreground">{o.nome_completo}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{o.email ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <DocumentosCell
                      edicaoId={edicaoId}
                      entidadeTipo="orientador"
                      entidadeId={o.id}
                      docs={docsPorOrientador(o.id)}
                      label="Anexar documento do orientador"
                      onChange={recarregarDocs}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CadastroOrientadorLegadoModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onCreated={() => { setModalAberto(false); carregar() }}
        edicaoId={edicaoId}
      />

      <ImportarPlanilhaModal
        open={modalImportarAberto}
        onClose={() => setModalImportarAberto(false)}
        entidade="orientador"
        tituloEntidade="Orientadores"
        campos={CAMPOS_IMPORTACAO}
        onConfirmar={async (linhasAprovadas) => {
          for (const l of linhasAprovadas) {
            if (!l.nome_completo?.trim()) continue
            await orientadorService.create({
              nome_completo: l.nome_completo.trim(),
              email: l.email?.trim() || null,
              edicao_id: edicaoId,
            })
          }
          await carregar()
        }}
      />
    </div>
  )
}

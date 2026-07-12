import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Plus, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { FormField, Input, Textarea, Select, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { useTable, useCrud } from '@/hooks/useTable'
import { acervoService, edicaoService } from '@/lib/db'
import { PROGRAMAS } from '@/lib/programas'

const EMPTY_EDICAO = {
  programa_id: PROGRAMAS[0]?.programaId ?? '',
  ano_referencia: new Date().getFullYear(),
  numero_edital: '',
  observacoes: '',
}

function CadastroEdicaoLegadaModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_EDICAO)
  const { saving, crudError, create } = useCrud(edicaoService)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      programa_id: form.programa_id,
      ano_referencia: form.ano_referencia ? Number(form.ano_referencia) : null,
      numero_edital: form.numero_edital || null,
      observacoes: form.observacoes || null,
      status: 'encerrado',
    }
    try {
      const created = await create(payload)
      setForm(EMPTY_EDICAO)
      onCreated(created)
    } catch { /* crudError exibido no formulário */ }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cadastrar edição legada" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Edições legadas entram direto como <strong>encerradas</strong> — sem o fluxo de
          inscrição/avaliação da edição ativa, que não se aplica a dados históricos.
        </p>
        <FormField label="Programa" required>
          <Select value={form.programa_id} onChange={set('programa_id')}>
            {PROGRAMAS.map((p) => <option key={p.programaId} value={p.programaId}>{p.nome}</option>)}
          </Select>
        </FormField>
        <FormField label="Ano de referência" required>
          <Input type="number" min="2000" max="2099" value={form.ano_referencia} onChange={set('ano_referencia')} />
        </FormField>
        <FormField label="Número do edital">
          <Input value={form.numero_edital} onChange={set('numero_edital')} placeholder="ex: 01/2022" />
        </FormField>
        <FormField label="Observações">
          <Textarea value={form.observacoes} onChange={set('observacoes')} rows={3} />
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

export function Acervo() {
  const navigate = useNavigate()
  const fetch = useCallback(() => acervoService.listEdicoesEncerradas(), [])
  const { data, loading, error, reload } = useTable(fetch)
  const [modalAberto, setModalAberto] = useState(false)

  const grupos = PROGRAMAS
    .map((p) => ({ programa: p, edicoes: data.filter((e) => e.programa_id === p.programaId) }))
    .filter((g) => g.edicoes.length > 0)

  function handleCreated(edicao) {
    setModalAberto(false)
    reload()
    navigate(`/admin/acervo/${edicao.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted shrink-0">
            <Archive className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">Acervo</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Edições encerradas de todos os programas — projetos, orientadores, bolsistas e material histórico.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setModalAberto(true)}>
          <Plus className="w-4 h-4" /> Nova edição legada
        </Button>
      </div>

      <ErrorAlert message={error} />

      {loading ? <LoadingState /> : grupos.length === 0 ? (
        <EmptyState message="Nenhuma edição encerrada cadastrada ainda. Edições da tela “Edições” com status Encerrado aparecem aqui automaticamente." />
      ) : (
        <div className="space-y-8">
          {grupos.map(({ programa, edicoes }) => (
            <section key={programa.programaId} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: programa.cor }} />
                <h2 className="text-sm font-bold text-foreground">{programa.nome}</h2>
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {edicoes.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {edicoes.map((ed) => (
                  <Card
                    key={ed.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/admin/acervo/${ed.id}`)}
                  >
                    <CardContent className="pt-4 pb-4 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          Edição {ed.ano_referencia ?? '—'}
                        </p>
                        {ed.numero_edital && (
                          <p className="text-xs text-muted-foreground mt-0.5">Edital {ed.numero_edital}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="secondary">Encerrado</Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <CadastroEdicaoLegadaModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}

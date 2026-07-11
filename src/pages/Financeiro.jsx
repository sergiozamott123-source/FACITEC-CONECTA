import { useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, DollarSign, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField, Input, Select, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { useTable, useCrud } from '@/hooks/useTable'
import { pagamentoService, bolsistaService, edicaoService } from '@/lib/db'
import { useAdmin } from '@/contexts/AdminContext'

const STATUS_OPTS = ['pendente', 'agendado', 'pago', 'cancelado', 'devolvido']
const STATUS_VARIANT = { pago: 'success', pendente: 'warning', agendado: 'secondary', cancelado: 'destructive', devolvido: 'destructive' }

const EMPTY = { valor: '', data_pagamento: '', mes_referencia: '', status: 'pendente', bolsista_id: '', edicao_id: '' }

function fmt(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0)
}

function PagamentoForm({ value, onChange, bolsistas, edicoes }) {
  const set = k => e => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Valor (R$)" required>
          <Input type="number" step="0.01" min="0" placeholder="0,00" value={value.valor ?? ''} onChange={set('valor')} />
        </FormField>
        <FormField label="Status">
          <Select value={value.status} onChange={set('status')}>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Data de Pagamento">
          <Input type="date" value={value.data_pagamento ?? ''} onChange={set('data_pagamento')} />
        </FormField>
        <FormField label="Mês de Referência">
          <Input type="month" value={value.mes_referencia ?? ''} onChange={set('mes_referencia')} />
        </FormField>
      </div>
      <FormField label="Bolsista">
        <Select value={value.bolsista_id ?? ''} onChange={set('bolsista_id')}>
          <option value="">Selecione o bolsista</option>
          {bolsistas.map(b => <option key={b.id} value={b.id}>{b.nome_completo ?? b.email}</option>)}
        </Select>
      </FormField>
      <FormField label="Edição">
        <Select value={value.edicao_id ?? ''} onChange={set('edicao_id')}>
          <option value="">Selecione a edição</option>
          {edicoes.map(e => <option key={e.id} value={e.id}>Edição #{e.id} – {e.status}</option>)}
        </Select>
      </FormField>
    </div>
  )
}

export function Financeiro() {
  const { edicaoSelecionada, programaSelecionado } = useAdmin()
  const edicaoId = edicaoSelecionada?.id
  const fetchP = useCallback(() => pagamentoService.list(edicaoId), [edicaoId])
  const fetchB = useCallback(() => bolsistaService.listAll(), [])
  const fetchE = useCallback(() => edicaoService.list(programaSelecionado), [programaSelecionado])

  const { data, loading, error, reload } = useTable(fetchP)
  const { data: bolsistas } = useTable(fetchB)
  const { data: edicoes } = useTable(fetchE)
  const { saving, crudError, create, update, remove } = useCrud(pagamentoService)

  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [confirm, setConfirm] = useState(null)

  function openCreate() { setForm(EMPTY); setModal({ mode: 'create' }) }
  function openEdit(item) {
    setForm({
      valor: item.valor ?? '',
      data_pagamento: item.data_pagamento ?? '',
      mes_referencia: item.mes_referencia ?? '',
      status: item.status ?? 'pendente',
      bolsista_id: item.bolsista_id ?? '',
      edicao_id: item.edicao_id ?? '',
    })
    setModal({ mode: 'edit', item })
  }
  function closeModal() { setModal(null) }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      valor: form.valor ? Number(form.valor) : null,
      data_pagamento: form.data_pagamento || null,
      mes_referencia: form.mes_referencia || null,
      status: form.status,
      bolsista_id: form.bolsista_id || null,
      edicao_id: form.edicao_id || null,
    }
    try {
      if (modal.mode === 'create') await create(payload)
      else await update(modal.item.id, payload)
      closeModal(); reload()
    } catch { /* */ }
  }

  async function handleDelete() {
    try { await remove(confirm); setConfirm(null); reload() } catch { /* */ }
  }

  const totalPago = data.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor ?? 0), 0)
  const totalPendente = data.filter(p => ['pendente', 'agendado'].includes(p.status)).reduce((s, p) => s + Number(p.valor ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de Pagamentos', value: data.length, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', display: String(data.length) },
          { label: 'Total Pago', value: totalPago, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', display: fmt(totalPago) },
          { label: 'A Pagar', value: totalPendente, icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-50', display: fmt(totalPendente) },
        ].map(c => {
          const Icon = c.icon
          return (
            <Card key={c.label}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${c.bg}`}><Icon className={`w-5 h-5 ${c.color}`} /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="text-lg font-bold text-foreground">{c.display}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} pagamento(s)</p>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" />Novo Pagamento</Button>
      </div>

      <ErrorAlert message={error} />

      {loading ? <LoadingState /> : data.length === 0 ? <EmptyState message="Nenhum pagamento registrado." /> : (
        <div className="space-y-2">
          {data.map(p => (
            <Card key={p.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={STATUS_VARIANT[p.status] ?? 'secondary'}>{p.status}</Badge>
                      {p.mes_referencia && <span className="text-xs text-muted-foreground">{p.mes_referencia}</span>}
                    </div>
                    {p.bolsista?.nome_completo && (
                      <p className="text-sm text-foreground">{p.bolsista.nome_completo}
                        {p.bolsista.tipo && <span className="text-xs text-muted-foreground ml-1">({p.bolsista.tipo})</span>}
                      </p>
                    )}
                    {p.data_pagamento && (
                      <p className="text-xs text-muted-foreground">{new Date(p.data_pagamento).toLocaleDateString('pt-BR')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-base font-bold text-foreground">{fmt(p.valor)}</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirm(p.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={closeModal} title={modal?.mode === 'create' ? 'Novo Pagamento' : 'Editar Pagamento'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PagamentoForm value={form} onChange={setForm} bolsistas={bolsistas} edicoes={edicoes} />
          <ErrorAlert message={crudError} />
          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleDelete} loading={saving} />
    </div>
  )
}

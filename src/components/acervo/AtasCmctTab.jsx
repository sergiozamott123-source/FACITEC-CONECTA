import { useCallback, useMemo, useState } from 'react'
import { Search, Plus, ChevronRight, FileText, ExternalLink, Download, Trash2, Pencil } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { FormField, Input, Select, Textarea, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { useTable, useCrud } from '@/hooks/useTable'
import { reuniaoCmctService, documentoAcervoService } from '@/lib/db'
import { useSecretaria } from '@/contexts/SecretariaAuthContext'
import { AnexarDocumentoAtaCmct, CATEGORIAS_ATA_CMCT } from './AnexarDocumentoAtaCmct'
import { CalendarioCmctView } from './CalendarioCmctView'

const STATUS_ATA_LABEL = { sem_ata: 'Sem ata', minuta: 'Minuta', assinada: 'Assinada' }
// Selos com a palavra, nas cores do kit de identidade (classes .dv-selo do kit).
const STATUS_ATA_SELO = { sem_ata: 'dv-selo--neutro', minuta: 'dv-selo--atencao', assinada: 'dv-selo--sucesso' }

function SeloAta({ status }) {
  return <span className={`dv-selo ${STATUS_ATA_SELO[status] ?? 'dv-selo--neutro'}`}>{STATUS_ATA_LABEL[status] ?? status}</span>
}

function formatarData(d) {
  return d ? new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR') : 'Data não confirmada'
}
const CATEGORIA_LABEL = Object.fromEntries(CATEGORIAS_ATA_CMCT.map((c) => [c.value, c.label]))

function tituloReuniao(r) {
  return `${r.numero_ordinal}ª ${r.tipo === 'ordinaria' ? 'Ordinária' : 'Extraordinária'}`
}

function agruparPorAno(reunioes) {
  const anos = [...new Set(reunioes.map((r) => r.ano))].sort((a, b) => b - a)
  return anos.map((ano) => ({
    ano,
    reunioes: reunioes
      .filter((r) => r.ano === ano)
      .sort((a, b) => (b.data_reuniao ?? '').localeCompare(a.data_reuniao ?? '') || b.numero_ordinal - a.numero_ordinal),
  }))
}

const EMPTY_REUNIAO = { ano: new Date().getFullYear(), numero_ordinal: '', tipo: 'ordinaria', data_reuniao: '', observacoes: '' }

function NovaReuniaoForm({ onCreated, onCancel }) {
  const [form, setForm] = useState(EMPTY_REUNIAO)
  const { saving, crudError, create } = useCrud(reuniaoCmctService)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ano: Number(form.ano),
      numero_ordinal: Number(form.numero_ordinal),
      tipo: form.tipo,
      data_reuniao: form.data_reuniao || null,
      observacoes: form.observacoes || null,
    }
    try {
      const created = await create(payload)
      onCreated(created)
    } catch { /* crudError exibido no formulário */ }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Ano" required>
          <Input type="number" min="2000" max="2099" value={form.ano} onChange={set('ano')} />
        </FormField>
        <FormField label="Número" required>
          <Input type="number" min="1" value={form.numero_ordinal} onChange={set('numero_ordinal')} placeholder="ex: 3" />
        </FormField>
      </div>
      <FormField label="Tipo" required>
        <Select value={form.tipo} onChange={set('tipo')}>
          <option value="ordinaria">Ordinária</option>
          <option value="extraordinaria">Extraordinária</option>
        </Select>
      </FormField>
      <FormField label="Data da reunião">
        <Input type="date" value={form.data_reuniao} onChange={set('data_reuniao')} />
      </FormField>
      <FormField label="Observações">
        <Textarea value={form.observacoes} onChange={set('observacoes')} rows={2} />
      </FormField>
      <ErrorAlert message={crudError} />
      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Salvando…' : 'Salvar reunião'}</Button>
      </div>
    </form>
  )
}

function AnexarEmReuniaoExistenteForm({ reunioes, onUploaded }) {
  const [reuniaoId, setReuniaoId] = useState('')

  const opcoes = useMemo(
    () => agruparPorAno(reunioes).flatMap((g) => g.reunioes.map((r) => ({ id: r.id, label: `${r.ano} — ${tituloReuniao(r)}` }))),
    [reunioes]
  )

  if (opcoes.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Cadastre uma reunião antes de anexar arquivos a ela.</p>
  }

  return (
    <div className="space-y-3">
      <FormField label="Reunião" required>
        <Select value={reuniaoId} onChange={(e) => setReuniaoId(e.target.value)}>
          <option value="">Selecione…</option>
          {opcoes.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </Select>
      </FormField>
      {reuniaoId && (
        <AnexarDocumentoAtaCmct reuniaoId={reuniaoId} onUploaded={onUploaded} label="Selecionar arquivo" />
      )}
    </div>
  )
}

function EnviarDocumentoModal({ open, onClose, reunioes, onChanged, onAtaAnexada }) {
  const [modo, setModo] = useState('nova')

  function handleClose() {
    setModo('nova')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Enviar documento" size="md">
      <div className="flex gap-1 border-b border-border mb-4">
        {[['nova', 'Nova reunião'], ['existente', 'Reunião existente']].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setModo(key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${modo === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {modo === 'nova' ? (
        <NovaReuniaoForm onCreated={() => { onChanged(); handleClose() }} onCancel={handleClose} />
      ) : (
        <AnexarEmReuniaoExistenteForm reunioes={reunioes} onUploaded={(doc) => { onChanged(); handleClose(); onAtaAnexada?.(doc) }} />
      )}
    </Modal>
  )
}

function DocumentosReuniao({ reuniaoId, podeEditar, onAnexou }) {
  const fetch = useCallback(() => documentoAcervoService.listPorEntidade('reuniao_cmct', reuniaoId), [reuniaoId])
  const { data: documentos, loading, reload } = useTable(fetch)

  async function handleExcluir(id) {
    await documentoAcervoService.remove(id)
    reload()
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-3">
      {documentos.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhum arquivo anexado ainda.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border">
          {documentos.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 px-3 py-2">
              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{doc.nome_arquivo}</p>
                <p className="text-[10px] text-muted-foreground">
                  {CATEGORIA_LABEL[doc.categoria] ?? doc.categoria}
                  {doc.descricao ? ` · ${doc.descricao}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[color:var(--dv-primaria-texto)] hover:text-[color:var(--dv-primaria-texto)] px-2 py-1 rounded hover:bg-muted transition-colors">
                  <ExternalLink className="w-3 h-3" /> Ver
                </a>
                <a href={doc.url} download
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors">
                  <Download className="w-3 h-3" /> Baixar
                </a>
                {podeEditar && (
                  <button type="button" onClick={() => handleExcluir(doc.id)}
                    className="inline-flex items-center gap-1 text-xs text-destructive/70 hover:text-destructive px-2 py-1 rounded hover:bg-muted transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {podeEditar && (
        <AnexarDocumentoAtaCmct reuniaoId={reuniaoId} onUploaded={(doc) => { reload(); onAnexou?.(doc) }} />
      )}
    </div>
  )
}

// Edição de data e situação da ata de uma reunião (só a Secretaria).
// O banco não atualiza `atualizado_em` sozinho, então gravamos o carimbo aqui.
function EditarReuniaoForm({ reuniao, onSaved, onCancel }) {
  const [data, setData] = useState(reuniao.data_reuniao ?? '')
  const [status, setStatus] = useState(reuniao.status_ata)
  const { saving, crudError, update } = useCrud(reuniaoCmctService)

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const atualizada = await update(reuniao.id, {
        data_reuniao: data || null,
        status_ata: status,
        atualizado_em: new Date().toISOString(),
      })
      onSaved(atualizada)
    } catch { /* crudError exibido no formulário */ }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-border p-3 bg-muted/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Data da reunião">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </FormField>
        <FormField label="Situação da ata">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(STATUS_ATA_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </FormField>
      </div>
      <p className="text-xs text-muted-foreground">Deixe a data vazia enquanto ela não estiver confirmada.</p>
      <ErrorAlert message={crudError} />
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
      </div>
    </form>
  )
}

// Ao anexar um arquivo do tipo "Ata" numa reunião marcada como "Sem ata",
// pergunta se a ata já está assinada. Nada muda sem a resposta de quem usa.
function PerguntaAtaAssinada({ reuniao, onClose, onSaved }) {
  const { saving, crudError, update } = useCrud(reuniaoCmctService)

  async function definir(status) {
    try {
      const atualizada = await update(reuniao.id, { status_ata: status, atualizado_em: new Date().toISOString() })
      onSaved(atualizada)
    } catch { /* crudError exibido abaixo */ }
  }

  return (
    <Modal open onClose={onClose} title="Situação da ata" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-foreground">
          Você anexou uma ata à {tituloReuniao(reuniao)} de {reuniao.ano}. <strong>Esta ata já está assinada?</strong>
        </p>
        <ErrorAlert message={crudError} />
        <div className="flex flex-col gap-2">
          <Button size="sm" disabled={saving} onClick={() => definir('assinada')}>Sim, a ata está assinada</Button>
          <Button size="sm" variant="outline" disabled={saving} onClick={() => definir('minuta')}>Não, é uma minuta</Button>
          <Button size="sm" variant="ghost" disabled={saving} onClick={onClose}>Deixar como está (Sem ata)</Button>
        </div>
      </div>
    </Modal>
  )
}

function ReuniaoDetalheModal({ reuniao, onClose, podeEditar, onSaved, onAnexou }) {
  const [editando, setEditando] = useState(false)
  if (!reuniao) return null

  function fechar() {
    setEditando(false)
    onClose()
  }

  return (
    <Modal open={!!reuniao} onClose={fechar} title={`${reuniao.ano} — ${tituloReuniao(reuniao)}`} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <SeloAta status={reuniao.status_ata} />
          <span className="text-muted-foreground">{formatarData(reuniao.data_reuniao)}</span>
          {podeEditar && !editando && (
            <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => setEditando(true)}>
              <Pencil className="w-3.5 h-3.5" /> Editar data e situação
            </Button>
          )}
        </div>
        {editando && (
          <EditarReuniaoForm
            reuniao={reuniao}
            onSaved={(atualizada) => { setEditando(false); onSaved(atualizada) }}
            onCancel={() => setEditando(false)}
          />
        )}
        {reuniao.observacoes && <p className="text-sm text-muted-foreground">{reuniao.observacoes}</p>}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Arquivos</h3>
          <DocumentosReuniao reuniaoId={reuniao.id} podeEditar={podeEditar} onAnexou={onAnexou} />
        </div>
      </div>
    </Modal>
  )
}

function ListaAtasCmct({ podeEditar }) {
  const { data: reunioes, loading, error, reload } = useTable(reuniaoCmctService.list)
  const [busca, setBusca] = useState('')
  const [filtroAno, setFiltroAno] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [modalEnvio, setModalEnvio] = useState(false)
  const [reuniaoSelecionada, setReuniaoSelecionada] = useState(null)
  const [perguntaAta, setPerguntaAta] = useState(null)

  // Reunião salva (edição ou resposta da pergunta): recarrega a lista e
  // mantém aberta a janela com os dados novos.
  function handleSalva(atualizada) {
    reload()
    setReuniaoSelecionada((atual) => (atual && atual.id === atualizada.id ? atualizada : atual))
  }

  // Depois de anexar um arquivo: se for "Ata" e a reunião estiver "Sem ata", pergunta.
  function handleAnexou(doc) {
    if (doc?.categoria !== 'ata') return
    const reuniao = reunioes.find((r) => r.id === doc.entidade_id)
    if (reuniao && reuniao.status_ata === 'sem_ata') setPerguntaAta(reuniao)
  }

  const anosDisponiveis = useMemo(
    () => [...new Set(reunioes.map((r) => r.ano))].sort((a, b) => b - a),
    [reunioes]
  )

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return reunioes.filter((r) => {
      if (filtroAno && String(r.ano) !== filtroAno) return false
      if (filtroStatus && r.status_ata !== filtroStatus) return false
      if (termo) {
        const alvo = `${r.ano} ${tituloReuniao(r)}`.toLowerCase()
        if (!alvo.includes(termo)) return false
      }
      return true
    })
  }, [reunioes, busca, filtroAno, filtroStatus])

  const grupos = agruparPorAno(filtradas)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por ano, número ou tipo…"
              className="h-8 pl-8 pr-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring w-64"
            />
          </div>
          <select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)}
            className="h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos os anos</option>
            {anosDisponiveis.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
            className="h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_ATA_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        {podeEditar && (
          <Button size="sm" onClick={() => setModalEnvio(true)}>
            <Plus className="w-4 h-4" /> Enviar documento
          </Button>
        )}
      </div>

      <ErrorAlert message={error} />

      {loading ? <LoadingState /> : grupos.length === 0 ? (
        <EmptyState message={reunioes.length === 0 ? 'Nenhuma reunião cadastrada ainda.' : 'Nenhuma reunião encontrada com os filtros atuais.'} />
      ) : (
        <div className="space-y-8">
          {grupos.map(({ ano, reunioes: reunioesDoAno }) => (
            <section key={ano} className="space-y-3">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">{ano}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reunioesDoAno.map((r) => (
                  <Card key={r.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setReuniaoSelecionada(r)}>
                    <CardContent className="pt-4 pb-4 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{tituloReuniao(r)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatarData(r.data_reuniao)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <SeloAta status={r.status_ata} />
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

      <EnviarDocumentoModal open={modalEnvio} onClose={() => setModalEnvio(false)} reunioes={reunioes} onChanged={reload} onAtaAnexada={handleAnexou} />
      <ReuniaoDetalheModal
        reuniao={reuniaoSelecionada}
        onClose={() => setReuniaoSelecionada(null)}
        podeEditar={podeEditar}
        onSaved={handleSalva}
        onAnexou={handleAnexou}
      />
      {perguntaAta && (
        <PerguntaAtaAssinada
          reuniao={perguntaAta}
          onClose={() => setPerguntaAta(null)}
          onSaved={(atualizada) => { setPerguntaAta(null); handleSalva(atualizada) }}
        />
      )}
    </div>
  )
}

// Duas visões: a lista de atas por reunião e o calendário do ano (previsto × realizado).
export function AtasCmctTab() {
  const { role } = useSecretaria()
  const podeEditar = role === 'secretaria'
  const [visao, setVisao] = useState('calendario')

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-border">
        {[['calendario', 'Calendário do ano'], ['atas', 'Atas por reunião']].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setVisao(key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${visao === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {visao === 'calendario' ? <CalendarioCmctView podeEditar={podeEditar} /> : <ListaAtasCmct podeEditar={podeEditar} />}
    </div>
  )
}

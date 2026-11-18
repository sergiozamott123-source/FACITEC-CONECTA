import { useMemo, useState } from 'react'
import { CalendarClock, CalendarPlus, CalendarCheck, CalendarX, ArrowRight, Video, MapPin, Pencil } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { FormField, Input, Select, Textarea, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { useTable } from '@/hooks/useTable'
import { reuniaoCmctService, reuniaoCmctHistoricoService } from '@/lib/db'

// ---------- Utilidades ----------
const MODALIDADE_LABEL = { presencial: 'Presencial', online: 'Online', hibrida: 'Híbrida' }
const ATA_LABEL = { sem_ata: 'Sem ata', minuta: 'Minuta', assinada: 'Ata assinada' }
const ATA_SELO = { sem_ata: 'dv-selo--neutro', minuta: 'dv-selo--atencao', assinada: 'dv-selo--sucesso' }

function fmt(d) {
  return d ? new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR') : '—'
}
function diasEntre(a, b) {
  return Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000)
}
function hoje() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}
function titulo(r) {
  return `${r.numero_ordinal}ª ${r.tipo === 'ordinaria' ? 'Ordinária' : 'Extraordinária'}`
}
function hora(h) {
  return h ? h.slice(0, 5) : null
}

// Diz, em palavras, o que aconteceu com a reunião em relação ao que estava previsto.
function situacaoDaReuniao(r) {
  if (r.situacao_reuniao === 'cancelada') return { texto: 'Cancelada', classe: 'dv-selo--erro' }
  if (r.situacao_reuniao === 'prevista') {
    const atrasada = r.data_reuniao && r.data_reuniao < hoje()
    return atrasada
      ? { texto: 'Data passou — confirmar', classe: 'dv-selo--atencao' }
      : { texto: 'Prevista', classe: 'dv-selo--info' }
  }
  if (!r.data_prevista_original) return { texto: 'Não estava no calendário', classe: 'dv-selo--neutro' }
  const dif = r.data_reuniao ? diasEntre(r.data_prevista_original, r.data_reuniao) : 0
  if (dif === 0) return { texto: 'Na data prevista', classe: 'dv-selo--sucesso' }
  if (dif > 0) return { texto: `Adiada ${dif} dia${dif === 1 ? '' : 's'}`, classe: 'dv-selo--atencao' }
  return { texto: `Antecipada ${-dif} dia${dif === -1 ? '' : 's'}`, classe: 'dv-selo--info' }
}

// ---------- Janelas de ação ----------
function RemarcarForm({ reuniao, onDone, onCancel }) {
  const [data, setData] = useState('')
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!data) { setErro('Informe a nova data.'); return }
    setSaving(true); setErro(null)
    try {
      // 1) guarda no histórico (data antiga → nova + motivo)
      await reuniaoCmctHistoricoService.create({
        reuniao_id: reuniao.id,
        data_anterior: reuniao.data_reuniao,
        data_nova: data,
        motivo: motivo.trim() || null,
      })
      // 2) atualiza a reunião; se ainda não havia "data original", guarda a atual
      await reuniaoCmctService.update(reuniao.id, {
        data_reuniao: data,
        data_prevista_original: reuniao.data_prevista_original ?? reuniao.data_reuniao ?? data,
        atualizado_em: new Date().toISOString(),
      })
      onDone()
    } catch (err) {
      setErro(err.message ?? 'Não foi possível remarcar.')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Data atual: <strong className="text-foreground">{fmt(reuniao.data_reuniao)}</strong>. A data anterior fica guardada no histórico.
      </p>
      <FormField label="Nova data" required><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></FormField>
      <FormField label="Motivo da remarcação">
        <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: falta de quórum, conflito de agenda…" />
      </FormField>
      <ErrorAlert message={erro} />
      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Salvando…' : 'Remarcar'}</Button>
      </div>
    </form>
  )
}

function RealizadaForm({ reuniao, onDone, onCancel }) {
  const [data, setData] = useState(reuniao.data_reuniao ?? '')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!data) { setErro('Informe a data em que a reunião aconteceu.'); return }
    setSaving(true); setErro(null)
    try {
      if (reuniao.data_reuniao && data !== reuniao.data_reuniao) {
        await reuniaoCmctHistoricoService.create({
          reuniao_id: reuniao.id, data_anterior: reuniao.data_reuniao, data_nova: data, motivo: 'Realizada em data diferente da prevista',
        })
      }
      await reuniaoCmctService.update(reuniao.id, {
        data_reuniao: data,
        situacao_reuniao: 'realizada',
        data_prevista_original: reuniao.data_prevista_original ?? reuniao.data_reuniao ?? data,
        atualizado_em: new Date().toISOString(),
      })
      onDone()
    } catch (err) {
      setErro(err.message ?? 'Não foi possível salvar.')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Data em que a reunião aconteceu" required>
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </FormField>
      <ErrorAlert message={erro} />
      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Salvando…' : 'Confirmar realização'}</Button>
      </div>
    </form>
  )
}

function CancelarForm({ reuniao, onDone, onCancel }) {
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState(null)
  async function confirmar() {
    setSaving(true); setErro(null)
    try {
      await reuniaoCmctService.update(reuniao.id, { situacao_reuniao: 'cancelada', atualizado_em: new Date().toISOString() })
      onDone()
    } catch (err) {
      setErro(err.message ?? 'Não foi possível cancelar.')
    } finally { setSaving(false) }
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground">
        Marcar a {titulo(reuniao)} de {reuniao.ano} como <strong>cancelada</strong>? Nada é apagado: ela continua no calendário com o selo “Cancelada”.
      </p>
      <ErrorAlert message={erro} />
      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Voltar</Button>
        <Button type="button" size="sm" disabled={saving} onClick={confirmar}>{saving ? 'Salvando…' : 'Sim, cancelar'}</Button>
      </div>
    </div>
  )
}

// Preenche ou corrige o motivo de cada mudança de data já registrada.
function MotivoForm({ historico, onDone, onCancel }) {
  const [motivos, setMotivos] = useState(() => Object.fromEntries(historico.map((h) => [h.id, h.motivo && h.motivo !== 'A informar' ? h.motivo : ''])))
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setErro(null)
    try {
      for (const h of historico) {
        const novo = motivos[h.id].trim() || null
        if (novo !== (h.motivo === 'A informar' ? null : h.motivo)) await reuniaoCmctHistoricoService.update(h.id, { motivo: novo })
      }
      onDone()
    } catch (err) {
      setErro(err.message ?? 'Não foi possível salvar.')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {historico.map((h) => (
        <FormField key={h.id} label={`${fmt(h.data_anterior)} → ${fmt(h.data_nova)}`}>
          <Textarea rows={2} value={motivos[h.id]} onChange={(e) => setMotivos((m) => ({ ...m, [h.id]: e.target.value }))} placeholder="Por que a data mudou?" />
        </FormField>
      ))}
      <ErrorAlert message={erro} />
      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Salvando…' : 'Salvar motivos'}</Button>
      </div>
    </form>
  )
}

// Cria as reuniões ordinárias previstas de um ano (situação "prevista").
function GerarCalendarioForm({ ano, reunioesDoAno, onDone, onCancel }) {
  const proximoNumero = reunioesDoAno.filter((r) => r.tipo === 'ordinaria').reduce((m, r) => Math.max(m, r.numero_ordinal), 0) + 1
  const [datas, setDatas] = useState(['', '', ''])
  const [horario, setHorario] = useState('15:00')
  const [modalidade, setModalidade] = useState('online')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState(null)

  const preenchidas = datas.filter(Boolean).sort()

  async function handleSubmit(e) {
    e.preventDefault()
    if (preenchidas.length === 0) { setErro('Informe pelo menos uma data.'); return }
    setSaving(true); setErro(null)
    try {
      for (let i = 0; i < preenchidas.length; i += 1) {
        await reuniaoCmctService.create({
          ano,
          numero_ordinal: proximoNumero + i,
          tipo: 'ordinaria',
          data_reuniao: preenchidas[i],
          data_prevista_original: preenchidas[i],
          situacao_reuniao: 'prevista',
          horario: horario || null,
          modalidade: modalidade || null,
        })
      }
      onDone()
    } catch (err) {
      setErro(err.message ?? 'Não foi possível gerar o calendário.')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Informe as datas das próximas reuniões ordinárias de {ano}, como decidido pelo CMCT. Elas serão numeradas a partir da {proximoNumero}ª Ordinária e ficam como “Prevista”.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {datas.map((d, i) => (
          <FormField key={i} label={`Data ${i + 1}`}>
            <Input type="date" value={d} onChange={(e) => setDatas((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} />
          </FormField>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Horário"><Input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} /></FormField>
        <FormField label="Modalidade">
          <Select value={modalidade} onChange={(e) => setModalidade(e.target.value)}>
            {Object.entries(MODALIDADE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </FormField>
      </div>
      <ErrorAlert message={erro} />
      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Criando…' : `Criar ${preenchidas.length || ''} reunião(ões) prevista(s)`}
        </Button>
      </div>
    </form>
  )
}

// ---------- Cartão de uma reunião no calendário ----------
function LinhaReuniao({ r, historico, podeEditar, onAcao }) {
  const sit = situacaoDaReuniao(r)
  const mudou = r.data_prevista_original && r.data_reuniao && r.data_prevista_original !== r.data_reuniao
  const h = hora(r.horario)
  return (
    <Card>
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <p className="text-sm font-semibold text-foreground">{titulo(r)}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`dv-selo ${sit.classe}`}>{sit.texto}</span>
            {r.situacao_reuniao === 'realizada' && <span className={`dv-selo ${ATA_SELO[r.status_ata] ?? 'dv-selo--neutro'}`}>{ATA_LABEL[r.status_ata] ?? r.status_ata}</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {r.data_prevista_original && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Previsto</p>
              <p className={mudou ? 'text-muted-foreground line-through' : 'text-foreground font-medium'}>{fmt(r.data_prevista_original)}</p>
            </div>
          )}
          {mudou && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
          {(mudou || !r.data_prevista_original) && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.situacao_reuniao === 'prevista' ? 'Nova data' : 'Realizada em'}</p>
              <p className="text-foreground font-medium">{fmt(r.data_reuniao)}</p>
            </div>
          )}
          {(h || r.modalidade) && (
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              {r.modalidade === 'online' ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
              {[h && `${h}h`, MODALIDADE_LABEL[r.modalidade]].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {historico.length > 0 && (
          <ul className="space-y-1 text-xs text-muted-foreground border-t border-border pt-2">
            {historico.map((x) => (
              <li key={x.id}>
                {fmt(x.data_anterior)} → {fmt(x.data_nova)}
                {x.motivo && x.motivo !== 'A informar' ? ` — ${x.motivo}` : ' — motivo a informar'}
              </li>
            ))}
          </ul>
        )}

        {podeEditar && r.situacao_reuniao === 'prevista' && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <Button size="sm" variant="outline" onClick={() => onAcao('realizada', r)}><CalendarCheck className="w-3.5 h-3.5" /> Marcar como realizada</Button>
            <Button size="sm" variant="outline" onClick={() => onAcao('remarcar', r)}><CalendarClock className="w-3.5 h-3.5" /> Remarcar</Button>
            <Button size="sm" variant="ghost" onClick={() => onAcao('cancelar', r)}><CalendarX className="w-3.5 h-3.5" /> Cancelar</Button>
          </div>
        )}
        {podeEditar && historico.length > 0 && (
          <div className="border-t border-border pt-3">
            <Button size="sm" variant="ghost" onClick={() => onAcao('motivo', r)}><Pencil className="w-3.5 h-3.5" /> Informar motivo da mudança</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------- Tela principal do calendário ----------
export function CalendarioCmctView({ podeEditar }) {
  const { data: reunioes, loading, error, reload } = useTable(reuniaoCmctService.list)
  const { data: historicoTodo, reload: reloadHistorico } = useTable(reuniaoCmctHistoricoService.list)
  const anoAtual = new Date().getFullYear()
  const [ano, setAno] = useState(anoAtual)
  const [acao, setAcao] = useState(null) // { tipo, reuniao } | { tipo: 'gerar' }

  const anos = useMemo(() => {
    const s = new Set(reunioes.map((r) => r.ano))
    s.add(anoAtual)
    return [...s].sort((a, b) => b - a)
  }, [reunioes, anoAtual])

  const doAno = useMemo(
    () => reunioes
      .filter((r) => r.ano === ano)
      .sort((a, b) => (a.data_prevista_original ?? a.data_reuniao ?? '9999').localeCompare(b.data_prevista_original ?? b.data_reuniao ?? '9999')),
    [reunioes, ano]
  )

  const historicoPorReuniao = useMemo(() => {
    const m = {}
    historicoTodo.forEach((h) => { (m[h.reuniao_id] ||= []).push(h) })
    return m
  }, [historicoTodo])

  const resumo = useMemo(() => {
    const previstas = doAno.filter((r) => r.data_prevista_original)
    const realizadas = doAno.filter((r) => r.situacao_reuniao === 'realizada')
    const adiadas = previstas.filter((r) => r.data_reuniao && r.data_reuniao !== r.data_prevista_original && r.situacao_reuniao !== 'cancelada')
    const extras = doAno.filter((r) => !r.data_prevista_original && r.situacao_reuniao === 'realizada' && r.tipo === 'extraordinaria')
    const aRealizar = doAno.filter((r) => r.situacao_reuniao === 'prevista')
    return { realizadas: realizadas.length, adiadas: adiadas.length, extras: extras.length, aRealizar: aRealizar.length, total: doAno.length }
  }, [doAno])

  function concluido() {
    setAcao(null)
    reload()
    reloadHistorico()
  }

  const tituloModal = { remarcar: 'Remarcar reunião', realizada: 'Marcar como realizada', cancelar: 'Cancelar reunião', motivo: 'Motivo da mudança de data', gerar: `Gerar calendário de ${ano}` }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="cal-ano" className="text-sm text-muted-foreground">Ano</label>
          <select id="cal-ano" value={ano} onChange={(e) => setAno(Number(e.target.value))}
            className="h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {podeEditar && (
          <Button size="sm" onClick={() => setAcao({ tipo: 'gerar' })}><CalendarPlus className="w-4 h-4" /> Gerar calendário do ano</Button>
        )}
      </div>

      <ErrorAlert message={error} />

      {loading ? <LoadingState /> : doAno.length === 0 ? (
        <EmptyState message={`Nenhuma reunião registrada em ${ano}.`} />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Em {ano}: <strong className="text-foreground">{resumo.realizadas}</strong> reunião(ões) realizada(s)
            {resumo.adiadas > 0 && <>, <strong className="text-foreground">{resumo.adiadas}</strong> com data diferente da prevista</>}
            {resumo.extras > 0 && <>, <strong className="text-foreground">{resumo.extras}</strong> extraordinária(s)</>}
            {resumo.aRealizar > 0 && <> e <strong className="text-foreground">{resumo.aRealizar}</strong> ainda por realizar</>}.
          </p>
          <div className="space-y-3">
            {doAno.map((r) => (
              <LinhaReuniao key={r.id} r={r} historico={historicoPorReuniao[r.id] ?? []} podeEditar={podeEditar}
                onAcao={(tipo, reuniao) => setAcao({ tipo, reuniao })} />
            ))}
          </div>
        </>
      )}

      {acao && (
        <Modal open onClose={() => setAcao(null)} title={tituloModal[acao.tipo]} size="md">
          {acao.tipo === 'remarcar' && <RemarcarForm reuniao={acao.reuniao} onDone={concluido} onCancel={() => setAcao(null)} />}
          {acao.tipo === 'realizada' && <RealizadaForm reuniao={acao.reuniao} onDone={concluido} onCancel={() => setAcao(null)} />}
          {acao.tipo === 'cancelar' && <CancelarForm reuniao={acao.reuniao} onDone={concluido} onCancel={() => setAcao(null)} />}
          {acao.tipo === 'motivo' && <MotivoForm historico={historicoPorReuniao[acao.reuniao.id] ?? []} onDone={concluido} onCancel={() => setAcao(null)} />}
          {acao.tipo === 'gerar' && <GerarCalendarioForm ano={ano} reunioesDoAno={doAno} onDone={concluido} onCancel={() => setAcao(null)} />}
        </Modal>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Check, CheckCircle2, Clock, Download, FileText,
  Loader2, Paperclip, Plus, RefreshCw, Scale, Trash2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { ErrorAlert, LoadingState } from '@/components/common/FormField'
import { supabase } from '@/lib/supabase'

const TIPOS_DOC = ['Petição', 'Parecer jurídico', 'Decisão final', 'Outro']

function tipoIcon(tipo) {
  if (tipo === 'Petição')        return <FileText className="w-4 h-4 text-blue-500" />
  if (tipo === 'Parecer jurídico') return <Scale className="w-4 h-4 text-purple-500" />
  if (tipo === 'Decisão final')  return <CheckCircle2 className="w-4 h-4 text-green-600" />
  return <Paperclip className="w-4 h-4 text-gray-400" />
}

export function PainelConsolidadoRecurso() {
  const { recursoId, programa, ano } = useParams()
  const navigate = useNavigate()

  const [recurso,        setRecurso]        = useState(null)
  const [convocacao,     setConvocacao]     = useState(null)
  const [notasOriginais, setNotasOriginais] = useState({})
  const [documentos,     setDocumentos]     = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)
  const [modalJust,      setModalJust]      = useState(null)

  // Upload de documento
  const fileInputRef            = useRef(null)
  const [docModal,      setDocModal]      = useState(false)
  const [docTipo,       setDocTipo]       = useState(TIPOS_DOC[0])
  const [docFile,       setDocFile]       = useState(null)
  const [uploadingDoc,  setUploadingDoc]  = useState(false)
  const [docError,      setDocError]      = useState(null)
  const [deletingDoc,   setDeletingDoc]   = useState(null)

  useEffect(() => { fetchDados() }, [recursoId])

  async function fetchDados() {
    setLoading(true)
    setError(null)

    const [{ data: rec, error: e1 }, { data: conv, error: e2 }, { data: docs }] = await Promise.all([
      supabase
        .from('recurso')
        .select(`
          id, codigo_recurso, projeto_id,
          projeto:projeto_id(id, titulo),
          orientador:orientador_id(id, nome_completo)
        `)
        .eq('id', recursoId)
        .single(),
      supabase
        .from('convocacao')
        .select(`
          id,
          convocacao_criterio(
            id, criterio_id, avaliador_id,
            status, resposta, nova_nota, justificativa, respondido_em,
            avaliador:avaliador_id(id, nome, email),
            criterio:criterio_id(id, codigo, nome)
          )
        `)
        .eq('recurso_id', recursoId)
        .maybeSingle(),
      supabase
        .from('recurso_documento')
        .select('*')
        .eq('recurso_id', recursoId)
        .order('created_at', { ascending: false }),
    ])

    if (e1) { setError(e1.message); setLoading(false); return }

    setRecurso(rec)
    setConvocacao(conv ?? null)
    setDocumentos(docs ?? [])

    if (rec && conv?.convocacao_criterio?.length) {
      const { data: avs } = await supabase
        .from('avaliacao')
        .select('avaliador_id, avaliacao_criterio(criterio_id, nota)')
        .eq('projeto_id', rec.projeto_id)
        .eq('status', 'concluida')

      const map = {}
      ;(avs ?? []).forEach(av => {
        ;(av.avaliacao_criterio ?? []).forEach(ac => {
          map[`${av.avaliador_id}:${ac.criterio_id}`] = ac.nota
        })
      })
      setNotasOriginais(map)
    }

    setLoading(false)
  }

  async function fetchDocumentos() {
    const { data } = await supabase
      .from('recurso_documento')
      .select('*')
      .eq('recurso_id', recursoId)
      .order('created_at', { ascending: false })
    setDocumentos(data ?? [])
  }

  async function handleUploadDoc() {
    if (!docFile) return
    setDocError(null)
    setUploadingDoc(true)
    try {
      const ts        = Date.now()
      const tipoSlug  = docTipo.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      const fileName  = `${tipoSlug}_${ts}.pdf`
      const path      = `recursos/${recursoId}/${fileName}`

      const { error: upErr } = await supabase.storage
        .from('inscricoes')
        .upload(path, docFile, { upsert: false, contentType: 'application/pdf' })
      if (upErr) throw new Error(upErr.message)

      const { data: { publicUrl } } = supabase.storage.from('inscricoes').getPublicUrl(path)

      const { error: dbErr } = await supabase
        .from('recurso_documento')
        .insert({ recurso_id: recursoId, tipo: docTipo, nome_arquivo: fileName, url: publicUrl })
      if (dbErr) throw new Error(dbErr.message)

      setDocModal(false)
      setDocFile(null)
      setDocTipo(TIPOS_DOC[0])
      await fetchDocumentos()
    } catch (err) {
      setDocError(err.message)
    } finally {
      setUploadingDoc(false)
    }
  }

  async function handleDeleteDoc(doc) {
    setDeletingDoc(doc.id)
    try {
      const url  = doc.url
      const path = url.split('/inscricoes/')[1]?.split('?')[0]
      if (path) {
        await supabase.storage.from('inscricoes').remove([path])
      }
      await supabase.from('recurso_documento').delete().eq('id', doc.id)
      await fetchDocumentos()
    } catch (err) {
      setDocError(`Erro ao excluir: ${err.message}`)
    } finally {
      setDeletingDoc(null)
    }
  }

  function handlePDF() {
    const ccs = convocacao?.convocacao_criterio ?? []
    const linhas = ccs.map(cc => {
      const notaOrig  = notasOriginais[`${cc.avaliador_id}:${cc.criterio_id}`] ?? '—'
      const nome      = cc.avaliador?.nome ?? cc.avaliador?.email ?? '—'
      const criterio  = [cc.criterio?.codigo, cc.criterio?.nome].filter(Boolean).join(' — ')
      const resposta  = cc.status === 'respondido'
        ? cc.resposta === 'sim'
          ? `Sim — alterou para ${cc.nova_nota}`
          : 'Não — manteve nota'
        : 'Aguardando resposta'

      return `
        <tr>
          <td>${nome}</td>
          <td>${criterio}</td>
          <td style="text-align:center">${notaOrig}</td>
          <td>${resposta}</td>
          <td style="white-space:pre-wrap">${cc.justificativa ?? '—'}</td>
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Relatório — ${recurso?.codigo_recurso ?? 'Recurso'}</title>
<style>
  body{font-family:Arial,sans-serif;padding:2rem;font-size:12px;color:#111}
  h1{font-size:15px;margin:0 0 4px}
  .sub{font-size:12px;color:#555;margin:0 0 1.5rem}
  table{width:100%;border-collapse:collapse;margin-top:1rem}
  th{background:#f0f0f0;text-align:left;padding:6px 8px;border:1px solid #ccc}
  td{padding:6px 8px;border:1px solid #ccc;vertical-align:top}
  .meta{font-size:11px;color:#777;margin-bottom:1rem}
</style></head><body>
<h1>Relatório de Convocação — ${recurso?.codigo_recurso ?? ''}</h1>
<p class="sub">Projeto: ${recurso?.projeto?.titulo ?? '—'} · Candidato: ${recurso?.orientador?.nome_completo ?? '—'}</p>
<p class="meta">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
<table>
  <thead><tr>
    <th>Avaliador</th><th>Critério</th>
    <th>Nota orig.</th><th>Resposta</th><th>Justificativa</th>
  </tr></thead>
  <tbody>${linhas}</tbody>
</table>
</body></html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.print()
  }

  if (loading) return <LoadingState />
  if (error)   return <ErrorAlert message={error} />
  if (!recurso) return <ErrorAlert message="Recurso não encontrado." />

  const ccs              = convocacao?.convocacao_criterio ?? []
  const total            = ccs.length
  const respondidos      = ccs.filter(cc => cc.status === 'respondido').length
  const todosResponderam = total > 0 && respondidos === total
  const pct              = total > 0 ? Math.round((respondidos / total) * 100) : 0

  const statusLabel = todosResponderam ? 'Aguardando decisão' : 'Em andamento'
  const statusClass = todosResponderam
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-yellow-50 text-yellow-700 border-yellow-200'

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost" size="sm"
          onClick={() => navigate(`/admin/${programa}/${ano}/recursos`)}
          className="gap-1 -ml-1 mt-0.5 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {recurso.codigo_recurso && (
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                {recurso.codigo_recurso}
              </span>
            )}
            <span className={`text-xs font-semibold border px-2 py-0.5 rounded ${statusClass}`}>
              {statusLabel}
            </span>
            <Button
              variant="ghost" size="sm"
              onClick={fetchDados}
              className="gap-1 h-6 text-xs ml-auto"
            >
              <RefreshCw className="w-3 h-3" />
              Atualizar
            </Button>
          </div>
          <h2 className="text-base font-semibold text-foreground mt-1 leading-snug">
            {recurso.projeto?.titulo ?? '—'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Candidato: {recurso.orientador?.nome_completo ?? '—'}
          </p>
        </div>
      </div>

      {/* Barra de progresso */}
      {total > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Respostas recebidas</span>
              <span className="font-bold text-foreground">{respondidos} / {total}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {todosResponderam
                ? 'Todos os convocados responderam.'
                : `${total - respondidos} avaliador(es) ainda não respondeu(ram).`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Grid de avaliadores */}
      {ccs.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-8">
          Nenhuma convocação registrada para este recurso ainda.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ccs.map(cc => {
            const notaOrig  = notasOriginais[`${cc.avaliador_id}:${cc.criterio_id}`] ?? null
            const respondeu = cc.status === 'respondido'
            const alterou   = respondeu && cc.resposta === 'sim'
            const nome      = cc.avaliador?.nome ?? cc.avaliador?.email ?? '—'

            return (
              <Card key={cc.id} className={respondeu ? 'border-green-200' : ''}>
                <CardContent className="pt-4 pb-4 space-y-2">

                  {/* Nome + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{nome}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cc.criterio?.codigo && (
                          <span className="font-bold text-blue-700 mr-1">{cc.criterio.codigo}</span>
                        )}
                        {cc.criterio?.nome}
                      </p>
                    </div>
                    {respondeu ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded shrink-0">
                        <Check className="w-3 h-3" />
                        {alterou ? 'Alterou nota' : 'Manteve nota'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shrink-0">
                        <Clock className="w-3 h-3" />
                        Pendente
                      </span>
                    )}
                  </div>

                  {/* Notas */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>
                      Nota original:{' '}
                      <strong className="text-foreground">{notaOrig ?? '—'}</strong>
                    </span>
                    {alterou && cc.nova_nota !== null && (
                      <>
                        <span className="text-muted-foreground">→</span>
                        <span>
                          Nova nota:{' '}
                          <strong className="text-blue-700">{cc.nova_nota}</strong>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Justificativa */}
                  {cc.justificativa && (
                    <div>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {cc.justificativa}
                      </p>
                      <button
                        onClick={() => setModalJust({ nome, criterio: cc.criterio, texto: cc.justificativa })}
                        className="text-xs text-blue-600 hover:underline mt-1"
                      >
                        Ver completo
                      </button>
                    </div>
                  )}

                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Documentos do processo */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Documentos do processo</p>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-7 text-xs"
              onClick={() => { setDocFile(null); setDocTipo(TIPOS_DOC[0]); setDocError(null); setDocModal(true) }}
            >
              <Plus className="w-3 h-3" />
              Adicionar
            </Button>
          </div>

          <ErrorAlert message={docError} />

          {documentos.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              Nenhum documento anexado.
            </p>
          ) : (
            <div className="divide-y divide-border rounded-md border">
              {documentos.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="shrink-0">{tipoIcon(doc.tipo)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{doc.nome_arquivo}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {doc.tipo} · {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                  </a>
                  <button
                    onClick={() => handleDeleteDoc(doc)}
                    disabled={deletingDoc === doc.id}
                    className="shrink-0 p-1 rounded hover:bg-muted transition-colors disabled:opacity-50"
                    title="Excluir"
                  >
                    {deletingDoc === doc.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                      : <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botões de ação */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <Button variant="outline" onClick={handlePDF} className="gap-2">
          <FileText className="w-4 h-4" />
          PDF consolidado
        </Button>

        <span title={!todosResponderam ? 'Disponível quando todos os convocados responderem' : undefined}>
          <Button
            disabled={!todosResponderam}
            onClick={() => navigate(`/admin/${programa}/${ano}/recursos/${recursoId}/decisao`)}
            className="gap-2"
          >
            <Scale className="w-4 h-4" />
            Gerar decisão final
          </Button>
        </span>
      </div>

      {/* Modal — justificativa completa */}
      <Modal
        open={!!modalJust}
        onClose={() => setModalJust(null)}
        title={modalJust ? `Justificativa — ${modalJust.nome}` : ''}
        size="md"
      >
        {modalJust && (
          <div className="space-y-2">
            {modalJust.criterio && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {[modalJust.criterio.codigo, modalJust.criterio.nome].filter(Boolean).join(' — ')}
              </p>
            )}
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {modalJust.texto}
            </p>
          </div>
        )}
      </Modal>

      {/* Modal — adicionar documento */}
      <Modal
        open={docModal}
        onClose={() => setDocModal(false)}
        title="Adicionar documento"
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tipo de documento</label>
            <select
              value={docTipo}
              onChange={e => setDocTipo(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            >
              {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Arquivo PDF</label>
            {docFile ? (
              <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2">
                <FileText className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-xs text-green-800 truncate flex-1">{docFile.name}</span>
                <button
                  onClick={() => setDocFile(null)}
                  className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 py-5 rounded-md border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors">
                <FileText className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Clique para selecionar um PDF</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={e => setDocFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          <ErrorAlert message={docError} />

          <div className="flex justify-end gap-3 pt-1 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setDocModal(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!docFile || uploadingDoc}
              onClick={handleUploadDoc}
              className="gap-2"
            >
              {uploadingDoc
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Enviando…</>
                : <><Plus className="w-3.5 h-3.5" />Anexar</>
              }
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}

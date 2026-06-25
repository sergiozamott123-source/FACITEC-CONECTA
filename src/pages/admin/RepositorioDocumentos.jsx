import { useEffect, useState } from 'react'
import { Archive, Download, ExternalLink, FileText, Paperclip, Plus, Upload, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ErrorAlert, LoadingState } from '@/components/common/FormField'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/contexts/AdminContext'

// ── helpers ─────────────────────────────────────────────────────────────────

const TIPO_LABEL = {
  recurso_interposto: 'Recurso interposto',
  resposta_recurso: 'Resposta ao recurso',
}

function initials(nome) {
  if (!nome) return '?'
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function statusBadge(status) {
  if (status === 'deferido')
    return (
      <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded border border-green-200 bg-green-50 text-green-700">
        Deferido
      </span>
    )
  if (status === 'indeferido')
    return (
      <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded border border-red-200 bg-red-50 text-red-700">
        Indeferido
      </span>
    )
  return (
    <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded border border-border bg-muted text-muted-foreground capitalize">
      {status ?? 'Em análise'}
    </span>
  )
}

// ── RecursoCard ──────────────────────────────────────────────────────────────

function RecursoCard({ recurso }) {
  const docs = recurso.recurso_documento ?? []
  const nomeRecorrente = recurso.orientador?.nome_completo ?? '—'

  return (
    <Card>
      <CardContent className="pt-4 pb-4 space-y-3">

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted text-muted-foreground text-sm font-bold shrink-0">
            {initials(nomeRecorrente)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {recurso.codigo_recurso && (
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                  {recurso.codigo_recurso}
                </span>
              )}
              {statusBadge(recurso.status)}
            </div>
            <p className="text-sm font-semibold text-foreground mt-0.5 leading-snug">
              {nomeRecorrente}
            </p>
          </div>
        </div>

        {/* Projeto */}
        {recurso.projeto && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground truncate block">
              {recurso.projeto.titulo ?? '—'}
            </span>
          </div>
        )}

        {/* Datas */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            Interposto em{' '}
            <strong className="text-foreground">{fmtDate(recurso.assinado_em ?? recurso.enviado_em)}</strong>
          </span>
          {recurso.respondido_em && (
            <span>
              Decisão em{' '}
              <strong className="text-foreground">{fmtDate(recurso.respondido_em)}</strong>
            </span>
          )}
        </div>

        {/* Documentos */}
        {docs.length > 0 && (
          <div className="divide-y divide-border rounded-md border">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 px-3 py-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {doc.nome_arquivo ?? TIPO_LABEL[doc.tipo] ?? 'Documento'}
                  </p>
                  {doc.tipo && (
                    <p className="text-[10px] text-muted-foreground">
                      {TIPO_LABEL[doc.tipo] ?? doc.tipo}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Visualizar
                  </a>
                  <a
                    href={doc.url}
                    download
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Baixar
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {docs.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Nenhum documento anexado.</p>
        )}

        {/* Ação */}
        <div className="pt-1">
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" disabled>
            <Plus className="w-3 h-3" />
            Anexar outro documento
          </Button>
        </div>

      </CardContent>
    </Card>
  )
}

// ── AvaliadorCard ─────────────────────────────────────────────────────────────

function AvaliadorCard({ avaliador }) {
  const url = avaliador.extrato_url

  function nomeArquivo(u) {
    if (!u) return ''
    try { return decodeURIComponent(u.split('/').pop()) } catch { return u.split('/').pop() }
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-xs font-bold shrink-0">
            {initials(avaliador.nome)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{avaliador.nome ?? '—'}</p>
            {avaliador.created_at && (
              <p className="text-[10px] text-muted-foreground">
                Desde {fmtDate(avaliador.created_at)}
              </p>
            )}
          </div>
        </div>

        {url ? (
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded max-w-full">
              <Paperclip className="w-3 h-3 shrink-0" />
              <span className="truncate">{nomeArquivo(url)}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Ver
              </a>
              <a
                href={url}
                download
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="w-3 h-3" />
                Baixar
              </a>
            </div>
          </div>
        ) : (
          <button
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/50 rounded px-2.5 py-1.5 transition-colors"
            disabled
          >
            <Upload className="w-3 h-3" />
            Extrato não anexado
          </button>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export function RepositorioDocumentos() {
  const { edicaoSelecionada } = useAdmin()

  const [recursos,    setRecursos]    = useState([])
  const [avaliadores, setAvaliadores] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  useEffect(() => {
    if (!edicaoSelecionada?.id) return
    fetchDados(edicaoSelecionada.id)
  }, [edicaoSelecionada?.id])

  async function fetchDados(edicaoId) {
    setLoading(true)
    setError(null)
    try {
      // Get projeto IDs for this edition
      const { data: projetos, error: eProjetos } = await supabase
        .from('projeto')
        .select('id')
        .eq('edicao_id', edicaoId)
      if (eProjetos) throw new Error(eProjetos.message)

      const projetoIds = (projetos ?? []).map((p) => p.id)

      // Fetch in parallel
      const [recursosRes, avaliacoesRes] = await Promise.all([
        projetoIds.length > 0
          ? supabase
              .from('recurso')
              .select(`
                id, codigo_recurso, status, assinado_em, enviado_em, respondido_em,
                projeto:projeto_id(id, titulo),
                orientador:orientador_id(id, nome_completo),
                recurso_documento(id, tipo, nome_arquivo, url, created_at)
              `)
              .in('projeto_id', projetoIds)
              .order('assinado_em', { ascending: false })
          : Promise.resolve({ data: [], error: null }),

        projetoIds.length > 0
          ? supabase
              .from('avaliacao')
              .select(`
                avaliador_id,
                avaliador:avaliador_id(id, nome, extrato_url, created_at)
              `)
              .in('projeto_id', projetoIds)
          : Promise.resolve({ data: [], error: null }),
      ])

      if (recursosRes.error) throw new Error(recursosRes.error.message)
      if (avaliacoesRes.error) throw new Error(avaliacoesRes.error.message)

      // Deduplicate avaliadores
      const avMap = new Map()
      ;(avaliacoesRes.data ?? []).forEach((row) => {
        const av = row.avaliador
        if (av && !avMap.has(av.id)) avMap.set(av.id, av)
      })

      setRecursos(recursosRes.data ?? [])
      setAvaliadores([...avMap.values()])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const nomeEdital = edicaoSelecionada
    ? `Edição ${edicaoSelecionada.ano_referencia}${edicaoSelecionada.numero_edital ? ` — Edital ${edicaoSelecionada.numero_edital}` : ''}`
    : '—'

  if (!edicaoSelecionada) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Archive className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Selecione uma edição na barra lateral para visualizar o repositório.</p>
      </div>
    )
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorAlert message={error} />

  return (
    <div className="space-y-8">

      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted shrink-0">
          <Archive className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">Repositório de documentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{nomeEdital}</p>
        </div>
      </div>

      {/* Seção: Recursos administrativos */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Recursos administrativos</h2>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {recursos.length}
          </span>
        </div>

        {recursos.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/30 py-10 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum recurso registrado nesta edição.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {recursos.map((rec) => (
              <RecursoCard key={rec.id} recurso={rec} />
            ))}
          </div>
        )}
      </section>

      {/* Seção: Extratos dos avaliadores */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Extratos dos avaliadores</h2>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {avaliadores.length}
          </span>
        </div>

        {avaliadores.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/30 py-10 text-center">
            <User className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum avaliador associado a esta edição.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {avaliadores.map((av) => (
              <AvaliadorCard key={av.id} avaliador={av} />
            ))}
          </div>
        )}
      </section>

    </div>
  )
}

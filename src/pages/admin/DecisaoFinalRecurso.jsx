import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, FileText, Loader2, Scale, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { ErrorAlert, LoadingState } from '@/components/common/FormField'
import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase'
import logoFacitec from '@/assets/facitec_logo_cropped.png'
import logoCdtiv from '@/assets/logo-cdtiv.jpg.jpg'

function arredonda(n) {
  return Math.round(n * 100) / 100
}

function dataPorExtenso(date = new Date()) {
  const meses = [
    'janeiro','fevereiro','março','abril','maio','junho',
    'julho','agosto','setembro','outubro','novembro','dezembro',
  ]
  return `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`
}

function buildCriterios(rcList, ccAll, notaMap) {
  return [...rcList]
    .sort((a, b) => (a.criterio?.ordem ?? 0) - (b.criterio?.ordem ?? 0))
    .map(rc => {
      const ccList     = ccAll.filter(cc => cc.criterio_id === rc.criterio_id)
      const pendentes  = ccList.filter(cc => cc.status === 'convocado')
      const simVoters  = ccList.filter(cc => cc.status === 'respondido' && cc.resposta === 'sim')
      const naoVoters  = ccList.filter(cc => cc.status === 'respondido' && cc.resposta === 'nao')
      const votos_sim  = simVoters.length
      const votos_nao  = naoVoters.length
      const decisao    = votos_sim > votos_nao ? 'alterada' : 'mantida'
      const nota_calculada = decisao === 'alterada' && simVoters.length > 0
        ? arredonda(simVoters.reduce((s, cc) => s + (cc.nova_nota ?? 0), 0) / simVoters.length)
        : null

      return {
        rcId: rc.id,
        criterio: rc.criterio,
        fundamentacao: rc.fundamentacao ?? null,
        ccList,
        pendentes,
        simVoters,
        naoVoters,
        votos_sim,
        votos_nao,
        decisao,
        nota_calculada,
      }
    })
}

export function DecisaoFinalRecurso() {
  const { recursoId } = useParams()
  const navigate      = useNavigate()

  const [recurso,        setRecurso]        = useState(null)
  const [criterios,      setCriterios]      = useState([])
  const [notaMap,        setNotaMap]        = useState({})
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)
  const [confirming,     setConfirming]     = useState(false)
  const [salvando,       setSalvando]       = useState(false)
  const [actionError,    setActionError]    = useState(null)
  const [sucesso,        setSucesso]        = useState(false)
  const [resumo,         setResumo]         = useState([])

  // Fase E — Parecer Oficial
  const [parecerModal,   setParecerModal]   = useState(false)
  const [presidenteNome, setPresidenteNome] = useState('')
  const [textoIA,        setTextoIA]        = useState('')
  const [gerandoIA,      setGerandoIA]      = useState(false)

  async function gerarComIA() {
    setGerandoIA(true)
    try {
      const resp = await fetch(
        `${supabaseUrl}/functions/v1/gerar-parecer-recurso`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            recurso_id: recurso.id,
            criterio_ids: criterios.map(c => c.criterio?.id).filter(Boolean),
          }),
        }
      )
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }))
        throw new Error(err.error ?? 'Erro ao gerar texto com IA')
      }
      const { texto_gerado } = await resp.json()
      setTextoIA(texto_gerado ?? '')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setGerandoIA(false)
    }
  }

  useEffect(() => { fetchDados() }, [recursoId])

  async function fetchDados() {
    setLoading(true)
    setError(null)

    const [
      { data: rec,    error: e1 },
      { data: rcList, error: e2 },
      { data: conv,   error: e3 },
    ] = await Promise.all([
      supabase
        .from('recurso')
        .select(`
          id, codigo_recurso, status, projeto_id, enviado_em,
          projeto:projeto_id(id, titulo, edicao_id, edicao:edicao_id(numero_edital, numero_processo, item_criterios_avaliacao, prazo_recurso_fim)),
          orientador:orientador_id(id, nome_completo)
        `)
        .eq('id', recursoId)
        .single(),
      supabase
        .from('recurso_criterio')
        .select('id, criterio_id, fundamentacao, criterio:criterio_id(id, codigo, nome, nota_maxima, ordem)')
        .eq('recurso_id', recursoId),
      supabase
        .from('convocacao')
        .select(`
          id,
          convocacao_criterio(
            id, criterio_id, avaliador_id,
            status, resposta, nova_nota, justificativa, respondido_em,
            avaliador:avaliador_id(id, nome, email)
          )
        `)
        .eq('recurso_id', recursoId)
        .maybeSingle(),
    ])

    if (e1 || e2) { setError((e1 ?? e2).message); setLoading(false); return }

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

    setRecurso(rec)
    setNotaMap(map)
    setCriterios(buildCriterios(rcList ?? [], conv?.convocacao_criterio ?? [], map))
    setLoading(false)
  }

  const hasPendentes   = criterios.some(c => c.pendentes.length > 0)
  const podeConfirmar  = !hasPendentes && criterios.length > 0

  async function handleConfirmar() {
    setSalvando(true)
    setActionError(null)
    setConfirming(false)

    try {
      const now = new Date().toISOString()

      for (const crit of criterios) {
        // 1. Gravar decisão em recurso_criterio
        const { error: errRC } = await supabase
          .from('recurso_criterio')
          .update({
            decisao_final: crit.decisao,
            votos_sim:     crit.votos_sim,
            votos_nao:     crit.votos_nao,
            nota_aplicada: crit.nota_calculada,
            decidido_em:   now,
          })
          .eq('id', crit.rcId)
        if (errRC) throw new Error(`Erro ao gravar decisão (${crit.criterio?.codigo}): ${errRC.message}`)

        // 2. Se alterada: atualizar avaliacao_criterio dos que votaram 'sim'
        if (crit.decisao === 'alterada' && crit.simVoters.length > 0) {
          const avaliadorIds = crit.simVoters.map(cc => cc.avaliador_id)

          const { data: avaliacoes, error: errAv } = await supabase
            .from('avaliacao')
            .select('id, avaliador_id')
            .eq('projeto_id', recurso.projeto_id)
            .in('avaliador_id', avaliadorIds)
          if (errAv) throw new Error(`Erro ao buscar avaliações: ${errAv.message}`)

          for (const av of (avaliacoes ?? [])) {
            const { error: errAC } = await supabase
              .from('avaliacao_criterio')
              .update({ nota: crit.nota_calculada, alterado_em_recurso: true })
              .eq('avaliacao_id', av.id)
              .eq('criterio_id', crit.criterio.id)
            if (errAC) throw new Error(`Erro ao atualizar nota: ${errAC.message}`)
          }
        }
      }

      // 3. Encerrar recurso — deferido se ao menos um critério foi alterado
      const statusFinal = criterios.some(c => c.decisao === 'alterada') ? 'deferido' : 'indeferido'
      const { error: errRec } = await supabase
        .from('recurso')
        .update({ status: statusFinal })
        .eq('id', recursoId)
      if (errRec) throw new Error(`Erro ao encerrar recurso: ${errRec.message}`)

      setResumo(criterios.map(c => ({
        criterio:       c.criterio,
        decisao:        c.decisao,
        nota_calculada: c.nota_calculada,
        votos_sim:      c.votos_sim,
        votos_nao:      c.votos_nao,
      })))
      setSucesso(true)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setSalvando(false)
    }
  }

  // ─── Fase E: gerar parecer oficial em PDF ────────────────────────────────
  function handleGerarPDF() {
    const dataHoje      = dataPorExtenso()
    const edicao        = recurso?.projeto?.edicao
    const tempestivo    = recurso?.enviado_em && edicao?.prazo_recurso_fim
      ? new Date(recurso.enviado_em) <= new Date(edicao.prazo_recurso_fim)
      : true

    const isDeferido    = criterios.some(c => c.decisao === 'alterada')
    const nomeOrient    = recurso?.orientador?.nome_completo ?? '—'
    const tituloProjeto = recurso?.projeto?.titulo ?? '—'
    const codigoRecurso = recurso?.codigo_recurso ?? '—'
    const numEdital     = edicao?.numero_edital ?? '—'
    const numProcesso   = edicao?.numero_processo ?? '—'
    const itemCrit      = edicao?.item_criterios_avaliacao ?? '—'
    const nomesCrit     = criterios.map(c => c.criterio?.nome ?? '—').join(', ')

    const avIds = new Set()
    criterios.forEach(c => c.ccList.forEach(cc => avIds.add(cc.avaliador_id)))
    const numAv = avIds.size

    function esc(str) {
      return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
    }

    const blocoII3 = textoIA
      .split(/\n\n+/)
      .filter(p => p.trim())
      .map(p => `<p>${esc(p.trim())}</p>`)
      .join('\n')

    const nomesTodos = criterios.map(c => c.criterio?.nome ?? '—').join(', ')

    const alteracoesTexto = criterios
      .filter(c => c.decisao === 'alterada')
      .map(c => {
        const notaOrig = c.simVoters.length > 0
          ? arredonda(c.simVoters.reduce((s, cc) => s + (notaMap[`${cc.avaliador_id}:${cc.criterio_id}`] ?? 0), 0) / c.simVoters.length)
          : null
        return `Critério ${esc(c.criterio?.nome ?? '—')}: de ${notaOrig !== null ? notaOrig.toFixed(2) : '—'} para ${c.nota_calculada?.toFixed(2) ?? '—'}`
      }).join('; ')

    const secaoII = !tempestivo ? '' : `
      <h2>SEÇÃO II – FUNDAMENTAÇÃO</h2>

      <p><strong>II.1 – Da competência e do conhecimento do recurso</strong></p>
      <p>Conforme previsto no edital ${esc(numEdital)}, os recursos interpostos contra o resultado preliminar devem ser dirigidos ao Presidente do Conselho Municipal de Ciência e Tecnologia, a quem compete o julgamento.</p>
      <p>No caso concreto, o recurso administrativo foi protocolado tempestivamente, identifica com precisão a proposta e o resultado impugnado, e foi apresentado por quem figura como proponente, preenchendo, portanto, os requisitos objetivos e subjetivos de admissibilidade.</p>
      <p>Diante disso, CONHEÇO do recurso interposto por ${esc(nomeOrient)} para exame de mérito.</p>

      <p><strong>II.2 – Da motivação da avaliação e da atuação da Banca</strong></p>
      <p>Registre-se, inicialmente, que a atribuição original de notas às propostas submetidas ao Edital ${esc(numEdital)} não foi acompanhada de motivação escrita individualizada para cada critério, tendo sido divulgadas apenas as pontuações finais.</p>
      <p>A fase recursal, entretanto, foi estruturada de modo a permitir a reapreciação das propostas e a explicitação das razões técnicas de manutenção ou alteração das notas, incumbindo à Banca Avaliadora emitir pareceres fundamentados à luz dos critérios definidos no item ${esc(itemCrit)} do edital.</p>
      <p>No âmbito do presente recurso, a Banca Avaliadora examinou detidamente as razões apresentadas pela recorrente em relação a cada um dos critérios de avaliação, tendo emitido manifestação técnica que supre de forma adequada a motivação das notas originalmente atribuídas.</p>

      <p><strong>II.3 – Do mérito recursal segundo os critérios de avaliação</strong></p>
      ${blocoII3}

      <p><strong>II.4 – Síntese conclusiva</strong></p>
      <p>À vista de todo o exposto, constata-se que: (i) o recurso preenche os requisitos de admissibilidade e foi devidamente conhecido; (ii) a Banca Avaliadora examinou a proposta e as razões recursais à luz dos critérios do edital, emitindo parecer técnico fundamentado; e (iii) ${
        isDeferido
          ? 'restou demonstrado que as notas merecem revisão conforme deliberação da Banca.'
          : 'não restou demonstrado vício de legalidade, erro manifesto ou arbitrariedade que justifique a alteração das notas atribuídas.'
      }</p>`

    const secaoIII = !tempestivo ? '' : `
      <h2>SEÇÃO III – DISPOSITIVO</h2>
      <p>Diante do exposto, no uso das atribuições que me confere o Edital FACITEC n.º ${esc(numEdital)} e na qualidade de Presidente do Conselho Municipal de Ciência e Tecnologia – CMCT, DECIDO:</p>
      <p>1) CONHECER do recurso administrativo interposto por ${esc(nomeOrient)}, relativo à proposta ${esc(tituloProjeto)}, vinculada ao Processo Administrativo n.º ${esc(numProcesso)}.</p>
      ${isDeferido
        ? `<p>2) NO MÉRITO, DAR PROVIMENTO ao recurso, alterando as seguintes notas: ${alteracoesTexto}.</p>`
        : `<p>2) NO MÉRITO, NEGAR PROVIMENTO ao recurso, mantendo-se inalteradas as notas atribuídas aos critérios ${esc(nomesTodos)}, por seus próprios fundamentos técnicos, ora expressamente adotados como razões de decidir.</p>`
      }
      <p>3) Determinar a publicação desta decisão no endereço eletrônico oficial do Fundo FACITEC (facitecnews.com.br), de forma consolidada com os demais resultados, para que produza seus regulares efeitos jurídicos e administrativos.</p>`

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Decisão Final — ${esc(codigoRecurso)}</title>
  <style>
    @page { size: A4; margin: 2.5cm 3cm; }
    body { font-family: Arial, sans-serif; font-size: 12pt; color: #000; line-height: 1.7; margin: 2.5rem 3rem; }
    h1 { font-size: 12pt; font-weight: bold; text-transform: uppercase; text-align: center; margin: 4px 0; line-height: 1.5; }
    h2 { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 28px 0 14px; }
    p { margin: 0 0 14px; text-align: justify; }
    .cabecalho { text-align: center; margin-bottom: 36px; border-bottom: 2px solid #000; padding-bottom: 20px; }
    .assinatura { margin-top: 64px; text-align: center; }
    .assinatura .data { margin-bottom: 52px; }
    .assinatura .linha { border-top: 1px solid #000; width: 320px; margin: 0 auto 8px; }
    .assinatura p { margin: 3px 0; text-align: center; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>

  <div class="cabecalho">
    <h1>COMPANHIA DE DESENVOLVIMENTO, TURISMO E INOVAÇÃO DE VITÓRIA – CDTIV</h1>
    <h1>CONSELHO MUNICIPAL DE CIÊNCIA E TECNOLOGIA – CMCT</h1>
    <h1>PROCESSO ADMINISTRATIVO N.º ${esc(numProcesso)}</h1>
    <h1>EDITAL FACITEC N.º ${esc(numEdital)} – PIBICJR</h1>
    <h1>RECURSO ADMINISTRATIVO – PROPOSTA ${esc(tituloProjeto)}</h1>
  </div>

  <h2>SEÇÃO I – RELATÓRIO</h2>
  <p>Trata-se de recurso administrativo interposto por ${esc(nomeOrient)}, registrado sob o código ${esc(codigoRecurso)}, em face do resultado preliminar de avaliação da proposta intitulada ${esc(tituloProjeto)}, submetida no âmbito do Edital FACITEC n. ${esc(numEdital)} – Programa Institucional de Bolsas de Iniciação Científica Júnior – PIBICJR.</p>
  <p>A recorrente insurge-se contra as notas atribuídas aos critérios de avaliação previstos no edital, pleiteando a revisão das pontuações atribuídas aos critérios ${esc(nomesCrit)}.</p>
  ${tempestivo
    ? `<p>O recurso foi apresentado dentro do prazo estabelecido no cronograma do edital ${esc(numEdital)}, por parte legítima e em peça escrita, razão pela qual foi formalmente conhecido e encaminhado à Banca Avaliadora composta por ${numAv} avaliador${numAv !== 1 ? 'es' : ''}, para análise técnica e emissão de parecer fundamentado quanto às razões recursais.</p><p>É o relatório. Decido.</p>`
    : `<p>Não obstante, verifica-se que o recurso foi interposto fora do prazo estabelecido no cronograma do Edital FACITEC n. ${esc(numEdital)}, razão pela qual se mostra <strong>INTEMPESTIVO</strong>, não podendo ser formalmente conhecido.</p>`
  }

  ${secaoII}
  ${secaoIII}

  <div class="assinatura">
    <p class="data">Vitória/ES, ${dataHoje}.</p>
    <div class="linha"></div>
    <p><strong>${esc(presidenteNome)}</strong></p>
    <p>Diretor Presidente da CDTIV</p>
    <p>Presidente do Conselho Municipal de Ciência e Tecnologia – CMCT</p>
  </div>

</body>
</html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.print()
  }

  // ─── Tela de sucesso ──────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center py-8 space-y-3">
          <CheckCircle2 className="w-14 h-14 text-green-500" />
          <h2 className="text-lg font-bold text-foreground">Decisão final registrada!</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            O recurso foi concluído e as notas foram atualizadas conforme a deliberação.
          </p>
        </div>

        <Card>
          <CardContent className="pt-4 pb-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Resumo da decisão
            </p>
            {resumo.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {r.criterio?.codigo && (
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
                      {r.criterio.codigo}
                    </span>
                  )}
                  <span className="text-sm text-foreground truncate">{r.criterio?.nome}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {r.votos_sim}S · {r.votos_nao}N
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                    r.decisao === 'alterada'
                      ? 'text-blue-700 bg-blue-50 border-blue-200'
                      : 'text-gray-600 bg-gray-50 border-gray-200'
                  }`}>
                    {r.decisao === 'alterada'
                      ? `Alterada → ${r.nota_calculada?.toFixed(2)}`
                      : 'Mantida'}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => setParecerModal(true)} className="gap-2">
            <FileText className="w-4 h-4" />
            Gerar Parecer Oficial
          </Button>
          <Button onClick={() => navigate('/recursos')}>
            Voltar à lista de recursos
          </Button>
        </div>

        {/* Modal — Parecer Oficial */}
        <Modal
          open={parecerModal}
          onClose={() => setParecerModal(false)}
          title="Gerar Parecer Oficial"
          size="lg"
        >
          <div className="space-y-5">

            {/* Local e data (fixo) */}
            <div className="rounded-md bg-muted/50 border border-border px-4 py-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                Local e data
              </p>
              <p className="text-sm text-foreground">Vitória, {dataPorExtenso()}.</p>
            </div>

            {/* Nome do Presidente */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Nome do Presidente do CMCT
                <span className="text-destructive ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={presidenteNome}
                onChange={e => setPresidenteNome(e.target.value)}
                placeholder="Ex.: João da Silva Souza"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              />
            </div>

            {/* Item II.3 — gerado por IA */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-foreground">
                  Item II.3 – Mérito recursal por critério
                  <span className="text-destructive ml-0.5">*</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={gerandoIA}
                  onClick={gerarComIA}
                  className="gap-1.5 shrink-0"
                >
                  {gerandoIA
                    ? <><Loader2 className="w-3 h-3 animate-spin" />Gerando...</>
                    : <><Sparkles className="w-3 h-3" />Gerar com IA</>
                  }
                </Button>
              </div>
              <textarea
                value={textoIA}
                onChange={e => setTextoIA(e.target.value)}
                rows={10}
                placeholder="Clique em 'Gerar com IA' para redigir automaticamente o item II.3 com base nos votos e argumentações da banca, ou redija manualmente."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 resize-y"
                style={{ minHeight: '200px' }}
              />
            </div>

            <div className="flex justify-end gap-3 pt-1 border-t border-border">
              <Button variant="outline" onClick={() => setParecerModal(false)}>
                Cancelar
              </Button>
              <Button
                disabled={!presidenteNome.trim() || !textoIA.trim()}
                onClick={() => { setParecerModal(false); handleGerarPDF() }}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Gerar PDF
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  // ─── Loading / Error ──────────────────────────────────────────────────────
  if (loading) return <LoadingState />
  if (error)   return <ErrorAlert message={error} />
  if (!recurso) return <ErrorAlert message="Recurso não encontrado." />

  // ─── Tela principal ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost" size="sm"
          onClick={() => navigate(`/recursos/${recursoId}/painel`)}
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
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
              Decisão final
            </span>
          </div>
          <h2 className="text-base font-semibold text-foreground mt-1 leading-snug">
            {recurso.projeto?.titulo ?? '—'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Candidato: {recurso.orientador?.nome_completo ?? '—'}
          </p>
        </div>
      </div>

      {/* Aviso de pendências */}
      {hasPendentes && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Aguardando resposta de todos os avaliadores.</span>
            {' '}A decisão final só poderá ser confirmada quando todos os convocados tiverem respondido.
          </p>
        </div>
      )}

      {/* Cards por critério */}
      <div className="space-y-4">
        {criterios.map(crit => {
          const { criterio, ccList, pendentes, simVoters, votos_sim, votos_nao, decisao, nota_calculada } = crit
          const alterada = decisao === 'alterada'
          const notaOrigSim = simVoters.length > 0
            ? arredonda(simVoters.reduce((s, cc) => s + (notaMap[`${cc.avaliador_id}:${cc.criterio_id}`] ?? 0), 0) / simVoters.length)
            : null

          return (
            <Card key={criterio?.id}>
              <CardContent className="pt-4 pb-4 space-y-4">

                {/* Cabeçalho do critério */}
                <div className="flex items-center gap-2 flex-wrap">
                  {criterio?.codigo && (
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                      {criterio.codigo}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-foreground flex-1">
                    {criterio?.nome}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Nota máx.: {criterio?.nota_maxima}
                  </span>
                </div>

                {/* Lista de votos */}
                {ccList.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-1">
                    Nenhum avaliador convocado para este critério.
                  </p>
                ) : (
                  <div className="rounded-md border divide-y divide-border">
                    {ccList.map((cc, i) => {
                      const nome      = cc.avaliador?.nome ?? cc.avaliador?.email ?? `Avaliador ${i + 1}`
                      const notaOrig  = notaMap[`${cc.avaliador_id}:${cc.criterio_id}`] ?? null
                      const respondeu = cc.status === 'respondido'
                      const votouSim  = respondeu && cc.resposta === 'sim'

                      return (
                        <div key={cc.id} className="flex items-center gap-3 px-3 py-2.5 flex-wrap">
                          <p className="flex-1 text-sm text-foreground min-w-0 truncate">{nome}</p>
                          {notaOrig !== null && (
                            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                              orig: {notaOrig}
                            </span>
                          )}
                          {!respondeu ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shrink-0">
                              <Clock className="w-3 h-3" />
                              Pendente
                            </span>
                          ) : votouSim ? (
                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded shrink-0">
                              SIM → {cc.nova_nota}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded shrink-0">
                              NÃO
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Contagem + badge de resultado */}
                {(votos_sim + votos_nao) > 0 && pendentes.length === 0 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      <strong className="text-blue-700">{votos_sim} voto{votos_sim !== 1 ? 's' : ''} SIM</strong>
                      {' · '}
                      <strong className="text-gray-600">{votos_nao} voto{votos_nao !== 1 ? 's' : ''} NÃO</strong>
                    </span>
                    <span className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${
                      alterada
                        ? 'text-blue-700 bg-blue-50 border-blue-200'
                        : 'text-gray-600 bg-gray-100 border-gray-300'
                    }`}>
                      {alterada ? 'Maioria: alterar nota' : 'Maioria: manter nota'}
                    </span>
                  </div>
                )}

                {/* Nota original vs nota final */}
                {alterada && nota_calculada !== null && (
                  <div className="flex items-center gap-6 rounded-lg bg-blue-50 border border-blue-200 px-5 py-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-0.5">Nota original</p>
                      <p className="text-2xl font-bold text-gray-500">
                        {notaOrigSim !== null ? notaOrigSim.toFixed(2) : '—'}
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-muted-foreground">→</div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-0.5">Nota final aplicada</p>
                      <p className="text-2xl font-bold text-blue-700">{nota_calculada.toFixed(2)}</p>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          )
        })}
      </div>

      <ErrorAlert message={actionError} />

      {/* Botão confirmar */}
      <div className="flex justify-end pt-2 border-t border-border">
        <span title={hasPendentes ? 'Aguardando resposta de todos os avaliadores' : undefined}>
          <Button
            disabled={!podeConfirmar || salvando}
            onClick={() => setConfirming(true)}
            className="gap-2"
          >
            {salvando
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Scale className="w-4 h-4" />}
            {salvando ? 'Salvando…' : 'Confirmar decisão final'}
          </Button>
        </span>
      </div>

      {/* Modal de confirmação */}
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Confirmar decisão final"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Esta ação é <strong>irreversível</strong>. As notas dos avaliadores serão
              atualizadas no banco conforme a deliberação e o recurso será encerrado.
            </p>
          </div>
          <p className="text-sm text-foreground">
            Deseja confirmar a decisão final para este recurso?
          </p>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmar} className="gap-2">
              <Scale className="w-4 h-4" />
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recurso_id, criterio_ids } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Dados do recurso com joins
    const { data: rec, error: recErr } = await supabase
      .from('recurso')
      .select(`
        id, codigo_recurso, status, created_at, projeto_id,
        projeto:projeto_id(titulo),
        edicao:edicao_id(numero_edital, numero_processo, item_criterios_avaliacao, prazo_recurso_fim),
        orientador:orientador_id(nome_completo)
      `)
      .eq('id', recurso_id)
      .single()
    if (recErr) throw recErr

    // 2. Detalhes dos critérios
    const { data: criterioList, error: critErr } = await supabase
      .from('criterio_avaliacao')
      .select('id, ordem, codigo, nome')
      .in('id', criterio_ids)
    if (critErr) throw critErr

    // 3. Argumentação do proponente por critério
    const { data: rcList, error: rcErr } = await supabase
      .from('recurso_criterio')
      .select('criterio_id, fundamentacao')
      .eq('recurso_id', recurso_id)
      .in('criterio_id', criterio_ids)
    if (rcErr) throw rcErr

    // 4. Notas originais (média por critério)
    const { data: avaliacoes, error: avErr } = await supabase
      .from('avaliacao')
      .select('id')
      .eq('projeto_id', rec.projeto_id)
      .eq('status', 'concluida')
    if (avErr) throw avErr

    const avaliacaoIds = (avaliacoes ?? []).map((a: any) => a.id)
    const notaOrigMap: Record<string, number[]> = {}

    if (avaliacaoIds.length > 0) {
      const { data: acList, error: acErr } = await supabase
        .from('avaliacao_criterio')
        .select('criterio_id, nota')
        .in('avaliacao_id', avaliacaoIds)
        .in('criterio_id', criterio_ids)
      if (acErr) throw acErr

      ;(acList ?? []).forEach((ac: any) => {
        if (ac.nota === null || ac.nota === undefined) return
        if (!notaOrigMap[ac.criterio_id]) notaOrigMap[ac.criterio_id] = []
        notaOrigMap[ac.criterio_id].push(ac.nota)
      })
    }

    // 5. Votos e pareceres dos avaliadores
    const { data: convList, error: convErr } = await supabase
      .from('convocacao')
      .select('id')
      .eq('recurso_id', recurso_id)
    if (convErr) throw convErr

    let ccAll: any[] = []
    if (convList && convList.length > 0) {
      const convIds = convList.map((c: any) => c.id)
      const { data: ccData, error: ccErr } = await supabase
        .from('convocacao_criterio')
        .select('criterio_id, resposta, justificativa, nova_nota')
        .in('convocacao_id', convIds)
        .in('criterio_id', criterio_ids)
        .eq('status', 'respondido')
      if (ccErr) throw ccErr
      ccAll = ccData ?? []
    }

    // 6. Montar contexto dos critérios para o prompt
    const edicao = rec.edicao
    const tituloEdicao = edicao?.numero_edital ?? '—'

    const criteriosBlock = criterio_ids.map((cid: string, i: number) => {
      const criterio = (criterioList ?? []).find((c: any) => c.id === cid)
      const rc = (rcList ?? []).find((r: any) => r.criterio_id === cid)
      const notas = notaOrigMap[cid] ?? []
      const notaOriginal = notas.length > 0
        ? (notas.reduce((s: number, n: number) => s + n, 0) / notas.length).toFixed(2)
        : '—'
      const argumento = rc?.fundamentacao ?? '(sem argumentação registrada)'
      const votos = ccAll.filter((cc: any) => cc.criterio_id === cid)

      const numeroCrit = criterio?.ordem ?? criterio?.codigo ?? (i + 1)
      const nomeCrit = criterio?.nome ?? '—'

      const votosBlock = votos.length > 0
        ? votos.map((v: any, j: number) => {
            const alterou = v.resposta === 'sim' ? 'sim' : 'não'
            return `- Avaliador ${j + 1}: ${alterou} alterou a nota | Nova nota proposta: ${v.nova_nota ?? '—'} | Justificativa: ${v.justificativa ?? '(sem justificativa)'}`
          }).join('\n')
        : '(sem pareceres registrados)'

      const simVoters = votos.filter((v: any) => v.resposta === 'sim')
      const naoCount = votos.filter((v: any) => v.resposta === 'nao').length
      const decisao = simVoters.length > naoCount ? 'deferido' : 'indeferido'
      const novaNotaCalc = simVoters.length > 0
        ? (simVoters.reduce((s: number, v: any) => s + (v.nova_nota ?? 0), 0) / simVoters.length).toFixed(2)
        : '—'

      return `CRITÉRIO ${numeroCrit} – ${nomeCrit}
Nota original: ${notaOriginal}
Argumentação do proponente: ${argumento}

Pareceres da Banca Avaliadora:
${votosBlock}

Decisão majoritária: ${decisao}
Nova nota final (se deferido): ${novaNotaCalc}`
    }).join('\n\n---\n\n')

    // 7. Prompt para a Anthropic
    const prompt = `Você é um assessor jurídico especializado em direito administrativo público brasileiro, com experiência em redação de decisões de recursos administrativos no âmbito de editais de fomento à pesquisa científica.

Você deve redigir o conteúdo do item II.3 – "Do mérito recursal segundo os critérios de avaliação" de uma decisão administrativa de recurso, com linguagem formal, técnica e impessoal, compatível com atos administrativos municipais.

## CONTEXTO DO EDITAL
Programa: Programa Institucional de Bolsas de Iniciação Científica Júnior – PIBIC Jr
Edital: ${tituloEdicao}
Órgão: Fundo Municipal de Ciência e Tecnologia – FACITEC / CDTIV
Item dos critérios de avaliação no edital: ${edicao?.item_criterios_avaliacao ?? '—'}

## DADOS DO RECURSO
Proponente: ${rec.orientador?.nome_completo ?? '—'}
Título da proposta: ${rec.projeto?.titulo ?? '—'}
Código do recurso: ${rec.codigo_recurso ?? '—'}

## CRITÉRIOS RECORRIDOS E ANÁLISE DA BANCA
Para cada critério abaixo, redija um parágrafo identificado pela letra correspondente (a), (b), (c)..., seguindo rigorosamente esta estrutura:
1. Identifique o critério pelo número e nome
2. Descreva sinteticamente o que o proponente alegou
3. Exponha o entendimento da Banca Avaliadora com base nos pareceres individuais, indicando se houve unanimidade ou maioria
4. Conclua com a decisão adotada (manutenção ou alteração da nota) e a nova nota, se houver alteração

${criteriosBlock}

## INSTRUÇÕES DE REDAÇÃO
- Use linguagem jurídico-administrativa formal, em terceira pessoa
- Não invente informações além das fornecidas
- Não cite os avaliadores pelo nome — use "a Banca Avaliadora" ou "os membros da Banca"
- Em caso de deferimento, indique claramente a nota anterior e a nova nota
- Em caso de indeferimento, fundamente a manutenção da nota com base nos pareceres da banca
- Cada critério deve ser um bloco separado, identificado pela letra (a), (b)...
- Tamanho esperado: de 3 a 5 parágrafos por critério
Redija apenas o conteúdo do item II.3, sem introduções, sem títulos, sem comentários seus. Comece diretamente pela letra (a).`

    // 8. Chamar a API da Anthropic
    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text()
      throw new Error(`Anthropic API error ${anthropicResp.status}: ${errText}`)
    }

    const anthropicData = await anthropicResp.json()
    const texto_gerado: string = anthropicData.content?.[0]?.text ?? ''

    return new Response(JSON.stringify({ texto_gerado }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

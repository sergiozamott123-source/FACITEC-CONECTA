// Edge Function do Acervo Inteligente (Fase B / B.1 — ver PROMPT_ACERVO_INTELIGENTE.md).
//
// Recebe o conteúdo bruto de uma planilha (já convertido para texto simples
// no frontend, via SheetJS) e o tipo de entidade alvo, e devolve uma lista de
// registros estruturados com nível de confiança por linha — para revisão
// humana ANTES de qualquer gravação no banco (esta função nunca escreve no
// banco; só interpreta e devolve).
//
// Segue o mesmo padrão de ../gerar-parecer-recurso/index.ts (CORS, chamada
// direta à API da Anthropic via fetch, mesmas env vars).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Schemas suportados. Adicionar um novo tipo de entidade aqui basta para a
// função passar a suportá-lo — nenhuma outra mudança de código é necessária.
const SCHEMAS: Record<string, { campos: string[]; obrigatorios: string[]; descricaoCampos: string }> = {
  orientador: {
    campos: ['nome_completo', 'email'],
    obrigatorios: ['nome_completo'],
    descricaoCampos: `- nome_completo (texto, obrigatório): nome completo da pessoa.
- email (texto ou null): e-mail, se houver na planilha; senão null.`,
  },
  bolsista: {
    campos: ['nome_completo', 'tipo', 'projeto_titulo'],
    obrigatorios: ['nome_completo'],
    descricaoCampos: `- nome_completo (texto, obrigatório): nome completo do estudante.
- tipo (texto, um destes valores EXATOS): "titular", "bolsista" ou "voluntario". Se não for possível identificar, use "titular".
- projeto_titulo (texto ou null): título do projeto ao qual o estudante pertence, se identificável na planilha; senão null.`,
  },
  projeto: {
    campos: ['titulo', 'area_conhecimento', 'orientador_nome'],
    obrigatorios: ['titulo'],
    descricaoCampos: `- titulo (texto, obrigatório): título do projeto de pesquisa.
- area_conhecimento (texto ou null): área do conhecimento, se houver.
- orientador_nome (texto ou null): nome do(a) orientador(a) responsável, se identificável na planilha.`,
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { entidade, texto } = await req.json()

    const schema = SCHEMAS[entidade]
    if (!schema) {
      throw new Error(`Tipo de entidade não suportado: "${entidade}". Suportados: ${Object.keys(SCHEMAS).join(', ')}`)
    }
    if (!texto || typeof texto !== 'string' || !texto.trim()) {
      throw new Error('Nenhum conteúdo de planilha recebido.')
    }

    const prompt = `Você é um assistente de organização de dados históricos para a Secretaria Executiva de um fundo municipal de fomento à ciência (FACITEC/CDTIV, Vitória-ES). Vou te passar o conteúdo bruto de uma planilha antiga — pode ter cabeçalhos, colunas fora de ordem, linhas em branco, notas de rodapé ou formatação inconsistente.

Sua tarefa: extrair uma lista estruturada de registros do tipo "${entidade}", devolvendo APENAS um array JSON válido, sem nenhum texto antes ou depois, sem marcação de código (\`\`\`), sem comentários.

Cada objeto do array deve ter estes campos:
${schema.descricaoCampos}

Além dos campos acima, cada objeto deve ter também:
- _confianca ("ok" ou "checar"): "ok" se você tem certeza razoável dos dados desta linha; "checar" se algum campo obrigatório (${schema.obrigatorios.join(', ')}) não pôde ser identificado com confiança, está ambíguo, ou parece incompleto/estranho.

Regras importantes:
- Ignore linhas de cabeçalho, linhas totalmente em branco, e linhas de rodapé/notas que não representem um registro de verdade.
- Não invente dados que não estão na planilha — se um campo opcional não existir, use null.
- Se a planilha tiver colunas com nomes diferentes dos campos esperados, use o bom senso para mapear pelo conteúdo (ex: uma coluna "Nome" ou "Aluno" mapeia para nome_completo).
- Responda em português.

CONTEÚDO DA PLANILHA:
${texto}`

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text()
      throw new Error(`Anthropic API error ${anthropicResp.status}: ${errText}`)
    }

    const anthropicData = await anthropicResp.json()
    const textoGerado: string = anthropicData.content?.[0]?.text ?? ''

    // A IA foi instruída a responder só com JSON, mas por segurança extraímos
    // o primeiro bloco que parece um array JSON, caso venha algum texto extra.
    let linhas: any[]
    try {
      linhas = JSON.parse(textoGerado)
    } catch {
      const match = textoGerado.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('A IA não devolveu um JSON válido. Tente novamente ou revise o arquivo.')
      linhas = JSON.parse(match[0])
    }

    if (!Array.isArray(linhas)) {
      throw new Error('A IA não devolveu uma lista. Tente novamente.')
    }

    return new Response(JSON.stringify({ linhas, campos: schema.campos }), {
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

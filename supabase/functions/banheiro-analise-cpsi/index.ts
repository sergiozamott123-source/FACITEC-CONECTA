// Edge Function — Pesquisa Banheiros Públicos: análise CPSI de uma resposta.
//
// Chamada pelo painel da pesquisa (botão "Gerar análise CPSI"). Só funciona
// para quem está logado e tem acesso ao módulo (Secretaria ou modulo_acesso
// 'pesquisa-banheiros'). A verificação é feita no banco, pelas funções
// tem_acesso_modulo e banheiro_salvar_analise, usando o login de quem clicou
// (esta função NÃO usa a service role).
//
// Regras de análise adaptadas do formulário "Arquiteto de Problemas" da CDTIV.
// Mesmo padrão de chamada à API da Anthropic de ../acervo-importar-planilha.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MODELO = 'claude-sonnet-5-5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT = `Você é analista da CDTIV, companhia municipal de desenvolvimento, turismo e inovação de Vitória. Abaixo estão as respostas de um servidor municipal a um questionário sobre os banheiros públicos sob responsabilidade da secretaria dele. Monte a ficha estruturada do problema.

REGRAS
Use apenas o que está nas respostas. Não invente dado, número, grupo, causa, marca ou modelo. O que não foi dito entra em lacunas_criticas.
Separe com rigor: sintoma é o que se observa; dor é o impacto sobre alguém; necessidade é o que falta existir, nunca uma solução específica; causa provável é hipótese, marque como tal.
Se a pessoa descreveu uma solução, por exemplo trocar de empresa, comprar modelo X, instalar autolimpante, converta em necessidade e registre a solução em suposicoes. Nunca recomende equipamento, modelo ou fornecedor.
Respostas "Não sei" ou em branco são lacunas, não evidência.
Nada de travessão. Português do Brasil. Frases curtas, sem adjetivo desnecessário.

FILTRO CPSI
O Contrato Público para Solução Inovadora serve para problema público delimitado, SEM solução pronta no mercado, com meta aferível. Banheiro modular, químico, contêiner e autolimpante são produtos de mercado maduro com muitos fornecedores: comprar ou locar isso é compra comum ou concessão, nunca CPSI. Limpeza e manutenção terceirizadas são serviço comum. Falta de fiscalização é gestão, não inovação.
Onde pode haver inovação real: telemetria e detecção de falha antes da reclamação, roteirização de limpeza por uso real em vez de escala fixa, operação autônoma em ponto sem rede de esgoto, resistência a maresia e pico sazonal.
Seja honesto e restritivo. Se o problema dominante for limpeza, abastecimento ou contrato e gestão, a aderência tende a ser Baixa ou "Não é caso de CPSI", e o instrumento alternativo deve ser indicado.

Responda apenas com um objeto JSON, sem texto antes ou depois e sem marcação de código, neste formato:
{
 "titulo": "frase curta que nomeia o problema, até 12 palavras",
 "problema": "um parágrafo de até 4 linhas",
 "sintomas": ["..."],
 "dores": [{"grupo": "quem sofre", "impacto": "como afeta"}],
 "causas_provaveis": ["..."],
 "necessidades": ["..."],
 "evidencias": ["o que foi afirmado com base em dado ou registro"],
 "suposicoes": ["o que foi afirmado como percepção, sem lastro"],
 "resultados_esperados": ["mudança observável"],
 "indicadores": {"processo": ["..."], "resultado": ["..."]},
 "riscos": ["o que acontece se nada for feito"],
 "maturidade": {"nivel": 3, "justificativa": "uma linha"},
 "lacunas_criticas": ["o que falta descobrir"],
 "cpsi": {
   "aderencia": "Alta | Média | Baixa | Não é caso de CPSI",
   "justificativa": "duas linhas",
   "solucao_pronta_no_mercado": "sim | não | indeterminado",
   "risco_tecnologico": "alto | médio | baixo | nenhum",
   "mensuravel": "sim | não | parcialmente",
   "espaco_para_inovacao": "uma ou duas linhas, ou vazio se não houver",
   "instrumento_alternativo": "vazio se a aderência for Alta"
 },
 "proximos_passos": ["o que investigar ou validar antes de decidir"]
}

Escala de maturidade: 1 descrição vaga, 2 sintomas identificados, 3 dores e necessidades claras, 4 causas estruturais consistentes, 5 problema arquitetado com evidência.
Arrays vazios são aceitáveis quando as respostas não cobriram o item.

RESPOSTAS:
`

function resposta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return resposta({ error: 'Faça login para gerar a análise.' }, 401)

    // Cliente com o login de quem chamou: o banco decide se ele tem acesso.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: acesso, error: acessoErr } = await supabase.rpc('tem_acesso_modulo', { p_modulo: 'pesquisa-banheiros' })
    if (acessoErr || acesso !== true) return resposta({ error: 'Sem permissão para esta pesquisa.' }, 403)

    const { resposta_id, transcricao } = await req.json()
    if (!resposta_id || typeof transcricao !== 'string' || !transcricao.trim()) {
      return resposta({ error: 'Parâmetros inválidos.' }, 400)
    }
    if (transcricao.length > 30000) return resposta({ error: 'Respostas longas demais para análise.' }, 400)

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 4000,
        messages: [{ role: 'user', content: PROMPT + transcricao }],
      }),
    })
    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text()
      throw new Error(`Falha na API da Anthropic (${anthropicResp.status}): ${errText.slice(0, 300)}`)
    }
    const data = await anthropicResp.json()
    const texto: string = data.content?.[0]?.text ?? ''
    const limpo = texto.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    let analise
    try {
      analise = JSON.parse(limpo)
    } catch {
      throw new Error('A análise veio em formato inesperado. Tente gerar de novo.')
    }

    const { error: salvarErr } = await supabase.rpc('banheiro_salvar_analise', {
      p_id: resposta_id, p_analise: analise, p_modelo: MODELO,
    })
    if (salvarErr) throw new Error('Não foi possível gravar a análise: ' + salvarErr.message)

    return resposta({ analise, modelo: MODELO })
  } catch (err) {
    return resposta({ error: (err as Error).message }, 500)
  }
})

// Ficha da Pesquisa Banheiros Públicos — calculada a partir das respostas,
// sem IA. Roda igual na tela de quem responde e no painel, então é sempre
// recalculada das respostas gravadas. A análise CPSI (com IA) é separada e
// fica gravada em banheiro_respostas.analise_cpsi.
import { NATUREZAS, QUESTIONARIO, todasPerguntas, opcoesDa } from './questionario'

const PESO_PRINCIPAL = 2

function rotuloOpcao(pergunta, v) {
  const o = opcoesDa(pergunta).find((x) => x.v === v)
  return o ? o.t : v
}

function vazio(v) {
  return v == null || v === '' || (Array.isArray(v) && v.length === 0)
}

function soNaoSei(v) {
  return v === 'nao_sei' || (Array.isArray(v) && v.length === 1 && v[0] === 'nao_sei')
}

// A pergunta "principal" só aparece quando mais de um problema foi marcado.
export function perguntaVisivel(p, r) {
  if (!p.opcoesDe) return true
  return (r[p.opcoesDe] || []).filter((v) => v !== 'nao_sei').length > 1
}

// Distribui 100 pontos proporcionalmente, somando exatamente 100.
function para100(pontos) {
  const chaves = Object.keys(NATUREZAS)
  const out = Object.fromEntries(chaves.map((k) => [k, 0]))
  const total = chaves.reduce((a, k) => a + (pontos[k] || 0), 0)
  if (!total) return out
  const brutos = chaves.map((k) => {
    const x = ((pontos[k] || 0) * 100) / total
    return { k, piso: Math.floor(x), resto: x - Math.floor(x) }
  })
  let soma = brutos.reduce((a, b) => a + b.piso, 0)
  brutos.forEach((b) => { out[b.k] = b.piso })
  brutos.sort((a, b) => b.resto - a.resto)
  for (let i = 0; soma < 100; i++, soma++) out[brutos[i % brutos.length].k] += 1
  return out
}

function maturidade(r) {
  const tem = (x) => !vazio(x) && !soNaoSei(x)
  let nivel = 1
  let just = 'Descrição ainda vaga.'
  if (tem(r.problemas)) { nivel = 2; just = 'Sabe-se o que acontece, mas não quem sofre nem como afeta.' }
  if (nivel === 2 && tem(r.usuarios) && tem(r.impacto)) { nivel = 3; just = 'Sabe-se quem sofre e como é afetado.' }
  if (nivel === 3 && tem(r.hipotese) && (tem(r.fora_escopo) || tem(r.trocas))) {
    nivel = 4; just = 'Há uma explicação para o porquê, apoiada no contrato ou em experiência anterior.'
  }
  if (nivel === 4 && r.registro === 'sim') { nivel = 5; just = 'Há registro com números que pode sustentar o diagnóstico.' }
  return { nivel, justificativa: just + ' Estimativa automática.' }
}

export function gerarFicha(r = {}) {
  const perguntas = todasPerguntas()
  const pontos = {}
  for (const p of perguntas) {
    const val = r[p.id]
    if (vazio(val)) continue
    const peso = p.id === 'principal' ? PESO_PRINCIPAL : p.peso || 1
    for (const v of Array.isArray(val) ? val : [val]) {
      const nat = opcoesDa(p).find((o) => o.v === v)?.nat
      if (nat) pontos[nat] = (pontos[nat] || 0) + peso
    }
  }
  const natureza = para100(pontos)
  const dominante = Object.values(natureza).some((x) => x > 0)
    ? Object.entries(natureza).sort((a, b) => b[1] - a[1])[0][0]
    : null

  const respostas = {}
  for (const p of perguntas) {
    const val = r[p.id]
    if (vazio(val)) continue
    respostas[p.id] = Array.isArray(val)
      ? val.map((v) => rotuloOpcao(p, v))
      : p.tipo === 'unica' ? rotuloOpcao(p, val) : String(val)
  }

  const lacunas = perguntas
    .filter((p) => perguntaVisivel(p, r) && (vazio(r[p.id]) || soNaoSei(r[p.id])))
    .map((p) => p.rotulo)

  const setor = respostas.setor || 'Setor não informado'
  const titulo = dominante
    ? `${setor}: problema principal de ${NATUREZAS[dominante].toLowerCase()}`
    : `${setor}: nenhum problema apontado`

  return { titulo, setor, natureza, dominante, respostas, lacunas, maturidade: maturidade(r) }
}

// Texto legível das respostas, enviado para a análise CPSI.
export function transcricao(r = {}, nome) {
  const f = gerarFicha(r)
  const linhas = []
  if (nome) linhas.push(`Respondente: ${nome}`)
  for (const bloco of QUESTIONARIO.blocos) {
    linhas.push(`\n## ${bloco.titulo}`)
    for (const p of bloco.perguntas) {
      if (!perguntaVisivel(p, r)) continue
      const v = f.respostas[p.id]
      linhas.push(`P: ${p.rotulo}\nR: ${v == null ? '(em branco)' : Array.isArray(v) ? v.join('; ') : v}`)
    }
  }
  return linhas.join('\n')
}

export function mediaNatureza(lista) {
  const soma = Object.fromEntries(Object.keys(NATUREZAS).map((k) => [k, 0]))
  let n = 0
  for (const item of lista) {
    const f = gerarFicha(item.respostas)
    if (!f.dominante) continue
    n++
    for (const k of Object.keys(soma)) soma[k] += f.natureza[k]
  }
  const media = n ? Object.fromEntries(Object.entries(soma).map(([k, v]) => [k, Math.round(v / n)])) : soma
  const dominante = n ? Object.entries(media).sort((a, b) => b[1] - a[1])[0][0] : null
  return { n, media, dominante }
}

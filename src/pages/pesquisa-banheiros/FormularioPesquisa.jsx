// Página pública da Pesquisa Banheiros Públicos (sem login).
// Quem responde recebe um código de acesso da CDTIV (ou um link com
// ?codigo=...). Cada código vale uma resposta.
import { useEffect, useMemo, useRef, useState } from 'react'
import { QUESTIONARIO, opcoesDa } from '@/lib/pesquisaBanheiros/questionario'
import { gerarFicha, perguntaVisivel } from '@/lib/pesquisaBanheiros/ficha'
import { validarCodigo, enviarResposta } from '@/lib/pesquisaBanheiros/api'
import { CabecalhoPesquisa, FichaView } from './componentes'

const RASCUNHO = 'pesquisa-banheiros-rascunho'
const guarda = {
  ler() { try { return JSON.parse(sessionStorage.getItem(RASCUNHO) || 'null') } catch { return null } },
  gravar(v) { try { sessionStorage.setItem(RASCUNHO, JSON.stringify(v)) } catch { /* sem armazenamento */ } },
  limpar() { try { sessionStorage.removeItem(RASCUNHO) } catch { /* idem */ } },
}

const MSG = {
  invalido: 'Código não encontrado. Confira as letras e os números e tente de novo.',
  usado: 'Este código já foi usado. Cada código vale uma resposta. Se precisar de outro, fale com a CDTIV.',
  bloqueado: 'Muitas tentativas erradas. Espere 15 minutos e tente de novo.',
  dados_invalidos: 'Não foi possível gravar a resposta. Tente de novo.',
  conexao: 'Falha de conexão. Verifique sua internet e tente de novo.',
}

const LISTA = QUESTIONARIO.blocos.flatMap((b, bi) => b.perguntas.map((p) => ({ ...p, bloco: bi })))

export function FormularioPesquisa() {
  const salvo = useMemo(() => guarda.ler(), [])
  const [etapa, setEtapa] = useState(salvo?.ativo ? 'questionario' : 'entrada')
  const [codigo, setCodigo] = useState(
    salvo?.codigo || (new URLSearchParams(window.location.search).get('codigo') || '').toUpperCase()
  )
  const [nome, setNome] = useState(salvo?.nome || '')
  const [aceite, setAceite] = useState(!!salvo?.ativo)
  const [r, setR] = useState(salvo?.r || {})
  const [idx, setIdx] = useState(salvo?.idx || 0)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    if (etapa === 'questionario') guarda.gravar({ ativo: true, codigo, nome, r, idx })
  }, [etapa, codigo, nome, r, idx])

  async function entrar(e) {
    e.preventDefault()
    setErro(''); setOcupado(true)
    try {
      const st = await validarCodigo(codigo)
      if (st === 'ok') { setR({}); setIdx(0); setEtapa('questionario') }
      else setErro(MSG[st] || MSG.conexao)
    } catch { setErro(MSG.conexao) }
    setOcupado(false)
  }

  async function enviar() {
    setErro(''); setOcupado(true)
    try {
      const st = await enviarResposta(codigo, r, nome)
      if (st === 'ok') { guarda.limpar(); setEtapa('fim') }
      else setErro(MSG[st] || MSG.conexao)
    } catch { setErro(MSG.conexao) }
    setOcupado(false)
  }

  function sair() {
    guarda.limpar()
    setEtapa('entrada'); setR({}); setIdx(0); setCodigo(''); setErro(''); setAceite(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <CabecalhoPesquisa subtitulo="Levantamento com as secretarias municipais" />
      {etapa === 'entrada' && (
        <main className="flex-1 w-full max-w-xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold leading-tight text-balance">
            Banheiros públicos de Vitória: vamos descobrir onde o problema realmente está.
          </h1>
          <p className="text-slate-600 mt-3">
            A CDTIV está ouvindo as secretarias responsáveis pelos banheiros públicos da cidade para entender
            se o que falha é limpeza, manutenção, abastecimento, o equipamento, o contrato ou a segurança.
            Leva cerca de 10 minutos.
          </p>
          <form onSubmit={entrar} className="mt-6 space-y-4 bg-white border border-slate-200 rounded-xl p-5">
            <div className="space-y-1">
              <label htmlFor="pb-codigo" className="block text-sm font-medium text-slate-700">Código de acesso</label>
              <input id="pb-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="ex: SV-AB12-CD34" autoComplete="off" spellCheck="false" required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-md font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-cyan-700" />
            </div>
            <div className="space-y-1">
              <label htmlFor="pb-nome" className="block text-sm font-medium text-slate-700">Seu nome <span className="text-slate-400 font-normal">(opcional)</span></label>
              <input id="pb-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} autoComplete="name"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-700" />
            </div>
            <label className="flex gap-3 items-start text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-0.5 w-4 h-4 accent-cyan-700" />
              <span>Concordo que minhas respostas sejam usadas pela CDTIV no diagnóstico dos banheiros públicos de Vitória, conforme a LGPD. Não pedimos documento e o nome é opcional.</span>
            </label>
            {erro && <div role="alert" className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">{erro}</div>}
            <button disabled={!codigo.trim() || !aceite || ocupado}
              className="w-full py-3 rounded-md bg-[#0D1F3C] text-white font-semibold disabled:opacity-40">
              {ocupado ? 'Verificando…' : 'Começar'}
            </button>
          </form>
          <p className="text-xs text-slate-500 mt-4">Não recebeu um código? Fale com a Gerência de Inovação da CDTIV.</p>
        </main>
      )}

      {etapa === 'questionario' && (
        <Questionario r={r} setR={setR} idx={idx} setIdx={setIdx} onEnviar={enviar} ocupado={ocupado} erro={erro} onSair={sair} />
      )}

      {etapa === 'fim' && (
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 space-y-4">
          <div className="print:hidden">
            <h1 className="text-2xl font-bold">Obrigado. Sua resposta foi registrada.</h1>
            <p className="text-slate-600 mt-2">Abaixo está a ficha gerada com base nas suas respostas. A equipe da CDTIV recebe a mesma ficha.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => window.print()} className="px-4 py-2 rounded-md border border-slate-300 bg-white text-sm font-medium">Imprimir ou salvar em PDF</button>
              <button onClick={sair} className="px-4 py-2 rounded-md border border-slate-300 bg-white text-sm font-medium">Sair</button>
            </div>
          </div>
          <FichaView ficha={gerarFicha(r)} />
        </main>
      )}
    </div>
  )
}

function Questionario({ r, setR, idx, setIdx, onEnviar, ocupado, erro, onSair }) {
  const visiveis = LISTA.filter((p) => perguntaVisivel(p, r))
  const i = Math.min(idx, visiveis.length)
  const p = visiveis[i]
  const [aviso, setAviso] = useState('')
  const [confirmaSair, setConfirmaSair] = useState(false)
  const titulo = useRef(null)

  useEffect(() => { setAviso(''); titulo.current?.focus({ preventScroll: true }); window.scrollTo(0, 0) }, [i])

  const val = p ? r[p.id] : null
  const vazio = val == null || val === '' || (Array.isArray(val) && !val.length)
  let opcoes = p ? opcoesDa(p) : []
  if (p?.opcoesDe) opcoes = opcoes.filter((o) => (r[p.opcoesDe] || []).includes(o.v))

  const set = (v) => setR({ ...r, [p.id]: v })
  function alterna(v) {
    let atual = Array.isArray(val) ? [...val] : []
    if (v === 'nao_sei') atual = atual.includes('nao_sei') ? [] : ['nao_sei']
    else {
      atual = atual.filter((x) => x !== 'nao_sei')
      atual = atual.includes(v) ? atual.filter((x) => x !== v) : [...atual, v]
    }
    set(atual)
  }
  function avancar(e) {
    e?.preventDefault()
    if (p.obrigatoria && vazio) { setAviso('Esta pergunta precisa de resposta. Se não souber, marque "Não sei" quando houver essa opção.'); return }
    const prox = { ...r }
    for (const q of LISTA) if (q.opcoesDe && !perguntaVisivel(q, prox)) delete prox[q.id]
    if (Object.keys(prox).length !== Object.keys(r).length) setR(prox)
    setIdx(i + 1)
  }

  const botao = 'px-4 py-3 rounded-md border border-slate-300 bg-white text-sm font-medium disabled:opacity-40'
  return (
    <>
      <div className="h-1 bg-slate-200"><div className="h-full bg-cyan-700 transition-all" style={{ width: `${Math.round((i / visiveis.length) * 100)}%` }} /></div>
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center text-xs text-slate-500 mb-5 gap-3">
          <span>{p ? `${QUESTIONARIO.blocos[p.bloco].titulo} · ${i + 1} de ${visiveis.length}` : 'Revisão'}</span>
          {confirmaSair ? (
            <span>Descartar respostas?{' '}
              <button onClick={onSair} className="underline text-cyan-800">sim, sair</button>{' '}
              <button onClick={() => setConfirmaSair(false)} className="underline text-cyan-800">não</button>
            </span>
          ) : <button onClick={() => setConfirmaSair(true)} className="underline text-cyan-800">sair</button>}
        </div>

        {p ? (
          <form onSubmit={avancar}>
            <h2 ref={titulo} tabIndex={-1} className="text-xl font-semibold leading-snug outline-none">{p.rotulo}</h2>
            {p.dica && <p className="text-sm text-slate-500 mt-1">{p.dica}</p>}
            {!p.obrigatoria && <p className="text-sm text-slate-500 mt-1">Opcional.</p>}

            {p.tipo === 'texto' && (
              <input value={val || ''} onChange={(e) => set(e.target.value)} maxLength={300} autoFocus
                className="mt-4 w-full px-3 py-2.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-cyan-700" />
            )}
            {p.tipo === 'texto_longo' && (
              <textarea rows={5} value={val || ''} onChange={(e) => set(e.target.value)} maxLength={3000}
                className="mt-4 w-full px-3 py-2.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-cyan-700" />
            )}
            {(p.tipo === 'unica' || p.tipo === 'multipla') && (
              <div className="mt-4 space-y-2">
                {opcoes.map((o) => {
                  const sel = p.tipo === 'unica' ? val === o.v : (val || []).includes(o.v)
                  return (
                    <label key={o.v} className={`flex gap-3 items-start rounded-lg border px-3.5 py-3 cursor-pointer ${sel ? 'border-cyan-700 bg-cyan-50' : 'border-slate-200 bg-white'}`}>
                      <input type={p.tipo === 'unica' ? 'radio' : 'checkbox'} name={p.id} checked={sel}
                        onChange={() => (p.tipo === 'unica' ? set(o.v) : alterna(o.v))} className="mt-0.5 w-4 h-4 shrink-0 accent-cyan-700" />
                      <span>{o.t}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {aviso && <div role="alert" className="mt-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">{aviso}</div>}
            <div className="flex gap-2 mt-5">
              <button type="button" className={botao} onClick={() => setIdx(Math.max(0, i - 1))} disabled={i === 0}>Voltar</button>
              <button className="flex-1 py-3 rounded-md bg-[#0D1F3C] text-white font-semibold">{!p.obrigatoria && vazio ? 'Pular' : 'Continuar'}</button>
            </div>
          </form>
        ) : (
          <div>
            <h2 ref={titulo} tabIndex={-1} className="text-xl font-semibold outline-none">Tudo pronto para enviar?</h2>
            <p className="text-sm text-slate-500 mt-1">Depois de enviar, o código fica usado e as respostas não podem mais ser alteradas. Você pode voltar e revisar antes.</p>
            {erro && <div role="alert" className="mt-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">{erro}</div>}
            <div className="flex gap-2 mt-5">
              <button type="button" className={botao} onClick={() => setIdx(i - 1)}>Voltar</button>
              <button onClick={onEnviar} disabled={ocupado} className="flex-1 py-3 rounded-md bg-[#0D1F3C] text-white font-semibold disabled:opacity-40">
                {ocupado ? 'Enviando…' : 'Enviar respostas'}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

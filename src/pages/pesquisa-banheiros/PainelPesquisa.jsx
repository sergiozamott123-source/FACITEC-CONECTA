// Painel da equipe da Pesquisa Banheiros Públicos.
// Rotas: /pesquisa-banheiros/painel, .../painel/ficha/:id, .../painel/relatorio
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { NATUREZAS, todasPerguntas } from '@/lib/pesquisaBanheiros/questionario'
import { gerarFicha, mediaNatureza, transcricao } from '@/lib/pesquisaBanheiros/ficha'
import {
  listarRespostas, listarCodigos, gerarCodigos, revogarCodigo, listarEquipe, gerarAnaliseCpsi,
} from '@/lib/pesquisaBanheiros/api'
import { useEquipePesquisa } from './AcessoPesquisa'
import { CabecalhoPesquisa, BarrasNatureza, FichaView, PilulaAderencia } from './componentes'

const dataBR = (s) => (s ? new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '')
const botao = 'px-3 py-2 rounded-md border border-slate-300 bg-white text-sm font-medium hover:bg-slate-50 disabled:opacity-40'
const cartao = 'bg-white border border-slate-200 rounded-xl p-4'
const tituloCartao = 'text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3'

function useRespostas() {
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState('')
  const carregar = useCallback(async () => {
    setErro('')
    try { setLista(await listarRespostas()) } catch { setErro('Não foi possível carregar as respostas.') }
  }, [])
  useEffect(() => { carregar() }, [carregar])
  return { lista, erro, carregar, setLista }
}

function Moldura({ children }) {
  const eq = useEquipePesquisa()
  const navigate = useNavigate()
  async function sair() {
    await supabase.auth.signOut()
    navigate('/login/pesquisa-banheiros')
  }
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 print:bg-white">
      <CabecalhoPesquisa
        subtitulo="Painel da equipe · CDTIV"
        direita={
          <div className="flex items-center gap-3 text-xs text-white/70">
            {eq?.secretaria && <Link to="/admin" className="underline hover:text-white">Programas FACITEC</Link>}
            <span className="hidden sm:inline">{eq?.email}</span>
            <button onClick={sair} className="underline hover:text-white">sair</button>
          </div>
        }
      />
      <main className="max-w-5xl mx-auto px-4 py-6 print:p-0 print:max-w-none">{children}</main>
    </div>
  )
}

export function PainelPesquisa() {
  const [aba, setAba] = useState('geral')
  const dados = useRespostas()
  const abas = [['geral', 'Visão geral'], ['respostas', 'Respostas'], ['codigos', 'Códigos de acesso'], ['equipe', 'Equipe']]
  return (
    <Moldura>
      <div className="flex flex-wrap gap-1 border-b border-slate-200 mb-5">
        {abas.map(([v, t]) => (
          <button key={v} onClick={() => setAba(v)}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px ${aba === v ? 'border-cyan-700 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>
      {aba === 'geral' && <VisaoGeral dados={dados} irPara={setAba} />}
      {aba === 'respostas' && <ListaRespostas dados={dados} />}
      {aba === 'codigos' && <Codigos />}
      {aba === 'equipe' && <Equipe />}
    </Moldura>
  )
}

function VisaoGeral({ dados, irPara }) {
  const { lista, erro } = dados
  const [codigos, setCodigos] = useState(null)
  useEffect(() => { listarCodigos().then(setCodigos).catch(() => setCodigos([])) }, [])
  const resumo = useMemo(() => mediaNatureza(lista || []), [lista])
  const setores = useMemo(() => new Set((lista || []).map((x) => gerarFicha(x.respostas).setor)).size, [lista])
  const comAnalise = (lista || []).filter((x) => x.analise_cpsi).length
  const livres = (codigos || []).filter((c) => !c.usado_em && !c.revogado && !(c.expira_em && new Date(c.expira_em) < new Date())).length

  if (erro) return <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{erro}</div>
  if (!lista) return <p className="text-sm text-slate-400">Carregando…</p>
  const kpis = [['Respostas', lista.length], ['Secretarias', setores], ['Com análise CPSI', comAnalise], ['Códigos livres', codigos ? livres : '…']]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(([t, v]) => (
          <div key={t} className={cartao}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t}</div>
            <div className="text-2xl font-bold tabular-nums mt-1">{v}</div>
          </div>
        ))}
      </div>
      <section className={cartao}>
        <h3 className={tituloCartao}>Natureza do problema · média das respostas</h3>
        {resumo.n ? <BarrasNatureza natureza={resumo.media} dominante={resumo.dominante} />
          : <p className="text-sm text-slate-500">Ainda não há respostas. Gere códigos na aba Códigos de acesso e envie para as secretarias.</p>}
      </section>
      <div className="flex flex-wrap gap-2">
        <button className={botao} onClick={() => irPara('respostas')}>Ver respostas</button>
        <Link className={botao} to="/pesquisa-banheiros/painel/relatorio">Relatório consolidado</Link>
        <button className={botao} onClick={() => irPara('codigos')}>Gerar códigos</button>
      </div>
    </div>
  )
}

function exportarPlanilha(lista) {
  const ps = todasPerguntas()
  const linhas = lista.map((x) => {
    const f = gerarFicha(x.respostas)
    const linha = {
      Data: dataBR(x.criado_em), Nome: x.nome || '', Lote: x.lote || '', 'Código (final)': x.final,
      'Natureza dominante': f.dominante ? NATUREZAS[f.dominante] : '',
    }
    for (const [k, rot] of Object.entries(NATUREZAS)) linha[rot] = f.natureza[k]
    linha['Maturidade (automática)'] = f.maturidade.nivel
    linha['Aderência CPSI (IA)'] = x.analise_cpsi?.cpsi?.aderencia || ''
    linha['Instrumento alternativo (IA)'] = x.analise_cpsi?.cpsi?.instrumento_alternativo || ''
    for (const p of ps) {
      const v = f.respostas[p.id]
      linha[p.rotulo] = Array.isArray(v) ? v.join('; ') : v ?? ''
    }
    return linha
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas), 'Respostas')
  XLSX.writeFile(wb, `pesquisa-banheiros-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function ListaRespostas({ dados }) {
  const { lista, erro, carregar } = dados
  if (erro) return <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{erro}</div>
  if (!lista) return <p className="text-sm text-slate-400">Carregando…</p>
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button className={botao} onClick={carregar}>Atualizar</button>
        <button className={botao} onClick={() => exportarPlanilha(lista)} disabled={!lista.length}>Baixar planilha (Excel)</button>
        <Link className={botao} to="/pesquisa-banheiros/painel/relatorio">Relatório consolidado</Link>
      </div>
      {!lista.length ? <p className="text-sm text-slate-500">Nenhuma resposta ainda.</p> : (
        <div className={`${cartao} p-0 overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="px-4 py-2 font-medium">Data</th><th className="px-4 py-2 font-medium">Secretaria</th>
              <th className="px-4 py-2 font-medium">Problema principal</th><th className="px-4 py-2 font-medium">Aderência CPSI</th><th />
            </tr></thead>
            <tbody>
              {lista.map((x) => {
                const f = gerarFicha(x.respostas)
                return (
                  <tr key={x.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 whitespace-nowrap">{dataBR(x.criado_em)}</td>
                    <td className="px-4 py-2.5">{f.setor}{x.nome ? <span className="text-slate-400"> · {x.nome}</span> : null}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{f.dominante ? `${NATUREZAS[f.dominante]} ${f.natureza[f.dominante]}` : '–'}</td>
                    <td className="px-4 py-2.5">{x.analise_cpsi ? <PilulaAderencia aderencia={x.analise_cpsi.cpsi?.aderencia} /> : <span className="text-slate-400 text-xs">sem análise</span>}</td>
                    <td className="px-4 py-2.5 text-right"><Link className="text-cyan-800 underline whitespace-nowrap" to={`/pesquisa-banheiros/painel/ficha/${x.id}`}>ver ficha</Link></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function FichaPesquisa() {
  const { id } = useParams()
  const { lista, erro, setLista } = useRespostas()
  const [gerando, setGerando] = useState(false)
  const [erroIa, setErroIa] = useState('')
  const item = lista?.find((x) => x.id === id)

  async function analisar() {
    setErroIa(''); setGerando(true)
    try {
      const { analise, modelo } = await gerarAnaliseCpsi(item.id, transcricao(item.respostas, item.nome))
      setLista(lista.map((x) => (x.id === item.id ? { ...x, analise_cpsi: analise, analise_em: new Date().toISOString(), analise_modelo: modelo } : x)))
    } catch (e) { setErroIa(e.message) }
    setGerando(false)
  }

  return (
    <Moldura>
      <div className="flex flex-wrap gap-2 mb-4 print:hidden">
        <Link className={botao} to="/pesquisa-banheiros/painel">← Voltar ao painel</Link>
        {item && <button className={botao} onClick={() => window.print()}>Imprimir ou salvar em PDF</button>}
        {item && (
          <button className={`${botao} border-cyan-700 text-cyan-800`} onClick={analisar} disabled={gerando}>
            {gerando ? 'Gerando análise… (até 1 minuto)' : item.analise_cpsi ? 'Gerar análise CPSI de novo' : 'Gerar análise CPSI'}
          </button>
        )}
      </div>
      {erro && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{erro}</div>}
      {erroIa && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 mb-4 print:hidden">{erroIa}</div>}
      {!lista && !erro && <p className="text-sm text-slate-400">Carregando…</p>}
      {lista && !item && <p className="text-sm text-slate-500">Resposta não encontrada.</p>}
      {item && (
        <>
          {item.analise_cpsi && (
            <p className="text-xs text-slate-500 mb-2 print:hidden">Análise gerada em {dataBR(item.analise_em)} ({item.analise_modelo}).</p>
          )}
          <FichaView ficha={gerarFicha(item.respostas)} analise={item.analise_cpsi}
            meta={`${dataBR(item.criado_em)}${item.nome ? ' · ' + item.nome : ''}${item.lote ? ' · lote ' + item.lote : ''} · código …${item.final}`} />
        </>
      )}
    </Moldura>
  )
}

export function RelatorioPesquisa() {
  const { lista, erro } = useRespostas()
  const resumo = useMemo(() => mediaNatureza(lista || []), [lista])
  const aderencias = useMemo(() => {
    const c = {}
    for (const x of lista || []) {
      const a = x.analise_cpsi?.cpsi?.aderencia || 'Sem análise'
      c[a] = (c[a] || 0) + 1
    }
    return c
  }, [lista])

  return (
    <Moldura>
      <div className="flex flex-wrap gap-2 mb-4 print:hidden">
        <Link className={botao} to="/pesquisa-banheiros/painel">← Voltar ao painel</Link>
        <button className={botao} onClick={() => window.print()} disabled={!lista?.length}>Imprimir ou salvar em PDF</button>
      </div>
      {erro && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{erro}</div>}
      {!lista && !erro && <p className="text-sm text-slate-400">Carregando…</p>}
      {lista && (
        <div className="space-y-6">
          <section className={`${cartao} print:border-0 print:p-0`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-800">Relatório consolidado</p>
            <h1 className="text-2xl font-bold mt-1">Pesquisa Banheiros Públicos de Vitória</h1>
            <p className="text-sm text-slate-500">CDTIV · emitido em {dataBR(new Date().toISOString())} · {lista.length} resposta{lista.length === 1 ? '' : 's'}</p>
            <h3 className={`${tituloCartao} mt-5`}>Natureza do problema · média</h3>
            {resumo.n ? <BarrasNatureza natureza={resumo.media} dominante={resumo.dominante} /> : <p className="text-sm">Sem respostas.</p>}
            <h3 className={`${tituloCartao} mt-5`}>Aderência a CPSI (análise por IA)</h3>
            <div className="flex flex-wrap gap-3 text-sm">
              {Object.entries(aderencias).map(([k, v]) => <span key={k}><PilulaAderencia aderencia={k} /> <b className="tabular-nums">{v}</b></span>)}
            </div>
          </section>
          {lista.map((x) => (
            <div key={x.id} className="break-before-page">
              <FichaView ficha={gerarFicha(x.respostas)} analise={x.analise_cpsi}
                meta={`${dataBR(x.criado_em)}${x.nome ? ' · ' + x.nome : ''}${x.lote ? ' · lote ' + x.lote : ''}`} />
            </div>
          ))}
        </div>
      )}
    </Moldura>
  )
}

function Codigos() {
  const [qtd, setQtd] = useState(5)
  const [lote, setLote] = useState('')
  const [validade, setValidade] = useState(30)
  const [novos, setNovos] = useState(null)
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [confirmar, setConfirmar] = useState(null)

  const carregar = useCallback(async () => {
    try { setLista(await listarCodigos()) } catch { setErro('Não foi possível carregar os códigos.') }
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const linkDe = (c) => `${window.location.origin}/pesquisa-banheiros?codigo=${encodeURIComponent(c)}`

  async function gerar(e) {
    e.preventDefault(); setErro(''); setOcupado(true); setCopiado(false)
    try {
      const c = await gerarCodigos(Number(qtd), lote.trim(), validade ? Number(validade) : null)
      setNovos({ lote: lote.trim(), codigos: c })
      carregar()
    } catch { setErro('Não foi possível gerar os códigos.') }
    setOcupado(false)
  }

  function baixar() {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      novos.codigos.map((c) => ({ Código: c, 'Link direto': linkDe(c), Lote: novos.lote })),
    ), 'Códigos')
    XLSX.writeFile(wb, `codigos-pesquisa-banheiros-${novos.lote || 'lote'}-${Date.now()}.xlsx`)
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(novos.codigos.map((c) => `${c}\t${linkDe(c)}`).join('\n')); setCopiado(true) } catch { setCopiado(false) }
  }

  const status = (c) => c.revogado ? 'Revogado' : c.usado_em ? 'Usado' : c.expira_em && new Date(c.expira_em) < new Date() ? 'Expirado' : 'Disponível'
  const input = 'w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-700'

  return (
    <div className="space-y-4">
      <section className={`${cartao} print:hidden`}>
        <h3 className={tituloCartao}>Gerar códigos</h3>
        <p className="text-sm text-slate-500 mb-3">Cada código vale uma resposta. Os códigos aparecem só agora: baixe ou copie antes de sair desta tela, porque o sistema guarda apenas uma versão cifrada.</p>
        <form onSubmit={gerar} className="grid sm:grid-cols-4 gap-3 items-end">
          <div><label htmlFor="pb-lote" className="block text-xs font-medium text-slate-600 mb-1">Secretaria (lote)</label>
            <input id="pb-lote" value={lote} onChange={(e) => setLote(e.target.value)} placeholder="ex: Semus" maxLength={60} className={input} /></div>
          <div><label htmlFor="pb-qtd" className="block text-xs font-medium text-slate-600 mb-1">Quantidade</label>
            <input id="pb-qtd" type="number" min={1} max={200} value={qtd} onChange={(e) => setQtd(e.target.value)} className={input} /></div>
          <div><label htmlFor="pb-val" className="block text-xs font-medium text-slate-600 mb-1">Validade (dias)</label>
            <input id="pb-val" type="number" min={1} max={365} value={validade} onChange={(e) => setValidade(e.target.value)} placeholder="sem validade" className={input} /></div>
          <button disabled={ocupado || !(qtd >= 1 && qtd <= 200)} className="py-2 rounded-md bg-[#0D1F3C] text-white text-sm font-semibold disabled:opacity-40">{ocupado ? 'Gerando…' : 'Gerar'}</button>
        </form>
        {erro && <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{erro}</div>}
      </section>

      {novos && (
        <section className={`${cartao} border-cyan-700`}>
          <h3 className={tituloCartao}>{novos.codigos.length} código{novos.codigos.length === 1 ? '' : 's'} gerado{novos.codigos.length === 1 ? '' : 's'}{novos.lote ? ` · ${novos.lote}` : ''}</h3>
          <div className="flex flex-wrap gap-2 mb-3 print:hidden">
            <button className={botao} onClick={baixar}>Baixar planilha (Excel)</button>
            <button className={botao} onClick={copiar}>{copiado ? 'Copiado' : 'Copiar códigos e links'}</button>
            <button className={botao} onClick={() => window.print()}>Imprimir</button>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {novos.codigos.map((c) => <li key={c} className="font-mono text-sm text-center bg-cyan-50 rounded-md py-2 tracking-wide">{c}</li>)}
          </ul>
          <p className="text-xs text-slate-500 mt-3">O link direto abre o formulário com o código preenchido. Envie cada código para uma única pessoa. Endereço do formulário: {window.location.origin}/pesquisa-banheiros</p>
        </section>
      )}

      <section className={`${cartao} print:hidden`}>
        <h3 className={tituloCartao}>Códigos emitidos</h3>
        {!lista ? <p className="text-sm text-slate-400">Carregando…</p> : !lista.length ? <p className="text-sm text-slate-500">Nenhum código emitido ainda.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3 font-medium">Final</th><th className="py-2 pr-3 font-medium">Lote</th><th className="py-2 pr-3 font-medium">Criado</th>
                <th className="py-2 pr-3 font-medium">Por</th><th className="py-2 pr-3 font-medium">Situação</th><th />
              </tr></thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 font-mono">…{c.final}</td>
                    <td className="py-2 pr-3">{c.lote || ''}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{dataBR(c.criado_em)}</td>
                    <td className="py-2 pr-3 text-slate-500">{c.criado_por_email || ''}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{status(c)}{c.usado_em ? ` em ${dataBR(c.usado_em)}` : ''}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {status(c) === 'Disponível' && (confirmar === c.id ? (
                        <span className="text-xs">Revogar?{' '}
                          <button className="underline text-red-700" onClick={async () => { await revogarCodigo(c.id); setConfirmar(null); carregar() }}>sim</button>{' '}
                          <button className="underline text-slate-600" onClick={() => setConfirmar(null)}>não</button>
                        </span>
                      ) : <button className="underline text-cyan-800 text-xs" onClick={() => setConfirmar(c.id)}>revogar</button>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Equipe() {
  const [lista, setLista] = useState(null)
  useEffect(() => { listarEquipe().then(setLista).catch(() => setLista([])) }, [])
  return (
    <section className={cartao}>
      <h3 className={tituloCartao}>Quem tem acesso a este painel</h3>
      {!lista ? <p className="text-sm text-slate-400">Carregando…</p> : (
        <ul className="divide-y divide-slate-100">
          {lista.map((p) => <li key={p.email} className="py-2 flex justify-between gap-3 text-sm"><span>{p.email}</span><span className="text-slate-500">{p.papel}</span></li>)}
        </ul>
      )}
      <p className="text-xs text-slate-500 mt-3">Para incluir ou remover alguém, a Secretaria Executiva do FACITEC ajusta a tabela modulo_acesso no Supabase (instruções em supabase/pesquisa_banheiros_setup.sql).</p>
    </section>
  )
}

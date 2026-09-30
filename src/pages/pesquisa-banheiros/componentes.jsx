// Componentes compartilhados da Pesquisa Banheiros Públicos.
import logoCdtiv from '@/assets/logo-cdtiv.jpg.jpg'
import { NATUREZAS, todasPerguntas } from '@/lib/pesquisaBanheiros/questionario'

export function CabecalhoPesquisa({ subtitulo, direita }) {
  return (
    <header className="bg-[#0D1F3C] text-white print:bg-white print:text-black print:border-b print:border-slate-300">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-white rounded-md px-2 py-1 shrink-0"><img src={logoCdtiv} alt="CDTIV" className="h-6 block" /></div>
          <div className="min-w-0">
            <div className="font-semibold text-sm leading-tight">Pesquisa Banheiros Públicos</div>
            {subtitulo && <div className="text-xs text-white/60 print:text-slate-500 leading-tight truncate">{subtitulo}</div>}
          </div>
        </div>
        {direita && <div className="print:hidden">{direita}</div>}
      </div>
    </header>
  )
}

export function BarrasNatureza({ natureza, dominante }) {
  const itens = Object.entries(NATUREZAS)
    .map(([k, rot]) => ({ k, rot, v: natureza[k] || 0 }))
    .sort((a, b) => b.v - a.v)
  return (
    <div className="space-y-1.5">
      {itens.map((i) => (
        <div key={i.k} className="grid grid-cols-[140px_1fr_32px] sm:grid-cols-[170px_1fr_32px] gap-3 items-center text-sm">
          <span className={i.k === dominante ? 'font-semibold' : 'text-slate-600'}>{i.rot}</span>
          <span className="h-2 rounded bg-slate-200 overflow-hidden">
            <span className={`block h-full rounded ${i.k === dominante ? 'bg-cyan-700' : 'bg-slate-400'}`} style={{ width: `${i.v}%` }} />
          </span>
          <span className="text-right tabular-nums text-slate-500">{i.v}</span>
        </div>
      ))}
    </div>
  )
}

function Secao({ titulo, children }) {
  return (
    <section className="mt-5 break-inside-avoid-page">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{titulo}</h3>
      {children}
    </section>
  )
}

export function FichaView({ ficha, meta, analise }) {
  return (
    <article className="bg-white border border-slate-200 rounded-xl p-5 print:border-0 print:p-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-800">Ficha da pesquisa</p>
      <h2 className="text-xl font-bold leading-snug mt-1">{analise?.titulo || ficha.titulo}</h2>
      {meta && <p className="text-sm text-slate-500 mt-0.5">{meta}</p>}

      <Secao titulo="Natureza do problema">
        {ficha.dominante ? (
          <>
            <p className="mb-2">Peso maior em <b>{NATUREZAS[ficha.dominante]}</b></p>
            <BarrasNatureza natureza={ficha.natureza} dominante={ficha.dominante} />
            <p className="text-xs text-slate-500 mt-2">Pontos de 0 a 100, distribuídos conforme os problemas marcados, o principal e a explicação escolhida.</p>
          </>
        ) : <p>Nenhum problema foi apontado.</p>}
      </Secao>

      <Secao titulo="Maturidade do diagnóstico">
        <div className="flex gap-1 max-w-[240px] mb-2" aria-label={`Nível ${ficha.maturidade.nivel} de 5`}>
          {[1, 2, 3, 4, 5].map((n) => <span key={n} className={`flex-1 h-1.5 rounded ${n <= ficha.maturidade.nivel ? 'bg-cyan-700' : 'bg-slate-200'}`} />)}
        </div>
        <p className="text-sm"><b>Nível {ficha.maturidade.nivel} de 5.</b> {ficha.maturidade.justificativa}</p>
      </Secao>

      {analise && <AnaliseCpsiView analise={analise} />}

      <Secao titulo="Respostas">
        <dl className="divide-y divide-slate-100">
          {todasPerguntas().filter((p) => ficha.respostas[p.id] != null).map((p) => (
            <div key={p.id} className="py-2 break-inside-avoid">
              <dt className="text-xs text-slate-500">{p.rotulo}</dt>
              <dd className="whitespace-pre-wrap break-words">
                {Array.isArray(ficha.respostas[p.id]) ? ficha.respostas[p.id].join('; ') : ficha.respostas[p.id]}
              </dd>
            </div>
          ))}
        </dl>
      </Secao>

      {ficha.lacunas.length > 0 && (
        <Secao titulo="Ficou em aberto">
          <ul className="list-disc pl-5 text-sm space-y-0.5">{ficha.lacunas.map((l) => <li key={l}>{l}</li>)}</ul>
        </Secao>
      )}
    </article>
  )
}

const COR_ADERENCIA = {
  Alta: 'bg-emerald-100 text-emerald-800',
  'Média': 'bg-cyan-100 text-cyan-800',
  Media: 'bg-cyan-100 text-cyan-800',
  Baixa: 'bg-amber-100 text-amber-800',
}

export function PilulaAderencia({ aderencia }) {
  if (!aderencia) return null
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${COR_ADERENCIA[aderencia] || 'bg-slate-100 text-slate-700'}`}>
      {aderencia}
    </span>
  )
}

function Lista({ itens }) {
  if (!itens?.length) return <p className="text-sm text-slate-400">Não identificado nas respostas.</p>
  return <ul className="list-disc pl-5 text-sm space-y-0.5">{itens.map((x, i) => <li key={i}>{x}</li>)}</ul>
}

export function AnaliseCpsiView({ analise }) {
  const c = analise.cpsi || {}
  return (
    <div className="mt-5 rounded-xl border-2 border-cyan-700/40 bg-cyan-50/40 p-4 print:border print:border-slate-300 print:bg-white">
      <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-800">Análise CPSI · gerada por IA, revisar antes de usar</p>
      {analise.problema && <p className="mt-2">{analise.problema}</p>}

      <Secao titulo="Aderência a CPSI">
        <div className="flex flex-wrap items-center gap-2 mb-2"><PilulaAderencia aderencia={c.aderencia} /></div>
        {c.justificativa && <p className="text-sm">{c.justificativa}</p>}
        <dl className="grid sm:grid-cols-3 gap-2 mt-2 text-sm">
          <div><dt className="text-xs text-slate-500">Solução pronta no mercado</dt><dd>{c.solucao_pronta_no_mercado || '–'}</dd></div>
          <div><dt className="text-xs text-slate-500">Risco tecnológico</dt><dd>{c.risco_tecnologico || '–'}</dd></div>
          <div><dt className="text-xs text-slate-500">Mensurável</dt><dd>{c.mensuravel || '–'}</dd></div>
        </dl>
        {c.espaco_para_inovacao && <p className="text-sm mt-2"><b>Espaço para inovação.</b> {c.espaco_para_inovacao}</p>}
        {c.instrumento_alternativo && <p className="text-sm mt-2"><b>Instrumento alternativo.</b> {c.instrumento_alternativo}</p>}
      </Secao>

      <div className="grid md:grid-cols-2 gap-x-6">
        <Secao titulo="Sintomas"><Lista itens={analise.sintomas} /></Secao>
        <Secao titulo="Quem sofre e como">
          <Lista itens={(analise.dores || []).map((d) => `${d.grupo}: ${d.impacto}`)} />
        </Secao>
        <Secao titulo="Causas prováveis (hipóteses)"><Lista itens={analise.causas_provaveis} /></Secao>
        <Secao titulo="Necessidades"><Lista itens={analise.necessidades} /></Secao>
        <Secao titulo="Evidências"><Lista itens={analise.evidencias} /></Secao>
        <Secao titulo="Suposições"><Lista itens={analise.suposicoes} /></Secao>
        <Secao titulo="Resultados esperados"><Lista itens={analise.resultados_esperados} /></Secao>
        <Secao titulo="Indicadores">
          <Lista itens={[...(analise.indicadores?.processo || []).map((x) => `Processo: ${x}`), ...(analise.indicadores?.resultado || []).map((x) => `Resultado: ${x}`)]} />
        </Secao>
        <Secao titulo="Riscos se nada for feito"><Lista itens={analise.riscos} /></Secao>
        <Secao titulo="Lacunas críticas"><Lista itens={analise.lacunas_criticas} /></Secao>
      </div>
      <Secao titulo="Próximos passos"><Lista itens={analise.proximos_passos} /></Secao>
      {analise.maturidade?.nivel && (
        <p className="text-sm mt-4 text-slate-600">Maturidade segundo a IA: <b>{analise.maturidade.nivel} de 5</b>. {analise.maturidade.justificativa}</p>
      )}
    </div>
  )
}

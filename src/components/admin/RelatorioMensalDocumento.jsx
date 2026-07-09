import { useEffect } from 'react'
import { X, Download, CheckCircle2, ClipboardList, Target, AlertTriangle, Camera, Users, Loader2 } from 'lucide-react'
import LogoFacitecConecta from '@/components/orientador/LogoFacitecConecta'

export function RelatorioMensalDocumento({ open, onClose, relatorio, ciclo, orientador, projetoTitulo, nomesBolsistas, onExportarPDF, exportando }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !relatorio) return null

  const codigo = orientador?.codigo_facitec || orientador?.codigo_orientador || '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-3xl max-h-[92vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Cabeçalho de marca */}
        <div style={{ background: '#16324A' }} className="px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <LogoFacitecConecta size="sm" inverted />
            <div className="border-l border-white/20 pl-3 min-w-0">
              <p className="text-white text-sm font-semibold leading-tight">FACITEC · Relatório de Acompanhamento</p>
              <p className="text-white/50 text-[11px] leading-tight">Fundo de Apoio à Ciência, Tecnologia e Inovação de Vitória</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onExportarPDF}
              disabled={exportando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {exportando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {exportando ? 'Gerando PDF...' : 'Exportar PDF'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Identificação */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-start justify-between gap-4 flex-wrap shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Projeto</p>
            <p className="text-base font-bold text-gray-900 leading-snug">{projetoTitulo ?? '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Orientador(a): {orientador?.nome_completo ?? '—'} · {codigo}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Ciclo {ciclo?.numero_ciclo} · {ciclo?.mes_referencia}
            </p>
            {relatorio.enviado_em && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 className="w-3 h-3" /> Enviado em {new Date(relatorio.enviado_em).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          <SecaoDoc icone={Users} titulo="Frequência da equipe" cor="text-blue-600">
            {(relatorio.frequencia_bolsistas ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">—</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-6">
                {relatorio.frequencia_bolsistas.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100">
                    <span className="text-gray-700 truncate pr-2">{nomesBolsistas[f.bolsista_id] ?? '—'}</span>
                    <span className={`text-xs font-semibold shrink-0 ${f.cumpriu_75_porcento ? 'text-green-600' : 'text-red-600'}`}>
                      {f.cumpriu_75_porcento ? '75%+' : 'Abaixo de 75%'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SecaoDoc>

          <SecaoDoc icone={ClipboardList} titulo="Atividades realizadas" cor="text-indigo-600">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{relatorio.atividades_realizadas || '—'}</p>
          </SecaoDoc>

          <SecaoDoc icone={Target} titulo="Resultados alcançados" cor="text-emerald-600">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{relatorio.resultados_alcancados || '—'}</p>
          </SecaoDoc>

          <SecaoDoc icone={AlertTriangle} titulo="Desafios enfrentados" cor="text-amber-600">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{relatorio.desafios_enfrentados || '—'}</p>
          </SecaoDoc>

          <SecaoDoc icone={Camera} titulo="Evidências" cor="text-purple-600">
            {(relatorio.evidencias_urls ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">—</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {relatorio.evidencias_urls.map(url => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
                  >
                    <img src={url} alt="Evidência" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </SecaoDoc>
        </div>
      </div>
    </div>
  )
}

function SecaoDoc({ icone: Icone, titulo, cor, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icone className={`w-3.5 h-3.5 ${cor}`} />
        <p className={`text-xs font-bold uppercase tracking-wider ${cor}`}>{titulo}</p>
      </div>
      {children}
    </div>
  )
}

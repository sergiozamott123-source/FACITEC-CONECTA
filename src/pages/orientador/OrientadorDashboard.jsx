import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock, Users, FileText, Award, ChevronRight } from 'lucide-react'
import { OrientadorSidebar } from './OrientadorSidebar'
import { usePortalOrientador } from '@/contexts/PortalOrientadorContext'
import { supabase } from '@/lib/supabase'

const MAX_BOLSISTAS = 8

const ETAPAS = [
  'Acesso criado',
  'Dados pessoais',
  'Equipe',
  'Aguard. contrato',
  'Contrato emitido',
]

function calcEtapaAtual(orientador, bolsistas, contrato) {
  if (contrato?.status === 'emitido') return 4
  if (bolsistas?.length >= MAX_BOLSISTAS) return 3
  if (bolsistas?.length > 0) return 2
  if (orientador?.cpf) return 1
  return 0
}

function StatusBolsista({ bolsista }) {
  const campos = ['nome_completo', 'cpf', 'data_nascimento', 'escola_origem', 'doc_rg_url', 'doc_cpf_url', 'doc_matricula_url']
  const completo = campos.every(c => bolsista[c])
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
      completo
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-amber-50 text-amber-700 border-amber-200'
    }`}>
      {completo ? 'Completo' : 'Pendente'}
    </span>
  )
}

function TipoBadge({ tipo }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
      tipo === 'bolsista'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-purple-50 text-purple-700 border-purple-200'
    }`}>
      {tipo === 'bolsista' ? 'Bolsista' : 'Voluntário'}
    </span>
  )
}

export function OrientadorDashboard() {
  const { orientador, projeto } = usePortalOrientador()
  const navigate = useNavigate()
  const [bolsistas, setBolsistas] = useState([])
  const [contrato, setContrato] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!projeto) { setLoading(false); return }
    fetchDados()
  }, [projeto])

  async function fetchDados() {
    setLoading(true)
    const [{ data: bData, error: e1 }, { data: cData, error: e2 }] = await Promise.all([
      supabase
        .from('bolsista')
        .select('*')
        .eq('projeto_id', projeto.id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: true }),
      supabase
        .from('contrato')
        .select('*')
        .eq('projeto_id', projeto.id)
        .maybeSingle(),
    ])
    if (e1) setError('Erro ao carregar dados do projeto.')
    setBolsistas(bData ?? [])
    setContrato(cData ?? null)
    setLoading(false)
  }

  const etapaAtual = calcEtapaAtual(orientador, bolsistas, contrato)
  const primeiroNome = orientador?.nome_completo?.split(' ')[0] ?? 'Orientador'
  const rankLabel = projeto?.rank ? `${String(projeto.rank).padStart(3, '0')}º` : null

  return (
    <div className="min-h-screen flex bg-gray-50">
      <OrientadorSidebar />

      <main className="flex-1 ml-[200px] p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Olá, {primeiroNome}!
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gerencie sua equipe e acompanhe os documentos do seu projeto.
            </p>
          </div>
          {rankLabel && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-bold">
              <Award className="w-4 h-4" />
              {rankLabel} classificado
            </span>
          )}
        </div>

        {/* Alerta equipe incompleta */}
        {!loading && bolsistas.length < MAX_BOLSISTAS && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Equipe incompleta — {MAX_BOLSISTAS - bolsistas.length} bolsista(s) ainda não cadastrado(s)
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Cadastre todos os {MAX_BOLSISTAS} bolsistas para avançar para o contrato.
              </p>
            </div>
            <button
              onClick={() => navigate('/orientador/equipe')}
              className="ml-auto shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
            >
              Cadastrar agora
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Cards de métricas */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bolsistas</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '—' : bolsistas.length}
              <span className="text-sm font-normal text-gray-400">/{MAX_BOLSISTAS}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">cadastrados</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contrato</p>
            </div>
            {loading ? (
              <p className="text-sm text-gray-400">Carregando...</p>
            ) : contrato ? (
              <>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                  contrato.status === 'emitido'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {contrato.status === 'emitido' ? 'Emitido' : 'Em elaboração'}
                </span>
              </>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-50 text-gray-500 border-gray-200">
                Aguardando
              </span>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vigência</p>
            </div>
            {loading ? (
              <p className="text-sm text-gray-400">—</p>
            ) : contrato?.vigencia ? (
              <p className="text-sm font-semibold text-gray-900">{contrato.vigencia}</p>
            ) : (
              <p className="text-sm text-gray-400">Não definida</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Card do projeto */}
          {projeto && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Meu projeto</p>
                {projeto.rank && (
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                    #{String(projeto.rank).padStart(3, '0')}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-snug">{projeto.titulo}</p>
                {projeto.area_conhecimento && (
                  <p className="text-xs text-gray-500 mt-1">{projeto.area_conhecimento}</p>
                )}
              </div>
              {projeto.nota_final !== undefined && projeto.nota_final !== null && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Nota final: <span className="font-semibold text-gray-800">{projeto.nota_final}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Card da equipe */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Minha equipe</p>
              <button
                onClick={() => navigate('/orientador/equipe')}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Ver todos <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {loading ? (
              <p className="text-sm text-gray-400">Carregando...</p>
            ) : bolsistas.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum bolsista cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {bolsistas.slice(0, 5).map(b => (
                  <div key={b.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <span className="text-gray-600 text-[10px] font-bold">
                        {b.nome_completo?.charAt(0) ?? '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{b.nome_completo}</p>
                      {b.codigo_facitec && (
                        <p className="text-[10px] text-gray-400">{b.codigo_facitec}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <TipoBadge tipo={b.tipo} />
                      <StatusBolsista bolsista={b} />
                    </div>
                  </div>
                ))}
                {bolsistas.length > 5 && (
                  <p className="text-xs text-gray-400 text-center pt-1">
                    +{bolsistas.length - 5} mais
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Progresso do processo
          </p>
          <div className="flex items-center">
            {ETAPAS.map((etapa, idx) => {
              const done = idx < etapaAtual
              const active = idx === etapaAtual
              return (
                <div key={idx} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                      done
                        ? 'bg-green-500 border-green-500 text-white'
                        : active
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}>
                      {done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <p className={`text-[10px] mt-1.5 text-center leading-tight max-w-[72px] ${
                      active ? 'text-blue-700 font-semibold' : done ? 'text-green-700' : 'text-gray-400'
                    }`}>
                      {etapa}
                    </p>
                  </div>
                  {idx < ETAPAS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mb-4 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}

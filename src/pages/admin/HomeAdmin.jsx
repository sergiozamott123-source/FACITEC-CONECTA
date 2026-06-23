import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Microscope, School, Lightbulb, Award, ChevronRight, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { db } from '@/lib/db'
import { useAdmin } from '@/contexts/AdminContext'

const PROGRAMAS_CONFIG = [
  {
    id: 'PIBICJR',
    nome: 'PIBIC Jr',
    nomeCompleto: 'Programa Institucional de Bolsas de Iniciação Científica Júnior',
    icon: Microscope,
    bg: '#EEEDFE',
    border: '#C5C1F5',
    cor: '#534AB7',
    badgeLabel: 'ativo',
    badgeCls: 'bg-green-100 text-green-700',
    ativo: true,
  },
  {
    id: 'PROFICJR',
    nome: 'PROFIC Jr',
    nomeCompleto: 'Programa de Fomento à Iniciação Científica Júnior',
    icon: School,
    bg: '#F0FDFA',
    border: '#99F6E4',
    cor: '#0D9488',
    badgeLabel: 'em breve',
    badgeCls: 'bg-gray-100 text-gray-400',
    ativo: false,
  },
  {
    id: 'PROFICJOVEM',
    nome: 'PROFIC Jovem',
    nomeCompleto: 'Programa de Fomento à Iniciação Científica Jovem',
    icon: Lightbulb,
    bg: '#FFF7F5',
    border: '#FDC5B0',
    cor: '#EA6C47',
    badgeLabel: 'em breve',
    badgeCls: 'bg-gray-100 text-gray-400',
    ativo: false,
  },
  {
    id: 'POSGRAD',
    nome: 'Pós-graduação',
    nomeCompleto: 'Programa de Apoio à Pós-Graduação',
    icon: Award,
    bg: '#FFFBEB',
    border: '#FDE68A',
    cor: '#D97706',
    badgeLabel: 'em breve',
    badgeCls: 'bg-gray-100 text-gray-400',
    ativo: false,
  },
]

function ProgramaCard({ config, qtdEdicoes, selecionado, onClick }) {
  const Icon = config.icon

  return (
    <button
      onClick={config.ativo ? onClick : undefined}
      disabled={!config.ativo}
      className={cn(
        'w-full text-left rounded-xl border-2 p-5 transition-all duration-200',
        config.ativo
          ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
          : 'cursor-not-allowed opacity-50',
        selecionado
          ? 'shadow-md ring-2 ring-[#534AB7] ring-offset-2'
          : 'hover:border-opacity-80'
      )}
      style={{
        backgroundColor: config.bg,
        borderColor: selecionado ? '#534AB7' : config.border,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
          style={{ backgroundColor: config.cor + '22' }}
        >
          <Icon className="w-5 h-5" style={{ color: config.cor }} />
        </div>
        <span
          className={cn(
            'text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full',
            config.badgeCls
          )}
        >
          {config.badgeLabel}
        </span>
      </div>

      <div className="mt-3">
        <p className="font-bold text-base leading-tight" style={{ color: config.cor }}>
          {config.nome}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
          {config.nomeCompleto}
        </p>
      </div>

      {config.ativo && (
        <p className="mt-3 text-xs font-medium" style={{ color: config.cor }}>
          {qtdEdicoes === 1 ? '1 edição' : `${qtdEdicoes} edições`}
        </p>
      )}
    </button>
  )
}

function EdicaoRow({ edicao, selecionada, contagem, onClick }) {
  const isAtiva = edicao.status === 'ativo'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border-2 px-4 py-3 transition-all duration-150',
        selecionada
          ? 'border-[#534AB7] bg-[#EEEDFE]'
          : 'border-[#E2E8F0] bg-white hover:border-[#C5C1F5] hover:bg-[#F8F7FF]'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('font-semibold text-sm', selecionada ? 'text-[#534AB7]' : 'text-gray-800')}>
              Edição {edicao.ano_referencia}
            </span>
            {edicao.numero_edital && (
              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                <Hash className="w-3 h-3" />
                Edital {edicao.numero_edital}
              </span>
            )}
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full',
                isAtiva ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              )}
            >
              {isAtiva ? 'ativa' : 'encerrada'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {contagem == null ? 'carregando...' : `${contagem} inscrição${contagem !== 1 ? 'ões' : ''}`}
          </p>
        </div>
        <ChevronRight className={cn('w-4 h-4 shrink-0', selecionada ? 'text-[#534AB7]' : 'text-gray-300')} />
      </div>
    </button>
  )
}

export function HomeAdmin() {
  const navigate = useNavigate()
  const { edicoes, edicaoSelecionada, setEdicaoSelecionada } = useAdmin()

  const [programaAberto, setProgramaAberto] = useState(null)
  const [edicaoDestaque, setEdicaoDestaque] = useState(null)
  const [contagens, setContagens] = useState({})

  const edicoesPibic = edicoes.filter(
    (e) => !e.programa_id || e.programa_id === 'PIBICJR'
  )

  const edicoesPibicAtivas = edicoesPibic.filter((e) => e.status === 'ativo')

  useEffect(() => {
    if (programaAberto !== 'PIBICJR' || edicoesPibicAtivas.length === 0) return
    edicoesPibicAtivas.forEach((e) => {
      db.count('projeto', [['edicao_id', 'eq', e.id]])
        .then((n) => setContagens((prev) => ({ ...prev, [e.id]: n })))
        .catch(() => setContagens((prev) => ({ ...prev, [e.id]: 0 })))
    })
  }, [programaAberto, edicoes])

  function handleProgramaClick(id) {
    if (id === programaAberto) {
      setProgramaAberto(null)
      setEdicaoDestaque(null)
    } else {
      setProgramaAberto(id)
      setEdicaoDestaque(null)
    }
  }

  function handleEdicaoClick(edicao) {
    setEdicaoDestaque(edicao.id)
  }

  function handleAcessarPainel() {
    const edicao = edicoesPibicAtivas.find((e) => e.id === edicaoDestaque)
    if (!edicao) return
    setEdicaoSelecionada(edicao)
    navigate(`/admin/pibic-jr/${edicao.ano_referencia}/painel`)
  }

  const edicaoDestak = edicoesPibicAtivas.find((e) => e.id === edicaoDestaque)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Programas FACITEC</h1>
        <p className="text-sm text-gray-500 mt-1">
          Selecione um programa e uma edição para acessar o painel de gestão.
        </p>
      </div>

      {/* Grid 2x2 */}
      <div className="grid grid-cols-2 gap-4">
        {PROGRAMAS_CONFIG.map((cfg) => {
          const qtd = cfg.id === 'PIBICJR' ? edicoesPibicAtivas.length : 0
          return (
            <ProgramaCard
              key={cfg.id}
              config={cfg}
              qtdEdicoes={qtd}
              selecionado={programaAberto === cfg.id}
              onClick={() => handleProgramaClick(cfg.id)}
            />
          )
        })}
      </div>

      {/* Painel de edições — visível só quando PIBIC Jr selecionado */}
      {programaAberto === 'PIBICJR' && (
        <div className="border border-[#E2E8F0] rounded-xl bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-gray-800">Edições — PIBIC Jr</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {edicoesPibicAtivas.length === 0
                  ? 'Nenhuma edição ativa'
                  : `${edicoesPibicAtivas.length} edição${edicoesPibicAtivas.length !== 1 ? 'ões' : ''} ativa${edicoesPibicAtivas.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            {edicaoDestaque && (
              <button
                onClick={handleAcessarPainel}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#534AB7] text-white text-sm font-semibold hover:bg-[#4740A0] transition-colors"
              >
                Acessar painel da edição {edicaoDestak?.ano_referencia}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="p-4 space-y-2">
            {edicoesPibicAtivas.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Nenhuma edição ativa encontrada para este programa.
              </p>
            ) : (
              edicoesPibicAtivas.map((e) => (
                <EdicaoRow
                  key={e.id}
                  edicao={e}
                  selecionada={edicaoDestaque === e.id}
                  contagem={contagens[e.id]}
                  onClick={() => handleEdicaoClick(e)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

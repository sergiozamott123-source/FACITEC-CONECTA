import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Microscope, School, Lightbulb, Award, Archive, ChevronRight, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { db, edicaoService } from '@/lib/db'
import { PROGRAMAS, PROGRAMA_ID_PADRAO } from '@/lib/programas'

const ICONS = { PIBICJR: Microscope, PROFICJR: School, PROFICJOVEM: Lightbulb, POSGRADUACAO: Award }
const BORDERS = { PIBICJR: '#C5C1F5', PROFICJR: '#99F6E4', PROFICJOVEM: '#FDC5B0', POSGRADUACAO: '#FDE68A' }

// Deriva do registro único (src/lib/programas.js), só decorando com ícone/borda/badge locais.
const PROGRAMAS_CONFIG = PROGRAMAS.map((p) => ({
  id: p.programaId,
  slug: p.slug,
  nome: p.nome,
  nomeCompleto: p.nomeCompleto,
  icon: ICONS[p.programaId] ?? Microscope,
  bg: p.corBg,
  border: BORDERS[p.programaId] ?? p.cor + '55',
  cor: p.cor,
  badgeLabel: p.ativo ? 'ativo' : 'em breve',
  badgeCls: p.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400',
  ativo: p.ativo,
}))

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

// Card de ferramenta (ex: Acervo) — mesmo visual do ProgramaCard, mas sem
// badge "ativo/em breve" e sem contagem de edições, já que não é um programa
// com edicao.programa_id, e sim uma ferramenta que atravessa todos eles.
function FerramentaCard({ icon: Icon, nome, descricao, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border-2 p-5 transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-opacity-80"
      style={{ backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
        style={{ backgroundColor: '#47556922' }}
      >
        <Icon className="w-5 h-5" style={{ color: '#475569' }} />
      </div>
      <div className="mt-3">
        <p className="font-bold text-base leading-tight" style={{ color: '#475569' }}>{nome}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{descricao}</p>
      </div>
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

  const [edicoesTodas, setEdicoesTodas] = useState([])
  const [programaAberto, setProgramaAberto] = useState(null)
  const [edicaoDestaque, setEdicaoDestaque] = useState(null)
  const [contagens, setContagens] = useState({})

  useEffect(() => {
    edicaoService.list().then(({ data }) => setEdicoesTodas(data ?? [])).catch(() => {})
  }, [])

  function edicoesDoPrograma(programaId) {
    return edicoesTodas.filter(
      (e) => (e.programa_id ?? PROGRAMA_ID_PADRAO) === programaId
    )
  }

  const cfgAberto = PROGRAMAS_CONFIG.find((c) => c.id === programaAberto) ?? null
  const edicoesAtivasAberto = cfgAberto ? edicoesDoPrograma(cfgAberto.id).filter((e) => e.status === 'ativo') : []

  useEffect(() => {
    if (!programaAberto || edicoesAtivasAberto.length === 0) return
    edicoesAtivasAberto.forEach((e) => {
      db.count('projeto', [['edicao_id', 'eq', e.id]])
        .then((n) => setContagens((prev) => ({ ...prev, [e.id]: n })))
        .catch(() => setContagens((prev) => ({ ...prev, [e.id]: 0 })))
    })
  }, [programaAberto, edicoesTodas])

  function irParaPainel(cfg, edicao) {
    navigate(`/admin/${cfg.slug}/${edicao.ano_referencia}/painel`)
  }

  function handleProgramaClick(cfg) {
    if (cfg.id === programaAberto) {
      setProgramaAberto(null)
      setEdicaoDestaque(null)
      return
    }
    const ativas = edicoesDoPrograma(cfg.id).filter((e) => e.status === 'ativo')
    if (ativas.length === 1) {
      irParaPainel(cfg, ativas[0])
      return
    }
    setProgramaAberto(cfg.id)
    setEdicaoDestaque(null)
  }

  function handleEdicaoClick(edicao) {
    setEdicaoDestaque(edicao.id)
  }

  function handleAcessarPainel() {
    const edicao = edicoesAtivasAberto.find((e) => e.id === edicaoDestaque)
    if (!edicao || !cfgAberto) return
    irParaPainel(cfgAberto, edicao)
  }

  const edicaoDestak = edicoesAtivasAberto.find((e) => e.id === edicaoDestaque)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Cabeçalho com hero fotográfico */}
      <div
        className="rounded-2xl px-6 py-8 sm:px-10 sm:py-10 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(15,30,45,0.55) 0%, rgba(15,30,45,0.75) 100%), url('/images/hero-vitoria.jpg')`,
        }}
      >
        <h1 className="text-2xl font-bold text-white">Programas FACITEC</h1>
        <p className="text-sm text-white/70 mt-1">
          Selecione um programa e uma edição para acessar o painel de gestão.
        </p>
      </div>

      {/* Grid 2x2 */}
      <div className="grid grid-cols-2 gap-4">
        {PROGRAMAS_CONFIG.map((cfg) => {
          const qtd = edicoesDoPrograma(cfg.id).filter((e) => e.status === 'ativo').length
          return (
            <ProgramaCard
              key={cfg.id}
              config={cfg}
              qtdEdicoes={qtd}
              selecionado={programaAberto === cfg.id}
              onClick={() => handleProgramaClick(cfg)}
            />
          )
        })}
      </div>

      {/* Ferramentas — atravessam todos os programas, não têm edição ativa própria */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Ferramentas</h2>
        <div className="grid grid-cols-2 gap-4">
          <FerramentaCard
            icon={Archive}
            nome="Acervo"
            descricao="Edições encerradas de todos os programas — projetos, orientadores, bolsistas e material histórico."
            onClick={() => navigate('/admin/acervo')}
          />
        </div>
      </div>

      {/* Painel de edições — visível só quando um programa com mais de uma edição está selecionado */}
      {cfgAberto && (
        <div className="border border-[#E2E8F0] rounded-xl bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-gray-800">Edições — {cfgAberto.nome}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {edicoesAtivasAberto.length === 0
                  ? 'Nenhuma edição ativa'
                  : `${edicoesAtivasAberto.length} edição${edicoesAtivasAberto.length !== 1 ? 'ões' : ''} ativa${edicoesAtivasAberto.length !== 1 ? 's' : ''}`}
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
            {edicoesAtivasAberto.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Nenhuma edição ativa encontrada para este programa.
              </p>
            ) : (
              edicoesAtivasAberto.map((e) => (
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

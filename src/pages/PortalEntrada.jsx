import { useNavigate } from 'react-router-dom'
import { Briefcase, Users } from 'lucide-react'
import LogoFacitecConecta from '@/components/orientador/LogoFacitecConecta'

const CARDS = [
  {
    icon: Briefcase,
    titulo: 'Secretaria executiva',
    subtitulo: 'Gestão dos programas, bolsistas e relatórios',
    to: '/login/secretaria',
  },
  {
    icon: Users,
    titulo: 'Portal do orientador de projetos',
    subtitulo: 'Acompanhe seus bolsistas e solicitações',
    to: '/login/orientador',
  },
]

export function PortalEntrada() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen flex flex-col bg-cover bg-center"
      style={{
        backgroundColor: '#0f1e2d',
        backgroundImage: `linear-gradient(180deg, rgba(15,30,45,0.30) 0%, rgba(15,30,45,0.45) 55%, rgba(10,20,32,0.68) 100%), url('/images/hero-vitoria.jpg')`,
      }}
    >
      <header className="pt-12 pb-6 px-4 flex flex-col items-center text-center">
        <LogoFacitecConecta size="lg" inverted />
        <p className="mt-4 text-white/70 text-[11px] sm:text-xs font-medium tracking-[0.2em] uppercase max-w-md">
          Fundo de Apoio à Ciência, Tecnologia e Inovação de Vitória
        </p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <h1
          className="text-center font-medium text-2xl sm:text-3xl tracking-wide mb-8 sm:mb-12"
          style={{ color: '#FFD9A8' }}
        >
          PLATAFORMA FACITEC CONECTA
        </h1>

        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {CARDS.map(({ icon: Icon, titulo, subtitulo, to }) => (
            <div
              key={to}
              className="rounded-xl border p-6 sm:p-8 flex flex-col items-start gap-4 text-left"
              style={{
                backgroundColor: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
                borderColor: 'rgba(255,255,255,0.28)',
                borderWidth: '0.5px',
              }}
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-white/15">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">{titulo}</h2>
                <p className="text-white/70 text-sm mt-1">{subtitulo}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(to)}
                className="mt-2 w-full sm:w-auto px-5 py-2.5 rounded-md bg-white text-[#0f1e2d] text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                Entrar
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

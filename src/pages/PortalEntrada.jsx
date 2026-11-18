import { useNavigate } from 'react-router-dom'
import { Briefcase, Users } from 'lucide-react'

// Card "Pesquisa Banheiros Públicos" removido da tela de abertura a pedido do
// Sérgio (06/10/2026) — a funcionalidade continua existindo normalmente no
// sistema (login, formulário, painel), só deixou de ser anunciada aqui. Quem
// já tem o link direto (/login/pesquisa-banheiros) continua acessando
// normalmente. Para reativar o card no futuro, basta devolver este item à
// lista abaixo (ver histórico do arquivo no git para o texto original):
// { icon: ClipboardList, titulo: 'Pesquisa Banheiros Públicos',
//   subtitulo: 'Equipe da CDTIV: respostas, fichas e códigos de acesso',
//   to: '/login/pesquisa-banheiros' }
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

// Visual de entrada no padrão do Portal CCAD (pedido do Sérgio, 17/11/2026):
// fundo azul-marinho liso, assinatura branca grande e cartões brancos.
// A foto aérea (/images/hero-vitoria.jpg) continua guardada no projeto.
export function PortalEntrada() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col bg-[var(--dv-marinho)]">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <header className="text-center mb-8 sm:mb-10">
          <img
            src="/identidade/facitec-conecta-assinatura-branca.svg"
            alt="FACITEC Conecta"
            className="h-14 sm:h-20 w-auto mx-auto mb-4"
          />
          <p className="text-xs sm:text-sm font-medium tracking-[0.15em] uppercase max-w-md mx-auto text-[var(--dv-texto-suave-escuro)]">
            Fundo de Apoio à Ciência, Tecnologia e Inovação de Vitória
          </p>
        </header>

        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {CARDS.map(({ icon: Icon, titulo, subtitulo, to }) => (
            <div
              key={to}
              className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-start gap-4 text-left"
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-[var(--dv-primaria-clara)]">
                <Icon className="w-5 h-5 text-[var(--dv-primaria-texto)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--dv-texto)]">{titulo}</h2>
                <p className="text-sm mt-1 text-[var(--dv-texto-secundario)]">{subtitulo}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(to)}
                className="mt-2 w-full py-2.5 px-4 rounded-md bg-[var(--dv-primaria)] text-white text-sm font-semibold hover:bg-[var(--dv-primaria-hover)] transition-colors"
              >
                Entrar
              </button>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-6 py-4 text-center">
        <p className="text-xs text-[var(--dv-texto-suave-escuro)] opacity-70">
          Fundo Municipal de Ciência e Tecnologia de Vitória/ES · CDTIV
        </p>
      </footer>
    </div>
  )
}

import { Building2 } from 'lucide-react'

export function InscricaoLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0c2358 0%, #1a3f72 100%)' }}>
      <header className="px-6 py-4 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">FACITEC Conecta</p>
            <p className="text-white/60 text-xs leading-tight">Portal de Inscrições PibicJr</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-3xl">
          {children}
        </div>
      </main>

      <footer className="px-6 py-4 text-center shrink-0">
        <p className="text-white/40 text-xs">
          Fundo Municipal de Ciência e Tecnologia de Vitória/ES · CDTIV
        </p>
      </footer>
    </div>
  )
}

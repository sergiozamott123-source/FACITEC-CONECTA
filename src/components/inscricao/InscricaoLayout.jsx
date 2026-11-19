
export function InscricaoLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--dv-marinho)' }}>
      <header className="px-6 py-4 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img src="/identidade/facitec-conecta-assinatura-branca.svg" alt="FACITEC Conecta" className="h-10 w-auto" />
          <div>
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

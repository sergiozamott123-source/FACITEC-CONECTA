import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'

const ESTILOS = {
  info: 'border-[color:var(--dv-borda)] bg-[color:var(--dv-primaria-clara)] text-[color:var(--dv-primaria-texto)]',
  urgente: 'border-amber-300 bg-amber-50 text-amber-900',
  atraso: 'border-red-300 bg-red-50 text-red-900',
}

export function BannerRelatorioMensal({ banner, onClick }) {
  if (!banner) return null
  const Icone = banner.tom === 'atraso' ? AlertTriangle : banner.tom === 'urgente' ? Clock : CheckCircle2

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 flex items-start gap-3 transition-opacity hover:opacity-90 ${ESTILOS[banner.tom]}`}
    >
      <Icone className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="text-sm font-medium">{banner.mensagem}</p>
    </button>
  )
}

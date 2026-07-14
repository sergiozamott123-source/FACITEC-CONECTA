import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getProgramaByProgramaId } from '@/lib/programas'

// Cabeçalho reaproveitado nas 4 páginas de entidade do Acervo (Projetos,
// Orientadores, Bolsistas Jr, Inscritos) — mesmo título/badge que existia no
// accordion único de AcervoEdicao.jsx, mais o(s) botão(ões) de ação da página atual.
export function AcervoEdicaoHeader({ edicao, acaoLabel, acaoIcon: AcaoIcon, onAcao, acaoSecundariaLabel, acaoSecundariaIcon: AcaoSecundariaIcon, onAcaoSecundaria }) {
  const programa = getProgramaByProgramaId(edicao.programa_id)

  return (
    <div>
      <Link
        to="/admin/acervo"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Acervo
      </Link>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground leading-tight">
              {programa?.nome ?? edicao.programa_id} — Edição {edicao.ano_referencia}
            </h1>
            <Badge variant="secondary">Encerrado</Badge>
          </div>
          {edicao.numero_edital && (
            <p className="text-sm text-muted-foreground mt-0.5">Edital {edicao.numero_edital}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {acaoSecundariaLabel && (
            <Button size="sm" variant="outline" onClick={onAcaoSecundaria}>
              {AcaoSecundariaIcon && <AcaoSecundariaIcon className="w-4 h-4" />} {acaoSecundariaLabel}
            </Button>
          )}
          {acaoLabel && (
            <Button size="sm" onClick={onAcao}>
              {AcaoIcon && <AcaoIcon className="w-4 h-4" />} {acaoLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

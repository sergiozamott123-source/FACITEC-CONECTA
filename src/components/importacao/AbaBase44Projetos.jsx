import { useState, useEffect } from 'react'
import { useXlsx } from '@/hooks/useXlsx'
import {
  detectBase44Format,
  importarBase44Projetos,
  importarBase44Classificacao,
  importarBase44Detalhamento,
  validateBase44Projetos,
  validateBase44Classificacao,
  validateBase44Detalhamento,
} from '@/lib/importacao'
import { FileUploadZone } from './FileUploadZone'
import { ImportPreview } from './ImportPreview'
import { ImportProgress } from './ImportProgress'
import { ImportReport } from './ImportReport'
import { ErrorAlert } from '@/components/common/FormField'

const FORMATS = {
  candidatos: {
    label: 'Relação de Candidatos',
    cols: ['#', 'Candidato', 'Título do Projeto', 'Orientador', 'Área', 'Instituição'],
    displayCols: ['candidato', 'titulo_do_projeto', 'area', 'instituicao'],
    importFn: importarBase44Projetos,
    validateFn: validateBase44Projetos,
    progressLabel: 'Importando projetos e orientadores…',
  },
  classificacao: {
    label: 'Classificação Geral',
    cols: ['Pos.', 'Código', 'Título', 'Candidato', 'Instituição', 'Avaliações', 'Média Final', 'Consenso'],
    displayCols: ['pos', 'titulo', 'candidato', 'media_final', 'consenso'],
    importFn: importarBase44Classificacao,
    validateFn: validateBase44Classificacao,
    progressLabel: 'Importando classificação…',
  },
  detalhamento: {
    label: 'Detalhamento por Critérios',
    cols: ['Projeto', 'Código', 'Candidato', 'Avaliador', 'C1', 'C2', 'C3', 'C4', 'Nota Total'],
    displayCols: ['codigo', 'candidato', 'avaliador', 'c1', 'c2', 'c3', 'c4'],
    importFn: importarBase44Detalhamento,
    validateFn: validateBase44Detalhamento,
    progressLabel: 'Importando avaliações por critérios…',
  },
}

export function AbaBase44Projetos({ edicao }) {
  const { rows, parsing, parseError, parse, reset } = useXlsx()
  const [state, setState] = useState('idle') // idle | preview | importing | done
  const [format, setFormat] = useState(null) // null | 'candidatos' | 'classificacao'
  const [validated, setValidated] = useState([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [report, setReport] = useState(null)

  useEffect(() => {
    if (rows.length > 0) {
      const fmt = detectBase44Format(rows)
      setFormat(fmt)
      setValidated(FORMATS[fmt].validateFn(rows))
      setState('preview')
    }
  }, [rows])

  async function handleFile(file) {
    reset()
    setFormat(null)
    setState('idle')
    await parse(file)
  }

  async function handleImport() {
    setState('importing')
    const valid = validated.filter(r => !r._skip)
    setProgress({ current: 0, total: valid.length })
    const result = await FORMATS[format].importFn(
      validated, edicao,
      (cur, tot) => setProgress({ current: cur, total: tot })
    )
    setReport(result)
    setState('done')
  }

  function handleReset() {
    reset()
    setValidated([])
    setReport(null)
    setFormat(null)
    setState('idle')
  }

  if (!edicao) return (
    <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
      Selecione uma edição no topo para continuar.
    </div>
  )

  if (state === 'idle') return (
    <div className="space-y-4">
      <ErrorAlert message={parseError} />
      <FileUploadZone onFile={handleFile} parsing={parsing} />
      <div className="rounded-md bg-muted/50 border border-border px-4 py-3 space-y-3">
        <p className="text-xs font-medium text-foreground">Formatos aceitos (detectados automaticamente):</p>
        {Object.entries(FORMATS).map(([key, fmt]) => (
          <div key={key}>
            <p className="text-[11px] font-semibold text-muted-foreground mb-1">{fmt.label}</p>
            <div className="flex flex-wrap gap-1">
              {fmt.cols.map(col => (
                <code key={col} className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5 font-mono text-muted-foreground">
                  {col}
                </code>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const fmtInfo = FORMATS[format ?? 'candidatos']

  if (state === 'preview') {
    const valid = validated.filter(r => !r._skip)
    const uniqueProjects = new Set(valid.map(r => r.codigo).filter(Boolean)).size
    const uniqueAvaliadores = new Set(valid.map(r => r.avaliador).filter(Boolean)).size

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Formato detectado:</span>
          <span className="inline-flex items-center text-xs font-medium bg-primary/10 text-primary rounded-full px-2.5 py-0.5">
            {fmtInfo.label}
          </span>
        </div>
        {format === 'detalhamento' && (
          <div className="flex flex-wrap gap-4 rounded-md bg-muted/40 border border-border px-4 py-2.5 text-sm">
            <span><span className="font-semibold text-foreground">{uniqueProjects}</span> <span className="text-muted-foreground">projetos únicos</span></span>
            <span><span className="font-semibold text-foreground">{uniqueAvaliadores}</span> <span className="text-muted-foreground">avaliadores únicos</span></span>
            <span><span className="font-semibold text-foreground">{valid.length}</span> <span className="text-muted-foreground">avaliações a importar</span></span>
          </div>
        )}
        <ImportPreview
          rows={validated}
          displayCols={fmtInfo.displayCols}
          onImport={handleImport}
          onCancel={handleReset}
        />
      </div>
    )
  }

  if (state === 'importing') return (
    <ImportProgress current={progress.current} total={progress.total} label={fmtInfo.progressLabel} />
  )

  return <ImportReport report={report} onReset={handleReset} />
}

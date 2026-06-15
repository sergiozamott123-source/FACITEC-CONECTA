import { useState, useEffect, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { useXlsx } from '@/hooks/useXlsx'
import {
  importarHistorico, validateHistorico,
  TABELAS_HISTORICO, normalizeKey,
} from '@/lib/importacao'
import { FileUploadZone } from './FileUploadZone'
import { ImportPreview } from './ImportPreview'
import { ImportProgress } from './ImportProgress'
import { ImportReport } from './ImportReport'
import { FormField, Select, ErrorAlert } from '@/components/common/FormField'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function autoMap(xlsxHeaders, tableFields) {
  const mapping = {}
  const fieldKeys = tableFields.map(f => f.key)
  for (const h of xlsxHeaders) {
    const norm = normalizeKey(h)
    if (fieldKeys.includes(norm)) mapping[h] = norm
    else mapping[h] = '__skip__'
  }
  return mapping
}

function ColumnMapper({ headers, tableFields, mapping, onChange }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-2 items-center">
        <p className="text-xs font-medium text-muted-foreground">Coluna na planilha</p>
        <div />
        <p className="text-xs font-medium text-muted-foreground">Campo no banco</p>
        {headers.map(h => (
          <>
            <code key={`h-${h}`} className="text-xs font-mono bg-muted rounded px-2 py-1 truncate">{h}</code>
            <ChevronRight key={`arr-${h}`} className="w-4 h-4 text-muted-foreground" />
            <Select
              key={`sel-${h}`}
              value={mapping[h] ?? '__skip__'}
              onChange={e => onChange({ ...mapping, [h]: e.target.value })}
            >
              <option value="__skip__">— Ignorar —</option>
              {tableFields.map(f => (
                <option key={f.key} value={f.key}>
                  {f.label}{f.required ? ' *' : ''}
                </option>
              ))}
            </Select>
          </>
        ))}
      </div>
    </div>
  )
}

export function AbaHistorica({ edicao }) {
  const [tabela, setTabela] = useState('')
  const { rows, headers, parsing, parseError, parse, reset } = useXlsx()
  const [mapping, setMapping] = useState({})
  const [state, setState] = useState('idle') // idle | mapping | preview | importing | done
  const [validated, setValidated] = useState([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [report, setReport] = useState(null)

  const tableMeta = tabela ? TABELAS_HISTORICO[tabela] : null

  // Auto-map when headers arrive
  useEffect(() => {
    if (headers.length > 0 && tableMeta) {
      setMapping(autoMap(headers, tableMeta.fields))
      setState('mapping')
    }
  }, [headers])

  async function handleFile(file) {
    if (!tabela) return
    reset()
    setState('idle')
    await parse(file)
  }

  function handleConfirmMapping() {
    const requiredFields = tableMeta?.required ?? []
    const validated = validateHistorico(rows, mapping, requiredFields)
    setValidated(validated)
    setState('preview')
  }

  async function handleImport() {
    setState('importing')
    const valid = validated.filter(r => !r._skip)
    setProgress({ current: 0, total: valid.length })
    const result = await importarHistorico(
      validated, tabela, mapping, edicao?.id,
      (cur, tot) => setProgress({ current: cur, total: tot })
    )
    setReport(result)
    setState('done')
  }

  function handleReset() {
    reset()
    setValidated([])
    setReport(null)
    setState('idle')
  }

  // mapped display columns (non-skipped)
  const displayCols = useMemo(() => {
    return headers.filter(h => mapping[h] && mapping[h] !== '__skip__').slice(0, 6)
  }, [headers, mapping])

  const mappedCount = Object.values(mapping).filter(v => v && v !== '__skip__').length
  const requiredMapped = (tableMeta?.required ?? []).every(req =>
    Object.values(mapping).includes(req)
  )

  return (
    <div className="space-y-6">
      {/* Table selector */}
      <FormField label="Tabela de destino" required>
        <Select
          value={tabela}
          onChange={e => { setTabela(e.target.value); handleReset() }}
          className="max-w-sm"
        >
          <option value="">Selecione a tabela</option>
          {Object.entries(TABELAS_HISTORICO).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </Select>
      </FormField>

      {!tabela && (
        <p className="text-sm text-muted-foreground">Selecione a tabela de destino para continuar.</p>
      )}

      {tabela && state === 'idle' && (
        <>
          <ErrorAlert message={parseError} />
          <FileUploadZone
            onFile={handleFile}
            parsing={parsing}
            label={tableMeta?.label}
          />
        </>
      )}

      {tabela && state === 'mapping' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Mapeamento de colunas</p>
              <p className="text-xs text-muted-foreground">
                {mappedCount} de {headers.length} colunas mapeadas
                {!requiredMapped && <span className="text-destructive ml-2">— campos obrigatórios (*) ainda sem mapeamento</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>Cancelar</Button>
              <Button size="sm" onClick={handleConfirmMapping} disabled={!requiredMapped}>
                Ver Preview
              </Button>
            </div>
          </div>
          <ColumnMapper
            headers={headers}
            tableFields={tableMeta?.fields ?? []}
            mapping={mapping}
            onChange={setMapping}
          />
        </div>
      )}

      {tabela && state === 'preview' && (
        <ImportPreview
          rows={validated}
          displayCols={displayCols}
          onImport={handleImport}
          onCancel={() => setState('mapping')}
        />
      )}

      {tabela && state === 'importing' && (
        <ImportProgress
          current={progress.current}
          total={progress.total}
          label={`Importando para ${tableMeta?.label}…`}
        />
      )}

      {tabela && state === 'done' && (
        <ImportReport report={report} onReset={handleReset} />
      )}
    </div>
  )
}

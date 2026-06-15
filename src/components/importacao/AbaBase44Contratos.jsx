import { useState, useEffect } from 'react'
import { useXlsx } from '@/hooks/useXlsx'
import { importarBase44Contratos, validateBase44Contratos } from '@/lib/importacao'
import { FileUploadZone } from './FileUploadZone'
import { ImportPreview } from './ImportPreview'
import { ImportProgress } from './ImportProgress'
import { ImportReport } from './ImportReport'
import { ErrorAlert } from '@/components/common/FormField'

const EXPECTED_COLS = [
  'numero_contrato', 'numero_processo', 'data_contrato',
  'codigo_facitec_orientador', 'codigo_facitec_bolsista', 'status',
]
const DISPLAY_COLS = ['numero_contrato', 'codigo_facitec_orientador', 'data_contrato', 'status']

export function AbaBase44Contratos({ edicao }) {
  const { rows, parsing, parseError, parse, reset } = useXlsx()
  const [state, setState] = useState('idle')
  const [validated, setValidated] = useState([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [report, setReport] = useState(null)

  useEffect(() => {
    if (rows.length > 0) {
      setValidated(validateBase44Contratos(rows))
      setState('preview')
    }
  }, [rows])

  async function handleFile(file) {
    reset()
    setState('idle')
    await parse(file)
  }

  async function handleImport() {
    setState('importing')
    const valid = validated.filter(r => !r._skip)
    setProgress({ current: 0, total: valid.length })
    const result = await importarBase44Contratos(
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
    setState('idle')
  }

  if (!edicao) return (
    <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
      Selecione uma edição no topo para continuar.
    </div>
  )

  if (state === 'idle') return (
    <>
      <ErrorAlert message={parseError} />
      <FileUploadZone onFile={handleFile} parsing={parsing} expectedCols={EXPECTED_COLS} />
    </>
  )

  if (state === 'preview') return (
    <ImportPreview
      rows={validated}
      displayCols={DISPLAY_COLS}
      onImport={handleImport}
      onCancel={handleReset}
    />
  )

  if (state === 'importing') return (
    <ImportProgress current={progress.current} total={progress.total} label="Importando contratos e termos…" />
  )

  return <ImportReport report={report} onReset={handleReset} />
}

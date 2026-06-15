import { useState, useEffect } from 'react'
import { useXlsx } from '@/hooks/useXlsx'
import { importarBase44Bolsistas, validateBase44Bolsistas } from '@/lib/importacao'
import { FileUploadZone } from './FileUploadZone'
import { ImportPreview } from './ImportPreview'
import { ImportProgress } from './ImportProgress'
import { ImportReport } from './ImportReport'
import { ErrorAlert } from '@/components/common/FormField'

const EXPECTED_COLS = [
  '— Orientador —',
  'nome_completo', 'cpf', 'email', 'telefone', 'banco', 'agencia', 'conta', 'escola',
  '— Bolsista —',
  'bolsista_nome_completo', 'bolsista_cpf', 'data_nascimento', 'tipo',
  'ordem', 'escola_origem', 'ano_serie', 'nome_responsavel', 'cpf_responsavel',
]
const DISPLAY_COLS = ['bolsista_nome_completo', 'bolsista_cpf', 'cpf', 'tipo', 'ordem']

export function AbaBase44Bolsistas({ edicao }) {
  const { rows, parsing, parseError, parse, reset } = useXlsx()
  const [state, setState] = useState('idle')
  const [validated, setValidated] = useState([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [report, setReport] = useState(null)

  useEffect(() => {
    if (rows.length > 0) {
      setValidated(validateBase44Bolsistas(rows))
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
    const result = await importarBase44Bolsistas(
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
      <FileUploadZone
        onFile={handleFile}
        parsing={parsing}
        expectedCols={EXPECTED_COLS.filter(c => !c.startsWith('—'))}
        label="Orientadores e Bolsistas"
      />
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
    <ImportProgress current={progress.current} total={progress.total} label="Importando orientadores e bolsistas…" />
  )

  return <ImportReport report={report} onReset={handleReset} />
}

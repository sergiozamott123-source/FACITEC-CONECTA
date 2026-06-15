import { useState } from 'react'
import * as XLSX from 'xlsx'

function readXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const headers = rows.length > 0 ? Object.keys(rows[0]) : []
        resolve({ rows, headers })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'))
    reader.readAsArrayBuffer(file)
  })
}

export function useXlsx() {
  const [rows, setRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState(null)

  async function parse(file) {
    setParsing(true)
    setParseError(null)
    try {
      const result = await readXlsx(file)
      setFileName(file.name)
      setRows(result.rows)
      setHeaders(result.headers)
      return result
    } catch (e) {
      setParseError(e.message ?? 'Erro ao processar planilha')
      throw e
    } finally {
      setParsing(false)
    }
  }

  function reset() {
    setRows([])
    setHeaders([])
    setFileName('')
    setParseError(null)
  }

  return { rows, headers, fileName, parsing, parseError, parse, reset }
}

import { useRef } from 'react'
import { Upload, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function FileUploadZone({ onFile, parsing, accept = '.xlsx,.xls', label, expectedCols }) {
  const ref = useRef()

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleChange(e) {
    const file = e.target.files[0]
    if (file) { onFile(file); e.target.value = '' }
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'border-2 border-dashed border-border rounded-lg p-10 text-center',
          'hover:border-primary/50 hover:bg-primary/5 transition-colors',
          'cursor-pointer'
        )}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => ref.current?.click()}
      >
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleChange} />
        {parsing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Processando planilha…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <FileSpreadsheet className="w-10 h-10 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium text-foreground">Arraste o arquivo aqui</p>
              <p className="text-xs text-muted-foreground mt-0.5">ou clique para selecionar (.xlsx, .xls)</p>
            </div>
            <Button variant="outline" size="sm" type="button">
              <Upload className="w-4 h-4" /> Selecionar arquivo
            </Button>
          </div>
        )}
      </div>

      {expectedCols && (
        <div className="rounded-md bg-muted/50 border border-border px-4 py-3">
          <p className="text-xs font-medium text-foreground mb-2">Colunas esperadas na planilha:</p>
          <div className="flex flex-wrap gap-1.5">
            {expectedCols.map(col => (
              <code key={col} className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5 font-mono text-muted-foreground">
                {col}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

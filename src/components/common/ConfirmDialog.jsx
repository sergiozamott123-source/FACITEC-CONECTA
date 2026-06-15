import { Modal } from './Modal'
import { Button } from '@/components/ui/button'

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Confirmar exclusão', message, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-muted-foreground mb-6">
        {message ?? 'Esta ação não pode ser desfeita. Deseja continuar?'}
      </p>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="destructive" size="sm" onClick={onConfirm} disabled={loading}>
          {loading ? 'Excluindo…' : 'Excluir'}
        </Button>
      </div>
    </Modal>
  )
}

// Toast fixo no canto inferior direito — usado junto com useToast().
export function Toast({ toast }) {
  if (!toast) return null
  const cls = toast.type === 'ok'
    ? 'bg-green-50 text-green-800 border-green-200'
    : toast.type === 'err'
      ? 'bg-red-50 text-red-800 border-red-200'
      : 'bg-blue-50 text-blue-800 border-blue-200'

  return (
    <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-semibold shadow-lg border ${cls}`}>
      {toast.msg}
    </div>
  )
}

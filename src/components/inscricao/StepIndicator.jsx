import { Fragment } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { n: 1, label: 'Orientador' },
  { n: 2, label: 'Projeto' },
  { n: 3, label: 'Documentos' },
  { n: 4, label: 'Revisão' },
]

export function StepIndicator({ current }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((s, i) => {
        const done = s.n < current
        const active = s.n === current
        return (
          <Fragment key={s.n}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                done
                  ? 'bg-primary text-primary-foreground'
                  : active
                  ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                  : 'bg-muted text-muted-foreground'
              )}>
                {done ? <Check className="w-4 h-4" /> : s.n}
              </div>
              <span className={cn(
                'text-xs font-medium hidden sm:block whitespace-nowrap',
                active ? 'text-primary font-semibold' : done ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-2 mb-5 transition-colors',
                done ? 'bg-primary' : 'bg-muted'
              )} />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

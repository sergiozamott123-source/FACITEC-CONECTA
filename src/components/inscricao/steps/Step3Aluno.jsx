import { FormField, Input, Select } from '@/components/common/FormField'

const SERIES = [
  '6º ano (EF)', '7º ano (EF)', '8º ano (EF)', '9º ano (EF)',
  '1º ano (EM)', '2º ano (EM)', '3º ano (EM)',
]
const PERIODOS = ['Matutino', 'Vespertino', 'Noturno', 'Integral']

export function Step3Aluno({ data, onChange, errors = {} }) {
  const set = (field) => (e) => onChange({ [field]: e.target.value })

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Dados do Aluno Bolsista</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Informações do aluno participante do PibicJr.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nome Completo" required error={errors.nome_completo} className="sm:col-span-2">
          <Input
            value={data.nome_completo}
            onChange={set('nome_completo')}
            placeholder="Nome completo do aluno"
          />
        </FormField>

        <FormField label="E-mail" error={errors.email}>
          <Input
            type="email"
            value={data.email}
            onChange={set('email')}
            placeholder="email@exemplo.com"
          />
        </FormField>

        <FormField label="Telefone / WhatsApp" error={errors.telefone}>
          <Input
            value={data.telefone}
            onChange={set('telefone')}
            placeholder="(27) 00000-0000"
          />
        </FormField>

        <FormField label="CPF" required error={errors.cpf}>
          <Input
            value={data.cpf}
            onChange={set('cpf')}
            placeholder="000.000.000-00"
            maxLength={14}
          />
        </FormField>

        <FormField label="RG" error={errors.rg}>
          <Input
            value={data.rg}
            onChange={set('rg')}
            placeholder="Número do RG"
          />
        </FormField>

        <FormField label="Escola" required error={errors.escola} className="sm:col-span-2">
          <Input
            value={data.escola}
            onChange={set('escola')}
            placeholder="Nome da escola de ensino básico"
          />
        </FormField>

        <FormField label="Série/Ano" required error={errors.serie}>
          <Select value={data.serie} onChange={set('serie')}>
            <option value="">Selecione...</option>
            {SERIES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>

        <FormField label="Período" required error={errors.periodo_bolsa}>
          <Select value={data.periodo_bolsa} onChange={set('periodo_bolsa')}>
            <option value="">Selecione...</option>
            {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
        </FormField>
      </div>
    </div>
  )
}

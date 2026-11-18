-- Calendário anual de reuniões do CMCT (registro do que já foi aplicado no banco em 18/11/2026).
-- Não precisa ser executado de novo; serve de documentação e para recriar o banco, se um dia for preciso.

alter table public.reuniao_cmct
  add column if not exists data_prevista_original date,
  add column if not exists situacao_reuniao text not null default 'realizada'
    check (situacao_reuniao in ('prevista','realizada','cancelada')),
  add column if not exists horario time,
  add column if not exists modalidade text check (modalidade in ('presencial','online','hibrida')),
  add column if not exists local_ou_link text;

create table if not exists public.reuniao_cmct_historico (
  id uuid primary key default gen_random_uuid(),
  reuniao_id uuid not null references public.reuniao_cmct(id) on delete cascade,
  data_anterior date,
  data_nova date,
  motivo text,
  criado_por uuid,
  criado_em timestamptz default now()
);
alter table public.reuniao_cmct_historico enable row level security;
create policy "historico_select" on public.reuniao_cmct_historico for select to authenticated using (true);
create policy "historico_insert" on public.reuniao_cmct_historico for insert to authenticated with check (get_my_role() = 'secretaria');
create policy "historico_update" on public.reuniao_cmct_historico for update to authenticated using (get_my_role() = 'secretaria');
create policy "historico_delete" on public.reuniao_cmct_historico for delete to authenticated using (get_my_role() = 'secretaria');

-- Preenchimento de 2026 (datas previstas na ata da 1ª Ordinária e remarcações):
--   1ª Ord: prevista 24/03, 16:00, presencial | 2ª Ord: prevista 17/06 (realizada 12/08) | 3ª Ord: prevista 16/09 (realizada 11/11)

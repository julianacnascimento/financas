-- =============================================================
--  Finanças — Migração: faturas de cartão (marcar como paga)
--
--  Use este script se você já rodou supabase_setup.sql (ou
--  migration_credit_cards.sql) e só quer adicionar o controle de
--  "fatura paga", SEM apagar os dados existentes.
--  Rode no SQL Editor do Supabase.
-- =============================================================

create table if not exists card_statements (
  id             bigint generated always as identity primary key,
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  credit_card_id bigint not null references credit_cards(id) on delete cascade,
  cycle_year     int not null,
  cycle_month    int not null check (cycle_month between 1 and 12),
  paid           boolean not null default false,
  paid_at        timestamptz,
  created_at     timestamptz default now(),
  unique (credit_card_id, cycle_year, cycle_month)
);

alter table card_statements enable row level security;

drop policy if exists "own card_statements" on card_statements;
create policy "own card_statements" on card_statements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

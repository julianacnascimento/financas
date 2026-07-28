-- =============================================================
--  Finanças — Migração: cartões de crédito
--
--  Use este script se você já tem o banco criado (via
--  supabase_setup.sql) e só quer adicionar a funcionalidade de
--  cartões de crédito, SEM apagar os dados existentes.
--  Rode no SQL Editor do Supabase.
-- =============================================================

create table if not exists credit_cards (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null,
  color        text not null,
  limit_amount numeric,
  closing_day  int check (closing_day between 1 and 31),
  due_day      int check (due_day between 1 and 31),
  created_at   timestamptz default now()
);

alter table transactions
  add column if not exists credit_card_id bigint references credit_cards(id) on delete set null;

alter table credit_cards enable row level security;

drop policy if exists "own credit_cards" on credit_cards;
create policy "own credit_cards" on credit_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

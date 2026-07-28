-- =============================================================
--  Finanças — Setup com autenticação e RLS
--  Rode isto no SQL Editor do Supabase.
--
--  ⚠️ ATENÇÃO: este script APAGA as tabelas atuais e recria com
--  a coluna user_id. Use enquanto os dados ainda são só de teste.
--  Depois de logar no app, as categorias padrão são recriadas
--  automaticamente (por usuário).
-- =============================================================

drop table if exists transactions cascade;
drop table if exists goals cascade;
drop table if exists categories cascade;
drop table if exists card_statements cascade;
drop table if exists credit_cards cascade;

-- ── Categorias ───────────────────────────────────────────────
create table categories (
  id      bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name    text not null,
  color   text not null,
  icon    text not null,
  type    text not null check (type in ('receita', 'despesa'))
);

-- ── Cartões de crédito ───────────────────────────────────────
create table credit_cards (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null,
  color        text not null,
  limit_amount numeric,
  closing_day  int check (closing_day between 1 and 31),
  due_day      int check (due_day between 1 and 31),
  created_at   timestamptz default now()
);

-- ── Faturas de cartão ──────────────────────────────────────────
-- Um ciclo de fatura (cartão + mês/ano de fechamento). Marcar como paga
-- libera o valor das despesas daquele ciclo do cálculo de limite ocupado.
create table card_statements (
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

-- ── Transações ───────────────────────────────────────────────
create table transactions (
  id                  bigint generated always as identity primary key,
  user_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  description         text not null,
  amount              numeric not null,
  type                text not null check (type in ('receita', 'despesa')),
  category_id         bigint references categories(id) on delete set null,
  credit_card_id      bigint references credit_cards(id) on delete set null,
  date                date not null,
  installments        int not null default 1,
  current_installment int not null default 1,
  group_id            text,
  notes               text,
  created_at          timestamptz default now()
);

-- ── Metas ────────────────────────────────────────────────────
create table goals (
  id             bigint generated always as identity primary key,
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name           text not null,
  target_amount  numeric not null,
  current_amount numeric not null default 0,
  deadline       date not null,
  color          text not null,
  created_at     timestamptz default now()
);

-- ── Ativa Row Level Security ─────────────────────────────────
alter table categories      enable row level security;
alter table transactions    enable row level security;
alter table goals           enable row level security;
alter table credit_cards    enable row level security;
alter table card_statements enable row level security;

-- ── Policies: cada usuário só acessa as próprias linhas ──────
-- "for all" cobre select, insert, update e delete.
create policy "own categories" on categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own transactions" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own goals" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own credit_cards" on credit_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own card_statements" on card_statements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

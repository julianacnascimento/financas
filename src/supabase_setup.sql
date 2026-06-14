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

-- ── Categorias ───────────────────────────────────────────────
create table categories (
  id      bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name    text not null,
  color   text not null,
  icon    text not null,
  type    text not null check (type in ('receita', 'despesa'))
);

-- ── Transações ───────────────────────────────────────────────
create table transactions (
  id                  bigint generated always as identity primary key,
  user_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  description         text not null,
  amount              numeric not null,
  type                text not null check (type in ('receita', 'despesa')),
  category_id         bigint references categories(id) on delete set null,
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
alter table categories   enable row level security;
alter table transactions enable row level security;
alter table goals        enable row level security;

-- ── Policies: cada usuário só acessa as próprias linhas ──────
-- "for all" cobre select, insert, update e delete.
create policy "own categories" on categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own transactions" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own goals" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

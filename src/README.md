# Finanças — Migração Dexie → Supabase

## Arquivos alterados
Substitua apenas estes arquivos no seu projeto:

- `App.tsx`
- `db.ts` ← reescrito completamente (Supabase no lugar do Dexie)
- `Dashboard.tsx`
- `TransactionList.tsx`
- `TransactionModal.tsx`
- `GoalsPage.tsx`
- `GoalModal.tsx`

Os arquivos `hooks.ts`, `uuid.ts` e `index.css` **não mudam**.

## Remover dependências do Dexie
```bash
npm uninstall dexie dexie-react-hooks
```

## SQL — criar tabelas no Supabase
Rode no SQL Editor do Supabase:

```sql
create table categories (
  id bigint generated always as identity primary key,
  name text not null,
  color text not null,
  icon text not null,
  type text not null check (type in ('receita', 'despesa'))
);

create table transactions (
  id bigint generated always as identity primary key,
  description text not null,
  amount numeric not null,
  type text not null check (type in ('receita', 'despesa')),
  category_id bigint references categories(id),
  date date not null,
  installments int not null default 1,
  current_installment int not null default 1,
  group_id text,
  notes text,
  created_at timestamptz default now()
);

create table goals (
  id bigint generated always as identity primary key,
  name text not null,
  target_amount numeric not null,
  current_amount numeric not null default 0,
  deadline date not null,
  color text not null,
  created_at timestamptz default now()
);
```

## Deploy no Vercel
1. Suba o projeto no GitHub
2. Acesse vercel.com → "Add New Project" → importe o repositório
3. Clique em Deploy

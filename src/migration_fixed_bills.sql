-- =============================================================
--  Finanças — Migração: contas fixas (fixar no topo + marcar como paga)
--
--  Use este script se você já rodou supabase_setup.sql e só quer
--  adicionar o controle de "conta fixa" e "paga" às transações,
--  SEM apagar os dados existentes.
--  Rode no SQL Editor do Supabase.
-- =============================================================

alter table transactions add column if not exists is_fixed boolean not null default false;
alter table transactions add column if not exists paid boolean not null default false;

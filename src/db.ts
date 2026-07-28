import { supabase } from './supabaseClient';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

// ── Tipos ──────────────────────────────────────────────────────────────────
export type TransactionType = 'receita' | 'despesa';

export interface Category {
  id?: number;
  name: string;
  color: string;
  icon: string;
  type: TransactionType;
}

export interface Transaction {
  id?: number;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: number;
  creditCardId?: number;
  date: string;
  installments: number;
  currentInstallment: number;
  groupId?: string;
  notes?: string;
}

export interface CreditCard {
  id?: number;
  name: string;
  color: string;
  limitAmount?: number;
  closingDay?: number;
  dueDay?: number;
}

export interface Goal {
  id?: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string;
}

export interface CardStatement {
  id?: number;
  creditCardId: number;
  cycleYear: number;
  cycleMonth: number;
  paid: boolean;
  paidAt?: string;
}

// ── Mapeamento snake_case ↔ camelCase ──────────────────────────────────────
// O user_id é preenchido automaticamente pelo banco (default auth.uid()),
// então não precisa ir nos payloads.
function txFromDB(r: any): Transaction {
  return {
    id: r.id,
    description: r.description,
    amount: Number(r.amount),
    type: r.type,
    categoryId: r.category_id,
    creditCardId: r.credit_card_id ?? undefined,
    date: r.date,
    installments: r.installments,
    currentInstallment: r.current_installment,
    groupId: r.group_id ?? undefined,
    notes: r.notes ?? undefined,
  };
}

function txToDB(t: Omit<Transaction, 'id'>) {
  return {
    description: t.description,
    amount: t.amount,
    type: t.type,
    category_id: t.categoryId,
    credit_card_id: t.creditCardId ?? null,
    date: t.date,
    installments: t.installments,
    current_installment: t.currentInstallment,
    group_id: t.groupId ?? null,
    notes: t.notes ?? null,
  };
}

function catFromDB(r: any): Category {
  return { id: r.id, name: r.name, color: r.color, icon: r.icon, type: r.type };
}

function cardFromDB(r: any): CreditCard {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    limitAmount: r.limit_amount != null ? Number(r.limit_amount) : undefined,
    closingDay: r.closing_day ?? undefined,
    dueDay: r.due_day ?? undefined,
  };
}

function statementFromDB(r: any): CardStatement {
  return {
    id: r.id,
    creditCardId: r.credit_card_id,
    cycleYear: r.cycle_year,
    cycleMonth: r.cycle_month,
    paid: r.paid,
    paidAt: r.paid_at ?? undefined,
  };
}

function goalFromDB(r: any): Goal {
  return {
    id: r.id,
    name: r.name,
    targetAmount: Number(r.target_amount),
    currentAmount: Number(r.current_amount),
    deadline: r.deadline,
    color: r.color,
  };
}

// ── API de transações ──────────────────────────────────────────────────────
export const transactions = {
  async between(startDate: string, endDate: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(txFromDB);
  },

  // Todas as despesas e receitas vinculadas a algum cartão (sem filtro de
  // data). Usado para calcular o limite comprometido considerando a compra
  // parcelada inteira, as faturas fechadas ainda não pagas e o que já foi
  // recebido/pago no cartão (ver creditCardStats.ts).
  async allCardTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .not('credit_card_id', 'is', null);
    if (error) throw error;
    return (data ?? []).map(txFromDB);
  },

  // Saldo acumulado: soma de tudo (receitas − despesas) até a data informada.
  async balanceUntil(endDate: string): Promise<number> {
    const { data, error } = await supabase
      .from('transactions')
      .select('amount, type')
      .lte('date', endDate);
    if (error) throw error;
    return (data ?? []).reduce(
      (sum, r: any) =>
        sum + (r.type === 'receita' ? Number(r.amount) : -Number(r.amount)),
      0,
    );
  },

  async add(t: Omit<Transaction, 'id'>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert(txToDB(t))
      .select()
      .single();
    if (error) throw error;
    return txFromDB(data);
  },

  async update(id: number, t: Partial<Transaction>): Promise<void> {
    const body: Record<string, any> = {};
    if (t.description !== undefined) body.description = t.description;
    if (t.amount !== undefined) body.amount = t.amount;
    if (t.type !== undefined) body.type = t.type;
    if (t.categoryId !== undefined) body.category_id = t.categoryId;
    if (t.creditCardId !== undefined)
      body.credit_card_id = t.creditCardId ?? null;
    if (t.date !== undefined) body.date = t.date;
    if (t.installments !== undefined) body.installments = t.installments;
    if (t.currentInstallment !== undefined)
      body.current_installment = t.currentInstallment;
    if (t.notes !== undefined) body.notes = t.notes;

    const { error } = await supabase.from('transactions').update(body).eq('id', id);
    if (error) throw error;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  },

  // Aplica categoria/cartão/observação a todas as parcelas do grupo de uma vez
  // (não mexe em valor, data ou número da parcela, que são específicos de cada uma).
  async updateByGroupId(
    groupId: string,
    t: Pick<Partial<Transaction>, 'categoryId' | 'creditCardId' | 'notes'>,
  ): Promise<void> {
    const body: Record<string, any> = {};
    if (t.categoryId !== undefined) body.category_id = t.categoryId;
    if (t.creditCardId !== undefined) body.credit_card_id = t.creditCardId ?? null;
    if (t.notes !== undefined) body.notes = t.notes;

    const { error } = await supabase
      .from('transactions')
      .update(body)
      .eq('group_id', groupId);
    if (error) throw error;
  },

  async deleteByGroupId(groupId: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('group_id', groupId);
    if (error) throw error;
  },

  async findByGroupId(groupId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('group_id', groupId);
    if (error) throw error;
    return (data ?? []).map(txFromDB);
  },
};

// ── API de categorias ──────────────────────────────────────────────────────
export const categories = {
  async all(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(catFromDB);
  },

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  },

  async bulkAdd(cats: Omit<Category, 'id'>[]): Promise<void> {
    const { error } = await supabase.from('categories').insert(cats);
    if (error) throw error;
  },
};

// ── API de metas ───────────────────────────────────────────────────────────
export const goals = {
  async all(): Promise<Goal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(goalFromDB);
  },

  async add(g: Omit<Goal, 'id'>): Promise<Goal> {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        name: g.name,
        target_amount: g.targetAmount,
        current_amount: g.currentAmount,
        deadline: g.deadline,
        color: g.color,
      })
      .select()
      .single();
    if (error) throw error;
    return goalFromDB(data);
  },

  async update(id: number, g: Partial<Goal>): Promise<void> {
    const body: Record<string, any> = {};
    if (g.name !== undefined) body.name = g.name;
    if (g.targetAmount !== undefined) body.target_amount = g.targetAmount;
    if (g.currentAmount !== undefined) body.current_amount = g.currentAmount;
    if (g.deadline !== undefined) body.deadline = g.deadline;
    if (g.color !== undefined) body.color = g.color;

    const { error } = await supabase.from('goals').update(body).eq('id', id);
    if (error) throw error;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── API de cartões de crédito ────────────────────────────────────────────
export const creditCards = {
  async all(): Promise<CreditCard[]> {
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(cardFromDB);
  },

  async add(c: Omit<CreditCard, 'id'>): Promise<CreditCard> {
    const { data, error } = await supabase
      .from('credit_cards')
      .insert({
        name: c.name,
        color: c.color,
        limit_amount: c.limitAmount ?? null,
        closing_day: c.closingDay ?? null,
        due_day: c.dueDay ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return cardFromDB(data);
  },

  async update(id: number, c: Partial<CreditCard>): Promise<void> {
    const body: Record<string, any> = {};
    if (c.name !== undefined) body.name = c.name;
    if (c.color !== undefined) body.color = c.color;
    if (c.limitAmount !== undefined) body.limit_amount = c.limitAmount ?? null;
    if (c.closingDay !== undefined) body.closing_day = c.closingDay ?? null;
    if (c.dueDay !== undefined) body.due_day = c.dueDay ?? null;

    const { error } = await supabase.from('credit_cards').update(body).eq('id', id);
    if (error) throw error;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from('credit_cards').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── API de faturas de cartão ─────────────────────────────────────────────
export const cardStatements = {
  async all(): Promise<CardStatement[]> {
    const { data, error } = await supabase.from('card_statements').select('*');
    if (error) throw error;
    return (data ?? []).map(statementFromDB);
  },

  async setPaid(
    creditCardId: number,
    cycleYear: number,
    cycleMonth: number,
    paid: boolean,
  ): Promise<void> {
    const { error } = await supabase.from('card_statements').upsert(
      {
        credit_card_id: creditCardId,
        cycle_year: cycleYear,
        cycle_month: cycleMonth,
        paid,
        paid_at: paid ? new Date().toISOString() : null,
      },
      { onConflict: 'credit_card_id,cycle_year,cycle_month' },
    );
    if (error) throw error;
  },
};

// ── Autenticação ───────────────────────────────────────────────────────────
export const auth = {
  signUp: (email: string, password: string) =>
    supabase.auth.signUp({ email, password }),
  signIn: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),
  onChange: (cb: (event: AuthChangeEvent, session: Session | null) => void) =>
    supabase.auth.onAuthStateChange(cb),
};

// ── Seed de categorias padrão (roda 1x por usuário, após o login) ──────────
export async function seedCategories() {
  const count = await categories.count();
  if (count > 0) return;
  await categories.bulkAdd([
    { name: 'Alimentação', color: '#f97316', icon: '🍽️', type: 'despesa' },
    { name: 'Transporte', color: '#3b82f6', icon: '🚗', type: 'despesa' },
    { name: 'Moradia', color: '#8b5cf6', icon: '🏠', type: 'despesa' },
    { name: 'Saúde', color: '#ec4899', icon: '💊', type: 'despesa' },
    { name: 'Lazer', color: '#14b8a6', icon: '🎬', type: 'despesa' },
    { name: 'Educação', color: '#f59e0b', icon: '📚', type: 'despesa' },
    { name: 'Vestuário', color: '#a855f7', icon: '👗', type: 'despesa' },
    { name: 'Outros (despesa)', color: '#6b7280', icon: '📦', type: 'despesa' },
    { name: 'Salário', color: '#22c55e', icon: '💼', type: 'receita' },
    { name: 'Freelance', color: '#10b981', icon: '💻', type: 'receita' },
    { name: 'Investimentos', color: '#06b6d4', icon: '📈', type: 'receita' },
    { name: 'Outros (receita)', color: '#84cc16', icon: '💰', type: 'receita' },
  ]);
}

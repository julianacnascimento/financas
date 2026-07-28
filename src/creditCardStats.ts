import type { CardStatement, CreditCard, Transaction } from "./db";

export interface Cycle {
  year: number;
  month: number;
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Parcelas após o dia de fechamento entram no ciclo que fecha no mês seguinte.
export function billingCycleFor(dateStr: string, closingDay: number): Cycle {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (d > closingDay) {
    return m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 };
  }
  return { year: y, month: m };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Trava no último dia real do mês (ex.: "fecha dia 31" em junho vira dia 30,
// em vez de estourar pro dia 1 de julho por causa do overflow do Date nativo).
function cycleClosingDate(cycle: Cycle, closingDay: number): Date {
  const day = Math.min(closingDay, daysInMonth(cycle.year, cycle.month));
  return new Date(cycle.year, cycle.month - 1, day);
}

export function cycleKey(cycle: Cycle): string {
  return `${cycle.year}-${cycle.month}`;
}

export function cycleLabel(cycle: Cycle): string {
  return `${String(cycle.month).padStart(2, "0")}/${cycle.year}`;
}

export interface PendingStatement {
  cycle: Cycle;
  total: number;
}

export interface CardStats {
  // Valor ainda ocupado no limite do cartão.
  committed: number;
  // Faturas já fechadas (dia de fechamento já passou) e ainda não marcadas como pagas.
  pendingStatements: PendingStatement[];
}

export function computeCardStats(
  card: CreditCard,
  allCardTxs: Transaction[],
  statements: CardStatement[],
  today: string,
): CardStats {
  const despesas = allCardTxs.filter(
    (t) => t.creditCardId === card.id && t.type === "despesa",
  );
  // Pagamento de fatura lançado como receita em um cartão com fatura (dia de
  // fechamento definido) abate do valor comprometido no limite.
  const totalReceived = allCardTxs
    .filter((t) => t.creditCardId === card.id && t.type === "receita")
    .reduce((s, t) => s + t.amount, 0);
  const isRecarga = !card.closingDay && totalReceived > 0;

  let grossCommitted: number;
  let pendingStatements: PendingStatement[] = [];

  if (!card.closingDay) {
    if (isRecarga) {
      // Cartão com recarga (tem receita vinculada): a porcentagem representa
      // quanto do limite já foi gasto, sem descontar o recebido — o recebido
      // aqui é o orçamento disponível, não um pagamento de dívida.
      grossCommitted = despesas.reduce((s, t) => s + t.amount, 0);
    } else {
      // Sem recarga e sem dia de fechamento: considera parcela atual + futuras.
      grossCommitted = despesas
        .filter((t) => t.date >= today)
        .reduce((s, t) => s + t.amount, 0);
    }
  } else {
    const paidCycles = new Set(
      statements
        .filter((s) => s.creditCardId === card.id && s.paid)
        .map((s) => cycleKey({ year: s.cycleYear, month: s.cycleMonth })),
    );

    const byCycle: Record<string, PendingStatement> = {};
    despesas.forEach((t) => {
      const cycle = billingCycleFor(t.date, card.closingDay!);
      const key = cycleKey(cycle);
      if (!byCycle[key]) byCycle[key] = { cycle, total: 0 };
      byCycle[key].total += t.amount;
    });

    const todayDate = parseDate(today);
    grossCommitted = 0;

    Object.entries(byCycle).forEach(([key, entry]) => {
      if (paidCycles.has(key)) return; // fatura já paga: não ocupa mais o limite
      grossCommitted += entry.total;
      if (cycleClosingDate(entry.cycle, card.closingDay!) <= todayDate) {
        pendingStatements.push(entry);
      }
    });

    pendingStatements.sort(
      (a, b) => a.cycle.year - b.cycle.year || a.cycle.month - b.cycle.month,
    );
  }

  const committed = isRecarga
    ? grossCommitted
    : Math.max(0, grossCommitted - totalReceived);
  return { committed, pendingStatements };
}

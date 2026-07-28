import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CreditCardModal } from "./CreditCardModal";
import { cycleLabel, computeCardStats } from "./creditCardStats";
import {
  cardStatements as statementsApi,
  creditCards as cardsApi,
  transactions as txApi,
  type CardStatement,
  type CreditCard,
  type Transaction,
} from "./db";
import { formatCurrency } from "./hooks";

interface Props {
  startDate: string;
  endDate: string;
  refreshKey?: number;
}

export function CreditCardsPage({ startDate, endDate, refreshKey }: Props) {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [allCardTxs, setAllCardTxs] = useState<Transaction[]>([]);
  const [statements, setStatements] = useState<CardStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCard, setEditCard] = useState<CreditCard | undefined>();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    load();
  }, [startDate, endDate, refreshKey]);

  async function load() {
    setLoading(true);
    const [c, t, allExp, st] = await Promise.all([
      cardsApi.all(),
      txApi.between(startDate, endDate),
      txApi.allCardTransactions(),
      statementsApi.all(),
    ]);
    setCards(c);
    setTxs(t);
    setAllCardTxs(allExp);
    setStatements(st);
    setLoading(false);
  }

  async function markPaid(cardId: number, cycleYear: number, cycleMonth: number) {
    await statementsApi.setPaid(cardId, cycleYear, cycleMonth, true);
    await load();
  }

  async function deleteCard(id: number) {
    if (
      !confirm(
        "Excluir este cartão? As transações vinculadas a ele ficarão sem cartão.",
      )
    )
      return;
    await cardsApi.delete(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return <div className="loading">Carregando…</div>;

  const today = new Date().toISOString().slice(0, 10);
  const despesas = txs.filter((t) => t.type === "despesa");
  const receitas = txs.filter((t) => t.type === "receita");
  const spentByCard: Record<number, number> = {};
  const receivedByCard: Record<number, number> = {};
  let semCartao = 0;
  despesas.forEach((t) => {
    if (t.creditCardId) {
      spentByCard[t.creditCardId] =
        (spentByCard[t.creditCardId] ?? 0) + t.amount;
    } else {
      semCartao += t.amount;
    }
  });
  receitas.forEach((t) => {
    if (t.creditCardId) {
      receivedByCard[t.creditCardId] =
        (receivedByCard[t.creditCardId] ?? 0) + t.amount;
    }
  });

  const totalCartoes = Object.values(spentByCard).reduce((s, v) => s + v, 0);
  const totalRecebidoCartoes = Object.values(receivedByCard).reduce(
    (s, v) => s + v,
    0,
  );
  const totalGeral = despesas.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="cards-page">
      <div className="page-header">
        <h2>Cartões</h2>
        <button
          className="btn-primary"
          onClick={() => {
            setEditCard(undefined);
            setShowModal(true);
          }}
        >
          <Plus size={16} /> Novo cartão
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="empty-state">
          <p>Você ainda não tem cartões cadastrados.</p>
          <p>
            Cadastre um cartão de crédito ou outro tipo de cartão (ex: recarga
            mensal) para acompanhar entradas e gastos separadamente.
          </p>
        </div>
      ) : (
        <>
          <div className="cards-row">
            <div className="card receita-card">
              <div>
                <span className="card-label">Total recebido nos cartões</span>
                <span className="card-value">
                  {formatCurrency(totalRecebidoCartoes)}
                </span>
              </div>
            </div>
            <div className="card despesa-card">
              <div>
                <span className="card-label">Total gasto nos cartões</span>
                <span className="card-value">
                  {formatCurrency(totalCartoes)}
                </span>
              </div>
            </div>
            <div className="card">
              <div>
                <span className="card-label">Total geral de despesas</span>
                <span className="card-value">{formatCurrency(totalGeral)}</span>
              </div>
            </div>
          </div>

          <div className="cc-full-grid">
            {cards.map((c) => {
              const spent = spentByCard[c.id!] ?? 0;
              const received = receivedByCard[c.id!] ?? 0;
              const saldo = received - spent;
              const { committed, pendingStatements } = computeCardStats(
                c,
                allCardTxs,
                statements,
                today,
              );
              const pct = c.limitAmount
                ? Math.min((committed / c.limitAmount) * 100, 100)
                : undefined;
              const isExpanded = c.id != null && expandedIds.has(c.id);
              return (
                <div
                  key={c.id}
                  className="cc-full-card"
                  style={{ borderTopColor: c.color }}
                >
                  <div className="cc-full-header">
                    <h3>{c.name}</h3>
                    <div className="goal-full-actions">
                      <button
                        className="icon-btn small"
                        title={isExpanded ? "Recolher" : "Ver detalhes"}
                        onClick={() => c.id && toggleExpand(c.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>
                      <button
                        className="icon-btn small"
                        onClick={() => {
                          setEditCard(c);
                          setShowModal(true);
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="icon-btn small danger"
                        onClick={() => c.id && deleteCard(c.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="cc-saldo-row">
                    <span className="stat-label">Saldo do período</span>
                    <span
                      className="cc-saldo-value"
                      style={{ color: saldo < 0 ? "var(--danger)" : "var(--receita)" }}
                    >
                      {formatCurrency(saldo)}
                    </span>
                  </div>

                  {c.limitAmount != null && (
                    <>
                      <div className="goal-bar-bg">
                        <div
                          className="goal-bar-fill"
                          style={{ width: `${pct}%`, background: c.color }}
                        />
                      </div>
                      <div className="goal-footer">
                        <span>
                          {formatCurrency(committed)} de{" "}
                          {formatCurrency(c.limitAmount)}
                        </span>
                        <span>{pct?.toFixed(0)}%</span>
                      </div>
                    </>
                  )}

                  {isExpanded && (
                    <>
                      <div className="cc-stats">
                        <div>
                          <span className="stat-label">Recebido</span>
                          <span className="stat-val receita">
                            {formatCurrency(received)}
                          </span>
                        </div>
                        <div>
                          <span className="stat-label">Gasto</span>
                          <span className="stat-val despesa">
                            {formatCurrency(spent)}
                          </span>
                        </div>
                      </div>
                      {(c.closingDay || c.dueDay) && (
                        <div className="cc-days">
                          {c.closingDay && <span>Fecha dia {c.closingDay}</span>}
                          {c.dueDay && <span>Vence dia {c.dueDay}</span>}
                        </div>
                      )}
                      {pendingStatements.length > 0 && (
                        <div className="cc-statements">
                          <span className="stat-label">Faturas fechadas em aberto</span>
                          {pendingStatements.map(({ cycle, total }) => (
                            <div key={cycleLabel(cycle)} className="cc-statement-row">
                              <span>
                                {cycleLabel(cycle)} — {formatCurrency(total)}
                              </span>
                              <button
                                className="btn-ghost"
                                onClick={() =>
                                  c.id && markPaid(c.id, cycle.year, cycle.month)
                                }
                              >
                                Marcar como paga
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {semCartao > 0 && (
            <p className="cc-note">
              {formatCurrency(semCartao)} em despesas sem cartão vinculado neste
              período.
            </p>
          )}
        </>
      )}

      {showModal && (
        <CreditCardModal
          onClose={() => setShowModal(false)}
          editCard={editCard}
          onSaved={load}
        />
      )}
    </div>
  );
}

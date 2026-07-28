import { CreditCard as CreditCardIcon, Pencil, Search, Trash2 } from "lucide-react";
import { Pencil, Search, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
  categories as catApi,
  creditCards as cardsApi,
  transactions as txApi,
  type Category,
  type CreditCard,
  type Transaction,
  type TransactionType,
} from "./db";
import { formatCurrency, formatDate } from "./hooks";

interface Props {
  startDate: string;
  endDate: string;
  onEdit: (tx: Transaction) => void;
  refreshKey?: number;
}

type TypeFilter = "all" | TransactionType;

// Normaliza texto: minúsculas e sem acentos (ex.: "Água" → "agua").
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function TransactionList({
  startDate,
  endDate,
  onEdit,
  refreshKey,
}: Props) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      txApi.between(startDate, endDate),
      catApi.all(),
      cardsApi.all(),
    ]).then(([t, c, cc]) => {
      setTxs(t);
      setCats(c);
      setCards(cc);
      setLoading(false);
    });
  }, [startDate, endDate, refreshKey]);

  if (loading) return <div className="loading">Carregando…</div>;

  const catMap = Object.fromEntries(cats.map((c) => [c.id!, c]));
  const cardMap = Object.fromEntries(cards.map((c) => [c.id!, c]));

  async function deleteTx(tx: Transaction) {
    if (!tx.id) return;
    if (tx.groupId && tx.installments > 1) {
      const all = await txApi.findByGroupId(tx.groupId);
      if (
        all.length > 1 &&
        confirm(`Excluir todas as ${tx.installments} parcelas?`)
      ) {
        await txApi.deleteByGroupId(tx.groupId);
        setTxs((prev) => prev.filter((t) => t.groupId !== tx.groupId));
        return;
      }
    }
    await txApi.delete(tx.id);
    setTxs((prev) => prev.filter((t) => t.id !== tx.id));
  }

  if (txs.length === 0) {
    return (
      <div className="empty-state">
        <p>Nenhuma transação neste período.</p>
      </div>
    );
  }

  // Filtra por tipo (receita/despesa) e pela busca (descrição, categoria ou observação).
  const q = normalize(search.trim());
  const filtered = q
    ? txs.filter((tx) => {
        const catName = catMap[tx.categoryId]?.name ?? "";
        const cardName = tx.creditCardId ? cardMap[tx.creditCardId]?.name ?? "" : "";
        return (
          normalize(tx.description).includes(q) ||
          normalize(catName).includes(q) ||
          normalize(cardName).includes(q) ||
          normalize(tx.notes ?? "").includes(q)
        );
      })
    : txs;

  const grouped: Record<string, Transaction[]> = {};
  filtered.forEach((tx) => {
    if (!grouped[tx.date]) grouped[tx.date] = [];
    grouped[tx.date].push(tx);
  });

  return (
    <div className="tx-list">
      <div className="tx-toolbar">
        <div className="tx-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descrição ou categoria…"
          />
        </div>
        <div className="tx-type-filter">
          <button
            className={typeFilter === "all" ? "active" : ""}
            onClick={() => setTypeFilter("all")}
          >
            Todas
          </button>
          <button
            className={typeFilter === "receita" ? "active" : ""}
            onClick={() => setTypeFilter("receita")}
          >
            <TrendingUp size={14} />
            Receitas
          </button>
          <button
            className={typeFilter === "despesa" ? "active" : ""}
            onClick={() => setTypeFilter("despesa")}
          >
            <TrendingDown size={14} />
            Despesas
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>
            {search
              ? `Nenhuma transação encontrada para “${search}”.`
              : "Nenhuma transação encontrada para este filtro."}
          </p>
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, items]) => (
            <div key={date} className="tx-group">
              <div className="tx-date-header">{formatDate(date)}</div>
              {items.map((tx) => {
                const cat = catMap[tx.categoryId];
                const card = tx.creditCardId ? cardMap[tx.creditCardId] : undefined;
                return (
                  <div key={tx.id} className={`tx-item ${tx.type}`}>
                    <span className="tx-icon">{cat?.icon ?? "📦"}</span>
                    <div className="tx-info">
                      <span className="tx-desc">{tx.description}</span>
                      <span className="tx-cat">{cat?.name ?? "—"}</span>
                    </div>
                    {card && (
                      <span className="card-tag" style={{ borderColor: card.color, color: card.color }}>
                        <CreditCardIcon size={11} /> {card.name}
                      </span>
                    )}
                    {tx.installments > 1 && (
                      <span className="installment-tag">
                        {tx.currentInstallment}/{tx.installments}x
                      </span>
                    )}
                    <span className={`tx-amount ${tx.type}`}>
                      {tx.type === "despesa" ? "−" : "+"}
                      {formatCurrency(tx.amount)}
                    </span>
                    <div className="tx-actions">
                      <button
                        className="icon-btn small"
                        onClick={() => onEdit(tx)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="icon-btn small danger"
                        onClick={() => deleteTx(tx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
      )}
    </div>
  );
}

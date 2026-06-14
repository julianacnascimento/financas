import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  categories as catApi,
  transactions as txApi,
  type Category,
  type Transaction,
} from "./db";
import { formatCurrency, formatDate } from "./hooks";

interface Props {
  startDate: string;
  endDate: string;
  onEdit: (tx: Transaction) => void;
  refreshKey?: number;
}

export function TransactionList({
  startDate,
  endDate,
  onEdit,
  refreshKey,
}: Props) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([txApi.between(startDate, endDate), catApi.all()]).then(
      ([t, c]) => {
        setTxs(t);
        setCats(c);
        setLoading(false);
      },
    );
  }, [startDate, endDate, refreshKey]);

  if (loading) return <div className="loading">Carregando…</div>;

  const catMap = Object.fromEntries(cats.map((c) => [c.id!, c]));

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

  const grouped: Record<string, Transaction[]> = {};
  txs.forEach((tx) => {
    if (!grouped[tx.date]) grouped[tx.date] = [];
    grouped[tx.date].push(tx);
  });

  return (
    <div className="tx-list">
      {Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, items]) => (
          <div key={date} className="tx-group">
            <div className="tx-date-header">{formatDate(date)}</div>
            {items.map((tx) => {
              const cat = catMap[tx.categoryId];
              return (
                <div key={tx.id} className={`tx-item ${tx.type}`}>
                  <span className="tx-icon">{cat?.icon ?? "📦"}</span>
                  <div className="tx-info">
                    <span className="tx-desc">{tx.description}</span>
                    <span className="tx-cat">{cat?.name ?? "—"}</span>
                  </div>
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
        ))}
    </div>
  );
}

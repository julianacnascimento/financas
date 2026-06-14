import { X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  categories as catApi,
  transactions as txApi,
  type Category,
  type Transaction,
  type TransactionType,
} from "./db";
import { v4 as uuid } from "./uuid";

interface Props {
  onClose: () => void;
  editTx?: Transaction;
  onSaved?: () => void;
}

export function TransactionModal({ onClose, editTx, onSaved }: Props) {
  const [cats, setCats] = useState<Category[]>([]);
  const [type, setType] = useState<TransactionType>(editTx?.type ?? "despesa");
  const [description, setDescription] = useState(editTx?.description ?? "");
  const [amount, setAmount] = useState(editTx ? String(editTx.amount) : "");
  const [categoryId, setCategoryId] = useState<number>(editTx?.categoryId ?? 0);
  const [date, setDate] = useState(
    editTx?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [installments, setInstallments] = useState(editTx?.installments ?? 1);
  const [notes, setNotes] = useState(editTx?.notes ?? "");

  useEffect(() => {
    catApi.all().then(setCats);
  }, []);

  const filteredCats = cats.filter((c) => c.type === type);

  async function handleSave() {
    if (!description || !amount || !categoryId || !date) return;
    const val = parseFloat(amount.replace(",", "."));
    if (isNaN(val)) return;

    if (editTx?.id) {
      await txApi.update(editTx.id, {
        description,
        amount: val,
        type,
        categoryId,
        date,
        installments,
        currentInstallment: editTx.currentInstallment,
        notes,
      });
    } else {
      if (installments > 1) {
        const groupId = uuid();
        const [y, m, d] = date.split("-").map(Number);
        for (let i = 0; i < installments; i++) {
          const txDate = new Date(y, m - 1 + i, d);
          const txDateStr = txDate.toISOString().slice(0, 10);
          await txApi.add({
            description: `${description} (${i + 1}/${installments})`,
            amount: parseFloat((val / installments).toFixed(2)),
            type,
            categoryId,
            date: txDateStr,
            installments,
            currentInstallment: i + 1,
            groupId,
            notes,
          });
        }
      } else {
        await txApi.add({
          description,
          amount: val,
          type,
          categoryId,
          date,
          installments: 1,
          currentInstallment: 1,
          notes,
        });
      }
    }
    onSaved?.();
    onClose();
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>{editTx ? "Editar" : "Nova"} transação</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="type-toggle">
          <button
            className={type === "despesa" ? "active despesa" : ""}
            onClick={() => {
              setType("despesa");
              setCategoryId(0);
            }}
          >
            Despesa
          </button>
          <button
            className={type === "receita" ? "active receita" : ""}
            onClick={() => {
              setType("receita");
              setCategoryId(0);
            }}
          >
            Receita
          </button>
        </div>

        <div className="form-grid">
          <div className="field full">
            <label>Descrição</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Mercado, Aluguel…"
            />
          </div>
          <div className="field">
            <label>Valor (R$)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>
          <div className="field">
            <label>Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="field full">
            <label>Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
            >
              <option value={0}>Selecione…</option>
              {filteredCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          {!editTx && type === "despesa" && (
            <div className="field full">
              <label>Parcelamento</label>
              <div className="installment-row">
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                />
                <span className="installment-badge">
                  {installments === 1 ? "À vista" : `${installments}x`}
                </span>
              </div>
            </div>
          )}
          <div className="field full">
            <label>Observação (opcional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes adicionais…"
            />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className={`btn-primary ${type}`} onClick={handleSave}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

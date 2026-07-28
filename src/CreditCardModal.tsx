import { X } from "lucide-react";
import { useState } from "react";
import { creditCards as cardsApi, type CreditCard } from "./db";

interface Props {
  onClose: () => void;
  editCard?: CreditCard;
  onSaved?: () => void;
}

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#BA1419",
];

export function CreditCardModal({ onClose, editCard, onSaved }: Props) {
  const [name, setName] = useState(editCard?.name ?? "");
  const [limitAmount, setLimitAmount] = useState(
    editCard?.limitAmount != null ? String(editCard.limitAmount) : "",
  );
  const [closingDay, setClosingDay] = useState(
    editCard?.closingDay != null ? String(editCard.closingDay) : "",
  );
  const [dueDay, setDueDay] = useState(
    editCard?.dueDay != null ? String(editCard.dueDay) : "",
  );
  const [color, setColor] = useState(editCard?.color ?? COLORS[0]);

  async function handleSave() {
    if (!name) return;
    const limit = limitAmount
      ? parseFloat(limitAmount.replace(",", "."))
      : undefined;
    const closing = closingDay ? Number(closingDay) : undefined;
    const due = dueDay ? Number(dueDay) : undefined;

    const payload = {
      name,
      color,
      limitAmount: limit != null && !isNaN(limit) ? limit : undefined,
      closingDay: closing != null && !isNaN(closing) ? closing : undefined,
      dueDay: due != null && !isNaN(due) ? due : undefined,
    };

    if (editCard?.id) {
      await cardsApi.update(editCard.id, payload);
    } else {
      await cardsApi.add(payload);
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
          <h2>{editCard ? "Editar" : "Novo"} cartão</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="form-grid">
          <div className="field full">
            <label>Nome do cartão</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nubank, Inter, Itaú…"
            />
          </div>
          <div className="field full">
            <label>Limite (R$, opcional)</label>
            <input
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>
          <div className="field">
            <label>Dia de fechamento</label>
            <input
              value={closingDay}
              onChange={(e) => setClosingDay(e.target.value)}
              placeholder="Ex: 20"
              inputMode="numeric"
            />
          </div>
          <div className="field">
            <label>Dia de vencimento</label>
            <input
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="Ex: 27"
              inputMode="numeric"
            />
          </div>
          <div className="field full">
            <label>Cor</label>
            <div className="color-row">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-dot${color === c ? " selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

import { X } from "lucide-react";
import { useState } from "react";
import { goals as goalsApi, type Goal } from "./db";

interface Props {
  onClose: () => void;
  editGoal?: Goal;
  onSaved?: () => void;
}

const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
];

export function GoalModal({ onClose, editGoal, onSaved }: Props) {
  const [name, setName] = useState(editGoal?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(
    editGoal ? String(editGoal.targetAmount) : "",
  );
  const [currentAmount, setCurrentAmount] = useState(
    editGoal ? String(editGoal.currentAmount) : "0",
  );
  const [deadline, setDeadline] = useState(editGoal?.deadline ?? "");
  const [color, setColor] = useState(editGoal?.color ?? COLORS[0]);

  async function handleSave() {
    if (!name || !targetAmount || !deadline) return;
    const target = parseFloat(targetAmount.replace(",", "."));
    const current = parseFloat(currentAmount.replace(",", ".")) || 0;
    if (isNaN(target)) return;

    if (editGoal?.id) {
      await goalsApi.update(editGoal.id, {
        name,
        targetAmount: target,
        currentAmount: current,
        deadline,
        color,
      });
    } else {
      await goalsApi.add({
        name,
        targetAmount: target,
        currentAmount: current,
        deadline,
        color,
      });
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
          <h2>{editGoal ? "Editar" : "Nova"} meta</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="form-grid">
          <div className="field full">
            <label>Nome da meta</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Viagem, Reserva de emergência…"
            />
          </div>
          <div className="field">
            <label>Valor alvo (R$)</label>
            <input
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>
          <div className="field">
            <label>Já guardado (R$)</label>
            <input
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>
          <div className="field full">
            <label>Prazo</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
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
          <button className="btn-primary receita" onClick={handleSave}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { goals as goalsApi, type Goal } from "./db";
import { GoalModal } from "./GoalModal";
import { formatCurrency, formatDate } from "./hooks";

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | undefined>();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const g = await goalsApi.all();
    setGoals(g);
    setLoading(false);
  }

  async function deleteGoal(id: number) {
    await goalsApi.delete(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  if (loading) return <div className="loading">Carregando…</div>;

  return (
    <div className="goals-page">
      <div className="page-header">
        <h2>Metas de economia</h2>
        <button
          className="btn-primary receita"
          onClick={() => {
            setEditGoal(undefined);
            setShowModal(true);
          }}
        >
          <Plus size={16} /> Nova meta
        </button>
      </div>

      {goals.length === 0 && (
        <div className="empty-state">
          <p>Você ainda não tem metas.</p>
          <p>Crie uma meta para acompanhar seu progresso de economia.</p>
        </div>
      )}

      <div className="goals-full-grid">
        {goals.map((g) => {
          const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
          const daysLeft = Math.ceil(
            (new Date(g.deadline).getTime() - Date.now()) / 86400000,
          );
          const remaining = g.targetAmount - g.currentAmount;
          return (
            <div
              key={g.id}
              className="goal-full-card"
              style={{ borderTopColor: g.color }}
            >
              <div className="goal-full-header">
                <h3>{g.name}</h3>
                <div className="goal-full-actions">
                  <button
                    className="icon-btn small"
                    onClick={() => {
                      setEditGoal(g);
                      setShowModal(true);
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="icon-btn small danger"
                    onClick={() => g.id && deleteGoal(g.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="goal-bar-bg large">
                <div
                  className="goal-bar-fill"
                  style={{ width: `${pct}%`, background: g.color }}
                />
              </div>
              <div className="goal-stats">
                <div>
                  <span className="stat-label">Guardado</span>
                  <span className="stat-val">
                    {formatCurrency(g.currentAmount)}
                  </span>
                </div>
                <div>
                  <span className="stat-label">Meta</span>
                  <span className="stat-val">
                    {formatCurrency(g.targetAmount)}
                  </span>
                </div>
                <div>
                  <span className="stat-label">Falta</span>
                  <span className="stat-val">
                    {formatCurrency(Math.max(remaining, 0))}
                  </span>
                </div>
                <div>
                  <span className="stat-label">Prazo</span>
                  <span className={`stat-val ${daysLeft < 30 ? "urgent" : ""}`}>
                    {formatDate(g.deadline)}
                  </span>
                </div>
              </div>
              <div className="goal-pct-big" style={{ color: g.color }}>
                {pct.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <GoalModal
          onClose={() => setShowModal(false)}
          editGoal={editGoal}
          onSaved={load}
        />
      )}
    </div>
  );
}

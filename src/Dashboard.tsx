import { useEffect, useState } from 'react';
import { transactions, categories, goals as goalsApi, type Transaction, type Category, type Goal } from './db';
import { formatCurrency } from './hooks';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface Props { startDate: string; endDate: string; }

export function Dashboard({ startDate, endDate }: Props) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accBalance, setAccBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      transactions.between(startDate, endDate),
      categories.all(),
      goalsApi.all(),
      transactions.balanceUntil(endDate),
    ]).then(([t, c, g, bal]) => {
      setTxs(t); setCats(c); setGoals(g); setAccBalance(bal); setLoading(false);
    });
  }, [startDate, endDate]);

  if (loading) return <div className="loading">Carregando…</div>;

  const catMap = Object.fromEntries(cats.map(c => [c.id!, c]));
  const receitas = txs.filter(t => t.type === 'receita').reduce((s, t) => s + t.amount, 0);
  const despesas = txs.filter(t => t.type === 'despesa').reduce((s, t) => s + t.amount, 0);
  // Saldo acumulado até o fim do mês visualizado (carrega de meses anteriores).
  const saldo = accBalance;
  // Média diária de gasto no mês: total de despesas ÷ dias do mês.
  const daysInMonth = Number(endDate.slice(8));
  const mediaDiariaGasto = daysInMonth > 0 ? despesas / daysInMonth : 0;

  const catTotals: Record<number, number> = {};
  txs.filter(t => t.type === 'despesa').forEach(t => {
    catTotals[t.categoryId] = (catTotals[t.categoryId] ?? 0) + t.amount;
  });
  const pieData = Object.entries(catTotals).map(([id, value]) => ({
    name: catMap[Number(id)]?.name ?? 'Outros',
    value,
    color: catMap[Number(id)]?.color ?? '#6b7280',
  })).sort((a, b) => b.value - a.value).slice(0, 6);

  const dayMap: Record<string, { receita: number; despesa: number }> = {};
  txs.forEach(t => {
    if (!dayMap[t.date]) dayMap[t.date] = { receita: 0, despesa: 0 };
    dayMap[t.date][t.type] += t.amount;
  });
  const barData = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({
    day: date.slice(8),
    Receitas: v.receita,
    Despesas: v.despesa,
  }));

  return (
    <div className="dashboard">
      <div className="cards-row">
        <div className="card receita-card">
          <TrendingUp size={20} />
          <div>
            <span className="card-label">Receitas</span>
            <span className="card-value">{formatCurrency(receitas)}</span>
          </div>
        </div>
        <div className="card despesa-card">
          <TrendingDown size={20} />
          <div>
            <span className="card-label">Despesas</span>
            <span className="card-value">{formatCurrency(despesas)}</span>
          </div>
        </div>
        <div className={`card saldo-card ${saldo >= 0 ? 'positivo' : 'negativo'}`}>
          <Wallet size={20} />
          <div>
            <span className="card-label">Saldo acumulado</span>
            <span className="card-value">{formatCurrency(saldo)}</span>
          </div>
        </div>
      </div>

      <div className="charts-row">
        {barData.length > 0 && (
          <div className="chart-box">
            <div className="chart-head">
              <h3>Movimentação por dia</h3>
              <span className="chart-meta">Média diária: <strong>{formatCurrency(mediaDiariaGasto)}</strong></span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barGap={2}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${v}`} width={60} />
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                <Bar dataKey="Receitas" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Despesas" fill="#f97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {pieData.length > 0 && (
          <div className="chart-box">
            <h3>Despesas por categoria</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                  labelLine={false} fontSize={10}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {goals.length > 0 && (
        <div className="goals-section">
          <h3>Metas</h3>
          <div className="goals-grid">
            {goals.map(g => {
              const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
              const daysLeft = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000);
              return (
                <div key={g.id} className="goal-card">
                  <div className="goal-header">
                    <span className="goal-name">{g.name}</span>
                    <span className="goal-pct">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="goal-bar-bg">
                    <div className="goal-bar-fill" style={{ width: `${pct}%`, background: g.color }} />
                  </div>
                  <div className="goal-footer">
                    <span>{formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}</span>
                    <span className={daysLeft < 30 ? 'urgent' : ''}>{daysLeft > 0 ? `${daysLeft} dias` : 'Vencido'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {txs.length === 0 && (
        <div className="empty-state">
          <p>Nenhuma transação neste período.</p>
          <p>Clique em <strong>+ Nova transação</strong> para começar.</p>
        </div>
      )}
    </div>
  );
}

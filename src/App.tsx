import type { Session } from "@supabase/supabase-js";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  List,
  LogOut,
  Plus,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Auth } from "./Auth";
import { Dashboard } from "./Dashboard";
import { auth, seedCategories, type Transaction } from "./db";
import { GoalsPage } from "./GoalsPage";
import { useMonthFilter } from "./hooks";
import { TransactionList } from "./TransactionList";
import { TransactionModal } from "./TransactionModal";

type Tab = "dashboard" | "transacoes" | "metas";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [tab, setTab] = useState<Tab>("dashboard");
  const [showTxModal, setShowTxModal] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const { label, startDate, endDate, prev, next } = useMonthFilter();

  // Carrega a sessão atual e escuta mudanças (login/logout)
  useEffect(() => {
    auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = auth.onChange((_event, session) => {
      setSession(session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Cria as categorias padrão na primeira vez que o usuário entra
  useEffect(() => {
    if (session) seedCategories();
  }, [session]);

  function openNewTx() {
    setEditTx(undefined);
    setShowTxModal(true);
  }
  function openEdit(tx: Transaction) {
    setEditTx(tx);
    setShowTxModal(true);
  }
  function onSaved() {
    setRefreshKey((k) => k + 1);
  }

  if (!authReady) return <div className="loading">Carregando…</div>;
  if (!session) return <Auth />;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">💸 Finanças</div>
          <nav className="main-nav">
            <button
              className={tab === "dashboard" ? "active" : ""}
              onClick={() => setTab("dashboard")}
            >
              <LayoutDashboard size={16} /> <span>Resumo</span>
            </button>
            <button
              className={tab === "transacoes" ? "active" : ""}
              onClick={() => setTab("transacoes")}
            >
              <List size={16} /> <span>Transações</span>
            </button>
            <button
              className={tab === "metas" ? "active" : ""}
              onClick={() => setTab("metas")}
            >
              <Target size={16} /> <span>Metas</span>
            </button>
          </nav>
          <button className="btn-primary add-btn" onClick={openNewTx}>
            <Plus size={16} /> Nova transação
          </button>
          <button
            className="icon-btn"
            title="Sair"
            onClick={() => auth.signOut()}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {tab !== "metas" && (
        <div className="month-bar">
          <button className="icon-btn" onClick={prev}>
            <ChevronLeft size={18} />
          </button>
          <span className="month-label">{label}</span>
          <button className="icon-btn" onClick={next}>
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <main className="app-main">
        {tab === "dashboard" && (
          <Dashboard key={refreshKey} startDate={startDate} endDate={endDate} />
        )}
        {tab === "transacoes" && (
          <TransactionList
            startDate={startDate}
            endDate={endDate}
            onEdit={openEdit}
            refreshKey={refreshKey}
          />
        )}
        {tab === "metas" && <GoalsPage />}
      </main>

      <button className="fab" onClick={openNewTx}>
        <Plus size={24} />
      </button>

      {showTxModal && (
        <TransactionModal
          onClose={() => setShowTxModal(false)}
          editTx={editTx}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

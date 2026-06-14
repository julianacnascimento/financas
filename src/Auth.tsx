import { useState } from "react";
import "./auth-styles.css";
import { auth } from "./db";

export function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) return;
    setError("");
    setLoading(true);

    const { error } = await auth.signIn(email, password);

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Login OK: o onAuthStateChange no App assume daqui.
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">💸 Finanças</div>
        <p className="auth-sub">Entre para acessar suas finanças</p>

        <div className="form-grid">
          <div className="field full">
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="field full">
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button
          className="btn-primary auth-submit"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { api, Summary } from "../api/client";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.reports
      .summary()
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h2>Resumo</h2>
      {error && <p style={{ color: "var(--expense)" }}>{error}</p>}
      {summary && (
        <div className="cards">
          <div className="card income">
            <div className="label">Receitas</div>
            <div className="value">{formatBRL(summary.income)}</div>
          </div>
          <div className="card expense">
            <div className="label">Despesas</div>
            <div className="value">{formatBRL(summary.expense)}</div>
          </div>
          <div className="card">
            <div className="label">Saldo</div>
            <div className="value">{formatBRL(summary.balance)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

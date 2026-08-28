import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";

interface Row {
  category: string;
  type: "INCOME" | "EXPENSE";
  total: number;
  count: number;
}

export function Reports() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.reports.byCategory().then(setRows).catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h2>Relatório por categoria</h2>
      {error && <p style={{ color: "var(--expense)" }}>{error}</p>}
      <div style={{ background: "var(--surface)", borderRadius: 10, padding: 16, height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="category" stroke="var(--text-muted)" fontSize={12} />
            <YAxis stroke="var(--text-muted)" fontSize={12} />
            <Tooltip
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            />
            <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

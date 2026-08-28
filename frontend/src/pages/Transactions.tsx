import { FormEvent, useEffect, useState } from "react";
import { api, Category, Transaction, TransactionType } from "../api/client";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");

  function load() {
    api.transactions.list().then(setTransactions).catch((err) => setError(err.message));
    api.categories.list().then(setCategories).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  const categoriesForType = categories.filter((c) => c.type === type);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.transactions.create({
        description,
        amount: Number(amount),
        type,
        date: new Date(date).toISOString(),
        categoryId,
      });
      setDescription("");
      setAmount("");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleRemove(id: string) {
    try {
      await api.transactions.remove(id);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Transações</h2>
      {error && <p style={{ color: "var(--expense)" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          type="number"
          step="0.01"
          placeholder="Valor"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <select value={type} onChange={(e) => { setType(e.target.value as TransactionType); setCategoryId(""); }}>
          <option value="EXPENSE">Despesa</option>
          <option value="INCOME">Receita</option>
        </select>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
          <option value="" disabled>
            Categoria
          </option>
          {categoriesForType.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <button type="submit">Adicionar</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Valor</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>{new Date(t.date).toLocaleDateString("pt-BR")}</td>
              <td>{t.description}</td>
              <td>
                <span className={`tag ${t.type === "INCOME" ? "income" : "expense"}`}>
                  {t.category.name}
                </span>
              </td>
              <td>{formatBRL(t.amount)}</td>
              <td>
                <button className="danger" onClick={() => handleRemove(t.id)}>
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { FormEvent, useEffect, useState } from "react";
import { api, Category, TransactionType } from "../api/client";

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [error, setError] = useState("");

  function load() {
    api.categories.list().then(setCategories).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.categories.create({ name, type });
      setName("");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleRemove(id: string) {
    try {
      await api.categories.remove(id);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Categorias</h2>
      {error && <p style={{ color: "var(--expense)" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Nome da categoria"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <select value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
          <option value="EXPENSE">Despesa</option>
          <option value="INCOME">Receita</option>
        </select>
        <button type="submit">Adicionar</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>
                <span className={`tag ${c.type === "INCOME" ? "income" : "expense"}`}>
                  {c.type === "INCOME" ? "Receita" : "Despesa"}
                </span>
              </td>
              <td>
                <button className="danger" onClick={() => handleRemove(c.id)}>
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

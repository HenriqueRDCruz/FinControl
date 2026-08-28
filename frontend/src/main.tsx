import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import "./style.css";

/* =========================
   API
========================= */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

/* =========================
   TYPES
========================= */

type Cat = {
  id: number;
  name: string;
};

type Transaction = {
  id: number;
  description: string;
  amount: string | number;
  type: "RECEITA" | "DESPESA";
  date: string;
  category?: Cat;
};

type Investment = {
  id: number;
  name: string;
  invested: string | number;
  currentValue: string | number;
  date: string;
};

type Dashboard = {
  receitas: number;
  despesas: number;
  saldo: number;
  investido: number;
  byCategory: Record<string, number>;
};

/* =========================
   HELPERS
========================= */

const money = (value: number | string | null | undefined) => {
  const number = Number(value ?? 0);

  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const formatDate = (value: string) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR");
};

/* =========================
   APP
========================= */

function App() {
  const [page, setPage] = useState("dashboard");

  const [cats, setCats] = useState<Cat[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);

  const [dashboard, setDashboard] = useState<Dashboard>({
    receitas: 0,
    despesas: 0,
    saldo: 0,
    investido: 0,
    byCategory: {},
  });

  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    description: "",
    amount: "",
    type: "DESPESA" as "RECEITA" | "DESPESA",
    date: new Date().toISOString().slice(0, 10),
    categoryId: "",
  });

  /* =========================
     LOAD DATA
  ========================= */

  const load = async () => {
    try {
      setLoading(true);

      const [categoriesResponse, transactionsResponse, investmentsResponse, dashboardResponse] =
        await Promise.all([
          api.get("/categories"),
          api.get("/transactions"),
          api.get("/investments"),
          api.get("/dashboard"),
        ]);

      setCats(categoriesResponse.data ?? []);
      setTransactions(transactionsResponse.data ?? []);
      setInvestments(investmentsResponse.data ?? []);

      const data = dashboardResponse.data ?? {};

      setDashboard({
        receitas: Number(data.receitas ?? 0),
        despesas: Number(data.despesas ?? 0),
        saldo: Number(data.saldo ?? 0),
        investido: Number(data.investido ?? 0),
        byCategory: data.byCategory ?? {},
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* =========================
     TRANSACTION
  ========================= */

  const submitTransaction = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !form.description ||
      !form.amount ||
      !form.categoryId
    ) {
      alert("Preencha todos os campos.");
      return;
    }

    try {
      await api.post("/transactions", {
        description: form.description,
        amount: form.amount,
        type: form.type,
        date: form.date,
        categoryId: Number(form.categoryId),
      });

      setForm({
        ...form,
        description: "",
        amount: "",
      });

      await load();
    } catch (error) {
      console.error(error);
      alert("Não foi possível adicionar a movimentação.");
    }
  };

  /* =========================
     DELETE TRANSACTION
  ========================= */

  const deleteTransaction = async (id: number) => {
    if (!window.confirm("Excluir este lançamento?")) {
      return;
    }

    try {
      await api.delete(`/transactions/${id}`);
      await load();
    } catch (error) {
      console.error(error);
      alert("Não foi possível excluir o lançamento.");
    }
  };

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="app">

      {/* SIDEBAR */}

      <aside>
        <h1>
          Fin<span>Control</span>
        </h1>

        <button
          className={page === "dashboard" ? "active" : ""}
          onClick={() => setPage("dashboard")}
        >
          📊 Dashboard
        </button>

        <button
          className={page === "transactions" ? "active" : ""}
          onClick={() => setPage("transactions")}
        >
          💸 Movimentações
        </button>

        <button
          className={page === "investments" ? "active" : ""}
          onClick={() => setPage("investments")}
        >
          📈 Investimentos
        </button>

        <button
          className={page === "categories" ? "active" : ""}
          onClick={() => setPage("categories")}
        >
          🏷️ Categorias
        </button>
      </aside>

      {/* MAIN */}

      <main>

        <header>
          <div>
            <small>CONTROLE FINANCEIRO</small>

            <h2>
              {page === "dashboard"
                ? "Dashboard"
                : page === "transactions"
                ? "Movimentações"
                : page === "investments"
                ? "Investimentos"
                : "Categorias"}
            </h2>
          </div>
        </header>

        {loading && page === "dashboard" ? (
          <div className="panel">
            <p>Carregando dados...</p>
          </div>
        ) : null}

        {/* =========================
            DASHBOARD
        ========================= */}

        {page === "dashboard" && (
          <>
            <section className="cards">

              <Card
                title="Receitas"
                value={money(dashboard.receitas)}
                cls="green"
              />

              <Card
                title="Despesas"
                value={money(dashboard.despesas)}
                cls="red"
              />

              <Card
                title="Saldo"
                value={money(dashboard.saldo)}
                cls="blue"
              />

              <Card
                title="Investido"
                value={money(dashboard.investido)}
                cls="purple"
              />

            </section>

            <section className="grid">

              <div className="panel">

                <h3>Resumo financeiro</h3>

                <div className="bar">
                  <i
                    style={{
                      width: `${
                        dashboard.receitas
                          ? Math.min(
                              100,
                              (dashboard.despesas /
                                dashboard.receitas) *
                                100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <p>
                  Despesas representam{" "}
                  {dashboard.receitas
                    ? (
                        (dashboard.despesas /
                          dashboard.receitas) *
                        100
                      ).toFixed(1)
                    : "0"}
                  % das receitas.
                </p>

              </div>

              <div className="panel">

                <h3>Gastos por categoria</h3>

                {Object.entries(
                  dashboard.byCategory
                ).length > 0 ? (
                  <ul>
                    {Object.entries(
                      dashboard.byCategory
                    ).map(([category, value]) => (
                      <li key={category}>
                        <span>{category}</span>

                        <b>
                          {money(value)}
                        </b>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    Nenhuma despesa cadastrada.
                  </p>
                )}

              </div>

            </section>
          </>
        )}

        {/* =========================
            TRANSACTIONS
        ========================= */}

        {page === "transactions" && (
          <>
            <div className="panel">

              <h3>Nova movimentação</h3>

              <form
                onSubmit={submitTransaction}
                className="form"
              >

                <input
                  placeholder="Descrição"
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description:
                        event.target.value,
                    })
                  }
                />

                <input
                  type="number"
                  step="0.01"
                  placeholder="Valor"
                  value={form.amount}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      amount:
                        event.target.value,
                    })
                  }
                />

                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      type:
                        event.target.value as
                          | "RECEITA"
                          | "DESPESA",
                    })
                  }
                >
                  <option value="DESPESA">
                    Despesa
                  </option>

                  <option value="RECEITA">
                    Receita
                  </option>
                </select>

                <select
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      categoryId:
                        event.target.value,
                    })
                  }
                >
                  <option value="">
                    Categoria
                  </option>

                  {cats.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      date: event.target.value,
                    })
                  }
                />

                <button className="primary">
                  Adicionar
                </button>

              </form>

            </div>

            <TransactionTable
              transactions={transactions}
              onDelete={deleteTransaction}
            />
          </>
        )}

        {/* =========================
            INVESTMENTS
        ========================= */}

        {page === "investments" && (
          <Investment
            investments={investments}
            load={load}
          />
        )}

        {/* =========================
            CATEGORIES
        ========================= */}

        {page === "categories" && (
          <Categories
            categories={cats}
            load={load}
          />
        )}

      </main>
    </div>
  );
}

/* =========================
   CARD
========================= */

function Card({
  title,
  value,
  cls,
}: {
  title: string;
  value: string;
  cls: string;
}) {
  return (
    <div className="card">
      <span>{title}</span>

      <strong className={cls}>
        {value}
      </strong>
    </div>
  );
}

/* =========================
   TRANSACTION TABLE
========================= */

function TransactionTable({
  transactions,
  onDelete,
}: {
  transactions: Transaction[];
  onDelete: (id: number) => void;
}) {
  return (
    <div className="panel">

      <h3>Últimas movimentações</h3>

      {transactions.length === 0 ? (
        <p>Nenhuma movimentação cadastrada.</p>
      ) : (
        <table>

          <thead>
            <tr>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Tipo</th>
              <th>Data</th>
              <th>Valor</th>
              <th></th>
            </tr>
          </thead>

          <tbody>

            {transactions.map((transaction) => (
              <tr key={transaction.id}>

                <td>
                  {transaction.description}
                </td>

                <td>
                  {transaction.category?.name ?? "-"}
                </td>

                <td>
                  <em
                    className={
                      transaction.type === "RECEITA"
                        ? "tag green"
                        : "tag red"
                    }
                  >
                    {transaction.type}
                  </em>
                </td>

                <td>
                  {formatDate(transaction.date)}
                </td>

                <td>
                  {money(transaction.amount)}
                </td>

                <td>
                  <button
                    className="delete"
                    onClick={() =>
                      onDelete(transaction.id)
                    }
                  >
                    Excluir
                  </button>
                </td>

              </tr>
            ))}

          </tbody>

        </table>
      )}

    </div>
  );
}

/* =========================
   CATEGORIES
========================= */

function Categories({
  categories,
  load,
}: {
  categories: Cat[];
  load: () => Promise<void>;
}) {
  const [name, setName] = useState("");

  const add = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    try {
      await api.post("/categories", {
        name: name.trim(),
      });

      setName("");

      await load();
    } catch (error) {
      console.error(error);
      alert(
        "Não foi possível criar a categoria."
      );
    }
  };

  const deleteCategory = async (
    id: number
  ) => {
    try {
      await api.delete(
        `/categories/${id}`
      );

      await load();
    } catch {
      alert(
        "Categoria em uso não pode ser excluída."
      );
    }
  };

  return (
    <div className="panel">

      <h3>Nova categoria</h3>

      <form
        className="form"
        onSubmit={add}
      >

        <input
          placeholder="Nome da categoria"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
        />

        <button className="primary">
          Adicionar
        </button>

      </form>

      <ul>

        {categories.map((category) => (
          <li key={category.id}>

            <span>
              {category.name}
            </span>

            <button
              className="delete"
              onClick={() =>
                deleteCategory(
                  category.id
                )
              }
            >
              Excluir
            </button>

          </li>
        ))}

      </ul>

    </div>
  );
}

/* =========================
   INVESTMENTS
========================= */

function Investment({
  investments,
  load,
}: {
  investments: Investment[];
  load: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: "",
    invested: "",
    currentValue: "",
    date: new Date()
      .toISOString()
      .slice(0, 10),
  });

  const add = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (
      !form.name ||
      !form.invested ||
      !form.currentValue
    ) {
      alert("Preencha todos os campos.");
      return;
    }

    try {
      await api.post("/investments", form);

      setForm({
        ...form,
        name: "",
        invested: "",
        currentValue: "",
      });

      await load();
    } catch (error) {
      console.error(error);
      alert(
        "Não foi possível adicionar o investimento."
      );
    }
  };

  return (
    <>
      <div className="panel">

        <h3>Novo investimento</h3>

        <form
          className="form"
          onSubmit={add}
        >

          <input
            placeholder="Nome"
            value={form.name}
            onChange={(event) =>
              setForm({
                ...form,
                name: event.target.value,
              })
            }
          />

          <input
            type="number"
            step="0.01"
            placeholder="Valor investido"
            value={form.invested}
            onChange={(event) =>
              setForm({
                ...form,
                invested:
                  event.target.value,
              })
            }
          />

          <input
            type="number"
            step="0.01"
            placeholder="Valor atual"
            value={form.currentValue}
            onChange={(event) =>
              setForm({
                ...form,
                currentValue:
                  event.target.value,
              })
            }
          />

          <input
            type="date"
            value={form.date}
            onChange={(event) =>
              setForm({
                ...form,
                date: event.target.value,
              })
            }
          />

          <button className="primary">
            Adicionar
          </button>

        </form>

      </div>

      <div className="panel">

        <h3>Investimentos</h3>

        {investments.length === 0 ? (
          <p>
            Nenhum investimento cadastrado.
          </p>
        ) : (
          <table>

            <thead>
              <tr>
                <th>Nome</th>
                <th>Investido</th>
                <th>Atual</th>
                <th>Resultado</th>
              </tr>
            </thead>

            <tbody>

              {investments.map((investment) => {

                const invested =
                  Number(
                    investment.invested ?? 0
                  );

                const current =
                  Number(
                    investment.currentValue ?? 0
                  );

                return (
                  <tr key={investment.id}>

                    <td>
                      {investment.name}
                    </td>

                    <td>
                      {money(invested)}
                    </td>

                    <td>
                      {money(current)}
                    </td>

                    <td>
                      {money(
                        current - invested
                      )}
                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>
        )}

      </div>
    </>
  );
}

/* =========================
   START
========================= */

createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
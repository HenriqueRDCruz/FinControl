import { NavLink, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { Categories } from "./pages/Categories";
import { Reports } from "./pages/Reports";

export function App() {
  return (
    <>
      <aside className="sidebar">
        <h1>💰 Controle Financeiro</h1>
        <nav>
          <NavLink to="/" end>
            Resumo
          </NavLink>
          <NavLink to="/transacoes">Transações</NavLink>
          <NavLink to="/categorias">Categorias</NavLink>
          <NavLink to="/relatorios">Relatórios</NavLink>
        </nav>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transacoes" element={<Transactions />} />
          <Route path="/categorias" element={<Categories />} />
          <Route path="/relatorios" element={<Reports />} />
        </Routes>
      </main>
    </>
  );
}

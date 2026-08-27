import { NavLink, Outlet } from 'react-router-dom';
import './layout.css';
export default function Layout(){return <div className="app"><aside><h1>FinControl</h1><nav><NavLink to="/">📊 Dashboard</NavLink><NavLink to="/movimentacoes">💸 Movimentações</NavLink><NavLink to="/investimentos">📈 Investimentos</NavLink><NavLink to="/categorias">🏷️ Categorias</NavLink></nav></aside><main><Outlet/></main></div>}

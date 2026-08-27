import { Router } from 'express';
import { controller as c } from '../controllers/financeController';
const r = Router();
r.get('/dashboard', c.dashboard);
r.get('/movimentacoes', c.movimentacoes); r.post('/movimentacoes', c.criarMovimentacao); r.put('/movimentacoes/:id', c.atualizarMovimentacao); r.delete('/movimentacoes/:id', c.excluirMovimentacao);
r.get('/categorias', c.categorias); r.post('/categorias', c.criarCategoria); r.put('/categorias/:id', c.atualizarCategoria); r.delete('/categorias/:id', c.excluirCategoria);
r.get('/investimentos', c.investimentos); r.post('/investimentos', c.criarInvestimento); r.put('/investimentos/:id', c.atualizarInvestimento); r.delete('/investimentos/:id', c.excluirInvestimento);
export default r;

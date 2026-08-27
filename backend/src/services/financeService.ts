import { TipoMovimentacao } from '@prisma/client';
import { prisma } from '../repositories/prisma';
import { financeRepository as repo } from '../repositories/financeRepository';

const date = (v: string | Date) => new Date(v);
const money = (v: unknown) => Number(v);

export const financeService = {
  async listMovimentacoes() { return repo.listMovimentacoes(); },
  async createMovimentacao(input: any) {
    const categoria = await repo.getCategoria(Number(input.categoriaId));
    if (!categoria) throw Object.assign(new Error('Categoria não encontrada.'), { status: 404 });
    if (categoria.tipo !== input.tipo) throw Object.assign(new Error('A categoria não pertence ao tipo informado.'), { status: 400 });
    return repo.createMovimentacao({ descricao: input.descricao, valor: money(input.valor), data: date(input.data), tipo: input.tipo, categoriaId: Number(input.categoriaId) });
  },
  async updateMovimentacao(id: number, input: any) {
    const categoria = await repo.getCategoria(Number(input.categoriaId));
    if (!categoria) throw Object.assign(new Error('Categoria não encontrada.'), { status: 404 });
    if (categoria.tipo !== input.tipo) throw Object.assign(new Error('A categoria não pertence ao tipo informado.'), { status: 400 });
    return repo.updateMovimentacao(id, { descricao: input.descricao, valor: money(input.valor), data: date(input.data), tipo: input.tipo, categoriaId: Number(input.categoriaId) });
  },
  async deleteMovimentacao(id: number) { return repo.deleteMovimentacao(id); },
  async listCategorias() { return repo.listCategorias(); },
  async createCategoria(input: any) { return repo.createCategoria(input); },
  async updateCategoria(id: number, input: any) { return repo.updateCategoria(id, input); },
  async deleteCategoria(id: number) { return repo.deleteCategoria(id); },
  async listInvestimentos() { return repo.listInvestimentos(); },
  async createInvestimento(input: any) { return repo.createInvestimento({ nome: input.nome, valorInvestido: money(input.valorInvestido), valorAtual: money(input.valorAtual), data: date(input.data) }); },
  async updateInvestimento(id: number, input: any) { return repo.updateInvestimento(id, { nome: input.nome, valorInvestido: money(input.valorInvestido), valorAtual: money(input.valorAtual), data: date(input.data) }); },
  async deleteInvestimento(id: number) { return repo.deleteInvestimento(id); },
  async dashboard() {
    const [movs, investimentos] = await Promise.all([repo.listMovimentacoes(), repo.listInvestimentos()]);
    const receitas = movs.filter(m => m.tipo === TipoMovimentacao.RECEITA).reduce((s, m) => s + money(m.valor), 0);
    const despesas = movs.filter(m => m.tipo === TipoMovimentacao.DESPESA).reduce((s, m) => s + money(m.valor), 0);
    const investido = investimentos.reduce((s, i) => s + money(i.valorAtual), 0);
    const porCategoria: Record<string, number> = {};
    movs.filter(m => m.tipo === TipoMovimentacao.DESPESA).forEach(m => { porCategoria[m.categoria.nome] = (porCategoria[m.categoria.nome] || 0) + money(m.valor); });
    const meses: Record<string, { mes: string; receitas: number; despesas: number }> = {};
    movs.forEach(m => {
      const d = new Date(m.data); const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      meses[key] ||= { mes: key, receitas: 0, despesas: 0 };
      meses[key][m.tipo === TipoMovimentacao.RECEITA ? 'receitas' : 'despesas'] += money(m.valor);
    });
    return { totais: { receitas, despesas, saldo: receitas - despesas, investido }, categorias: Object.entries(porCategoria).map(([nome, valor]) => ({ nome, valor })), evolucao: Object.values(meses).sort((a,b) => a.mes.localeCompare(b.mes)) };
  }
};

export { prisma };

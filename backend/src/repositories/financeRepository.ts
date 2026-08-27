import { prisma } from './prisma';

export const financeRepository = {
  listMovimentacoes: () => prisma.movimentacao.findMany({ include: { categoria: true }, orderBy: { data: 'desc' } }),
  getMovimentacao: (id: number) => prisma.movimentacao.findUnique({ where: { id }, include: { categoria: true } }),
  createMovimentacao: (data: any) => prisma.movimentacao.create({ data, include: { categoria: true } }),
  updateMovimentacao: (id: number, data: any) => prisma.movimentacao.update({ where: { id }, data, include: { categoria: true } }),
  deleteMovimentacao: (id: number) => prisma.movimentacao.delete({ where: { id } }),
  listCategorias: () => prisma.categoria.findMany({ orderBy: { nome: 'asc' } }),
  getCategoria: (id: number) => prisma.categoria.findUnique({ where: { id } }),
  createCategoria: (data: any) => prisma.categoria.create({ data }),
  updateCategoria: (id: number, data: any) => prisma.categoria.update({ where: { id }, data }),
  deleteCategoria: (id: number) => prisma.categoria.delete({ where: { id } }),
  listInvestimentos: () => prisma.investimento.findMany({ orderBy: { data: 'desc' } }),
  createInvestimento: (data: any) => prisma.investimento.create({ data }),
  updateInvestimento: (id: number, data: any) => prisma.investimento.update({ where: { id }, data }),
  deleteInvestimento: (id: number) => prisma.investimento.delete({ where: { id } })
};

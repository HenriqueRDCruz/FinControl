import { Request, Response, NextFunction } from 'express';
import { financeService as service } from '../services/financeService';

const id = (req: Request) => Number(req.params.id);
const ok = (res: Response, data: unknown) => res.json(data);

export const controller = {
  movimentacoes: async (req: Request, res: Response, next: NextFunction) => { try { return ok(res, await service.listMovimentacoes()); } catch(e){next(e);} },
  criarMovimentacao: async (req: Request, res: Response, next: NextFunction) => { try { return res.status(201).json(await service.createMovimentacao(req.body)); } catch(e){next(e);} },
  atualizarMovimentacao: async (req: Request, res: Response, next: NextFunction) => { try { return ok(res, await service.updateMovimentacao(id(req), req.body)); } catch(e){next(e);} },
  excluirMovimentacao: async (req: Request, res: Response, next: NextFunction) => { try { await service.deleteMovimentacao(id(req)); return res.status(204).send(); } catch(e){next(e);} },
  categorias: async (_req: Request, res: Response, next: NextFunction) => { try { return ok(res, await service.listCategorias()); } catch(e){next(e);} },
  criarCategoria: async (req: Request, res: Response, next: NextFunction) => { try { return res.status(201).json(await service.createCategoria(req.body)); } catch(e){next(e);} },
  atualizarCategoria: async (req: Request, res: Response, next: NextFunction) => { try { return ok(res, await service.updateCategoria(id(req), req.body)); } catch(e){next(e);} },
  excluirCategoria: async (req: Request, res: Response, next: NextFunction) => { try { await service.deleteCategoria(id(req)); return res.status(204).send(); } catch(e){next(e);} },
  investimentos: async (_req: Request, res: Response, next: NextFunction) => { try { return ok(res, await service.listInvestimentos()); } catch(e){next(e);} },
  criarInvestimento: async (req: Request, res: Response, next: NextFunction) => { try { return res.status(201).json(await service.createInvestimento(req.body)); } catch(e){next(e);} },
  atualizarInvestimento: async (req: Request, res: Response, next: NextFunction) => { try { return ok(res, await service.updateInvestimento(id(req), req.body)); } catch(e){next(e);} },
  excluirInvestimento: async (req: Request, res: Response, next: NextFunction) => { try { await service.deleteInvestimento(id(req)); return res.status(204).send(); } catch(e){next(e);} },
  dashboard: async (_req: Request, res: Response, next: NextFunction) => { try { return ok(res, await service.dashboard()); } catch(e){next(e);} }
};

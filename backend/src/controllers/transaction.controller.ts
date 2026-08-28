import { NextFunction, Request, Response } from "express";
import { transactionService } from "../services/transaction.service";

export const transactionController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const transactions = await transactionService.list(req.query);
      res.json(transactions);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const transaction = await transactionService.getById(req.params.id);
      res.json(transaction);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const transaction = await transactionService.create(req.body);
      res.status(201).json(transaction);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const transaction = await transactionService.update(req.params.id, req.body);
      res.json(transaction);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await transactionService.remove(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};

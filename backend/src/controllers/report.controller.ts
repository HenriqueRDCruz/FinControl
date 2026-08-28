import { NextFunction, Request, Response } from "express";
import { reportService } from "../services/report.service";

export const reportController = {
  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await reportService.summary(req.query);
      res.json(summary);
    } catch (err) {
      next(err);
    }
  },

  async byCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.byCategory(req.query);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
};

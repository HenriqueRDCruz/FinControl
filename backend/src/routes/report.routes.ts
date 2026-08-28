import { Router } from "express";
import { reportController } from "../controllers/report.controller";

export const reportRoutes = Router();

reportRoutes.get("/summary", reportController.summary);
reportRoutes.get("/by-category", reportController.byCategory);

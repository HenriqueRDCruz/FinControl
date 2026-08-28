import { Router } from "express";
import { categoryRoutes } from "./category.routes";
import { transactionRoutes } from "./transaction.routes";
import { reportRoutes } from "./report.routes";

export const routes = Router();

routes.get("/health", (_req, res) => res.json({ status: "ok" }));
routes.use("/categories", categoryRoutes);
routes.use("/transactions", transactionRoutes);
routes.use("/reports", reportRoutes);

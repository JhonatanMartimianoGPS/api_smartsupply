import type { Request, Response, NextFunction } from "express";
import { AppError } from "../middlewares/error.middleware.js";
import { dashboardService } from "../services/dashboard.service.js";

// Parâmetros de URL podem chegar como lista ou objeto (?a=1&a=2): só aceitamos texto.
// Ausente ou vazio vale "sem filtro"; qualquer outro formato é erro de quem chamou.
const asString = (value: unknown) => {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") throw new AppError(400, "Parâmetro inválido.");
  return value;
};

export class DashboardController {
  async getOrderStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getOrderStats(req.user!, {
        periodMonth: asString(req.query.periodMonth),
        regionalId: asString(req.query.regionalId),
      });
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  async getContractSpending(req: Request, res: Response, next: NextFunction) {
    try {
      const spending = await dashboardService.getContractSpending(req.user!, {
        periodMonth: asString(req.query.periodMonth),
        regionalId: asString(req.query.regionalId),
      });
      res.json(spending);
    } catch (error) {
      next(error);
    }
  }

  async getMonthlySpending(req: Request, res: Response, next: NextFunction) {
    try {
      const spending = await dashboardService.getMonthlySpending(req.user!, {
        regionalId: asString(req.query.regionalId),
      });
      res.json(spending);
    } catch (error) {
      next(error);
    }
  }

  async getCategorySpending(req: Request, res: Response, next: NextFunction) {
    try {
      const spending = await dashboardService.getCategorySpending(req.user!, {
        periodMonth: asString(req.query.periodMonth),
        regionalId: asString(req.query.regionalId),
      });
      res.json(spending);
    } catch (error) {
      next(error);
    }
  }

  async getProductAndSupplierSpending(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getProductAndSupplierSpending(req.user!, {
        periodMonth: asString(req.query.periodMonth),
        regionalId: asString(req.query.regionalId),
      });
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getApprovalHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await dashboardService.getApprovalHistory(req.user!, {
        monthKey: asString(req.query.monthKey),
        regionalId: asString(req.query.regionalId),
      });
      res.json(history);
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();

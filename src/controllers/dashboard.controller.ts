import type { Request, Response, NextFunction } from "express";
import { dashboardService } from "../services/dashboard.service.js";

export class DashboardController {
  async getOrderStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { periodMonth, regionalId } = req.query;
      const stats = await dashboardService.getOrderStats({
        periodMonth: periodMonth as string,
        regionalId: regionalId as string,
      });
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  async getContractSpending(req: Request, res: Response, next: NextFunction) {
    try {
      const { periodMonth, regionalId } = req.query;
      const spending = await dashboardService.getContractSpending({
        periodMonth: periodMonth as string,
        regionalId: regionalId as string,
      });
      res.json(spending);
    } catch (error) {
      next(error);
    }
  }

  async getMonthlySpending(req: Request, res: Response, next: NextFunction) {
    try {
      const { regionalId } = req.query;
      const spending = await dashboardService.getMonthlySpending({
        regionalId: regionalId as string,
      });
      res.json(spending);
    } catch (error) {
      next(error);
    }
  }

  async getCategorySpending(req: Request, res: Response, next: NextFunction) {
    try {
      const { periodMonth, regionalId } = req.query;
      const spending = await dashboardService.getCategorySpending({
        periodMonth: periodMonth as string,
        regionalId: regionalId as string,
      });
      res.json(spending);
    } catch (error) {
      next(error);
    }
  }

  async getProductAndSupplierSpending(req: Request, res: Response, next: NextFunction) {
    try {
      const { periodMonth, regionalId } = req.query;
      const data = await dashboardService.getProductAndSupplierSpending({
        periodMonth: periodMonth as string,
        regionalId: regionalId as string,
      });
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getApprovalHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { monthKey, regionalId } = req.query;
      const history = await dashboardService.getApprovalHistory({
        monthKey: monthKey as string,
        regionalId: regionalId as string,
      });
      res.json(history);
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();

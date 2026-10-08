import type { Request, Response, NextFunction } from "express";
import { orderService } from "../services/order.service.js";

export class OrderController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { regionalId, contractId, status, competenceMonth } = req.query;
      const orders = await orderService.listOrders({
        regionalId: regionalId as string,
        contractId: contractId as string,
        status: status as string,
        competenceMonth: competenceMonth as string,
      });
      res.json(orders);
    } catch (error) {
      next(error);
    }
  }

  async getMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const month = req.query.month as string | undefined;
      const orders = await orderService.getMyOrders(userId, month);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  }

  async getActiveMonthOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const orders = await orderService.getActiveMonthOrders(user.userId, user.role);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  }

  async getCurrentMonthOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const contractId = req.query.contractId as string;
      const order = await orderService.getCurrentMonthOrder(contractId);
      res.json(order);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.getOrderById(req.params.id as string);
      res.json(order);
    } catch (error) {
      next(error);
    }
  }

  async createMonthly(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const order = await orderService.createMonthlyOrder(userId, req.body);
      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }

  async createExtra(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const order = await orderService.createExtraOrder(userId, req.body);
      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await orderService.updateStatus(req.params.id as string, userId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async queryItems(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderIds } = req.body;
      const items = await orderService.queryItems(orderIds || []);
      res.json(items);
    } catch (error) {
      next(error);
    }
  }

  async updateItems(req: Request, res: Response, next: NextFunction) {
    try {
      const { items } = req.body;
      const result = await orderService.updateItems(req.params.id as string, items || []);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await orderService.getOrderHistory(req.params.id as string);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  async addHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await orderService.addHistory(req.params.id as string, userId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await orderService.deleteOrder(req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ─── Divergências de Entrega ────────────────────────────────────────────────
  async listDivergences(req: Request, res: Response, next: NextFunction) {
    try {
      const divergences = await orderService.listDeliveryDivergences();
      res.json(divergences);
    } catch (error) {
      next(error);
    }
  }

  async createDivergence(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const divergence = await orderService.createDeliveryDivergence(userId, req.body);
      res.status(201).json(divergence);
    } catch (error) {
      next(error);
    }
  }

  async resolveDivergence(req: Request, res: Response, next: NextFunction) {
    try {
      const divergence = await orderService.resolveDeliveryDivergence(req.params.id as string, req.body.notes);
      res.json(divergence);
    } catch (error) {
      next(error);
    }
  }

  // ─── Relatos de Problemas ───────────────────────────────────────────────────
  async listIssueReports(req: Request, res: Response, next: NextFunction) {
    try {
      const issues = await orderService.listIssueReports();
      res.json(issues);
    } catch (error) {
      next(error);
    }
  }

  async createIssueReport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const issue = await orderService.createIssueReport(userId, req.body);
      res.status(201).json(issue);
    } catch (error) {
      next(error);
    }
  }

  async updateIssueReportStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, notes } = req.body;
      const issue = await orderService.updateIssueReportStatus(req.params.id as string, status, notes);
      res.json(issue);
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();

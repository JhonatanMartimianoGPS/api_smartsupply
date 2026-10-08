import type { Request, Response, NextFunction } from "express";
import { orderService } from "../services/order.service.js";

export class OrderController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { regionalId, contractId, status, competenceMonth } = req.query;
      const orders = await orderService.listOrders(req.user!, {
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
      const month = req.query.month as string | undefined;
      const orders = await orderService.getMyOrders(req.user!, month);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  }

  async getActiveMonthOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await orderService.getActiveMonthOrders(req.user!);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  }

  async getCurrentMonthOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const contractId = req.query.contractId as string;
      const order = await orderService.getCurrentMonthOrder(req.user!, contractId);
      res.json(order);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.getOrderById(req.user!, req.params.id as string);
      res.json(order);
    } catch (error) {
      next(error);
    }
  }

  async createMonthly(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.createMonthlyOrder(req.user!, req.body);
      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }

  async createExtra(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.createExtraOrder(req.user!, req.body);
      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await orderService.updateStatus(req.user!, req.params.id as string, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async queryItems(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderIds } = req.body;
      const items = await orderService.queryItems(req.user!, orderIds || []);
      res.json(items);
    } catch (error) {
      next(error);
    }
  }

  async updateItems(req: Request, res: Response, next: NextFunction) {
    try {
      const { items } = req.body;
      const result = await orderService.updateItems(req.user!, req.params.id as string, items || []);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await orderService.getOrderHistory(req.user!, req.params.id as string);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  async addHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await orderService.addHistory(req.user!, req.params.id as string, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await orderService.deleteOrder(req.user!, req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ─── Divergências de Entrega ────────────────────────────────────────────────
  async listDivergences(req: Request, res: Response, next: NextFunction) {
    try {
      const competenceMonth = typeof req.query.competenceMonth === "string" ? req.query.competenceMonth : undefined;
      // O front manda os contratos separados por vírgula
      const contractIds =
        typeof req.query.contractIds === "string" ? req.query.contractIds.split(",").filter(Boolean).slice(0, 200) : undefined;
      const divergences = await orderService.listDeliveryDivergences(req.user!, { competenceMonth, contractIds });
      res.json(divergences);
    } catch (error) {
      next(error);
    }
  }

  async createDivergence(req: Request, res: Response, next: NextFunction) {
    try {
      const divergence = await orderService.createDeliveryDivergence(req.user!, req.body);
      res.status(201).json(divergence);
    } catch (error) {
      next(error);
    }
  }

  async resolveDivergence(req: Request, res: Response, next: NextFunction) {
    try {
      // O front envia resolutionNote (formato do Supabase); notes é o nome no banco
      const divergence = await orderService.resolveDeliveryDivergence(
        req.user!,
        req.params.id as string,
        req.body?.resolutionNote ?? req.body?.notes,
      );
      res.json(divergence);
    } catch (error) {
      next(error);
    }
  }

  // ─── Relatos de Problemas ───────────────────────────────────────────────────
  async listIssueReports(req: Request, res: Response, next: NextFunction) {
    try {
      const issues = await orderService.listIssueReports(req.user!);
      res.json(issues);
    } catch (error) {
      next(error);
    }
  }

  async createIssueReport(req: Request, res: Response, next: NextFunction) {
    try {
      const issue = await orderService.createIssueReport(req.user!, req.body);
      res.status(201).json(issue);
    } catch (error) {
      next(error);
    }
  }

  async updateIssueReportStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, notes } = req.body;
      const issue = await orderService.updateIssueReportStatus(req.user!, req.params.id as string, status, notes);
      res.json(issue);
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();

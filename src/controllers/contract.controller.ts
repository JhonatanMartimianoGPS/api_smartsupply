import type { Request, Response, NextFunction } from "express";
import { contractService } from "../services/contract.service.js";
import { AppError } from "../middlewares/error.middleware.js";

export class ContractController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const active = req.query.active !== undefined ? req.query.active === "true" : undefined;
      const regionalId = req.query.regionalId as string | undefined;
      const contracts = await contractService.listContracts({ active, regionalId });
      res.json(contracts);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const contract = await contractService.getContractById(req.user!, req.params.id as string);
      res.json(contract);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const contract = await contractService.createContract(req.body);
      res.status(201).json(contract);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const contract = await contractService.updateContract(req.params.id as string, req.body);
      res.json(contract);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await contractService.deleteContract(req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getBudgetHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await contractService.getBudgetHistory(req.user!, req.params.id as string);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  async getBudgetPeriodsBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { entries } = req.body;
      const result = await contractService.getBudgetPeriodsBatch(req.user!, entries || []);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ─── Suborçamentos por categoria de produto ─────────────────────────────────
  async listSubbudgets(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await contractService.listSubbudgets(req.user!, req.params.id as string));
    } catch (error) {
      next(error);
    }
  }

  async listSubbudgetPeriods(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await contractService.listSubbudgetPeriods(req.user!, req.params.id as string));
    } catch (error) {
      next(error);
    }
  }

  async createSubbudget(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await contractService.createSubbudget(req.user!, req.params.id as string, req.body));
    } catch (error) {
      next(error);
    }
  }

  async updateSubbudget(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await contractService.updateSubbudget(req.user!, req.params.id as string, req.body));
    } catch (error) {
      next(error);
    }
  }

  async setSubbudgetActive(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await contractService.setSubbudgetActive(req.user!, req.params.id as string, req.body?.active));
    } catch (error) {
      next(error);
    }
  }

  async getBudgetBreakdown(req: Request, res: Response, next: NextFunction) {
    try {
      const periodMonth = req.query.periodMonth;
      if (periodMonth !== undefined && typeof periodMonth !== "string") {
        throw new AppError(400, "Competência inválida. Use o formato AAAA-MM.");
      }
      res.json(await contractService.getBudgetBreakdown(req.user!, req.params.id as string, periodMonth));
    } catch (error) {
      next(error);
    }
  }

  async getContractProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await contractService.getContractProducts(req.user!, req.params.id as string);
      res.json(products);
    } catch (error) {
      next(error);
    }
  }

  async getLastHistoricalOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await contractService.getLastHistoricalOrder(req.user!, req.params.id as string);
      res.json(order);
    } catch (error) {
      next(error);
    }
  }
}

export const contractController = new ContractController();

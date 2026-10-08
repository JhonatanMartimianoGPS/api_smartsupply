import type { Request, Response, NextFunction } from "express";
import { contractService } from "../services/contract.service.js";

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
      const contract = await contractService.getContractById(req.params.id as string);
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
      const history = await contractService.getBudgetHistory(req.params.id as string);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  async getBudgetPeriodsBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { entries } = req.body;
      const result = await contractService.getBudgetPeriodsBatch(entries || []);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getContractProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await contractService.getContractProducts(req.params.id as string);
      res.json(products);
    } catch (error) {
      next(error);
    }
  }

  async getLastHistoricalOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await contractService.getLastHistoricalOrder(req.params.id as string);
      res.json(order);
    } catch (error) {
      next(error);
    }
  }
}

export const contractController = new ContractController();

import type { Request, Response, NextFunction } from "express";
import { AppError } from "../middlewares/error.middleware.js";
import { solicitationService } from "../services/solicitation.service.js";

// Parâmetros de URL podem chegar como lista ou objeto (?a=1&a=2): só aceitamos texto.
const asString = (value: unknown) => {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") throw new AppError(400, "Parâmetro inválido.");
  return value;
};

export class SolicitationController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const solicitations = await solicitationService.listSolicitations(req.user!, {
        contractId: asString(req.query.contractId),
        status: asString(req.query.status),
      });
      res.json(solicitations);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const solicitation = await solicitationService.getSolicitationById(req.user!, req.params.id as string);
      res.json(solicitation);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const solicitation = await solicitationService.createSolicitation(req.user!, req.body);
      res.status(201).json(solicitation);
    } catch (error) {
      next(error);
    }
  }

  async updateItems(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await solicitationService.updateItems(req.user!, req.params.id as string, req.body.items);
      res.json(items);
    } catch (error) {
      next(error);
    }
  }

  async updateStep(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await solicitationService.updateStep(req.user!, req.params.id as string, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async revertStep(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await solicitationService.revertStep(req.user!, req.params.id as string, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await solicitationService.deleteSolicitation(req.user!, req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await solicitationService.getHistory(req.user!, req.params.id as string);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  async addHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const entry = await solicitationService.addHistory(req.user!, req.params.id as string, req.body);
      res.json(entry);
    } catch (error) {
      next(error);
    }
  }
}

export const solicitationController = new SolicitationController();

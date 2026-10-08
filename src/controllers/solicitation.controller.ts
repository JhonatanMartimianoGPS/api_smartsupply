import type { Request, Response, NextFunction } from "express";
import { solicitationService } from "../services/solicitation.service.js";

export class SolicitationController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { contractId, status } = req.query;
      const solicitations = await solicitationService.listSolicitations({
        contractId: contractId as string,
        status: status as string,
      });
      res.json(solicitations);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const solicitation = await solicitationService.getSolicitationById(req.params.id as string);
      res.json(solicitation);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const solicitation = await solicitationService.createSolicitation(userId, req.body);
      res.status(201).json(solicitation);
    } catch (error) {
      next(error);
    }
  }

  async updateItems(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await solicitationService.updateItems(req.params.id as string, req.body.items || []);
      res.json(items);
    } catch (error) {
      next(error);
    }
  }

  async updateStep(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await solicitationService.updateStep(req.params.id as string, userId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async revertStep(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await solicitationService.revertStep(req.params.id as string, userId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await solicitationService.deleteSolicitation(req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await solicitationService.getHistory(req.params.id as string);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  async addHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const entry = await solicitationService.addHistory(req.params.id as string, userId, req.body);
      res.json(entry);
    } catch (error) {
      next(error);
    }
  }
}

export const solicitationController = new SolicitationController();

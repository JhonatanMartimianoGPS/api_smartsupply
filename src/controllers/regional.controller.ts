import type { Request, Response, NextFunction } from "express";
import { regionalService } from "../services/regional.service.js";

export class RegionalController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const active = req.query.active !== undefined ? req.query.active === "true" : undefined;
      const regionals = await regionalService.list(active);
      res.json(regionals);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const regional = await regionalService.getById(req.params.id as string);
      res.json(regional);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const regional = await regionalService.create(req.body);
      res.status(201).json(regional);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const regional = await regionalService.update(req.params.id as string, req.body);
      res.json(regional);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await regionalService.delete(req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const regionalController = new RegionalController();

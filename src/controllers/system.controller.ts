import type { Request, Response, NextFunction } from "express";
import { systemService } from "../services/system.service.js";

export class SystemController {
  async getHealth(_req: Request, res: Response, next: NextFunction) {
    try {
      const health = await systemService.getHealth();
      res.json(health);
    } catch (error) {
      next(error);
    }
  }

  async ping(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await systemService.ping(req.query.service as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async listModules(_req: Request, res: Response, next: NextFunction) {
    try {
      const modules = await systemService.listModules();
      res.json(modules);
    } catch (error) {
      next(error);
    }
  }

  async updateModule(req: Request, res: Response, next: NextFunction) {
    try {
      const module = await systemService.updateModule(req.params.id as string, req.body);
      res.json(module);
    } catch (error) {
      next(error);
    }
  }

  async toggleModule(req: Request, res: Response, next: NextFunction) {
    try {
      const { is_enabled } = req.body;
      const module = await systemService.toggleModule(req.params.id as string, is_enabled);
      res.json(module);
    } catch (error) {
      next(error);
    }
  }

  async recordPresence(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await systemService.recordPresence(userId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getActivePresences(_req: Request, res: Response, next: NextFunction) {
    try {
      const presences = await systemService.getActivePresences();
      res.json(presences);
    } catch (error) {
      next(error);
    }
  }

  async listTeamMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await systemService.listTeamMembers(req.query.regionalId as string);
      res.json(members);
    } catch (error) {
      next(error);
    }
  }

  async createTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await systemService.createTeamMember(req.body);
      res.status(201).json(member);
    } catch (error) {
      next(error);
    }
  }

  async updateTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await systemService.updateTeamMember(req.params.id as string, req.body);
      res.json(member);
    } catch (error) {
      next(error);
    }
  }

  async deleteTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await systemService.deleteTeamMember(req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMinimumClientVersion(_req: Request, res: Response, next: NextFunction) {
    try {
      const config = await systemService.getMinimumClientVersion();
      res.json(config);
    } catch (error) {
      next(error);
    }
  }
}

export const systemController = new SystemController();

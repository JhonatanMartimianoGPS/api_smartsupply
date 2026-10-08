import type { Request, Response, NextFunction } from "express";
import { userService } from "../services/user.service.js";

export class UserController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, regionalId, search } = req.query;
      const users = await userService.listUsers({
        role: role as string,
        regionalId: regionalId as string,
        search: search as string,
      });
      res.json(users);
    } catch (error) {
      next(error);
    }
  }

  async listMentionable(_req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.listMentionable();
      res.json(users);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.getUserById(req.params.id as string);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.updateUser(req.params.id as string, req.body);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  async toggleBlock(req: Request, res: Response, next: NextFunction) {
    try {
      const { isBlocked, reason } = req.body;
      const user = await userService.toggleBlock(req.params.id as string, isBlocked, reason);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  async assignRegionals(req: Request, res: Response, next: NextFunction) {
    try {
      const { regionalIds } = req.body;
      const result = await userService.assignRegionals(req.params.id as string, regionalIds || []);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async assignContracts(req: Request, res: Response, next: NextFunction) {
    try {
      const { contractIds } = req.body;
      const result = await userService.assignContracts(req.params.id as string, contractIds || []);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.deleteUser(req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();

import type { Request, Response, NextFunction } from "express";
import { feedService } from "../services/feed.service.js";

export class FeedController {
  async listPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const { page, pageSize } = req.query;
      const result = await feedService.listPosts(userId, {
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createPost(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const post = await feedService.createPost(userId, req.body);
      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  }

  async updatePost(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const post = await feedService.updatePost(req.params.id as string, userId, req.body);
      res.json(post);
    } catch (error) {
      next(error);
    }
  }

  async deletePost(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const isAdmin = user.role === "super_admin" || user.role === "admin";
      const result = await feedService.deletePost(req.params.id as string, user.userId, isAdmin);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async togglePin(req: Request, res: Response, next: NextFunction) {
    try {
      const post = await feedService.togglePin(req.params.id as string);
      res.json(post);
    } catch (error) {
      next(error);
    }
  }

  async likePost(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await feedService.likePost(req.params.id as string, userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async unlikePost(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await feedService.unlikePost(req.params.id as string, userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async listComments(req: Request, res: Response, next: NextFunction) {
    try {
      const comments = await feedService.listComments(req.params.id as string);
      res.json(comments);
    } catch (error) {
      next(error);
    }
  }

  async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const comment = await feedService.addComment(req.params.id as string, userId, req.body.content);
      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  }

  async deleteComment(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const isAdmin = user.role === "super_admin" || user.role === "admin";
      const result = await feedService.deleteComment(req.params.id as string, user.userId, isAdmin);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const feedController = new FeedController();

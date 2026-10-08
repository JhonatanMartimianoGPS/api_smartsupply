import type { Request, Response, NextFunction } from "express";
import { notificationService } from "../services/notification.service.js";

export class NotificationController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const list = await notificationService.listNotifications(userId);
      res.json(list);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      await notificationService.markAsRead(req.params.id as string, userId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      await notificationService.markAllAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async markTicketNotificationsAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      await notificationService.markTicketNotificationsAsRead(req.params.ticketId as string, userId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await notificationService.deleteNotification(req.params.id as string, userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await notificationService.deleteAll(userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();

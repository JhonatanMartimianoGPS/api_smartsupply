import { prisma } from "../lib/prisma.js";

export class NotificationService {
  async listNotifications(userId: string) {
    const list = await prisma.appNotification.findMany({
      where: { userId },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    return list.map((n) => ({
      id: n.id,
      user_id: n.userId,
      ticket_id: n.ticketId,
      title: n.title,
      message: n.message,
      link: n.link,
      is_read: n.isRead,
      created_at: n.createdAt.toISOString(),
    }));
  }

  async markAsRead(id: string, userId: string) {
    return prisma.appNotification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.appNotification.updateMany({
      where: { userId },
      data: { isRead: true },
    });
  }

  async markTicketNotificationsAsRead(ticketId: string, userId: string) {
    return prisma.appNotification.updateMany({
      where: { ticketId, userId },
      data: { isRead: true },
    });
  }

  async deleteNotification(id: string, userId: string) {
    await prisma.appNotification.deleteMany({
      where: { id, userId },
    });
    return { id };
  }

  async deleteAll(userId: string) {
    await prisma.appNotification.deleteMany({
      where: { userId },
    });
    return { success: true };
  }
}

export const notificationService = new NotificationService();

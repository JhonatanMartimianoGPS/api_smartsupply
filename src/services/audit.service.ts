import type { Request } from "express";
import { prisma } from "../lib/prisma.js";

export interface CreateAuditLogParams {
  userId?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "APPROVE" | "REJECT" | "CANCEL" | "EXPORT" | "SYNC";
  entity: "Order" | "Contract" | "Product" | "User" | "StockEntrada" | "StockSaida" | "ServiceTicket" | "SystemConfig" | "Auth";
  entityId?: string | null;
  details?: string | null;
  diffBefore?: Record<string, unknown> | null;
  diffAfter?: Record<string, unknown> | null;
  req?: Request;
}

export interface AuditLogFilters {
  entity?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export class AuditService {
  /**
   * Grava uma entrada na trilha de auditoria global (LGPD, SOX, Governança)
   */
  async log(params: CreateAuditLogParams) {
    try {
      let ipAddress = params.req?.ip || null;
      if (params.req?.headers["x-forwarded-for"]) {
        const forwarded = params.req.headers["x-forwarded-for"];
        ipAddress = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0].trim();
      }

      const userAgent = (params.req?.headers["user-agent"] as string) || null;
      const userId = params.userId || (params.req as any)?.user?.userId || null;

      return await prisma.auditLog.create({
        data: {
          userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId || null,
          details: params.details || null,
          diffBefore: params.diffBefore ? JSON.parse(JSON.stringify(params.diffBefore)) : undefined,
          diffAfter: params.diffAfter ? JSON.parse(JSON.stringify(params.diffAfter)) : undefined,
          ipAddress,
          userAgent,
        },
      });
    } catch (err) {
      // Falha de auditoria não deve travar a requisição do usuário, mas deve ser registrada no console
      console.error("⚠️ [AuditLog Error]: Erro ao gravar trilha de auditoria:", err);
      return null;
    }
  }

  /**
   * Consulta paginada dos logs de auditoria
   */
  async listLogs(filters: AuditLogFilters) {
    const where: any = {};

    if (filters.entity) where.entity = filters.entity;
    if (filters.action) where.action = filters.action;
    if (filters.userId) where.userId = filters.userId;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const take = Math.min(filters.limit || 50, 100);
    const skip = filters.offset || 0;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
    ]);

    return {
      total,
      limit: take,
      offset: skip,
      logs: logs.map((l) => ({
        id: l.id,
        user_id: l.userId,
        user_name: l.user?.name || null,
        user_email: l.user?.email || null,
        action: l.action,
        entity: l.entity,
        entity_id: l.entityId,
        details: l.details,
        diff_before: l.diffBefore,
        diff_after: l.diffAfter,
        ip_address: l.ipAddress,
        user_agent: l.userAgent,
        created_at: l.createdAt.toISOString(),
      })),
    };
  }
}

export const auditService = new AuditService();

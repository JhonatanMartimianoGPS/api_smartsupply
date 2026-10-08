import { prisma } from "../lib/prisma.js";

export class SystemService {
  // ─── Telemetria e Saúde ─────────────────────────────────────────────────────
  async getHealth() {
    let dbStatus = "ok";
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "error";
    }
    const dbLatencyMs = Date.now() - start;

    return {
      status: dbStatus === "ok" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database: { status: dbStatus, latencyMs: dbLatencyMs },
        server: { status: "ok", uptime: process.uptime() },
      },
    };
  }

  async ping(service?: string) {
    const start = Date.now();
    if (service === "database") {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return { ok: true, latencyMs: Date.now() - start };
      } catch {
        return { ok: false, latencyMs: Date.now() - start };
      }
    }
    return { ok: true, latencyMs: 1 };
  }

  // ─── Módulos do Sistema ─────────────────────────────────────────────────────
  async listModules() {
    return prisma.systemModule.findMany({
      orderBy: { category: "asc" },
    });
  }

  async updateModule(id: string, data: { name?: string; category?: string; enabled?: boolean; roles?: string[] }) {
    return prisma.systemModule.update({
      where: { id },
      data,
    });
  }

  async toggleModule(id: string, is_enabled: boolean) {
    return prisma.systemModule.update({
      where: { id },
      data: { enabled: is_enabled },
    });
  }

  // ─── Presença de Usuários ───────────────────────────────────────────────────
  async recordPresence(userId: string, data: { ipAddress?: string; userAgent?: string; city?: string; region?: string }) {
    return prisma.userPresence.upsert({
      where: { id: userId }, // usando o userId como ID único de presença por simplicidade
      create: {
        id: userId,
        userId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        city: data.city,
        region: data.region,
        lastSeenAt: new Date(),
      },
      update: {
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        city: data.city,
        region: data.region,
        lastSeenAt: new Date(),
      },
    });
  }

  async getActivePresences() {
    const threshold = new Date(Date.now() - 15 * 60 * 1000); // últimos 15 min
    const presences = await prisma.userPresence.findMany({
      where: { lastSeenAt: { gte: threshold } },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
      },
      orderBy: { lastSeenAt: "desc" },
    });

    return presences.map((p) => ({
      userId: p.userId,
      userName: p.user.name,
      userEmail: p.user.email,
      role: p.user.role,
      avatarUrl: p.user.avatarUrl,
      lastSeenAt: p.lastSeenAt.toISOString(),
      city: p.city,
      region: p.region,
    }));
  }

  // ─── Membros da Equipe (Vitrine) ────────────────────────────────────────────
  async listTeamMembers(regionalId?: string) {
    const where: any = { active: true };
    if (regionalId) where.regionalId = regionalId;

    return prisma.teamMember.findMany({
      where,
      include: { regional: true },
      orderBy: { name: "asc" },
    });
  }

  async createTeamMember(data: { name: string; role: string; email?: string; phone?: string; regionalId?: string; avatarUrl?: string }) {
    return prisma.teamMember.create({ data });
  }

  async updateTeamMember(id: string, data: { name?: string; role?: string; email?: string; phone?: string; regionalId?: string; avatarUrl?: string; active?: boolean }) {
    return prisma.teamMember.update({
      where: { id },
      data,
    });
  }

  async deleteTeamMember(id: string) {
    return prisma.teamMember.update({
      where: { id },
      data: { active: false },
    });
  }

  // ─── AppConfig ──────────────────────────────────────────────────────────────
  async getMinimumClientVersion() {
    const config = await prisma.appConfig.findUnique({ where: { id: "default" } });
    return {
      minimum_client_version: config?.minimumClientVersion || "1.0.0",
      maintenance_mode: config?.maintenanceMode || false,
    };
  }
}

export const systemService = new SystemService();

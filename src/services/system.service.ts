import { Prisma, type SystemModule, type SystemModuleCategory } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import type {
  CreateSystemModuleCategoryInput,
  UpdateSystemModuleCategoryInput,
  UpdateSystemModuleInput,
} from "../schemas/system.schema.js";
import type { AccessUser } from "./access.service.js";
import { auditService } from "./audit.service.js";

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
  // Só o super_admin altera (no Supabase: policy "Allow super_admin to manage system_modules_config").
  // O perfil é checado na rota (authorize); aqui ficam as regras.

  // Transitório: o frontend lê o formato herdado do Supabase (is_enabled, route, badge, updated_at).
  private formatModule(m: SystemModule) {
    return {
      id: m.id,
      name: m.name,
      description: m.description ?? "",
      category: m.category,
      is_enabled: m.enabled,
      icon: m.icon ?? "",
      route: m.route ?? "",
      badge: m.badge,
      roles: m.roles,
      updated_at: m.updatedAt.toISOString(),
      updated_by: m.updatedById,
    };
  }

  async listModules() {
    const modules = await prisma.systemModule.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
    return modules.map((m) => this.formatModule(m));
  }

  private async findModule(id: string) {
    const module = await prisma.systemModule.findUnique({ where: { id } });
    if (!module) {
      throw new AppError(404, "Módulo não encontrado.");
    }
    return module;
  }

  async updateModule(user: AccessUser, id: string, data: UpdateSystemModuleInput) {
    const before = await this.findModule(id);
    if (data.category && data.category !== before.category) {
      await this.assertCategoryExists(data.category);
    }

    const module = await prisma.systemModule.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        enabled: data.is_enabled ?? data.enabled,
        icon: data.icon,
        route: data.route,
        badge: data.badge,
        roles: data.roles,
        updatedById: user.userId,
      },
    });

    void auditService.log({
      userId: user.userId,
      action: "UPDATE",
      entity: "SystemConfig",
      entityId: id,
      details: `Módulo "${module.name}" atualizado.`,
      diffBefore: this.formatModule(before),
      diffAfter: this.formatModule(module),
    });
    return this.formatModule(module);
  }

  async toggleModule(user: AccessUser, id: string, enabled: boolean) {
    await this.findModule(id);
    const module = await prisma.systemModule.update({
      where: { id },
      data: { enabled, updatedById: user.userId },
    });
    void auditService.log({
      userId: user.userId,
      action: "UPDATE",
      entity: "SystemConfig",
      entityId: id,
      details: `Módulo "${module.name}" ${enabled ? "ativado" : "desativado"}.`,
    });
    return this.formatModule(module);
  }

  async enableAllModules(user: AccessUser) {
    const result = await prisma.systemModule.updateMany({
      where: { enabled: false },
      data: { enabled: true, updatedById: user.userId },
    });
    void auditService.log({
      userId: user.userId,
      action: "UPDATE",
      entity: "SystemConfig",
      details: `${result.count} módulo(s) reativado(s) de uma vez.`,
    });
    return { updated: result.count };
  }

  // ─── Categorias de Módulos ──────────────────────────────────────────────────
  private formatCategory(c: SystemModuleCategory) {
    return {
      id: c.id,
      label: c.label,
      description: c.description,
      color: c.color,
      sort_order: c.sortOrder,
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    };
  }

  private async assertCategoryExists(id: string) {
    const count = await prisma.systemModuleCategory.count({ where: { id } });
    if (count === 0) {
      throw new AppError(400, "Categoria de módulo não encontrada.");
    }
  }

  /** Sem id, ele vem do rótulo: "Serviços & Salas" vira "servicos_salas" (mesma regra do frontend). */
  private slugFromLabel(label: string) {
    return label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50);
  }

  async listModuleCategories() {
    const categories = await prisma.systemModuleCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
    return categories.map((c) => this.formatCategory(c));
  }

  async createModuleCategory(user: AccessUser, data: CreateSystemModuleCategoryInput) {
    const id = data.id || this.slugFromLabel(data.label);
    if (!id) {
      throw new AppError(400, "Não foi possível gerar um identificador para a categoria.");
    }
    const sortOrder = data.sort_order ?? (await prisma.systemModuleCategory.count()) + 1;

    let category: SystemModuleCategory;
    try {
      category = await prisma.systemModuleCategory.create({
        data: {
          id,
          label: data.label,
          description: data.description ?? null,
          color: data.color ?? "indigo",
          sortOrder,
        },
      });
    } catch (error) {
      // P2002 = chave duplicada: alguém criou a mesma categoria antes
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(409, "Já existe uma categoria com esse identificador.");
      }
      throw error;
    }

    void auditService.log({
      userId: user.userId,
      action: "CREATE",
      entity: "SystemConfig",
      entityId: id,
      details: `Categoria de módulo "${category.label}" criada.`,
    });
    return this.formatCategory(category);
  }

  async updateModuleCategory(user: AccessUser, id: string, data: UpdateSystemModuleCategoryInput) {
    await this.assertCategoryExists(id);
    const category = await prisma.systemModuleCategory.update({
      where: { id },
      data: {
        label: data.label,
        description: data.description,
        color: data.color,
        sortOrder: data.sort_order,
      },
    });
    void auditService.log({
      userId: user.userId,
      action: "UPDATE",
      entity: "SystemConfig",
      entityId: id,
      details: `Categoria de módulo "${category.label}" atualizada.`,
    });
    return this.formatCategory(category);
  }

  async deleteModuleCategory(user: AccessUser, id: string) {
    await this.assertCategoryExists(id);
    const linked = await prisma.systemModule.count({ where: { category: id } });
    if (linked > 0) {
      throw new AppError(409, `A categoria tem ${linked} módulo(s) vinculado(s). Mova os módulos para outra categoria antes de excluí-la.`);
    }
    await prisma.systemModuleCategory.delete({ where: { id } });
    void auditService.log({
      userId: user.userId,
      action: "DELETE",
      entity: "SystemConfig",
      entityId: id,
      details: `Categoria de módulo "${id}" excluída.`,
    });
    return { id };
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

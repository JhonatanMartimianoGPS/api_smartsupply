import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import { notificationService } from "./notification.service.js";

export class SolicitationService {
  async listSolicitations(params?: { contractId?: string; status?: string }) {
    const where: any = {};
    if (params?.contractId) where.contractId = params.contractId;
    if (params?.status) where.status = params.status;

    return prisma.solicitation.findMany({
      where,
      include: {
        contract: { include: { regional: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getSolicitationById(id: string) {
    const s = await prisma.solicitation.findUnique({
      where: { id },
      include: {
        contract: { include: { regional: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } },
        history: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!s) {
      throw new AppError(404, "Solicitação não encontrada.");
    }
    return s;
  }

  async createSolicitation(
    userId: string,
    data: {
      contractId: string;
      items: Array<{ product_id: string; quantity: number; unit_price?: number; description?: string }>;
      notes?: string;
    },
  ) {
    let totalAmount = 0;
    const itemsToCreate = data.items.map((it) => {
      const price = it.unit_price || 0;
      totalAmount += price * it.quantity;
      return {
        productId: it.product_id,
        quantity: it.quantity,
        unitPrice: price,
        description: it.description,
      };
    });

    const solicitation = await prisma.solicitation.create({
      data: {
        contractId: data.contractId,
        createdById: userId,
        status: "pendente",
        step: "gestor",
        notes: data.notes,
        totalAmount,
        items: { create: itemsToCreate },
        history: {
          create: {
            userId,
            action: "Criação de Solicitação Especial",
            step: "gestor",
            notes: data.notes,
          },
        },
      },
      include: {
        contract: true,
        items: true,
      },
    });

    await notificationService.solicitationCreated({
      solicitationId: solicitation.id,
      contract: solicitation.contract,
      actorId: userId,
    });
    return solicitation;
  }

  async updateItems(
    id: string,
    items: Array<{ product_id: string; quantity: number; unit_price?: number; description?: string }>,
  ) {
    const s = await prisma.solicitation.findUnique({ where: { id } });
    if (!s) {
      throw new AppError(404, "Solicitação não encontrada.");
    }

    await prisma.solicitationItem.deleteMany({ where: { solicitationId: id } });

    let totalAmount = 0;
    const itemsToCreate = items.map((it) => {
      const price = it.unit_price || 0;
      totalAmount += price * it.quantity;
      return {
        solicitationId: id,
        productId: it.product_id,
        quantity: it.quantity,
        unitPrice: price,
        description: it.description,
      };
    });

    await prisma.solicitationItem.createMany({ data: itemsToCreate });
    await prisma.solicitation.update({
      where: { id },
      data: { totalAmount },
    });

    return prisma.solicitationItem.findMany({ where: { solicitationId: id } });
  }

  async updateStep(
    id: string,
    userId: string,
    data: {
      step: string;
      status: string;
      notes?: string | null;
      fromStep?: string | null;
      action?: string;
    },
  ) {
    const s = await prisma.solicitation.findUnique({ where: { id } });
    if (!s) {
      throw new AppError(404, "Solicitação não encontrada.");
    }

    const updated = await prisma.solicitation.update({
      where: { id },
      data: {
        step: data.step,
        status: data.status,
        history: {
          create: {
            userId,
            action: data.action || `Avanço de etapa: ${data.fromStep || s.step} -> ${data.step}`,
            step: data.step,
            notes: data.notes,
          },
        },
      },
      include: {
        contract: true,
        items: true,
      },
    });

    // Avisa quem criou a solicitação quando o status ou a etapa mudou
    if (s.status !== updated.status || s.step !== updated.step) {
      await notificationService.solicitationStatusChanged({
        solicitationId: id,
        contractName: updated.contract.name,
        creatorId: updated.createdById,
        status: updated.status,
        step: updated.step,
      });
    }

    return updated;
  }

  async revertStep(
    id: string,
    userId: string,
    data: { currentStep: string; previousStep: string; notes?: string },
  ) {
    return this.updateStep(id, userId, {
      step: data.previousStep,
      status: "em_revisao",
      fromStep: data.currentStep,
      action: `Reversão de etapa: ${data.currentStep} -> ${data.previousStep}`,
      notes: data.notes,
    });
  }

  async deleteSolicitation(id: string) {
    const s = await prisma.solicitation.findUnique({ where: { id } });
    if (!s) {
      throw new AppError(404, "Solicitação não encontrada.");
    }
    await prisma.solicitation.delete({ where: { id } });
    return { id, deleted: true };
  }

  async getHistory(id: string) {
    return prisma.solicitationHistory.findMany({
      where: { solicitationId: id },
      orderBy: { createdAt: "desc" },
    });
  }

  async addHistory(id: string, userId: string, data: { action: string; notes?: string }) {
    return prisma.solicitationHistory.create({
      data: {
        solicitationId: id,
        userId,
        action: data.action,
        notes: data.notes,
      },
    });
  }
}

export const solicitationService = new SolicitationService();

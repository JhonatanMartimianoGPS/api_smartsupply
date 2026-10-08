import type { Request, Response, NextFunction } from "express";
import { ticketService } from "../services/ticket.service.js";
import { storageService } from "../services/storage.service.js";

export class TicketController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { contractId, regionalId, status, priority } = req.query;
      const tickets = await ticketService.listTickets({
        contractId: contractId as string,
        regionalId: regionalId as string,
        status: status as string,
        priority: priority as string,
      });
      res.json(tickets);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.getTicketById(req.params.id as string);
      res.json(ticket);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const ticket = await ticketService.createTicket(userId, req.body);
      res.status(201).json(ticket);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const ticket = await ticketService.updateStatus(req.params.id as string, status);
      res.json(ticket);
    } catch (error) {
      next(error);
    }
  }

  async updatePriority(req: Request, res: Response, next: NextFunction) {
    try {
      const { priority } = req.body;
      const ticket = await ticketService.updatePriority(req.params.id as string, priority);
      res.json(ticket);
    } catch (error) {
      next(error);
    }
  }

  async updateCost(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.updateCost(req.params.id as string, req.body);
      res.json(ticket);
    } catch (error) {
      next(error);
    }
  }

  async updateSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.updateSupplier(req.params.id as string, req.body);
      res.json(ticket);
    } catch (error) {
      next(error);
    }
  }

  async attend(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.attend(req.params.id as string, req.body);
      res.json(ticket);
    } catch (error) {
      next(error);
    }
  }

  async startAttention(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.startAttention(req.params.id as string);
      res.json(ticket);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ticketService.deleteTicket(req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async listTypes(_req: Request, res: Response, next: NextFunction) {
    try {
      const types = await ticketService.listTypes();
      res.json(types);
    } catch (error) {
      next(error);
    }
  }

  async listFlows(_req: Request, res: Response, next: NextFunction) {
    try {
      const flows = await ticketService.listFlows();
      res.json(flows);
    } catch (error) {
      next(error);
    }
  }

  // ─── Etapas (Steps) ─────────────────────────────────────────────────────────
  async addStep(req: Request, res: Response, next: NextFunction) {
    try {
      const step = await ticketService.addStep(req.params.id as string, req.body.title);
      res.status(201).json(step);
    } catch (error) {
      next(error);
    }
  }

  async toggleStep(req: Request, res: Response, next: NextFunction) {
    try {
      const step = await ticketService.toggleStep(req.params.stepId as string);
      res.json(step);
    } catch (error) {
      next(error);
    }
  }

  async deleteStep(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ticketService.deleteStep(req.params.stepId as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ─── Mensagens ──────────────────────────────────────────────────────────────
  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const messages = await ticketService.getMessages(req.params.id as string);
      res.json(messages);
    } catch (error) {
      next(error);
    }
  }

  async addMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const { message, isInternal } = req.body;
      const msg = await ticketService.addMessage(req.params.id as string, userId, message, isInternal);
      res.status(201).json(msg);
    } catch (error) {
      next(error);
    }
  }

  async deleteMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ticketService.deleteMessage(req.params.messageId as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ─── Anexos ─────────────────────────────────────────────────────────────────
  async getAttachments(req: Request, res: Response, next: NextFunction) {
    try {
      const attachments = await ticketService.getAttachments(req.params.id as string);
      res.json(attachments);
    } catch (error) {
      next(error);
    }
  }

  async addAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      let { fileName, fileUrl, fileType, fileSize } = req.body;

      if (req.file) {
        const info = storageService.formatUploadResult(req.file, "ticket-attachments");
        fileName = fileName || info.originalName;
        fileUrl = fileUrl || info.url;
        fileType = fileType || info.mimeType;
        fileSize = fileSize || info.size;
      }

      if (!fileUrl || !fileName) {
        return res.status(400).json({
          statusCode: 400,
          message: "Arquivo ou fileUrl/fileName é obrigatório.",
          error: "Bad Request",
        });
      }

      const attachment = await ticketService.addAttachment(req.params.id as string, {
        fileName,
        fileUrl,
        fileType,
        fileSize: fileSize ? Number(fileSize) : undefined,
        uploadedBy: userId,
      });
      res.status(201).json(attachment);
    } catch (error) {
      next(error);
    }
  }

  async deleteAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ticketService.deleteAttachment(req.params.attachmentId as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ─── Produtos ───────────────────────────────────────────────────────────────
  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await ticketService.getProducts(req.params.id as string);
      res.json(products);
    } catch (error) {
      next(error);
    }
  }

  async addProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ticketService.addProduct(req.params.id as string, req.body);
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ticketService.deleteProduct(req.params.productId as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const ticketController = new TicketController();

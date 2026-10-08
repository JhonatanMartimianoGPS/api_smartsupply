import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Request } from "express";
import { env } from "../config/env.js";
import { AppError } from "../middlewares/error.middleware.js";

export type StorageBucket = "product-images" | "ticket-attachments" | "feed-attachments" | "avatars" | "stock-photos";

export interface StoredFileInfo {
  url: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  bucket: StorageBucket;
}

export class StorageService {
  private uploadsRoot: string;

  constructor() {
    this.uploadsRoot = path.join(process.cwd(), "uploads");
    this.ensureDirectoryExists(this.uploadsRoot);
  }

  private ensureDirectoryExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Retorna middleware do Multer configurado para um bucket específico
   */
  getUploadMiddleware(bucket: StorageBucket, fieldName: string = "file", maxSizeBytes: number = 25 * 1024 * 1024) {
    const bucketDir = path.join(this.uploadsRoot, bucket);
    this.ensureDirectoryExists(bucketDir);

    const storage = multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, bucketDir);
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || "";
        const safeName = `${crypto.randomUUID()}${ext}`;
        cb(null, safeName);
      },
    });

    const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      // Lista de tipos permitidos para arquivos corporativos
      const allowedMimes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/svg+xml",
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/csv",
        "text/plain",
      ];

      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new AppError(400, `Tipo de arquivo não permitido (${file.mimetype}). Apenas imagens, PDFs e planilhas são aceitos.`));
      }
    };

    return multer({
      storage,
      limits: { fileSize: maxSizeBytes },
      fileFilter,
    }).single(fieldName);
  }

  /**
   * Converte arquivo salvo no disco para objeto com URL pública
   */
  formatUploadResult(file: Express.Multer.File, bucket: StorageBucket): StoredFileInfo {
    const baseUrl = env.STORAGE_BASE_URL.replace(/\/$/, "");
    const publicUrl = `${baseUrl}/uploads/${bucket}/${file.filename}`;

    return {
      url: publicUrl,
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      bucket,
    };
  }

  /**
   * Remove arquivo do storage
   */
  async deleteFile(bucket: StorageBucket, fileName: string): Promise<boolean> {
    const filePath = path.join(this.uploadsRoot, bucket, fileName);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  }
}

export const storageService = new StorageService();

import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { toSnakeKey } from "../lib/serialize.js";

export function validate(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // O cliente envia snake_case (docs/api-contract.md): o nome do campo na mensagem segue o que ele enviou
        const errorMessages = error.issues
          .map((i) => `${i.path.map((p) => (typeof p === "string" ? toSnakeKey(p) : p)).join(".")}: ${i.message}`)
          .join(", ");
        return res.status(400).json({
          statusCode: 400,
          message: `Dados inválidos: ${errorMessages}`,
          error: "Bad Request",
          details: error.issues,
        });
      }
      next(error);
    }
  };
}

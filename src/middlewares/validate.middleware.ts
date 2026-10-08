import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validate(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
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

import type { Request, Response, NextFunction } from "express";
import { serialize, toCamelCase } from "../lib/serialize.js";

/**
 * Aplica a convenção da API (docs/api-contract.md) a um router:
 * - corpo de entrada em snake_case vira camelCase antes dos schemas e services
 * - toda resposta via res.json sai em snake_case (Decimal vira número, Date vira ISO)
 *
 * - query params em snake_case (?contract_id=) viram camelCase; camelCase continua aceito enquanto o front migra
 *
 * Vale para todos os routers, menos /stock/* (exceção do contrato).
 */
export function apiConvention(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    req.body = toCamelCase(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = toCamelCase(req.query) as typeof req.query;
  }
  const json = res.json.bind(res);
  res.json = (body: unknown) => json(serialize(body));
  next();
}

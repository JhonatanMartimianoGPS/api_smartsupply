import type { Request, Response, NextFunction } from "express";
import { serialize, toCamelCase } from "../lib/serialize.js";

/**
 * Aplica a convenção da API (docs/api-contract.md) a um router:
 * - corpo de entrada em snake_case vira camelCase antes dos schemas e services
 * - toda resposta via res.json sai em snake_case (Decimal vira número, Date vira ISO)
 *
 * Registrado router a router enquanto os recursos migram; no fim passa a valer para a API inteira.
 * Query params não são tocados (são URL, não JSON).
 */
export function apiConvention(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    req.body = toCamelCase(req.body);
  }
  const json = res.json.bind(res);
  res.json = (body: unknown) => json(serialize(body));
  next();
}

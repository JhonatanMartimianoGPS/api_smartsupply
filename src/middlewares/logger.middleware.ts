import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();

  // Garante que o requestId viaje de volta no header e no objeto req
  res.setHeader("X-Request-Id", requestId);
  (req as any).requestId = requestId;

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      method,
      path: originalUrl,
      statusCode,
      durationMs: duration,
      ip: ip || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"] || "unknown",
    };

    // Log estruturado em JSON para ingestão corporativa (Azure Application Insights, Datadog, etc.)
    if (statusCode >= 400) {
      console.warn(JSON.stringify({ level: "warn", ...logEntry }));
    } else {
      console.log(JSON.stringify({ level: "info", ...logEntry }));
    }
  });

  next();
}

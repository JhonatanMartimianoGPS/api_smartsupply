import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";

interface RequestMetric {
  method: string;
  route: string;
  status: number;
  count: number;
  totalDurationMs: number;
}

const metricsMap = new Map<string, RequestMetric>();
let totalRequests = 0;
const startTime = Date.now();

export function metricsCollector(req: Request, res: Response, next: NextFunction) {
  // Ignora chamadas ao próprio /metrics e static files para não poluir
  if (req.path === "/metrics" || req.path.startsWith("/uploads")) {
    return next();
  }

  const start = performance.now();
  totalRequests++;

  res.on("finish", () => {
    const duration = performance.now() - start;
    const route = req.baseUrl + (req.route?.path || req.path);
    const key = `${req.method}|${route}|${res.statusCode}`;

    const existing = metricsMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalDurationMs += duration;
    } else {
      metricsMap.set(key, {
        method: req.method,
        route,
        status: res.statusCode,
        count: 1,
        totalDurationMs: duration,
      });
    }
  });

  next();
}

export async function metricsHandler(req: Request, res: Response) {
  const mem = process.memoryUsage();
  const uptime = (Date.now() - startTime) / 1000;

  // DB ping
  let dbStatus = 1;
  let dbPingMs = 0;
  try {
    const dbStart = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    dbPingMs = Math.round(performance.now() - dbStart);
  } catch {
    dbStatus = 0;
  }

  // Se o cliente pedir JSON explicitamente
  if (req.headers.accept?.includes("application/json") || req.query.format === "json") {
    const httpMetrics = Array.from(metricsMap.values()).map((m) => ({
      method: m.method,
      route: m.route,
      statusCode: m.status,
      count: m.count,
      avgLatencyMs: Number((m.totalDurationMs / m.count).toFixed(2)),
    }));

    return res.json({
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(uptime),
      process: {
        memory: {
          heapUsedBytes: mem.heapUsed,
          heapTotalBytes: mem.heapTotal,
          rssBytes: mem.rss,
        },
        cpu: process.cpuUsage(),
      },
      database: {
        status: dbStatus === 1 ? "connected" : "disconnected",
        pingLatencyMs: dbPingMs,
      },
      traffic: {
        totalRequests,
        endpoints: httpMetrics,
      },
    });
  }

  // Formato padrão: Prometheus exposition format (text/plain)
  let prometheusOutput = "";
  prometheusOutput += `# HELP process_uptime_seconds Servidor rodando em segundos.\n`;
  prometheusOutput += `# TYPE process_uptime_seconds gauge\n`;
  prometheusOutput += `process_uptime_seconds ${uptime.toFixed(1)}\n\n`;

  prometheusOutput += `# HELP nodejs_memory_heap_used_bytes Memória heap usada em bytes.\n`;
  prometheusOutput += `# TYPE nodejs_memory_heap_used_bytes gauge\n`;
  prometheusOutput += `nodejs_memory_heap_used_bytes ${mem.heapUsed}\n\n`;

  prometheusOutput += `# HELP nodejs_memory_rss_bytes Memória RSS total do processo em bytes.\n`;
  prometheusOutput += `# TYPE nodejs_memory_rss_bytes gauge\n`;
  prometheusOutput += `nodejs_memory_rss_bytes ${mem.rss}\n\n`;

  prometheusOutput += `# HELP db_up Conectividade com o banco PostgreSQL (1 = UP, 0 = DOWN).\n`;
  prometheusOutput += `# TYPE db_up gauge\n`;
  prometheusOutput += `db_up ${dbStatus}\n\n`;

  prometheusOutput += `# HELP db_ping_latency_ms Latência do round-trip no PostgreSQL em ms.\n`;
  prometheusOutput += `# TYPE db_ping_latency_ms gauge\n`;
  prometheusOutput += `db_ping_latency_ms ${dbPingMs}\n\n`;

  prometheusOutput += `# HELP http_requests_total Total acumulado de requisições HTTP por rota e status.\n`;
  prometheusOutput += `# TYPE http_requests_total counter\n`;
  for (const m of metricsMap.values()) {
    const escapedRoute = m.route.replace(/"/g, '\\"');
    prometheusOutput += `http_requests_total{method="${m.method}",route="${escapedRoute}",status="${m.status}"} ${m.count}\n`;
  }

  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  return res.send(prometheusOutput);
}

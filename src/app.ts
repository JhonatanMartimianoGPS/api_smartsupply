import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { requestLogger } from "./middlewares/logger.middleware.js";
import { metricsCollector, metricsHandler } from "./middlewares/metrics.middleware.js";
import { swaggerSpec } from "./docs/swagger.js";
import { prisma } from "./lib/prisma.js";

const app = express();

// 1. Segurança HTTP corporativa (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: false, // Permitir que o SPA e o Swagger UI carreguem assets
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Telemetria e Métricas de Runtime (Prometheus / JSON)
app.use(metricsCollector);

// 3. Logging estruturado e Correlation-ID (X-Request-Id)
app.use(requestLogger);

// 4. CORS Empresarial
const allowedOrigins = (env.CORS_ORIGIN || "").split(",").map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        env.CORS_ORIGIN === "*" ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      callback(new Error(`Origem ${origin} não permitida por CORS`));
    },
    credentials: true,
  })
);

// 5. Body parsers com limite razoável (10MB)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 6. Servir arquivos estáticos de uploads locais (imagens de produtos, anexos, avatares)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// 7. Rate Limiting corporativo geral (1000 req/15min por IP)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    message: "Muitas requisições originadas deste IP. Tente novamente em alguns minutos.",
    error: "Too Many Requests",
  },
  skip: (req) =>
    req.path === "/health" ||
    req.path === "/ready" ||
    req.path === "/metrics" ||
    req.path.startsWith("/api-docs"),
});
app.use(generalLimiter);

// 8. Rate Limiting estrito para proteção de força bruta em autenticação (15 tentativas / 15min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    message: "Muitas tentativas de login consecutivas. Por segurança, tente novamente em 15 minutos.",
    error: "Too Many Requests",
  },
});
app.use("/api/v1/auth/login", authLimiter);

// 9. Endpoints de Healthcheck e Readiness para Azure / Kubernetes
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ready",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: "unready",
      database: "disconnected",
      error: error?.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 10. Endpoint de Observabilidade e Métricas (/metrics)
app.get("/metrics", metricsHandler);

// 11. Documentação Interativa de APIs (Swagger UI OpenAPI 3.0)
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "GPS Bridge API Docs — Padrão Corporativo",
  })
);

// 12. Montar rotas da API em /api/v1
app.use("/api/v1", apiRouter);

// 13. Rota 404 para rotas não mapeadas
app.use((req, res) => {
  res.status(404).json({
    statusCode: 404,
    message: `Rota ${req.method} ${req.path} não encontrada no GPS Bridge Server`,
    error: "Not Found",
  });
});

// 14. Middleware global de erros
app.use(errorHandler);

export { app };

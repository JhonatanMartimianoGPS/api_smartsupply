import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const PORT = Number(env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 [GPS Bridge Server] Rodando na porta ${PORT} (${env.NODE_ENV})`);
  console.log(`📡 [Health Check]:  http://localhost:${PORT}/health`);
  console.log(`📊 [Metrics]:       http://localhost:${PORT}/metrics`);
  console.log(`📑 [Swagger Docs]:  http://localhost:${PORT}/api-docs`);
  console.log(`🔐 [Auth Service]:  http://localhost:${PORT}/api/v1/auth/login`);
});

// Tratamento robusto de Graceful Shutdown corporativo (SIGINT / SIGTERM)
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 [Shutdown] Recebido sinal ${signal}. Encerrando conexões graciosamente...`);

  // Forçar saída caso o fechamento trave por mais de 5 segundos
  const forceExitTimeout = setTimeout(() => {
    console.error("⚠️ [Shutdown] Tempo limite de encerramento excedido. Forçando encerramento.");
    process.exit(1);
  }, 5000);
  forceExitTimeout.unref();

  server.close(async () => {
    console.log("🛑 [Shutdown] Servidor HTTP não aceita mais conexões.");
    try {
      await prisma.$disconnect();
      console.log("🛑 [Shutdown] Pool do PostgreSQL (Prisma) desconectado com segurança.");
    } catch (err) {
      console.error("❌ [Shutdown] Erro ao desconectar Prisma:", err);
    }
    console.log("✅ [Shutdown] Servidor finalizado com sucesso.");
    process.exit(0);
  });
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

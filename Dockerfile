# Multi-stage Dockerfile otimizado para produção na Azure (Container Apps / App Service)
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências do sistema necessárias para compilação nativa se houver
RUN apk add --no-cache openssl libc6-compat

# Copia manifests de pacotes
COPY package*.json ./

# Instala todas as dependências (inclusive dev para o build do TypeScript)
RUN npm ci

# Copia schema do Prisma e gera o cliente
COPY prisma ./prisma
RUN npx prisma generate

# Copia código-fonte e compila TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Remove dependências de desenvolvimento para economizar espaço
RUN npm prune --omit=dev

# -------------------------------------------------------------
# Runtime stage
# -------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=3000

# Cria usuário não-root por segurança corporativa
USER node

# Copia artefatos da etapa de build com permissões corretas
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma

EXPOSE 3000

# Healthcheck do container
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]

# =============================================================================
# Portal CenterNet — Dockerfile de Produção (Multi-stage)
# Otimizado para AWS Lightsail / EC2 / qualquer Docker host
#
# Build:  docker build -t centernet-portal .
# Run:    docker run -d --name portal -p 3000:3000 --env-file .env centernet-portal
# =============================================================================

# --- Stage 1: Dependencies ---
FROM node:22-alpine AS deps
WORKDIR /app

# Instalar dependências de sistema necessárias
RUN apk add --no-cache libc6-compat

# Copiar arquivos de dependência
COPY package.json pnpm-lock.yaml* ./

# Instalar pnpm e dependências
RUN corepack enable pnpm && pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# --- Stage 2: Build ---
FROM node:22-alpine AS builder
WORKDIR /app

# Copiar dependências instaladas
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis necessárias para o build (Next.js precisa em build time)
# Valores dummy — os reais são passados em runtime
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build da aplicação
RUN corepack enable pnpm && pnpm run build

# --- Stage 3: Production ---
FROM node:22-alpine AS runner
WORKDIR /app

# Segurança: não rodar como root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copiar apenas o necessário para produção
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Permissões
RUN chown -R nextjs:nodejs /app

# Rodar como usuário não-root
USER nextjs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Iniciar aplicação
CMD ["node", "server.js"]

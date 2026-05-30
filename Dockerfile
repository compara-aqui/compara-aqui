# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências do Playwright
RUN apk add --no-cache \
  chromium \
  firefox \
  dumb-init

# Copia package files
COPY package*.json ./
COPY prisma ./prisma/

# Instala dependências
RUN npm ci --only=production && \
  npm install --save-dev prisma @prisma/client

# Gera client do Prisma
RUN npx prisma generate

# Copia código-fonte
COPY . .

# Compila Next.js
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Instala Playwright browsers
RUN apk add --no-cache \
  chromium \
  firefox \
  dumb-init \
  curl

# Instala Playwright globalmente
RUN npm install -g playwright

# Copia node_modules do build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma/

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV DATABASE_URL="file:./data/prod.db"

# Cria diretório para BD
RUN mkdir -p /app/data

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Inicia com dumb-init para gerenciar sinais
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Comando padrão
CMD ["npm", "run", "start"]

EXPOSE 3000

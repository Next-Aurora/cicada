# cicada - Docker 镜像（多阶段：pnpm 构建 → standalone 运行）
# Node 版本与 .github/nodejs.version / package.json engines 对齐

FROM node:24-alpine AS deps

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /app

ENV NPM_CONFIG_FETCH_TIMEOUT=120000
ENV CI=1

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV CI=1
# prisma generate / 构建期占位，运行时由 compose 注入真实 DATABASE_URL
ENV DATABASE_URL="mysql://build:build@127.0.0.1:3306/cicada"

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY . .

RUN pnpm build

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

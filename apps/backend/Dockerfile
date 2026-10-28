FROM node:20-alpine AS base
RUN npm install -g pnpm@9.0.0

FROM base AS pruner
RUN npm install -g turbo
WORKDIR /app
COPY . .
RUN turbo prune backend --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/full/ .
RUN pnpm install --frozen-lockfile
RUN pnpm run build --filter=backend

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN mkdir -p /data && chown -R node:node /data

COPY --from=pruner /app/out/json/ .
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/utils ./packages/utils

RUN pnpm install --prod --frozen-lockfile

USER node
EXPOSE 3000
ENV PORT=3000
ENV DATABASE_NAME=/data/database.sqlite

WORKDIR /app/apps/backend
CMD ["node", "dist/main.js"]

FROM node:20-alpine AS base
RUN npm install -g pnpm@9.0.0

FROM base AS pruner
RUN npm install -g turbo
WORKDIR /app
COPY . .
RUN turbo prune frontend --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/full/ .
RUN pnpm install --frozen-lockfile

# Argumento de build para configurar a URL do backend dinamicamente
ARG API_URL
RUN if [ -n "$API_URL" ]; then \
      sed -i "s|apiUrl: 'https://api.ueg.br'|apiUrl: '${API_URL}'|g" apps/frontend/src/environments/environment.prod.ts; \
    fi

RUN pnpm run build --filter=frontend

FROM nginx:alpine AS runner
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

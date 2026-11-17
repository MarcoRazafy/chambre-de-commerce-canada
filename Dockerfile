# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV TZ=Indian/Antananarivo \
    NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Seulement l'outil Prisma (aux versions du package-lock), pour « prisma migrate deploy » au démarrage :
# l'image finale n'embarque plus tout node_modules.
FROM base AS migrate
WORKDIR /migrate
COPY package-lock.json ./
RUN node -e "const l = require('./package-lock.json').packages; const v = (n) => l['node_modules/' + n].version; require('fs').writeFileSync('package.json', JSON.stringify({ private: true, dependencies: { prisma: v('prisma'), dotenv: v('dotenv') } }))" \
 && rm package-lock.json \
 && npm install --omit=dev --no-audit --no-fund
COPY prisma.config.ts ./
COPY prisma ./prisma

FROM base AS run
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libreoffice-writer-nogui \
      poppler-utils \
      fonts-liberation2 \
      fonts-dejavu-core \
      fonts-crosextra-carlito \
      fonts-crosextra-caladea \
 && rm -rf /var/lib/apt/lists/*
# output: "standalone" (next.config.ts) : server.js et le sous-ensemble de node_modules qu'il utilise.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=migrate /migrate ./migrate
EXPOSE 3000
CMD ["sh", "-c", "cd migrate && node_modules/.bin/prisma migrate deploy && cd .. && exec node server.js"]

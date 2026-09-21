FROM node:22-alpine AS base
RUN apk add --no-cache openssl ca-certificates postgresql17 postgresql17-contrib
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1200
RUN npx prisma generate && npx next build --webpack

# Prisma CLI (with its own deps and engine binaries, fetched at build time) for `migrate deploy` on start.
FROM base AS prisma-cli
RUN npm install --prefix /prisma-cli --no-audit --no-fund prisma@6.19.3 && /prisma-cli/node_modules/.bin/prisma --version

FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=prisma-cli --chown=node:node /prisma-cli /prisma-cli
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node docker-entrypoint.sh ./
ENV PGDATA=/data/pg 
RUN mkdir /data && chown node:node /data
VOLUME /data
USER node
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]

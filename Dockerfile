# syntax=docker/dockerfile:1

# ---- JS/TS SDK -------------------------------------------------------------

FROM node:22-alpine AS js-base
WORKDIR /app/js
COPY js/ ./

FROM js-base AS js-node
RUN npm ci
CMD ["npm", "test"]

FROM oven/bun:1 AS js-bun
WORKDIR /app/js
COPY --from=js-base /app/js ./
RUN bun install
CMD ["bun", "run", "test"]

# ---- PHP SDK ----------------------------------------------------------------
# (php-* stages will be added here once php/ is implemented)

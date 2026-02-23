FROM node:20-alpine AS base
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm build

EXPOSE 3000
ENV NODE_ENV=production
CMD ["pnpm", "start"]

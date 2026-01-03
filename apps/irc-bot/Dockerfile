# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY patches ./patches
COPY apps/irc-bot/package.json apps/irc-bot/
RUN pnpm install --frozen-lockfile --filter ./apps/irc-bot...

FROM deps AS build
COPY apps/irc-bot ./apps/irc-bot
# Fail fast if build does not emit dist
RUN pnpm --filter ./apps/irc-bot... build \
  && test -f apps/irc-bot/dist/index.js

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY patches ./patches
COPY apps/irc-bot/package.json apps/irc-bot/
RUN pnpm install --frozen-lockfile --prod --filter ./apps/irc-bot...
COPY --from=build /app/apps/irc-bot/dist ./apps/irc-bot/dist
WORKDIR /app/apps/irc-bot
CMD ["node", "dist/index.js"]

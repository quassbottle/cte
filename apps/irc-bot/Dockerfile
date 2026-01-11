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
COPY packages/contracts/package.json packages/contracts/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/prettier-config/package.json packages/prettier-config/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/irc-bot ./apps/irc-bot
COPY packages ./packages
RUN pnpm --filter @cte/contracts... build
# Fail fast if build does not emit dist
RUN pnpm --filter ./apps/irc-bot... build \
  && test -f apps/irc-bot/dist/index.js

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY patches ./patches
COPY apps/irc-bot/package.json apps/irc-bot/
COPY packages/contracts/package.json packages/contracts/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/prettier-config/package.json packages/prettier-config/
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/apps/irc-bot/dist ./apps/irc-bot/dist
WORKDIR /app/apps/irc-bot
CMD ["node", "dist/index.js"]

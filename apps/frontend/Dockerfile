FROM oven/bun:1.3.14 AS build

WORKDIR /app

COPY apps/frontend/package.json ./package.json

RUN bun install --no-save

COPY apps/frontend ./

RUN bun run build

FROM oven/bun:1.3.14 AS runtime

ENV NODE_ENV=production
ENV HTTP_HOST=0.0.0.0
ENV HTTP_PORT=3000

WORKDIR /app

COPY --from=build /app/build ./build

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=6 \
  CMD ["bun", "-e", "fetch('http://127.0.0.1:3000/').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]

CMD ["bun", "build/index.js"]

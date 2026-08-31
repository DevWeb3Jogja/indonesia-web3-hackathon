# syntax=docker/dockerfile:1
# Build dari ROOT monorepo (context = repo root). Next standalone output.
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# NEXT_PUBLIC_* di-inline saat build → WAJIB tersedia sebagai build args.
ARG NEXT_PUBLIC_WC_PROJECT_ID
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_WC_PROJECT_ID=$NEXT_PUBLIC_WC_PROJECT_ID \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter backoffice build

FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/backoffice/.next/standalone ./
COPY --from=builder /app/apps/backoffice/.next/static ./apps/backoffice/.next/static
COPY --from=builder /app/apps/backoffice/public ./apps/backoffice/public

# Native binding libsql (musl) di-load lewat require dinamis → tak ikut ter-trace
# ke standalone. Salin manual ke lokasi resolve-nya. Update versi kalau `libsql`
# di pnpm-lock.yaml berubah.
COPY --from=builder /app/node_modules/.pnpm/@libsql+linux-x64-musl@0.5.29/node_modules/@libsql/linux-x64-musl ./node_modules/.pnpm/libsql@0.5.29/node_modules/@libsql/linux-x64-musl

EXPOSE 3000
# Healthcheck: sehat hanya kalau HTTP melayani (bukan sekadar proses hidup).
HEALTHCHECK --interval=15s --timeout=4s --start-period=25s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "apps/backoffice/server.js"]

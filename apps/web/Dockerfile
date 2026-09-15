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

# 1) Manifest workspace SAJA dulu → layer install ini nge-cache selama deps tak
#    berubah (perubahan kode tak lagi memicu reinstall). Store di-cache lewat
#    BuildKit cache mount supaya kalaupun install jalan, tak download ulang.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/backoffice/package.json ./apps/backoffice/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# 2) Baru source → build. Cache .next/cache untuk build inkremental yang lebih cepat.
COPY . .
RUN --mount=type=cache,id=next-web,target=/app/apps/web/.next/cache \
    pnpm --filter web build

FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Native binding libsql (musl) di-load lewat require dinamis → tak ikut ter-trace
# ke standalone. Salin manual ke lokasi resolve-nya. Update versi kalau `libsql`
# di pnpm-lock.yaml berubah.
COPY --from=builder /app/node_modules/.pnpm/@libsql+linux-x64-musl@0.5.29/node_modules/@libsql/linux-x64-musl ./node_modules/.pnpm/libsql@0.5.29/node_modules/@libsql/linux-x64-musl

EXPOSE 3000
# Healthcheck: container dianggap sehat hanya kalau HTTP benar-benar melayani
# (bukan sekadar proses hidup). start-period beri waktu Next boot.
HEALTHCHECK --interval=15s --timeout=4s --start-period=25s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]

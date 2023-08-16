#syntax=docker/dockerfile:1.4

FROM node:lts-alpine AS installer
RUN apk add --no-cache libc6-compat
RUN apk update
RUN corepack enable && corepack prepare --activate pnpm@latest && pnpm config set store-dir .pnpm-store
WORKDIR /app

COPY --link . .
RUN pnpm install

RUN pnpm build

FROM nginx:stable-alpine AS runner
WORKDIR /app
COPY --from=installer /app/dist /usr/share/nginx/html
COPY --from=installer /app/nginx/nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]

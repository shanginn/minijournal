#syntax=docker/dockerfile:1.4

FROM oven/bun:latest

WORKDIR /app

COPY --link . /app

RUN bun install

ENV APP_PORT=${APP_PORT:-3333}

EXPOSE $APP_PORT

CMD ["bun", "index.ts"]
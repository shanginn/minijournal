FROM oven/bun:latest

COPY --link ../shared /shared
COPY --link . /app
WORKDIR /app

RUN bun install

ENV APP_PORT=${APP_PORT:-3333}

EXPOSE $APP_PORT

CMD ["bun", "index.ts"]
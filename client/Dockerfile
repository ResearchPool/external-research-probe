FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY schemas/package.json ./schemas/package.json
COPY client/package.json ./client/package.json

RUN pnpm install --frozen-lockfile

COPY schemas ./schemas
COPY client ./client

RUN pnpm --filter @app/schemas build
RUN pnpm --filter client build

FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
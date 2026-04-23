FROM node:22-alpine AS build

WORKDIR /app

RUN apk add --no-cache git

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy package manifests
COPY schemas/package.json ./schemas/package.json
COPY server/package.json ./server/package.json

# Install dependencies (workspace-aware)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY schemas ./schemas
COPY server ./server

# ✅ Build schemas first
RUN pnpm --filter @app/schemas build

# ✅ Build the server
RUN pnpm --filter server build


RUN pnpm deploy --filter server --prod --legacy /prod


FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /prod ./

EXPOSE 3000

CMD ["node", "dist/server.js"]
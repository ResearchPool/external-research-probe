# External Research Probe

A full‑stack **Server‑Sent Events (SSE) monitoring application** built around MySQL binlog streaming.The system is designed to run **locally and in production using Docker**, with a clean separation between build‑time and runtime concerns.

---

## Architecture Overview

- **Client**: React + Vite + Tailwind, served by **Nginx**
- **Server**: Node.js + Express + **ZongJi** (MySQL binlog CDC)
- **Shared**: TypeScript + Zod schemas used by both client and server
- **Monorepo**: pnpm workspaces
- **Runtime**: Docker + Docker Compose

```Shell
Browser
   │
   ▼
Client (Nginx)
   │  /events (proxy)
   ▼
Server (Express + ZongJi)
   │
   ▼
MySQL (binlog)

```

---

## Repository Structure

```Shell
.
├─ client/                 # React + Vite frontend
│  ├─ Dockerfile
│  ├─ nginx.conf
│  └─ src/
├─ server/                 # Express + ZongJi backend
│  ├─ Dockerfile
│  └─ src/
├─ shared/                 # Shared runtime schemas (Zod)
│  ├─ src/
│  └─ dist/
├─ pnpm-workspace.yaml
├─ pnpm-lock.yaml
├─ docker-compose.yml
└─ .env                    # Local environment variables (not committed)

```

---

## Prerequisites

- **Docker** ≥ 24
- **Docker Compose** (v2, `docker compose`)
- **pnpm** ≥ 9 (only required for non‑Docker development)

---

## Environment Configuration

Create a `.env` file at the **repository root**:

```PlainText
# Client
HTTP_PORT=8080
```

Create another `.env` file at `server/.env`:

```PlainText
# Server / Database
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_DATABASE=your-db-name
```

---

## Running with Docker (Recommended)

### Build and start all services

From the repository root:

```Shell
docker compose up --build
```
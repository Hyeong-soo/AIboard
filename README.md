#AI LLM들을 이사로 임명하여, 검토가 필요한 테스크를 자동화하기 위해 권한을 위임할 수 있게 하는 프로젝트

## Docker builds

Each service now ships with its own Dockerfile (Node 18 bullseye). Example builds:

```bash
# Backend (builds Prisma client during image build)
cd backend
docker build -t aiboard-backend .

# Frontend (builds static assets during image build)
cd ../frontend
docker build \
  --build-arg VITE_API_BASE_URL=http://host.docker.internal:3000 \
  --build-arg VITE_BUILD_MODE=docker \
  -t aiboard-frontend .

# MPC / LLM services
cd ../mpc
docker build -t aiboard-mpc .
cd ../llm/claude
docker build -t aiboard-llm-claude .
```

> **Note**  
> The frontend now reads `VITE_API_BASE_URL` from `.env.dev` during `npm run dev` and from the `VITE_BUILD_MODE`/`VITE_API_BASE_URL` build args inside Docker.  
> - Local dev server: `npm run dev` automatically loads `frontend/.env.dev` (`http://localhost:3000`).  
> - Docker image build: pass `--build-arg VITE_API_BASE_URL=http://backend:3000` (or your target) so the nginx container proxies to the backend container.

## Environment files

- Every Node service now has `.env.dev` and `.env.docker`. The runtime picks `.env.dev` for local (`NODE_ENV !== production`) and `.env.docker` for production, but you can force a specific file with `ENV_FILE=/path/to/file`.
- Docker images do **not** bake these files. When you run containers, pass the docker variant via `--env-file ./service/.env.docker` or Compose’s `env_file`.
- Files live beside each service (`backend/.env.dev`, `frontend/.env.docker`, `mpc/.env.dev`, `llm/*/.env.docker`, ...). Edit the dev files for host-only settings (e.g., `http://localhost:*`) and the docker files for in-cluster service DNS names (`http://backend:3000`, `http://llm-claude:5001`, etc.).
- Secrets such as API keys are represented by placeholders; replace them locally before running builds or tests.
- Backend containers now write SQLite data to `/data/prod.db`; the Compose stack mounts that path to the `backend-data` volume so database state is durable.
- The frontend nginx layer proxies `/api/*` to `backend:3000`, so Docker builds set `VITE_API_BASE_URL=/api`. Browsers always call `http://localhost:8080/api/...` and never need to resolve the Docker service name directly.

## Quick tests

1. **Local smoke test**
   ```bash
   # backend
   cd backend && npm install && npm run dev
   # frontend (uses .env.dev automatically)
   cd ../frontend && npm install && npm run dev
   ```
   Hit `http://localhost:5173` and verify API calls proxy to the backend defined in `.env.dev`.
2. **Container smoke test**  
   ```bash
   # Backend with docker env file
   docker build -t aiboard-backend backend
   docker run --rm --env-file backend/.env.docker -p 3000:3000 aiboard-backend

   # MPC service
   docker build -t aiboard-mpc mpc
   docker run --rm --env-file mpc/.env.docker -p 4000:4000 aiboard-mpc

   # Claude service (repeat for GPT/Upstage)
   docker build -t aiboard-llm-claude llm/claude
   docker run --rm --env-file llm/claude/.env.docker -p 5001:5001 aiboard-llm-claude
   ```
   Call `/health` (backend, mpc) or `/api/approve` (LLMs) to ensure each container responds with `200 OK`.

## docker-compose stack

Use the new Compose file to boot the entire graph (frontend ↔ backend ↔ LLMs ↔ MPC ↔ n8n) on a single network:

```bash
# Build images and start the stack
docker compose up --build

# Tear down (preserves named volumes)
docker compose down
```

### Service wiring

- The default network gives each container a DNS name equal to its service (`backend`, `mpc`, `llm-claude`, `llm-gpt`, `llm-upstage`, `n8n`, `frontend`). Internal calls use `http://service-name:port` (e.g., backend calls MPC at `http://mpc:4000/api/v1/sss/sign` and LLM workers at `http://llm-claude:5001/api/approve`).
- Only the required ports are exposed to the host: frontend (`8080` → nginx), backend (`3000`), MPC (`4000`), and n8n (`5678`). LLM services stay internal unless you temporarily add port mappings for debugging.
- The backend persists its SQLite file at `/data/prod.db` inside the container; the Compose file binds that path to the `backend-data` named volume so task history survives restarts.
- n8n mounts your existing host data directory (`/Users/hyeong-soo/.n8n`) into `/home/node/.n8n` inside the container so all previously created workflows/settings carry over. Stop any locally running n8n process before bringing the Compose stack up to avoid concurrent writes to the same SQLite database.

### Verifying the flow

1. `docker compose up --build`
2. Wait for logs showing `Server listening on port 3000`, `[server] MPC signature service running`, each LLM `Approval service listening`, and `n8n Ready to use`.
3. Visit:
   - Frontend: `http://localhost:8080`
   - Backend API: `http://localhost:3000/health`
   - MPC health: `http://localhost:4000/health`
   - n8n UI: `http://localhost:5678`
4. Trigger a document flow from the frontend; the backend will call LLM containers, request partial signatures from MPC, and you can monitor n8n executions at `localhost:5678`.

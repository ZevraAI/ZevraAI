# SEI Nexus

SEI Nexus is an enterprise operational reasoning platform that enables domain-configured AI agents to answer complex operational questions by combining structured data queries, vector memory retrieval, and multi-step reasoning over your enterprise data.

## Projects

| Project | Stack | Port |
|---|---|---|
| `sei-nexus-ai` | Spring Boot 3.3.5, Java 17 | 8090 |
| `sei-nexus-db` | PostgreSQL 16 + pgvector + pgcrypto | 5432 |
| `sei-nexus-ui` | React 18 + Vite + Tailwind CSS + nginx | 80 / 3000 |

---

## Prerequisites

### Required Software

| Tool | Minimum Version | Installation |
|---|---|---|
| Java | 17 | https://adoptium.net |
| Maven | 3.9 | https://maven.apache.org |
| Node.js | 20 LTS | https://nodejs.org |
| Docker Desktop | 24.0 | https://www.docker.com |
| Docker Compose | 2.24 | Bundled with Docker Desktop |
| PostgreSQL | 16 (with pgvector) | See below |

### PostgreSQL with pgvector (local without Docker)

If you run PostgreSQL directly on your machine rather than via Docker:

```bash
# macOS (Homebrew)
brew install postgresql@16
brew install pgvector

# Ubuntu / Debian
sudo apt install postgresql-16 postgresql-16-pgvector
```

---

## Environment Configuration

Copy `.env.example` to `.env` and fill in all required values:

```bash
cp .env.example .env
```

Required values with no defaults that must be set before the application will start:

- `NEXUS_DB_PASSWORD` — PostgreSQL password
- `AZURE_OPENAI_ENDPOINT` — Your Azure OpenAI resource URL
- `AZURE_OPENAI_API_KEY` — Your Azure OpenAI API key
- `NEXUS_JWT_SECRET` — Random string, minimum 32 characters

Generate a secure JWT secret:

```bash
openssl rand -base64 48
```

---

## Local Development with Docker (Recommended)

This is the fastest way to get all three services running locally.

### 1. Clone and configure

```bash
git clone <repo-url> nexus
cd nexus
cp .env.example .env
# Edit .env with your Azure OpenAI credentials and JWT secret
```

### 2. Start all services

```bash
docker compose up --build
```

Docker Compose will:
1. Start PostgreSQL (pgvector/pgvector:pg16) and run `sei-nexus-db/001_init.sql` automatically.
2. Build and start the Spring Boot backend once the database is healthy.
3. Build and start the React frontend via nginx.

### 3. Verify

| Service | URL | Expected |
|---|---|---|
| Frontend | http://localhost:3000 | Login page |
| Backend Health | http://localhost:8090/api/v1/actuator/health | `{"status":"UP"}` |
| Backend API | http://localhost:8090/api/v1 | 404 with JSON error body |

### 4. Stop

```bash
docker compose down
# To also delete all data volumes:
docker compose down -v
```

---

## Local Development Without Docker

Use this approach when you want fast iteration on a single service.

### Backend (sei-nexus-ai)

```bash
# Ensure PostgreSQL is running locally with the nexus_db database
psql -U postgres -c "CREATE USER nexus WITH PASSWORD 'nexus_local';"
psql -U postgres -c "CREATE DATABASE nexus_db OWNER nexus;"
psql -U nexus nexus_db < sei-nexus-db/001_init.sql

# Export environment variables
export NEXUS_DB_URL=jdbc:postgresql://localhost:5432/nexus_db
export NEXUS_DB_USERNAME=nexus
export NEXUS_DB_PASSWORD=nexus_local
export AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
export AZURE_OPENAI_API_KEY=your-key
export AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
export AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
export NEXUS_JWT_SECRET=$(openssl rand -base64 48)
export NEXUS_STORAGE_PATH=./data/documents
export SPRING_PROFILES_ACTIVE=local

# Run
cd sei-nexus-ai
mvn spring-boot:run
```

The backend API is available at `http://localhost:8090/api/v1`.

### Frontend (sei-nexus-ui)

```bash
cd sei-nexus-ui
npm install
# The frontend expects the backend at /api/v1 (proxied by Vite dev server)
# Edit vite.config.ts proxy target if your backend is on a different port
npm run dev
```

The frontend dev server is available at `http://localhost:5173` with HMR enabled.

---

## First-Run Setup

### 1. Default Admin Account

The database seed creates one admin account:

| Field | Value |
|---|---|
| Email | `admin@nexus.local` |
| Password | `NexusAdmin1!` |

**Change this password immediately after first login.**

### 2. Create Your First Domain

POST to `/api/v1/domains` with an admin JWT:

```bash
# Get a token
TOKEN=$(curl -s -X POST http://localhost:8090/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@nexus.local","password":"NexusAdmin1!"}' \
  | jq -r '.token')

# Create a domain
curl -X POST http://localhost:8090/api/v1/domains \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "domainKey": "SUPPLY_CHAIN",
    "name": "Supply Chain Operations",
    "description": "Operational monitoring for supply chain processes.",
    "ownerTeam": "Supply Chain Engineering",
    "ownerEmail": "sc-team@company.com"
  }'
```

### 3. Register Additional Users

```bash
curl -X POST http://localhost:8090/api/v1/auth/register \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "analyst@company.com",
    "displayName": "Jane Analyst",
    "password": "SecurePassword1!",
    "role": "USER"
  }'
```

---

## API Overview

All endpoints are prefixed with `/api/v1`.

### Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Authenticate and receive JWT |
| POST | `/auth/register` | Create a new user account (ADMIN only) |
| POST | `/auth/logout` | Invalidate the current session |
| GET | `/auth/me` | Get current user profile |

Include the JWT in all subsequent requests:
```
Authorization: Bearer <token>
```

Tokens expire after 24 hours by default (configurable via `NEXUS_JWT_EXPIRY_HOURS`).

### Domains

| Method | Path | Description |
|---|---|---|
| GET | `/domains` | List all domains |
| POST | `/domains` | Create a domain (ADMIN) |
| GET | `/domains/{domainKey}` | Get domain details |
| PUT | `/domains/{domainKey}` | Update a domain (ADMIN/DOMAIN_OWNER) |

### Agents

| Method | Path | Description |
|---|---|---|
| GET | `/agents` | List agents |
| POST | `/agents` | Create an agent (ADMIN/DOMAIN_OWNER) |
| GET | `/agents/{agentKey}` | Get agent details |
| PUT | `/agents/{agentKey}` | Update an agent |
| POST | `/agents/{agentKey}/playbooks` | Add a playbook to an agent |

### Conversations & Runs

| Method | Path | Description |
|---|---|---|
| POST | `/conversations` | Start a new conversation / run |
| GET | `/conversations/{conversationId}` | Get conversation history |
| GET | `/conversations/{conversationId}/runs` | List all runs in a conversation |
| GET | `/runs/{runKey}` | Get a specific run with evidence |
| POST | `/conversations/{conversationId}/pin` | Pin a conversation |

### Documents & Knowledge

| Method | Path | Description |
|---|---|---|
| POST | `/documents/upload` | Upload a document (multipart/form-data) |
| GET | `/documents` | List documents by domain |
| DELETE | `/documents/{documentKey}` | Archive a document |
| GET | `/knowledge/notes` | List knowledge notes |
| POST | `/knowledge/notes` | Create a knowledge note |
| GET | `/knowledge/gaps` | List knowledge gaps |
| PUT | `/knowledge/gaps/{gapKey}/resolve` | Resolve a knowledge gap |

### Data Objects (Enterprise Map)

| Method | Path | Description |
|---|---|---|
| GET | `/data-objects` | List data objects by domain |
| POST | `/data-objects` | Register a data object |
| PUT | `/data-objects/{objectKey}` | Update a data object |
| POST | `/data-objects/{objectKey}/scan` | Trigger column scan |

### Connections

| Method | Path | Description |
|---|---|---|
| GET | `/connections` | List connections |
| POST | `/connections` | Register a connection (ADMIN) |
| POST | `/connections/{connectionKey}/test` | Test a connection |

### Actuator (Backend Health)

| Method | Path | Description |
|---|---|---|
| GET | `/actuator/health` | Health status (no auth required) |
| GET | `/actuator/info` | Build info |
| GET | `/actuator/metrics` | Micrometer metrics (ADMIN only) |

---

## GitLab CI/CD Setup

### 1. Configure GitLab Container Registry

Ensure your GitLab project has the Container Registry enabled under **Settings > Packages and Registries**.

### 2. Set CI/CD Variables

In GitLab, go to **Settings > CI/CD > Variables** and add the following masked/protected variables:

**Staging deployment:**
- `STAGING_SSH_PRIVATE_KEY` — Private key matching the public key on your staging server
- `STAGING_HOST` — Staging server hostname or IP
- `STAGING_USER` — SSH username
- `STAGING_DB_USERNAME` — Staging PostgreSQL username
- `STAGING_DB_PASSWORD` — Staging PostgreSQL password (masked)
- `STAGING_AZURE_OPENAI_ENDPOINT` — Staging Azure OpenAI endpoint
- `STAGING_AZURE_OPENAI_API_KEY` — Staging Azure OpenAI key (masked)
- `STAGING_JWT_SECRET` — JWT secret for staging (masked)
- `STAGING_DATA_DIR` — Absolute path on staging server for persistent volumes
- `STAGING_SSL_CERT_DIR` — Absolute path on staging server for TLS certificates

**Production deployment** (same keys prefixed with `PROD_`):
- `PROD_SSH_PRIVATE_KEY`, `PROD_HOST`, `PROD_USER`, `PROD_DB_USERNAME`, `PROD_DB_PASSWORD`
- `PROD_AZURE_OPENAI_ENDPOINT`, `PROD_AZURE_OPENAI_API_KEY`, `PROD_JWT_SECRET`
- `PROD_DATA_DIR`, `PROD_SSL_CERT_DIR`

**Shared:**
- `AZURE_OPENAI_CHAT_DEPLOYMENT` — e.g. `gpt-4o`
- `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` — e.g. `text-embedding-ada-002`

### 3. Prepare Deployment Servers

On each server (staging and production):

```bash
# Install Docker Engine
curl -fsSL https://get.docker.com | sh

# Initialize Docker Swarm (required for docker stack deploy)
docker swarm init

# Create data directories
sudo mkdir -p /opt/nexus
sudo mkdir -p /data/nexus/postgres /data/nexus/documents /etc/nexus/certs
sudo chown -R $USER:$USER /opt/nexus /data/nexus /etc/nexus

# Add SSH public key to authorized_keys
echo "your-public-key" >> ~/.ssh/authorized_keys

# Copy production compose file to server
scp docker-compose.prod.yml user@server:/opt/nexus/
```

### 4. Pipeline Behaviour

| Branch | Stages run | Notes |
|---|---|---|
| Any | validate, build, test | Runs on every push |
| `main` | + containerize, deploy-staging | Deploys to staging automatically |
| `main` or `release/*` | + deploy-production | Manual gate required |

---

## Production Deployment Guide

### Infrastructure Requirements

| Component | Minimum | Recommended |
|---|---|---|
| Backend nodes | 2 vCPU, 3 GB RAM | 4 vCPU, 8 GB RAM |
| PostgreSQL node | 2 vCPU, 2 GB RAM | 4 vCPU, 8 GB RAM + fast SSD |
| Frontend nodes | 0.5 vCPU, 256 MB RAM | 1 vCPU, 512 MB RAM |

### Manual Production Deployment

If deploying outside of GitLab CI:

```bash
# On the production server
export CI_REGISTRY_IMAGE=registry.gitlab.com/your-group/nexus
export IMAGE_TAG=<commit-sha>
export NEXUS_DB_USERNAME=nexus_prod
export NEXUS_DB_PASSWORD=<strong-password>
export AZURE_OPENAI_ENDPOINT=https://your-prod-resource.openai.azure.com
export AZURE_OPENAI_API_KEY=<prod-key>
export AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
export AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
export NEXUS_JWT_SECRET=<random-48-char-string>
export NEXUS_DATA_DIR=/data/nexus
export NEXUS_SSL_CERT_DIR=/etc/nexus/certs

docker login registry.gitlab.com -u <user> -p <token>
cd /opt/nexus
docker stack deploy -c docker-compose.prod.yml nexus-prod --with-registry-auth
```

### Database Backup

```bash
# Automated daily backup via cron
0 2 * * * docker exec nexus-postgres pg_dump -U nexus nexus_db | gzip > /backups/nexus_$(date +%Y%m%d).sql.gz

# Restore
gunzip -c /backups/nexus_20260514.sql.gz | docker exec -i nexus-postgres psql -U nexus nexus_db
```

### TLS / HTTPS

Place your TLS certificate and private key in `$NEXUS_SSL_CERT_DIR`:
- `$NEXUS_SSL_CERT_DIR/nexus.crt` — Full chain certificate
- `$NEXUS_SSL_CERT_DIR/nexus.key` — Private key

Update `nginx.conf` in production to add an HTTPS server block listening on port 443. The `docker-compose.prod.yml` maps port 443 to the frontend container.

### Scaling

Scale backend replicas without downtime:
```bash
docker service scale nexus-prod_backend=4
```

Scale frontend:
```bash
docker service scale nexus-prod_frontend=3
```

### Monitoring

The Spring Boot Actuator health endpoint is available (no auth required):
```
GET /api/v1/actuator/health
```

For Prometheus scraping, configure your Prometheus server to scrape:
```
http://backend:8090/api/v1/actuator/prometheus
```

---

## Troubleshooting

**Database connection refused on startup**

The backend waits for `service_healthy` on the postgres container. If it still fails, check that `pg_isready` returns success inside the container:
```bash
docker exec nexus-postgres pg_isready -U nexus -d nexus_db
```

**pgvector extension not found**

Ensure you are using the `pgvector/pgvector:pg16` image, not the plain `postgres:16` image. The standard postgres image does not include pgvector.

**Azure OpenAI 401 errors**

Verify `AZURE_OPENAI_API_KEY` is set and matches the key for the resource at `AZURE_OPENAI_ENDPOINT`. Keys are scoped per Azure OpenAI resource, not per deployment.

**Embedding dimension mismatch**

All embedding columns are `vector(1536)`. If you switch to a different embedding model that produces a different dimension, you must run a migration to alter the column types and rebuild all indexes. The `text-embedding-ada-002` and `text-embedding-3-small` models both produce 1536-dimensional vectors.

**JWT token expired**

Tokens expire after 24 hours. Re-authenticate via `POST /api/v1/auth/login`. Increase `NEXUS_JWT_EXPIRY_HOURS` if needed for long-running automation.

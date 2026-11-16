# Deployment preparation

No external deployment was performed. These instructions prepare the project for a host that supports containers, PostgreSQL with pgvector, persistent volumes, and secret environment variables.

## Required production services

- A PostgreSQL 16-compatible database with pgvector installed.
- Persistent storage mounted at the backend `UPLOAD_DIR`, or an object-storage implementation.
- A backend container built from `backend/Dockerfile`.
- A frontend container built from `frontend/Dockerfile`, or the `frontend/dist` directory on a static host.
- A Gemini API key stored only in the backend secret configuration.

## Local container verification

```bash
export GEMINI_API_KEY="your-backend-only-key"
docker compose up --build
```

- Frontend: <http://localhost:8080>
- Backend: <http://localhost:4000>
- Health: <http://localhost:4000/api/health>
- Database health: <http://localhost:4000/api/health/database>

Compose uses named volumes for PostgreSQL and uploads. Removing those volumes deletes their data, so do not use `docker compose down --volumes` on a workspace you need to keep.

## Production environment

Set at minimum:

```env
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://your-frontend.example
TRUST_PROXY=true
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
UPLOAD_DIR=/absolute/persistent/mount/uploads
GEMINI_API_KEY=stored-in-a-secret-manager
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_DIMENSIONS=1536
GEMINI_GENERATION_MODEL=gemini-3.8-flash
```

Build the frontend with its public API URL:

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.example.com/api \
  -f frontend/Dockerfile \
  -t docusense-frontend .
```

Never put `DATABASE_URL` or `GEMINI_API_KEY` in a `VITE_` variable.

## Migration procedure

1. Back up the database.
2. Build the exact application revision being released.
3. Run `npm run db:status` against the target database.
4. Run `npm run db:migrate` once from a controlled release job.
5. Start the new backend and verify both health endpoints.
6. Start or publish the frontend and test upload, indexing, search, chat, and deletion with synthetic data.

Do not run `prisma migrate dev` in production.

## Backup and restore

```bash
pg_dump --format=custom --no-owner "$DATABASE_URL" > docusense.backup
pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" docusense.backup
```

Back up the upload volume or object-storage bucket with the database. A database-only restore leaves document metadata pointing to missing files.

## File-storage limitation

The current implementation stores files on one local filesystem. A persistent mounted volume is sufficient for one backend instance. It is not suitable for ephemeral serverless filesystems or several backend replicas. Before horizontal scaling, replace local storage with object storage and retain the same server-side filename and access-control guarantees.

## Gemini usage and cost

- Keep chunking, `topK`, context length, output tokens, and request rate limits bounded.
- Re-indexing is idempotent when the document, configured model, and stored chunk count already match.
- Monitor requests, tokens, project rate limits, and spending in Google AI Studio.
- Alert on sustained 429 and 503 responses. The backend retries temporary failures but does not retry without a bound.
- Review current pricing before changing models: <https://ai.google.dev/gemini-api/docs/pricing>
- Rate-limit documentation: <https://ai.google.dev/gemini-api/docs/rate-limits>
- Billing and usage documentation: <https://ai.google.dev/gemini-api/docs/billing>

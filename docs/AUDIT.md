# Final project audit

Audit date: 16 November 2026

## Baseline verified before changes

- Frontend and backend TypeScript checks passed.
- ESLint and production builds passed.
- Prisma schema validation passed and all five migrations were applied.
- PostgreSQL, pgvector 0.8.7, `vector(1536)`, the HNSW cosine index, foreign keys, and cascading deletes were verified.
- The production dependency audit reported zero known vulnerabilities.
- Source files contained no detected Gemini key or credential URL patterns.

## Findings and resolution

| Area                  | Finding                                                                             | Resolution                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Automated testing     | Verification scripts existed, but there was no test runner or frontend suite.       | Added Node test runner suites, API integration tests, frontend logic tests, and one root verification command.            |
| RAG evaluation        | No repeatable evaluation dataset or report.                                         | Added 10 synthetic cases covering exact, paraphrased, citation, and refusal behavior.                                     |
| Rate limiting         | Public API and paid AI routes had no abuse controls.                                | Added general, upload, and AI-specific configurable limits.                                                               |
| CORS                  | Only one raw origin string was supported and production localhost was not rejected. | Added explicit comma-separated origin validation and production startup guards.                                           |
| Request diagnostics   | Errors had no correlation identifier and logs had no request timing.                | Added request IDs and metadata-only structured logs. Request bodies and document content are not logged.                  |
| Upload cleanup        | A Multer failure after disk allocation could leave a partial file.                  | Added failure cleanup and restrictive stored-file permissions.                                                            |
| Identifier validation | Route IDs were passed directly to database lookups.                                 | Added UUID validation before document and chat session handlers.                                                          |
| Environment templates | README referenced templates that did not exist.                                     | Added complete backend and frontend `.env.example` files.                                                                 |
| Deployment            | No container or production static-server configuration existed.                     | Added backend/frontend Dockerfiles, Nginx SPA configuration, Compose, health checks, and persistent volumes.              |
| Storage               | Uploads use local disk.                                                             | Documented the persistent-volume requirement and the object-storage migration needed for horizontally scaled deployments. |
| Access control        | No authentication or ownership model exists.                                        | Documented the API as a single trusted workspace that must not be exposed as a public multi-user service.                 |
| Repository state      | The folder is not a Git repository.                                                 | Added repository-ready ignore and documentation files; Git initialization and remote configuration remain manual.         |

## Remaining risks

- OCR and document processing run synchronously inside upload requests. Large workloads need a background queue.
- In-memory rate limiting is per process. Multi-instance production deployments need a shared store such as Redis.
- Local files are not replicated between backend instances. Use object storage before horizontal scaling.
- There is no authentication, tenancy, ownership authorization, malware scanning, or audit-log retention.
- Deterministic extraction and the synthetic RAG evaluation do not replace evaluation on representative, non-confidential documents.
- Live Gemini availability, quality, latency, and cost depend on the selected model, project tier, and provider capacity.

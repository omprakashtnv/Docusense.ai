# Security model

## Implemented controls

- Helmet security headers and disabled Express identification headers.
- Explicit CORS allowlist with no wildcard support and production localhost rejection.
- General, upload, and AI-route rate limits with configurable thresholds.
- JSON body, chat question, search query, result-count, context, history, upload-size, PDF-page, and OCR-page limits.
- PDF/DOCX extension, MIME, and binary-signature validation.
- UUID storage filenames, private file permissions, guarded deletion paths, and failed-upload cleanup.
- Parameterized Prisma and raw pgvector queries. User input is never interpolated into SQL.
- Backend-only Gemini credentials and a frontend bundle scan for secret names.
- Bounded Gemini requests with timeouts, retry limits, structured output validation, and no full-document generation prompt.
- Document contents are marked as untrusted context. The system prompt forbids following document instructions or revealing configuration.
- API responses omit stored filenames and filesystem paths. Unexpected errors return a generic message and request ID.
- Logs contain request metadata, status, duration, and error class only. They do not log request bodies, document text, embeddings, or credentials.

## Rate-limit defaults

| Scope                      | Default                                |
| -------------------------- | -------------------------------------- |
| General API                | 120 requests per 60 seconds per client |
| Upload                     | 10 requests per 60 seconds per client  |
| Search and chat generation | 30 requests per 60 seconds per client  |

The default store is in-memory and applies per backend process. Configure `TRUST_PROXY=true` only when the backend is behind a trusted single proxy. Use a shared rate-limit store before running multiple backend replicas.

## Access-control boundary

DocuSense AI has no authentication, user accounts, ownership checks, or tenant isolation. Every caller who can reach the API can list, read, index, chat with, and delete every document. Keep the service on a trusted local or private network until authentication and authorization are implemented.

## Production recommendations

1. Put the API behind TLS and a managed reverse proxy.
2. Add identity, per-document ownership, and server-side authorization before public access.
3. Add malware scanning and content-type sandboxing for untrusted uploads.
4. Move uploads to encrypted object storage with short-lived access policies.
5. Store secrets in the hosting provider's secret manager, rotate them, and restrict the Gemini key to the intended project.
6. Add centralized metadata-only logs, alerts for repeated 429/5xx responses, and database audit retention.
7. Run dependency and container-image scanning in CI.

Report security issues privately. Do not attach confidential documents, database dumps, or API keys to an issue.

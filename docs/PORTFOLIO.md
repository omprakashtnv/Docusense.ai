# DocuSense AI portfolio summary

## Resume-ready description

Built DocuSense AI, a full-stack intelligent document processing and retrieval-augmented generation platform using React, TypeScript, Express, PostgreSQL, Prisma, pgvector, and Google Gemini. Implemented validated PDF/DOCX upload, conditional Tesseract OCR, deterministic classification and field extraction, page-aware chunking, 1,536-dimension Gemini embeddings, HNSW cosine search, and citation-grounded chat history. Added transactional vector indexing, prompt-injection boundaries, rate limiting, synthetic RAG evaluation, automated API/database tests, and container deployment configuration.

## Problem it solves

Business documents often contain useful information that is difficult to search across consistently. DocuSense extracts and cleans text, adds document metadata, indexes passages by meaning, and answers questions only from retrieved evidence with inspectable citations.

## Architecture

- React and Tailwind provide the document dashboard, details, search, and chat interface.
- Express controllers validate HTTP requests and delegate to modular services.
- Prisma manages relational records and lifecycle transactions.
- Raw parameterized SQL handles pgvector operations that Prisma cannot express natively.
- Gemini creates retrieval-document and retrieval-query embeddings and grounded structured answers.
- PostgreSQL stores documents, chunks, sessions, messages, citations, and `vector(1536)` values.

## Processing pipeline

1. Multer accepts one validated PDF or DOCX and assigns a UUID filename.
2. `unpdf` or Mammoth extracts text.
3. Low-text PDFs are rendered page by page and sent through Tesseract.js OCR.
4. Text cleaning removes control characters and normalizes whitespace while retaining punctuation and page markers.
5. Weighted deterministic rules classify the document and extract nullable structured fields.
6. LangChain splits cleaned text with overlap and page metadata.
7. Gemini creates normalized 1,536-dimension embeddings.
8. A transaction writes chunks, vectors, and final indexing state.
9. Search uses pgvector cosine distance and filters to compatible indexed documents.
10. RAG builds bounded context, validates Gemini structured output, and persists only verified citations.

## Technical challenges and solutions

- **Prisma and pgvector:** Declared the column as `Unsupported("vector(1536)")`, created it and its HNSW index in SQL migrations, and used parameterized raw SQL for vector writes and search.
- **Safe indexing:** Prevented duplicate concurrent indexing, validated every vector dimension, and kept chunk/vector/status writes in one transaction.
- **Scanned PDFs:** Ran OCR only when native extraction produced too little meaningful text and preserved page markers for later citations.
- **Grounded answers:** Treated documents as untrusted data, bounded retrieved context, required structured Gemini output, discarded invalid source references, and refused questions without evidence.
- **Deployment storage:** Kept the local implementation simple while documenting that production requires a persistent volume or object storage.

## Interview questions and concise answers

### 1. Why use pgvector instead of a separate vector database?

The project already needs PostgreSQL for document and chat metadata. pgvector keeps relational filters, transactions, cascading deletes, and vector search in one database. An HNSW index with `vector_cosine_ops` supports the chosen cosine query.

### 2. How did you handle Prisma's vector limitation?

The Prisma schema retains `Unsupported("vector(1536)")` so migrations know the column exists. A custom SQL migration enables pgvector and creates the HNSW index. Vector writes and similarity queries use tagged, parameterized Prisma raw SQL.

### 3. How do you prevent hallucinated answers?

The service retrieves indexed chunks first, sends only bounded context to Gemini, states that document instructions are untrusted, requires structured output, and validates every cited source number. When retrieval has no sufficient evidence, generation is skipped and the service returns a refusal.

### 4. Why are document and query embedding task types different?

Indexed chunks use `RETRIEVAL_DOCUMENT`, while user queries use `RETRIEVAL_QUERY`. This gives Gemini the intended asymmetric retrieval task while keeping the model and 1,536 output dimensions identical.

### 5. How is partial indexing prevented?

The service acquires an indexing state, generates and validates all embeddings, then creates chunks, writes vectors, and marks the document indexed inside one database transaction. A failure rolls back the transaction and leaves a safe failed status instead of a partial searchable index.

### 6. When does OCR run?

Native PDF extraction runs first. OCR is used only when the extracted text has fewer than the configured meaningful-character and word thresholds. Pages are rendered to PNG and processed sequentially to bound memory and CPU use.

### 7. What would you change before public multi-user deployment?

Add authentication, document ownership authorization, tenant-aware queries, object storage, malware scanning, background processing, a shared rate-limit store, centralized observability, and representative live-model evaluations.

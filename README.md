# DocuSense AI

**AI-Powered Document Intelligence & RAG Platform**

DocuSense AI is an intelligent document processing platform that allows users to upload PDF and DOCX documents, automatically extract and classify information, search document content using natural language, and ask questions using Retrieval-Augmented Generation (RAG).

The application combines document processing, OCR, Gemini AI, semantic search, and PostgreSQL with pgvector to turn unstructured documents into searchable knowledge.

## 1. What Does DocuSense AI Do?

Users often need to manually open multiple documents to find specific information. DocuSense AI simplifies this process by allowing users to upload documents once and interact with their content through search and AI-powered conversations.

### Example Use Case

A user uploads an invoice and asks:

- What is the invoice number?
- Who is the vendor?
- What is the total amount?
- When is the payment due?

DocuSense AI processes the document, extracts relevant information, and answers questions using the uploaded document as its source.

## 2. Main Features

- PDF and DOCX document upload.
- Automatic text extraction.
- OCR for scanned PDF documents.
- Document cleaning and classification.
- Structured invoice information extraction.
- Text chunking using LangChain.
- Gemini-powered document embeddings.
- PostgreSQL vector storage using pgvector.
- Semantic search with cosine similarity.
- RAG-based question answering using Gemini.
- Source citations with document and page information.
- Persistent chat sessions and conversation history.
- Responsive React dashboard.
- API validation, rate limiting, health checks, and security controls.

## 3. How the Application Works

### User Workflow

1. **Upload Documents:** Upload PDF or DOCX files through the Documents page.
2. **Document Processing:** The backend extracts text and performs OCR when necessary.
3. **Document Intelligence:** The system cleans text, identifies document types, and extracts structured fields.
4. **Index Documents:** Users trigger indexing to split the content into chunks and generate Gemini embeddings.
5. **Semantic Search:** Users search document content using natural language.
6. **Ask AI:** Users ask questions and receive answers based on retrieved document content.
7. **View Sources:** Users can inspect the document excerpts and page information supporting an answer.

### Document Processing Flow

```text
Document Upload
      |
      v
File Validation
      |
      v
PDF / DOCX Text Extraction
      |
      v
Conditional OCR
      |
      v
Text Cleaning
      |
      v
Document Classification
      |
      v
Structured Data Extraction
      |
      v
Save Document Information
```

### Document Indexing Flow

```text
Cleaned Document Text
      |
      v
Text Chunking
      |
      v
Gemini Embeddings
      |
      v
Dimension Validation
      |
      v
PostgreSQL + pgvector
```

### RAG Question-Answering Flow

```text
User Question
      |
      v
Gemini Query Embedding
      |
      v
pgvector Similarity Search
      |
      v
Retrieve Relevant Chunks
      |
      v
Build Document Context
      |
      v
Gemini LLM
      |
      v
Grounded Answer + Citations
```

The application only uses retrieved document content to generate grounded answers. If sufficient evidence is unavailable, it returns an insufficient-evidence response instead of inventing information.

## 4. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Vector Database | pgvector |
| Embeddings | Gemini `gemini-embedding-001` |
| LLM | Google Gemini |
| PDF Extraction | unpdf |
| DOCX Extraction | Mammoth |
| OCR | Tesseract.js |
| PDF Rendering | @napi-rs/canvas |
| Chunking | LangChain Text Splitter |
| Deployment Preparation | Docker, Docker Compose, Nginx |

## 5. Application Screens

The frontend provides the following sections:

| Screen | Purpose |
|---|---|
| Dashboard | Document statistics and recent activity |
| Documents | Upload, search, filter, and manage documents |
| Document Details | View extracted text, classification, and structured fields |
| Semantic Search | Search document content by meaning |
| AI Chat | Ask questions about uploaded documents |
| Settings | View application and AI model information |

## 6. Project Structure

```text
docusense-ai/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── .env.example
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── prisma/
│   │   └── migrations/
│   ├── uploads/
│   ├── .env.example
│   └── package.json
│
├── docs/
├── package.json
├── docker-compose.yml
├── README.md
└── .gitignore
```

## 7. Prerequisites

Install the following before starting:

- Node.js 24 or newer.
- npm 10 or newer.
- PostgreSQL with pgvector support (pgvector 0.5 or newer for HNSW indexing).
- Google Gemini API key for live embedding and AI generation.

Check installed versions:

```bash
node -v
npm -v
```

## 8. Local Setup and Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/omprakashtnv/Docusense.ai
cd docusense-ai
```

### Step 2: Install Dependencies

Run this command from the root project directory:

```bash
npm install
```

### Step 3: Configure Backend Environment

Create the backend environment file:

```bash
cp backend/.env
```

Open `backend/.env` and configure the required variables.

Required configuration:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/docusense_ai"
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

GEMINI_EMBEDDING_MODEL="gemini-embedding-001"
GEMINI_EMBEDDING_DIMENSIONS="1536"
```

Additional optional configuration:

```env
GEMINI_GENERATION_MODEL="gemini-3.8-flash"

CHUNK_SIZE="1000"
CHUNK_OVERLAP="150"

SEARCH_DEFAULT_TOP_K="5"
SEARCH_MAX_TOP_K="10"
SEARCH_MIN_SIMILARITY="0.25"

GEMINI_GENERATION_MAX_TOKENS="1024"
RAG_MAX_CONTEXT_CHARACTERS="12000"
RAG_HISTORY_MESSAGE_LIMIT="8"

OCR_LANGUAGE="eng"
OCR_MAX_PAGES="25"
```

Use the complete `backend/.env` as the source of truth for all supported configuration options and their defaults.

**Important:**

- Replace the database username and password with your PostgreSQL credentials.
- Add your own Gemini API key.

### Step 4: Configure Frontend Environment

Create the frontend environment file:

```bash
cp frontend/.env
```

Open `frontend/.env` and configure the frontend API URL using the exact variable name provided in `frontend/.env`.

For local development, the API runs at:

```text
http://localhost:4000
```

The frontend runs at:

```text
http://localhost:5173
```

Only public browser configuration should be stored in the frontend environment. Never add database credentials or Gemini API keys to frontend variables.

### Step 5: Create PostgreSQL Database

Open PostgreSQL and execute:

```sql
CREATE DATABASE docusense_ai;
```

Make sure pgvector is installed and available to the database server.

The database role must have permission to create the vector extension, or an administrator must enable it.

### Step 6: Run Database Migrations

From the root project directory:

```bash
npm run db:migrate
npm run db:generate
npm run db:verify
```

These commands apply the migrations, generate Prisma Client, and verify database connectivity and vector configuration.

### Step 7: Start the Application

Run both frontend and backend together:

```bash
npm run dev
```

Open the application:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:4000 |
| API Health | http://localhost:4000/api/health |
| Database Health | http://localhost:4000/api/health/database |
| Application Metadata | http://localhost:4000/api/meta |

To run applications separately:

**Backend:**

```bash
npm run dev --workspace backend
```

**Frontend:**

```bash
npm run dev --workspace frontend
```

## 9. How to Use the Application

### Upload a Document

1. Open the Documents page.
2. Select Upload Document.
3. Choose a PDF or DOCX file.
4. Wait for processing to complete.
5. Open the document details to view extracted information.

The maximum upload size is 10 MB.

### Index a Document

1. Open a successfully processed document.
2. Select **Index document**.
3. The backend creates text chunks.
4. Gemini generates embeddings.
5. Embeddings are saved in PostgreSQL using pgvector.
6. The document becomes available for semantic search and AI chat.

### Perform Semantic Search

1. Open Semantic Search.
2. Enter a natural-language question.
3. Optionally select a document filter.
4. Review matching document chunks and similarity scores.

### Ask Questions Using AI Chat

1. Open AI Chat.
2. Start a new conversation.
3. Select one or more documents, or search across all indexed documents.
4. Ask a question.
5. Review the generated answer and expandable source citations.

## 10. Important API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/documents/upload` | Upload a document |
| GET | `/api/documents` | List documents |
| GET | `/api/documents/:id` | Get document details |
| GET | `/api/documents/:id/intelligence` | Get extracted intelligence |
| POST | `/api/documents/:id/index` | Index document |
| GET | `/api/documents/:id/chunks` | Get document chunks |
| DELETE | `/api/documents/:id` | Delete document |
| POST | `/api/search` | Semantic search |
| POST | `/api/chat` | Ask AI questions |
| GET | `/api/chat/sessions` | List chat sessions |
| GET | `/api/chat/sessions/:id` | Get chat history |
| DELETE | `/api/chat/sessions/:id` | Delete chat session |
| GET | `/api/meta` | Get safe application metadata |

## 11. Validation and Testing

Run the following commands from the project root:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build

npm run db:validate
npm run db:status
npm run db:verify

npm run indexing:verify
npm run search:verify
npm run rag:verify

npm run test
npm run rag:evaluate
npm run verify
```

Automated tests use deterministic Gemini mocks and synthetic records, avoiding paid API calls during those tests.

For live AI testing, configure your Gemini API key and use synthetic documents.

## 12. Future Improvements

Potential future enhancements:

- User authentication and separate workspaces.
- Background document processing using Redis and BullMQ.
- Hybrid keyword and vector search.
- Improved retrieval with reranking.
- Clickable PDF citations with page navigation.
- Duplicate document detection.
- AI answer feedback and evaluation.
- Structured data export to CSV and Excel.

## Licence
Copyright © 2026 Om Prakash Gupta.

All rights reserved.

This repository is provided for evaluation and demonstration purposes only. No part of this project may be copied, modified, distributed, or used without prior written permission from the author.

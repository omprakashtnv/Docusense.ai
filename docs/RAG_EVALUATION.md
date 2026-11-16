# RAG evaluation report

Evaluation date: 16 November 2026

## Dataset and method

The automated evaluation uses three synthetic, non-confidential documents: an invoice, a contract, and a remote-work policy. It contains 10 questions, including four paraphrases and one question whose answer is absent.

The evaluation runs against the real PostgreSQL and pgvector query path. Gemini embeddings and answer generation are deterministic mocks, so the regular evaluation has no paid API calls and can run in CI. Every evaluation record and chat session is deleted in cleanup.

```bash
npm run rag:evaluate
```

## Results

| Check                                 | Passed | Total |
| ------------------------------------- | -----: | ----: |
| Overall cases                         |     10 |    10 |
| Relevant document retrieved and cited |     10 |    10 |
| Expected answer content present       |     10 |    10 |
| Citation contains supporting evidence |     10 |    10 |
| Unsupported question refused          |      1 |     1 |
| Paraphrased questions                 |      4 |     4 |

The first diagnostic run exposed an overly broad branch in the deterministic evaluator for “approve work from home.” The evaluator was corrected and the complete dataset was rerun before recording these results.

## Case coverage

1. Exact invoice total.
2. Paraphrased amount owed.
3. Invoice date.
4. Paraphrased vendor question.
5. Exact contract termination notice.
6. Paraphrased cancellation question.
7. Contract governing law.
8. Remote-work days.
9. Paraphrased approval question.
10. Missing parking allowance, which must return insufficient evidence with no citation.

## Limitations

- This verifies orchestration, vector filtering, ranking for the synthetic vectors, citation plumbing, persistence, and refusal logic. It does not measure live Gemini quality.
- Deterministic embeddings are designed for this dataset. They do not predict retrieval quality on noisy OCR or domain-specific language.
- The dataset is small and English-only.
- No latency, throughput, token-cost, or production-traffic claims are made.
- Before production, add representative non-confidential documents, human relevance judgments, and periodic live-model evaluation with a controlled budget.

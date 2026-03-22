# IAM Module

Creates and configures the RAG pipeline service account and its IAM role bindings.

## Resources

- **Service Account** (`speakifylk-rag-sa`) -- Used by the RAG pipeline
- **IAM Bindings:**
  - `roles/aiplatform.user`
  - `roles/storage.objectAdmin`
- **Service Account Key** -- JSON key for programmatic access

## Inputs

| Name         | Description        | Type   |
| ------------ | ------------------ | ------ |
| `project_id` | The GCP project ID | string |

## Outputs

| Name           | Description                                                 |
| -------------- | ----------------------------------------------------------- |
| `rag_sa_email` | The email of the RAG service account                        |
| `rag_sa_key`   | Base64-encoded JSON key for the service account (sensitive) |

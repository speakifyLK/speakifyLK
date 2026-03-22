# Storage Module

Creates the GCS bucket for RAG content and configures bucket-level IAM.

## Resources

- **GCS Bucket** (`speakifylk-rag-content`):
  - Uniform bucket-level access enabled
  - Lifecycle rule to auto-delete objects older than 90 days
- **Bucket IAM** -- Grants `roles/storage.objectAdmin` to the RAG service account

## Inputs

| Name           | Description                          | Type   |
| -------------- | ------------------------------------ | ------ |
| `region`       | The GCP region for the bucket        | string |
| `rag_sa_email` | The email of the RAG service account | string |

## Outputs

| Name                      | Description                        |
| ------------------------- | ---------------------------------- |
| `rag_content_bucket_name` | The name of the RAG content bucket |

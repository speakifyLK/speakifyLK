# Infrastructure

Terraform configuration for provisioning GCP resources used by SpeakifyLK.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.5.0
- A GCP project with billing enabled
- Authenticated via `gcloud auth application-default login`

## Resources

- **Google APIs** -- Enables AI Platform, Cloud Storage, and IAM APIs.
- **Service Account** (`speakifylk-rag-sa`) -- Used by the RAG pipeline with the following roles:
  - `roles/aiplatform.user`
  - `roles/storage.objectAdmin`
- **Service Account Key** -- JSON key generated for programmatic access.
- **GCS Bucket** (`speakifylk-rag-content`) -- Stores RAG content with:
  - Uniform bucket-level access enabled
  - Lifecycle rule to auto-delete objects older than 90 days
  - `roles/storage.objectAdmin` granted to the RAG service account

## Usage

1. **Initialize Terraform**

   ```bash
   cd infrastructure
   terraform init
   ```

2. **Preview changes**

   ```bash
   terraform plan -var="project_id=YOUR_PROJECT_ID"
   ```

3. **Apply changes**

   ```bash
   terraform apply -var="project_id=YOUR_PROJECT_ID"
   ```

   You will be prompted to confirm before any resources are created.

4. **Retrieve the service account key**

   The key is marked as sensitive. To view it:

   ```bash
   terraform output -raw rag_sa_key | base64 --decode > rag-sa-key.json
   ```

   Keep this file safe and do not commit it to version control.

## Variables

| Name         | Description        | Default       |
| ------------ | ------------------ | ------------- |
| `project_id` | The GCP project ID | _(required)_  |
| `region`     | The GCP region     | `us-central1` |

## Outputs

| Name                      | Description                         |
| ------------------------- | ----------------------------------- |
| `project_id`              | The GCP project ID                  |
| `region`                  | The GCP region                      |
| `rag_sa_email`            | Email of the RAG service account    |
| `rag_sa_key`              | Base64-encoded JSON key (sensitive) |
| `rag_content_bucket_name` | Name of the RAG content GCS bucket  |

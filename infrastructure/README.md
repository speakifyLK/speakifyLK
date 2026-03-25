# Infrastructure

Terraform configuration for provisioning GCP resources used by SpeakifyLK.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.5.0
- A GCP project with billing enabled
- Authenticated via `gcloud auth application-default login`
- A GCS bucket named `speakifylk-terraform-state` for remote state storage

## Module Structure

```
infrastructure/
  main.tf                 # Root module: backend, provider, and module calls
  variables.tf            # Root-level input variables
  outputs.tf              # Root-level outputs (delegated from modules)
  terraform.tfvars.example
  modules/
    project/              # Enables required GCP APIs
      main.tf
      outputs.tf
    iam/                  # Service account and IAM role bindings
      main.tf
      variables.tf
      outputs.tf
    storage/              # GCS bucket and bucket-level IAM
      main.tf
      variables.tf
      outputs.tf
```

### modules/project

Enables the GCP APIs required by the project:

- `aiplatform.googleapis.com`
- `generativelanguage.googleapis.com`
- `storage.googleapis.com`
- `iam.googleapis.com`

### modules/iam

Creates and configures the RAG pipeline service account (`speakifylk-rag-sa`):

- `roles/aiplatform.user`
- `roles/storage.objectAdmin`
- Generates a JSON service account key

### modules/storage

Creates the GCS bucket (`speakifylk-rag-content`) for RAG content:

- Uniform bucket-level access enabled
- Lifecycle rule to auto-delete objects older than 90 days
- `roles/storage.objectAdmin` granted to the RAG service account

## Remote State

Terraform state is stored in a GCS backend:

- **Bucket:** `speakifylk-terraform-state`
- **Prefix:** `speakifylk/state`

Create the state bucket before running `terraform init`:

```bash
gcloud storage buckets create gs://speakifylk-terraform-state \
  --location=us-west1 \
  --uniform-bucket-level-access
```

## Usage

1. **Copy the example variables file**

   ```bash
   cd infrastructure
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

2. **Initialize Terraform**

   ```bash
   terraform init
   ```

3. **Preview changes**

   ```bash
   terraform plan
   ```

4. **Apply changes**

   ```bash
   terraform apply
   ```

5. **Retrieve the service account key**

   ```bash
   terraform output -raw rag_sa_key | base64 --decode > rag-sa-key.json
   ```

   Keep this file safe and do not commit it to version control.

## Variables

| Name         | Description        | Default      |
| ------------ | ------------------ | ------------ |
| `project_id` | The GCP project ID | _(required)_ |
| `region`     | The GCP region     | `us-west1`   |

## Outputs

| Name                      | Description                         |
| ------------------------- | ----------------------------------- |
| `project_id`              | The GCP project ID                  |
| `region`                  | The GCP region                      |
| `rag_sa_email`            | Email of the RAG service account    |
| `rag_sa_key`              | Base64-encoded JSON key (sensitive) |
| `rag_content_bucket_name` | Name of the RAG content GCS bucket  |

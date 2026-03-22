# Terraform Infrastructure Setup

This guide covers the full setup required for the Terraform infrastructure and the GitHub Actions CI/CD workflow.

## Prerequisites

- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated
- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.5.0 installed
- A GCP project with billing enabled
- Admin access to the GitHub repository

## Step 1: Create the State Bucket

Terraform needs a GCS bucket to store its state file. This must be created manually before anything else.

```bash
gcloud storage buckets create gs://speakifylk-terraform-state --location=us-central1
gcloud storage buckets update gs://speakifylk-terraform-state --versioning
```

## Step 2: Create a Service Account for Terraform CI

```bash
PROJECT_ID="<your-project-id>"

gcloud iam service-accounts create terraform-ci \
  --display-name="Terraform CI"
```

## Step 3: Grant the Service Account Required Roles

```bash
SA_EMAIL="terraform-ci@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" --role="roles/editor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" --role="roles/iam.securityAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" --role="roles/serviceusage.serviceUsageAdmin"
```

## Step 4: Set Up Workload Identity Federation

This allows GitHub Actions to authenticate to GCP without storing service account keys.

### Create the Workload Identity Pool

```bash
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" \
  --display-name="GitHub Actions Pool"
```

### Create the OIDC Provider

```bash
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### Allow the GitHub Repository to Impersonate the Service Account

```bash
REPO="speakifyLK/speakifyLK"  # Update to your actual org/repo

PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/$REPO"
```

## Step 5: Get the WIF Provider Name

```bash
gcloud iam workload-identity-pools providers describe github-provider \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"
```

Save the output. It will look like:

```
projects/123456/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

## Step 6: Add GitHub Repository Secrets

Go to **Settings > Secrets and variables > Actions > New repository secret** and add:

| Secret                | Value                                               |
| --------------------- | --------------------------------------------------- |
| `WIF_PROVIDER`        | The full provider name from Step 5                  |
| `WIF_SERVICE_ACCOUNT` | `terraform-ci@<project-id>.iam.gserviceaccount.com` |
| `GCP_PROJECT_ID`      | Your GCP project ID                                 |

## Step 7: Run Terraform Locally (One-Time Bootstrap)

```bash
cd infrastructure

# Authenticate your local CLI
gcloud auth application-default login

# Initialize Terraform (connects to the GCS state bucket)
terraform init

# Preview what will be created
terraform plan -var="project_id=<your-project-id>"

# Apply to create resources and write initial state
terraform apply -var="project_id=<your-project-id>"
```

## How the CI/CD Workflow Works

After completing the steps above, the GitHub Actions workflow (`.github/workflows/terraform.yml`) handles everything automatically:

- **Pull requests** that change files in `infrastructure/` will:
  - Auto-format Terraform files and commit fixes via `speakify-bot[bot]`
  - Run `terraform plan` and post the output as a PR comment via `speakify-bot[bot]`
- **Merges to main** that change files in `infrastructure/` will run `terraform apply` automatically.

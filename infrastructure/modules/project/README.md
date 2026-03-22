# Project Module

Enables the required GCP APIs for the SpeakifyLK project.

## APIs Enabled

- `aiplatform.googleapis.com` -- AI Platform
- `storage.googleapis.com` -- Cloud Storage
- `iam.googleapis.com` -- Identity and Access Management

## Inputs

None.

## Outputs

| Name                 | Description                            |
| -------------------- | -------------------------------------- |
| `aiplatform_service` | The AI Platform API service resource   |
| `storage_service`    | The Cloud Storage API service resource |
| `iam_service`        | The IAM API service resource           |

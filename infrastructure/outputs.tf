output "project_id" {
  description = "The GCP project ID"
  value       = var.project_id
}

output "region" {
  description = "The GCP region"
  value       = var.region
}

output "rag_sa_email" {
  description = "The email of the RAG service account"
  value       = module.iam.rag_sa_email
}

output "rag_content_bucket_name" {
  description = "The name of the RAG content GCS bucket"
  value       = module.storage.rag_content_bucket_name
}

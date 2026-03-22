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
  value       = google_service_account.rag_sa.email
}

output "rag_sa_key" {
  description = "The base64-encoded JSON key for the RAG service account"
  value       = google_service_account_key.rag_sa_key.private_key
  sensitive   = true
}

output "rag_sa_email" {
  description = "The email of the RAG service account"
  value       = google_service_account.rag_sa.email
}

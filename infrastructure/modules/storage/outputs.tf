output "rag_content_bucket_name" {
  description = "The name of the RAG content GCS bucket"
  value       = google_storage_bucket.rag_content.name
}

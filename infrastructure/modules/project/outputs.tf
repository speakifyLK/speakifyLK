output "aiplatform_service" {
  description = "The AI Platform API service resource"
  value       = google_project_service.aiplatform
}

output "storage_service" {
  description = "The Cloud Storage API service resource"
  value       = google_project_service.storage
}

output "iam_service" {
  description = "The IAM API service resource"
  value       = google_project_service.iam
}

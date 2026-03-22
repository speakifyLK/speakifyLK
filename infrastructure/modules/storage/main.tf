resource "google_storage_bucket" "rag_content" {
  name                        = "speakifylk-rag-content"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket_iam_member" "rag_content_admin" {
  bucket = google_storage_bucket.rag_content.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.rag_sa_email}"
}

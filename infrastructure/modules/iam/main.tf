resource "google_service_account" "rag_sa" {
  account_id   = "speakifylk-rag-sa"
  display_name = "SpeakifyLK RAG Service Account"
}

resource "google_project_iam_member" "rag_sa_aiplatform_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.rag_sa.email}"
}

resource "google_project_iam_member" "rag_sa_storage_object_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.rag_sa.email}"
}

resource "google_service_account_key" "rag_sa_key" {
  service_account_id = google_service_account.rag_sa.name
}

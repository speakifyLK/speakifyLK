terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Local backend for now; switch to GCS when ready:
  # backend "gcs" {
  #   bucket = "your-terraform-state-bucket"
  #   prefix = "speakifylk/state"
  # }
  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_project_service" "aiplatform" {
  service            = "aiplatform.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "storage" {
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iam" {
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

# --- Service Account for RAG pipeline ---

resource "google_service_account" "rag_sa" {
  account_id   = "speakifylk-rag-sa"
  display_name = "SpeakifyLK RAG Service Account"

  depends_on = [google_project_service.iam]
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
  public_key_type    = "TYPE_X509_PEM_FILE"
}

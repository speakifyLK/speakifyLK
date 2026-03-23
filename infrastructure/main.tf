terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "speakifylk-terraform-state"
    prefix = "speakifylk/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# --- API Services ---

module "project" {
  source = "./modules/project"
}

# --- IAM: Service Account and Roles ---

module "iam" {
  source = "./modules/iam"

  project_id = var.project_id

  depends_on = [module.project]
}

# --- Storage: GCS Bucket ---

module "storage" {
  source = "./modules/storage"

  region       = var.region
  rag_sa_email = module.iam.rag_sa_email

  depends_on = [module.project]
}
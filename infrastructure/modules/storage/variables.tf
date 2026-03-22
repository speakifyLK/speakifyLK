variable "region" {
  description = "The GCP region for the bucket"
  type        = string
}

variable "rag_sa_email" {
  description = "The email of the RAG service account"
  type        = string
}

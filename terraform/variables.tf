variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Default GCP region"
  type        = string
  default     = "us-west1"
}

variable "db_tier" {
  description = "Cloud SQL tier"
  type        = string
  default     = "db-f1-micro"
}

variable "db_user" {
  description = "Cloud SQL DB user"
  type        = string
  default     = "zestify"
}

variable "backend_image" {
  description = "Backend container image (Artifact Registry path)"
  type        = string
}

variable "frontend_image" {
  description = "Frontend container image (Artifact Registry path)"
  type        = string
}

variable "stripe_secret_key" {
  description = "Stripe test secret key (kept in Secret Manager)"
  type        = string
  sensitive   = true
}

variable "stripe_publishable_key" {
  description = "Stripe publishable key (baked into frontend at build time)"
  type        = string
  default     = ""
}

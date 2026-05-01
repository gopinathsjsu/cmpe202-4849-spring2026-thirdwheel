variable "project_id" { type = string }
variable "region"     { type = string }
variable "bucket_name" {
  type        = string
  description = "Globally unique GCS bucket name for uploads"
}

resource "google_storage_bucket" "uploads" {
  project                     = var.project_id
  name                        = var.bucket_name
  location                    = var.region
  uniform_bucket_level_access = true
  cors {
    origin          = ["*"]
    method          = ["GET", "POST", "PUT"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

output "bucket_name" {
  value = google_storage_bucket.uploads.name
}

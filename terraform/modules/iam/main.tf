variable "project_id" { type = string }

resource "google_service_account" "backend" {
  project      = var.project_id
  account_id   = "zestify-backend"
  display_name = "Zestify backend Cloud Run runtime SA"
}

resource "google_project_iam_member" "backend_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

output "backend_sa_email" {
  value = google_service_account.backend.email
}

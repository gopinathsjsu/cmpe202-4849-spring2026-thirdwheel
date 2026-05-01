variable "project_id"             { type = string }
variable "region"                 { type = string }
variable "image"                  { type = string }
variable "service_account_email"  { type = string }
variable "cloud_sql_connection"   { type = string }
variable "db_name"                { type = string }
variable "db_user"                { type = string }
variable "secret_ids"             { type = map(string) }

resource "google_cloud_run_v2_service" "backend" {
  project  = var.project_id
  location = var.region
  name     = "zestify-backend"
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = var.service_account_email
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.cloud_sql_connection]
      }
    }
    containers {
      image = var.image
      ports { container_port = 5001 }
      env {
        name  = "PORT"
        value = "5001"
      }
      env {
        name  = "INSTANCE_UNIX_SOCKET"
        value = "/cloudsql/${var.cloud_sql_connection}"
      }
      env {
        name  = "DB_NAME"
        value = var.db_name
      }
      env {
        name  = "DB_USER"
        value = var.db_user
      }
      env {
        name = "DB_PASS"
        value_source {
          secret_key_ref {
            secret  = "db_password"
            version = "latest"
          }
        }
      }
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = "jwt_secret"
            version = "latest"
          }
        }
      }
      env {
        name = "STRIPE_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = "stripe_secret_key"
            version = "latest"
          }
        }
      }
      env {
        name  = "CORS_ORIGINS"
        value = "*"
      }
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
      startup_probe {
        http_get { path = "/healthz" }
        initial_delay_seconds = 5
        timeout_seconds       = 3
        period_seconds        = 5
        failure_threshold     = 6
      }
      liveness_probe {
        http_get { path = "/healthz" }
        period_seconds  = 30
        timeout_seconds = 3
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = google_cloud_run_v2_service.backend.location
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "url" {
  value = google_cloud_run_v2_service.backend.uri
}

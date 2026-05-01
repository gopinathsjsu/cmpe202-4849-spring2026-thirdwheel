variable "project_id"  { type = string }
variable "region"      { type = string }
variable "image"       { type = string }
variable "backend_url" { type = string }

resource "google_cloud_run_v2_service" "frontend" {
  project  = var.project_id
  location = var.region
  name     = "zestify-frontend"
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }
    containers {
      image = var.image
      ports { container_port = 3000 }
      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = "${var.backend_url}/api"
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = google_cloud_run_v2_service.frontend.location
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "url" {
  value = google_cloud_run_v2_service.frontend.uri
}

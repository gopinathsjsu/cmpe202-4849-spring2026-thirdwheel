variable "project_id" { type = string }
variable "region"     { type = string }
variable "repo_id"    { type = string default = "zestify" }

resource "google_artifact_registry_repository" "zestify" {
  project       = var.project_id
  location      = var.region
  repository_id = var.repo_id
  description   = "Zestify backend + frontend container images"
  format        = "DOCKER"
}

output "repo_url" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.zestify.repository_id}"
}

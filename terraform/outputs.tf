output "backend_url" {
  description = "Cloud Run backend service URL"
  value       = module.cloud_run_backend.url
}

output "frontend_url" {
  description = "Cloud Run frontend service URL"
  value       = module.cloud_run_frontend.url
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name (for unix socket connector)"
  value       = module.cloud_sql.connection_name
}

output "artifact_registry_repo" {
  description = "Artifact Registry repo URL"
  value       = module.artifact_registry.repo_url
}

output "uploads_bucket" {
  description = "GCS bucket for uploads"
  value       = module.storage.bucket_name
}

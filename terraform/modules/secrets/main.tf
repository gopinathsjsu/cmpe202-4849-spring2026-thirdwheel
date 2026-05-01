variable "project_id"        { type = string }
variable "jwt_secret"        { type = string sensitive = true }
variable "db_password"       { type = string sensitive = true }
variable "stripe_secret_key" { type = string sensitive = true }

locals {
  secrets = {
    jwt_secret        = var.jwt_secret
    db_password       = var.db_password
    stripe_secret_key = var.stripe_secret_key
  }
}

resource "google_secret_manager_secret" "this" {
  for_each  = local.secrets
  project   = var.project_id
  secret_id = each.key
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "this" {
  for_each    = local.secrets
  secret      = google_secret_manager_secret.this[each.key].id
  secret_data = each.value
}

output "secret_ids" {
  value = { for k, v in google_secret_manager_secret.this : k => v.id }
}

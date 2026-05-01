variable "project_id"  { type = string }
variable "region"      { type = string }
variable "tier"        { type = string default = "db-f1-micro" }
variable "db_name"     { type = string default = "zestify" }
variable "db_user"     { type = string default = "zestify" }
variable "db_password" { type = string sensitive = true }

resource "google_sql_database_instance" "zestify" {
  project          = var.project_id
  name             = "zestify-pg"
  region           = var.region
  database_version = "POSTGRES_16"

  settings {
    tier              = var.tier
    availability_type = "ZONAL"
    disk_size         = 10
    backup_configuration {
      enabled    = true
      start_time = "03:00"
    }
    ip_configuration {
      ipv4_enabled = true
    }
  }
  deletion_protection = false
}

resource "google_sql_database" "app" {
  project  = var.project_id
  name     = var.db_name
  instance = google_sql_database_instance.zestify.name
}

resource "google_sql_user" "app" {
  project  = var.project_id
  name     = var.db_user
  instance = google_sql_database_instance.zestify.name
  password = var.db_password
}

output "connection_name" {
  value = google_sql_database_instance.zestify.connection_name
}

output "instance_name" {
  value = google_sql_database_instance.zestify.name
}

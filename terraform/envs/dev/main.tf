terraform {
  required_version = ">= 1.6"
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id"             { type = string }
variable "region"                 { type = string default = "us-west1" }
variable "backend_image"          { type = string }
variable "frontend_image"         { type = string }
variable "stripe_secret_key"      { type = string sensitive = true }
variable "stripe_publishable_key" { type = string default = "" }
variable "jwt_secret"             { type = string sensitive = true }
variable "db_password"            { type = string sensitive = true }
variable "uploads_bucket_name"    { type = string }

module "artifact_registry" {
  source     = "../../modules/artifact_registry"
  project_id = var.project_id
  region     = var.region
}

module "cloud_sql" {
  source      = "../../modules/cloud_sql"
  project_id  = var.project_id
  region      = var.region
  db_password = var.db_password
}

module "secrets" {
  source            = "../../modules/secrets"
  project_id        = var.project_id
  jwt_secret        = var.jwt_secret
  db_password       = var.db_password
  stripe_secret_key = var.stripe_secret_key
}

module "iam" {
  source     = "../../modules/iam"
  project_id = var.project_id
}

module "storage" {
  source      = "../../modules/storage"
  project_id  = var.project_id
  region      = var.region
  bucket_name = var.uploads_bucket_name
}

module "cloud_run_backend" {
  source                = "../../modules/cloud_run_backend"
  project_id            = var.project_id
  region                = var.region
  image                 = var.backend_image
  service_account_email = module.iam.backend_sa_email
  cloud_sql_connection  = module.cloud_sql.connection_name
  db_name               = "zestify"
  db_user               = "zestify"
  secret_ids            = module.secrets.secret_ids
}

module "cloud_run_frontend" {
  source      = "../../modules/cloud_run_frontend"
  project_id  = var.project_id
  region      = var.region
  image       = var.frontend_image
  backend_url = module.cloud_run_backend.url
}

output "backend_url"  { value = module.cloud_run_backend.url }
output "frontend_url" { value = module.cloud_run_frontend.url }

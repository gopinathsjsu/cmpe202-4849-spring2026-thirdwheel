terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  backend "gcs" {
    # bucket = "<your-tf-state-bucket>"  # set in envs/{dev,prod}
    # prefix = "zestify"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs once per project
resource "google_project_service" "required" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "storage.googleapis.com",
    "iam.googleapis.com",
    "cloudbuild.googleapis.com",
  ])
  service                    = each.key
  disable_on_destroy         = false
}

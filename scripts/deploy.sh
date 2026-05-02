#!/usr/bin/env bash
# End-to-end deploy: build images, push to Artifact Registry, then run terraform apply.
# Usage:
#   ./scripts/deploy.sh dev|prod
#   PROJECT_ID=zestify-cmpe202 REGION=us-west1 ./scripts/deploy.sh dev

set -euo pipefail

ENV="${1:-dev}"
PROJECT_ID="${PROJECT_ID:?set PROJECT_ID}"
REGION="${REGION:-us-west1}"
REPO="${REPO:-zestify}"
TAG="${TAG:-$(git rev-parse --short HEAD)}"

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"
BACKEND_IMG="${REGISTRY}/backend:${TAG}"
FRONTEND_IMG="${REGISTRY}/frontend:${TAG}"

echo "==> Configuring Docker auth for ${REGION}-docker.pkg.dev"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

echo "==> Building backend image: ${BACKEND_IMG}"
docker build -t "${BACKEND_IMG}" ./backend

echo "==> Building frontend image: ${FRONTEND_IMG}"
docker build \
  --build-arg "NEXT_PUBLIC_API_URL=__placeholder__/api" \
  --build-arg "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}" \
  -t "${FRONTEND_IMG}" ./frontend

echo "==> Pushing images"
docker push "${BACKEND_IMG}"
docker push "${FRONTEND_IMG}"

echo "==> Terraform apply (env: ${ENV})"
cd "terraform/envs/${ENV}"
terraform init -upgrade
terraform apply \
  -var "project_id=${PROJECT_ID}" \
  -var "region=${REGION}" \
  -var "backend_image=${BACKEND_IMG}" \
  -var "frontend_image=${FRONTEND_IMG}"

echo "==> Done. Outputs:"
terraform output

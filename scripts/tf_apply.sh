#!/usr/bin/env bash
# Light wrapper around `terraform apply` for the chosen env. Reads tfvars from env vars.
# Usage:
#   ENV=dev ./scripts/tf_apply.sh
#   TF_VAR_project_id=...   TF_VAR_jwt_secret=...   ./scripts/tf_apply.sh

set -euo pipefail

ENV="${ENV:-dev}"
DIR="terraform/envs/${ENV}"

if [ ! -d "$DIR" ]; then
    echo "No env dir at $DIR" >&2
    exit 1
fi

cd "$DIR"
terraform init -upgrade
terraform fmt -recursive ../..
terraform validate
terraform plan -out=plan.tfplan
terraform apply plan.tfplan
rm -f plan.tfplan

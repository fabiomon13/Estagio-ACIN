#!/usr/bin/env bash
# backend/run_presentation_backend.sh
#
# Starts the backend pointed at the presentation database (backend/.env.presentation)
# instead of your normal dev database (backend/.env) -- uvicorn on its own only
# ever reads backend/.env, so without this, the demo would show your dev data
# even after prepare_presentation_db.sh has been run.
#
# Run this after prepare_presentation_db.sh has already wiped/reseeded the
# presentation branch. Every teammate demoing from their own laptop runs
# this (and only this) on their own machine -- prepare_presentation_db.sh
# itself only needs to run once, by whoever seeds the shared branch.
#
# Usage: ./run_presentation_backend.sh

set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env.presentation ]; then
  echo "Falta backend/.env.presentation -- cria o ficheiro com o DATABASE_URL da branch primeiro."
  exit 1
fi

source .venv/bin/activate

set -a
source .env.presentation
set +a

masked_url=$(echo "$DATABASE_URL" | sed -E 's#(postgresql\+psycopg://[^:]+):[^@]+@#\1:***@#')

echo "A arrancar o backend contra a base de apresentação:"
echo "  $masked_url"
echo

uvicorn app.main:app --reload

#!/usr/bin/env bash
# backend/prepare_presentation_db.sh
#
# Wipes all transactional data (dining sessions, guests, orders, order
# items, service requests, payments) and reseeds a clean catalog + fresh
# order history -- ready for a live demo.
#
# Run this from a fresh Neon branch, after pointing backend/.env.presentation
# at its connection string. Asks for confirmation before touching anything,
# since the wipe step has no undo.
#
# Usage: ./prepare_presentation_db.sh

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

echo "Isto vai APAGAR todas as sessões/pedidos ativos e voltar a semear o catálogo em:"
echo "  $masked_url"
echo
read -r -p "Escreve 'sim' para continuar: " confirmation

if [ "$confirmation" != "sim" ]; then
  echo "Cancelado."
  exit 1
fi

python -m app.db.seeds.wipe_transactional_data --yes
python -m app.db.seeds.seed_all --catalog-only

echo
echo "Pronto -- base de apresentação limpa e pronta."

if [ -n "${SEED_STAFF_PASSWORD:-}" ]; then
  echo "Password de staff semeada: a definida em SEED_STAFF_PASSWORD (.env.presentation)."
else
  echo "AVISO: SEED_STAFF_PASSWORD não está definida -- as contas ficaram com a password de dev (ChangeMe123!)."
fi

echo
echo "Falta um passo manual no frontend:"
echo "  cd ../frontend && yarn dev:presentation"
echo "(yarn dev normal deixa os tempos de warning/urgent em 10/20 min, demasiado lento para a demo)"

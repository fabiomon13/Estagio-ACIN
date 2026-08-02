# Scan & Serve

Internship group project. Frontend in React + TypeScript + Tailwind + React Router, backend in FastAPI + SQLAlchemy + Alembic + Pydantic, Postgres database (Neon).

## Requirements

- Node 24
- Python 3.13
- A Postgres database (Neon)

`mise.toml` pins the Node and Python versions for anyone using [mise](https://mise.jdx.dev/). It's optional — if you don't use mise, just make sure you have Node 24 and Python 3.13 installed however you prefer (nvm, pyenv, system install, etc.).

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL with the Neon connection string
alembic upgrade head    # once migrations exist
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`, with the main router mounted under `/api`.

## Frontend

```bash
cd frontend
yarn install
yarn dev
```

The app is available at `http://localhost:5173`.

## Docs

- [Staff authentication & authorization](docs/auth.md) — how login/roles work, and how to use them in new endpoints/pages.
- [Autenticação de Staff — explicação simples](docs/auth-simples.md) — versão simplificada em português.
- [Typography](docs/typography.md) — which font goes where, and how to size/weight it correctly.
- [Kitchen backend — tickets & item status](docs/kitchen-backend.md) — the `/api/kitchen` endpoints, how a ticket is defined, and how the backend test suite works.

## Structure

```
backend/
  app/
    api/        # FastAPI routers
    core/       # configuration (settings, env vars)
    db/         # engine, session, declarative Base
    models/     # SQLAlchemy models
    schemas/    # Pydantic schemas
    services/   # business logic
    modules/    # role-based modules (admin, client, kitchen, staff)
  alembic/      # migrations
frontend/
  src/          # React app source
```

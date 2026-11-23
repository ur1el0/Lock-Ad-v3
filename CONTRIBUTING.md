# Contributing to Lock-Ad v3

Thank you for helping improve Lock-Ad v3.

## Development Workflow
1. Fork the repository and create a feature or fix branch from `main` (e.g., `feature/my-change` or `fix/issue-name`). Do not commit directly to `main`.
2. Copy `backend/.env.example` to `backend/.env` and follow the setup steps in [README.md](README.md).
3. Keep commits small, atomic, and scoped to a single layer using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
4. Never commit `.env` files, API keys, or local database files.

## Verification Before Opening a PR
- Backend:
  ```bash
  cd backend
  python manage.py check
  python manage.py test
  python manage.py makemigrations --check --dry-run
  ```
- Frontend:
  ```bash
  cd frontend
  npm run lint
  npm test
  npm run build
  ```
- Docker Compose:
  ```bash
  docker compose --env-file backend/.env config --quiet
  ```

# Cabana da Pizza

Sistema de delivery para a Cabana da Pizza, com site público, carrinho, envio estruturado para WhatsApp, backend FastAPI, painel administrativo e controle operacional de pedidos.

## Estrutura

- `src/`: frontend React/Vite.
- `backend/`: API FastAPI, migrations Alembic e scripts operacionais.
- `src/data/menu.json`: cardápio, dados da marca e número do WhatsApp.
- `DEPLOY-CONTROLADO.md`: roteiro de deploy controlado.
- `backend/README.md`: instruções específicas do backend.

## Rodar Localmente

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
alembic upgrade head
python scripts/sync_menu_seed.py
python scripts/bootstrap_admin.py
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Validação

```bash
npm run lint
npm test
npm run build
```

# Deploy Controlado Cabana da Pizza

Este roteiro existe para testar o produto com o dono sem depender da sua maquina local.

## Objetivo

Publicar o sistema em um ambiente simples, com:

- site publico
- painel admin
- API FastAPI
- banco PostgreSQL
- pasta de midia persistente

## Ordem recomendada

1. Criar o banco PostgreSQL em nuvem.
2. Publicar a API FastAPI.
3. Rodar migrations com `alembic upgrade head`.
4. Criar o primeiro admin com `python scripts/bootstrap_admin.py`.
5. Publicar o frontend apontando para a URL real da API.
6. Testar pedido completo pelo site.
7. Testar painel, status, cozinha, detalhe e comanda.

## Variaveis do backend

Configure no ambiente da API:

```env
APP_ENV=production
API_V1_PREFIX=/api
DATABASE_URL=postgresql+psycopg://usuario:senha@host:5432/cabana_pizza
CORS_ORIGINS=https://seu-dominio.com
AUTH_SECRET_KEY=troque-por-uma-chave-grande-e-unica
AUTH_ALGORITHM=HS256
AUTH_ACCESS_TOKEN_EXPIRE_MINUTES=480
ADMIN_ORDER_UNDO_WINDOW_MINUTES=10
ADMIN_BOOTSTRAP_NAME=Cabana Admin
ADMIN_BOOTSTRAP_EMAIL=admin@cabanadapizza.com
ADMIN_BOOTSTRAP_PASSWORD=troque-esta-senha
MEDIA_ROOT=./media
MEDIA_URL_PREFIX=/media
MEDIA_MAX_UPLOAD_MB=5
```

Ponto importante: `MEDIA_ROOT` precisa ser persistente. Se o host apagar arquivos a cada deploy, as imagens enviadas pelo painel somem.

## Variaveis do frontend

Configure no build do frontend:

```env
VITE_API_BASE_URL=https://api.seu-dominio.com
```

Sem isso, o frontend tenta usar `http://127.0.0.1:8000`, que so funciona localmente.

## Checklist de validacao

- `GET /api/health` responde.
- `GET /api/health/database` responde saudavel.
- `GET /api/menu` retorna produtos.
- Pedido feito no site aparece no painel.
- Aviso de pedido novo aparece no painel.
- Status avanca de `Pendente` para `Confirmado`, `Preparando` e finalizacao.
- Desfazer status funciona dentro da janela configurada.
- Comanda abre a impressao.
- Upload de imagem funciona e a imagem aparece no site publico.

## O que deixar fora do primeiro deploy

- pagamento online
- taxa por bairro
- integracao com impressora termica direta
- automacao de WhatsApp

Esses pontos dependem de regra operacional real da loja ou de integracoes externas. O primeiro deploy deve provar o fluxo central: cliente pede, loja recebe, opera e acompanha.

# Plano de Backend e Painel

## Objetivo

Transformar o site atual em uma operação real de pedidos, com backend próprio e painel administrativo, sem complicar a arquitetura cedo demais.

## Direção Recomendada

- Manter o frontend atual em React/Vite.
- Criar um backend em `FastAPI` dentro de uma pasta `backend/`.
- Usar `PostgreSQL` como banco principal.
- Construir o painel admin dentro do mesmo frontend atual, em uma rota como `/admin`.
- Adiar por enquanto:
  - taxa de entrega por bairro
  - combos
  - pedido mínimo
  - backend multiempresa completo

## Por Que Esse Caminho É O Melhor

- É mais simples de estudar e manter.
- Evita dividir o projeto em dois frontends sem necessidade.
- Aproveita o payload de pedido que o site já monta hoje.
- Permite crescer depois para SaaS sem jogar trabalho fora.

## Estrutura Recomendada

```text
CabanaDaPizza/
  backend/
    app/
      api/
      core/
      db/
      dependencies/
      models/
      schemas/
      services/
      main.py
    alembic/
    pyproject.toml
    .env
  src/
    components/
    pages/
    lib/
    store/
    features/
      admin/
      checkout/
      menu/
```

## Stack Recomendada

### Backend

- FastAPI
- SQLAlchemy 2
- Alembic
- Pydantic
- PostgreSQL
- Uvicorn
- Passlib ou pwdlib para hash de senha

### Frontend Admin

- React Router
- TanStack Query
- React Hook Form
- Zod

## Modelagem Inicial

### Tabelas Principais

1. `admin_users`
   - login do painel

2. `categories`
   - tradicionais
   - especiais
   - premium
   - doces
   - refrigerantes
   - cervejas
   - sucos

3. `products`
   - nome
   - descrição
   - imagem
   - categoria
   - ativo/inativo
   - destaque

4. `pizza_category_prices`
   - categoria
   - tamanho `M/G/GG`
   - preço

5. `crust_prices`
   - tamanho
   - preço da borda

6. `product_options`
   - usado para bebidas e variações
   - exemplo: coca 1L, coca 2L, suco de acerola

7. `orders`
   - dados do cliente
   - endereço
   - forma de entrega
   - forma de pagamento
   - total
   - status

8. `order_items`
   - itens do pedido
   - observação por item
   - preço unitário
   - quantidade

## Status de Pedido Recomendados

- `pending`
- `confirmed`
- `preparing`
- `out_for_delivery`
- `completed`
- `cancelled`

## APIs da Primeira Fase

### Públicas

- `GET /api/health`
- `GET /api/menu`
- `POST /api/orders`

### Admin

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/{id}/status`
- `GET /api/admin/products`
- `POST /api/admin/products`
- `PATCH /api/admin/products/{id}`

## Ordem Correta de Construção

### Fase 1: Fundar o backend

Objetivo:
- subir FastAPI
- conectar PostgreSQL
- configurar migrations

Você aprende:
- estrutura de backend
- variáveis de ambiente
- conexão com banco
- migrations com Alembic

### Fase 2: Persistir pedidos

Objetivo:
- receber o pedido do frontend
- salvar no banco
- devolver número do pedido

Você aprende:
- schemas Pydantic
- validação
- transação
- relacionamento entre tabelas

### Fase 3: Login do painel

Objetivo:
- criar autenticação de admin
- proteger rotas do painel

Você aprende:
- hash de senha
- autenticação
- sessão/cookie ou token

### Fase 4: CRUD do cardápio

Objetivo:
- editar sabores
- ativar/desativar produto
- trocar preço e descrição

Você aprende:
- CRUD completo
- formulários admin
- integração frontend/backend

### Fase 5: Gestão de pedidos

Objetivo:
- listar pedidos
- mudar status
- visualizar detalhes

Você aprende:
- telas de operação
- filtros
- atualização de dados no painel

## O Que Não Vale Fazer Agora

- separar em microserviços
- criar app admin separado
- inventar multi-tenant completo antes da hora
- adicionar pagamento online antes do fluxo base ficar redondo

## Próximo Prompt Ideal

Se quiser seguir da forma mais correta, o próximo prompt deveria ser:

`Crie a base do backend FastAPI em /backend com PostgreSQL, SQLAlchemy 2, Alembic, configuração por .env e rota /api/health, me explicando cada parte enquanto faz.`

Depois disso, o próximo seria:

`Agora modele o banco inicial para produtos, categorias, preços, bordas, pedidos e itens do pedido, com migrations, e me explique cada decisão.`

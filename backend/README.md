# Backend Cabana da Pizza

"PS C:\Users\godinho> cd c:\Users\godinho\CabanaDaPizza\backend
PS C:\Users\godinho\CabanaDaPizza\backend> .\.venv\Scripts\Activate.ps1
(.venv) PS C:\Users\godinho\CabanaDaPizza\backend> uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"


## O que esta aqui

Esta pasta contem a base do backend em FastAPI com:

- configuracao por `.env`
- conexao PostgreSQL via SQLAlchemy 2
- Alembic para migrations
- health checks
- cardapio publico via `GET /api/menu`
- criacao de pedidos via `POST /api/orders`
- autenticacao admin via token JWT
- leitura inicial de pedidos via painel admin
- gestao inicial de cardapio pelo painel admin

## Estrutura

```text
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
  alembic.ini
  compose.yaml
  pyproject.toml
```

## Como subir

### 1. Criar o ambiente virtual

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Instalar dependencias

```powershell
pip install -e .
```

### 3. Subir o PostgreSQL

Se voce tiver Docker:

```powershell
docker compose up -d
```

### 4. Rodar a migration base

```powershell
alembic upgrade head
```

### 5. Subir a API

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Para publicar fora da maquina local, use o roteiro do arquivo `DEPLOY-CONTROLADO.md` na raiz do projeto.

## O que validar

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/api/health`
- `http://127.0.0.1:8000/api/health/database`
- `POST http://127.0.0.1:8000/api/orders`
- `GET http://127.0.0.1:8000/api/menu`
- `POST http://127.0.0.1:8000/api/admin/login`
- `GET http://127.0.0.1:8000/api/admin/me`
- `GET http://127.0.0.1:8000/api/admin/orders`
- `GET http://127.0.0.1:8000/api/admin/orders/dashboard`
- `PATCH http://127.0.0.1:8000/api/admin/orders/{id}/status`
- `POST http://127.0.0.1:8000/api/admin/orders/{id}/undo-status`
- `GET http://127.0.0.1:8000/api/admin/catalog`
- `POST http://127.0.0.1:8000/api/admin/media/product-image`
- `GET http://127.0.0.1:8000/api/admin/media/products`
- `DELETE http://127.0.0.1:8000/api/admin/media/products/{fileName}`
- `POST http://127.0.0.1:8000/api/admin/products`
- `PATCH http://127.0.0.1:8000/api/admin/products/{id}`
- `POST http://127.0.0.1:8000/api/admin/product-options`
- `PATCH http://127.0.0.1:8000/api/admin/product-options/{id}`
- `PATCH http://127.0.0.1:8000/api/admin/pizza-prices/{categoryCode}`
- `PATCH http://127.0.0.1:8000/api/admin/crust-prices`
- `PATCH http://127.0.0.1:8000/api/admin/crust-flavors/{id}`

Filtros ja suportados em `GET /api/admin/orders`:

- `limit`
- `status`
- `fulfillment`
- `search`
- `dateFrom`
- `dateTo`

O resumo operacional em `GET /api/admin/orders/dashboard` aceita:

- `dateFrom`
- `dateTo`

## Como criar o primeiro admin

No `.env`, defina:

```env
ADMIN_BOOTSTRAP_NAME=Cabana Admin
ADMIN_BOOTSTRAP_EMAIL=admin@cabanadapizza.com
ADMIN_BOOTSTRAP_PASSWORD=troque-esta-senha
```

Depois rode:

```powershell
python scripts/bootstrap_admin.py
```

Esse script cria ou atualiza o usuario admin inicial. Ele existe para evitar que voce precise inserir senha manualmente no banco.

## Como pensar nessa fase

- O site do cliente continua publico.
- O painel admin passa a exigir login.
- O backend emite um token de acesso.
- O frontend guarda esse token no navegador e usa nas rotas protegidas.

Em outras palavras: agora o sistema ja sabe diferenciar `cliente` de `operador`.

## Gestao inicial de pedidos

Nesta fase o painel ja consegue:

- listar pedidos recentes
- filtrar por status
- filtrar por entrega ou retirada
- filtrar por periodo
- buscar por cliente, telefone ou protocolo
- mostrar itens, endereco e pagamento
- abrir detalhe completo do pedido com cliente, endereco, itens, pagamento e historico
- alternar entre lista de atendimento e visao de cozinha em colunas
- receber aviso visual e sonoro quando entrar pedido novo no painel
- imprimir comanda limpa do pedido para cozinha ou balcao
- acompanhar resumo do periodo com pedidos, fila ativa, entregas, faturamento e contagem por status
- avancar o status operacional por botoes guiados de proxima acao
- desfazer a ultima mudanca de status dentro de uma janela curta de seguranca
- registrar historico de status com horario e admin responsavel

Fluxo de status implementado:

- `pending` -> `confirmed` ou `cancelled`
- `confirmed` -> `preparing` ou `cancelled`
- `preparing` -> `out_for_delivery`, `completed` ou `cancelled`
- `out_for_delivery` -> `completed` ou `cancelled`

`completed` e `cancelled` sao estados finais.

No painel, isso aparece como a proxima acao operacional:

- `Pendente`: confirmar pedido
- `Confirmado`: iniciar preparo
- `Preparando`: saiu para entrega ou concluir retirada
- `Saiu para entrega`: concluir entrega
- `Cancelar pedido`: acao separada com confirmacao

Para reduzir erro humano, o painel guarda o ultimo status anterior do pedido e permite desfazer a ultima mudanca por alguns minutos. A janela padrao vem de:

```env
ADMIN_ORDER_UNDO_WINDOW_MINUTES=10
```

Cada mudanca feita pelo painel tambem cria um registro em `order_events`. Esse historico guarda:

- pedido
- admin responsavel
- tipo do evento
- status anterior
- novo status
- horario da acao

## Gestao inicial de cardapio

Nesta fase o painel ja consegue:

- listar categorias e produtos direto do banco
- enviar imagem nova para o backend
- cadastrar produto novo por categoria
- criar nova opcao para bebidas
- editar nome comercial, descricao e selo curto de cada produto
- ligar ou desligar a disponibilidade de produtos e opcoes
- marcar pizzas como destaque
- ajustar a ordem de exibicao
- alterar os precos base das pizzas por categoria e tamanho
- alterar os precos de borda por tamanho
- editar sabores de borda

O site publico agora ja consegue ler o menu do backend por `GET /api/menu`. Se a API estiver online, o cardapio que aparece para o cliente passa a refletir o banco. Se a API estiver offline, o frontend ainda cai para o `menu.json` local como fallback de desenvolvimento.

Regra importante desta fase:

- pizza nova nasce pronta, porque usa a tabela base da categoria
- bebida nova precisa nascer com a primeira opcao de venda
- opcoes extras continuam sendo adicionadas depois no mesmo painel
- imagem pode continuar vindo do `imageKey` local ou passar a vir de upload salvo em `/media`

## Gestao inicial de imagem

Agora o backend tambem sabe servir imagens enviadas pelo painel.

Como isso funciona:

- o admin envia um arquivo JPG, PNG ou WEBP
- o backend salva em `backend/media/products`
- a API devolve um caminho como `/media/products/arquivo.jpg`
- o produto passa a poder usar esse caminho como imagem
- o site publico entende tanto imagens locais quanto imagens enviadas pelo painel

Nesta fase, o fluxo de imagem e intencionalmente simples:

- upload primeiro
- salvar produto depois

Isso evita referencia quebrada no banco e deixa o operador entender exatamente quando a troca foi publicada.

Nesta fase a biblioteca de imagem tambem ja consegue:

- listar todos os arquivos enviados
- mostrar quantos produtos usam cada imagem
- marcar imagem orfa
- impedir exclusao de imagem em uso
- excluir imagem orfa com seguranca

## Sincronizar seed local do cardapio

Enquanto o painel ainda esta nesta fase inicial, existe um script para popular ou atualizar o banco a partir do cardapio local:

```powershell
python scripts/sync_menu_seed.py
```

Esse script:

- le `src/data/menu.json`
- atualiza produtos e opcoes no PostgreSQL
- atualiza a tabela base de precos por categoria
- preserva a ideia de banco como fonte de verdade para o menu publico

## Exemplo de payload de pedido

```json
{
  "channel": "site",
  "customer": {
    "name": "Arthur",
    "phone": "869994780814"
  },
  "fulfillment": {
    "type": "delivery",
    "postalCode": "65630-550",
    "neighborhood": "Santo Antonio",
    "street": "Rua Jose Fernandes da Silva",
    "number": "311",
    "city": "Timon",
    "state": "MA",
    "complement": "Casa do portao branco",
    "reference": "Esquina com a UPA"
  },
  "payment": {
    "method": "pix",
    "changeFor": null
  },
  "items": [
    {
      "id": "local-1",
      "productId": "baiana",
      "name": "Baiana",
      "size": "GG",
      "edge": null,
      "note": "Bem assada",
      "unitPrice": 56,
      "qty": 1,
      "lineTotal": 56
    }
  ],
  "summary": {
    "itemCount": 1,
    "subtotal": 56,
    "total": 56
  },
  "notes": "Sem troco"
}
```

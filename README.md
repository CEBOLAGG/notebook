# NotebookCheck — Web

Painel web (Next.js + MongoDB) que recebe os checklists técnicos enviados pelo
app desktop NotebookCheck. Hospedado na Vercel.

## Setup local

```bash
cd web
npm install
cp .env.example .env.local   # ou: copy .env.example .env.local (Windows)
# preencha MONGODB_URI e INGEST_TOKEN
npm run dev
```

A UI sobe em http://localhost:3000.

## Variáveis de ambiente

| Nome              | Obrigatório | Descrição                                                                  |
| ----------------- | ----------- | -------------------------------------------------------------------------- |
| `MONGODB_URI`     | sim         | Connection string do MongoDB Atlas, com nome do banco no path da URI.      |
| `INGEST_TOKEN`    | sim         | Token bearer compartilhado com o app desktop (campo `auth_token`).         |
| `DASHBOARD_TOKEN` | não         | Reservado para proteção da UI (não exigido nesta versão inicial).          |

## API

### `POST /api/reports`

Endpoint consumido pelo app desktop. Espera o mesmo payload que `ApiPayload`
gera (`Application/Api/PayloadBuilder.cs`).

```http
POST /api/reports
Authorization: Bearer <INGEST_TOKEN>
Content-Type: application/json

{ ... ApiPayload ... }
```

Respostas:

- `201` — payload aceito e gravado (ou já existia, caso `test_id` repetido).
- `400` — JSON inválido ou faltando campos obrigatórios.
- `401` — token ausente ou incorreto.
- `500` — banco indisponível ou erro interno.

### `GET /api/reports`

Lista relatórios. Aceita `q`, `classification`, `type`, `limit` por query string.

### `GET /api/reports/:testId`

Documento completo com comentários.

### `POST /api/reports/:testId/comments`

Adiciona um comentário associado a um teste (`test_key` em snake_case) ou ao
relatório inteiro (`test_key = "_general"`).

```json
{ "test_key": "wifi", "author": "João", "text": "Não testado por falta de roteador" }
```

## Migração futura para o Bling

Toda interação com o banco está em `lib/repository.ts`. Para trocar por uma
camada que sincronize com o Bling, basta reescrever as funções do
`reportsRepo` mantendo as mesmas assinaturas — as rotas e a UI não precisam
mudar.

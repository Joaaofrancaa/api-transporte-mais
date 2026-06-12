# API Transporte Mais

Backend inicial do projeto Transporte Mais.

## Requisitos

- Node.js 20 ou superior
- MySQL 8 ou superior, quando as rotas com banco forem utilizadas

## Primeiros passos

```bash
npm install
copy .env.example .env
npm run dev
```

A API ficara disponivel em `http://localhost:3000`.

## Rotas iniciais

- `GET /`: identifica a API.
- `GET /health`: verifica se o processo esta respondendo.
- `GET /health/db`: verifica a conexao com o MySQL.
- `GET /api/v1`: identifica a versao publica atual.

## Scripts

- `npm run dev`: inicia com recarregamento automatico.
- `npm start`: inicia em modo normal.
- `npm run check`: valida a sintaxe dos arquivos JavaScript.

Consulte `agent/sobre-api.md` para a documentacao tecnica e as decisoes
iniciais do projeto.

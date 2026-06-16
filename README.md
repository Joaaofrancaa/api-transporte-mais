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
- `npm run security:env`: valida se `.env` continua protegido pelo `.gitignore`.
- `npm test`: executa testes automatizados de login, token e permissoes.
- `npm run verify`: executa sintaxe, seguranca de `.env` e testes.
- `npm run ensure:admin-index`: cria no banco a protecao de um administrador ativo por instituicao.
- `npm run ensure:tracking-column`: cria no banco a configuracao de uso da aba acompanhamentos por instituicao.

Os testes de permissao usam por padrao os usuarios locais `KENGI` e `JOAO`
com senha `123456`. Para outro banco, defina `TEST_ADMIN_LOGIN`,
`TEST_ADMIN_PASSWORD`, `TEST_REQUESTER_LOGIN` e `TEST_REQUESTER_PASSWORD`.

Consulte `agent/sobre-api.md` para a documentacao tecnica e as decisoes
iniciais do projeto.

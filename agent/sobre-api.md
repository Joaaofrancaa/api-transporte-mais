# Sobre a API - Transporte Mais

## Visao geral

Esta API foi criada para ser o backend do projeto Transporte Mais.

O tipo exato de operacao de transporte e as regras de negocio ainda nao foram
definidos. Por esse motivo, esta primeira versao estabelece somente a
infraestrutura comum da aplicacao e evita criar entidades prematuras.

## Objetivos desta base

- disponibilizar um servidor HTTP com Express;
- organizar rotas, controllers, middlewares e configuracoes;
- permitir configuracao por variaveis de ambiente;
- preparar uma conexao MySQL criada somente quando necessaria;
- oferecer endpoints de saude da aplicacao e do banco;
- centralizar respostas de erro;
- permitir evolucao das rotas por versao;
- documentar as decisoes do projeto desde o inicio.

## Stack inicial

- Node.js 20 ou superior;
- Express 5;
- MySQL com `mysql2/promise`;
- `dotenv` para configuracao local;
- `cors` para controle de origens;
- `helmet` para cabecalhos HTTP de seguranca;
- `morgan` para logs das requisicoes;
- `nodemon` para desenvolvimento.

## Estrutura

```txt
api-transporte-mais/
  agent/
    sobre-api.md
  scripts/
    check-js.js
  src/
    config/
      env.js
    controllers/
      health-controller.js
    database/
      connection.js
      create.sql
      inserts.sql
    middlewares/
      error-handler.js
      not-found.js
    routes/
      health-routes.js
      index.js
    app.js
    server.js
  .env.example
  .gitignore
  index.js
  package.json
  README.md
```

## Responsabilidade dos arquivos

### `index.js`

Ponto de entrada minimo. Apenas chama a inicializacao definida em
`src/server.js`.

### `src/app.js`

Monta e retorna a aplicacao Express. Registra seguranca, CORS, parsers, logs,
rotas e tratamento de erros. Nao abre uma porta, portanto pode ser reutilizado
em testes futuros.

### `src/server.js`

Abre a porta HTTP e trata `SIGINT` e `SIGTERM`. Ao encerrar, fecha o servidor e
o pool do MySQL caso ele tenha sido criado.

### `src/config/env.js`

Carrega o `.env`, aplica valores padrao e concentra as configuracoes da
aplicacao. Outros modulos nao devem acessar `process.env` diretamente.

### `src/database`

`connection.js` cria o pool MySQL sob demanda. A API pode iniciar mesmo que o
banco ainda nao esteja criado; a conexao real acontece quando uma rota solicita
o pool.

O mesmo diretorio guarda os scripts SQL. `create.sql` cria o banco vazio e
`inserts.sql` esta reservado para os dados iniciais das futuras entidades.

### `src/controllers`

Contem a logica HTTP de cada recurso. Controllers devem validar a entrada,
acionar servicos ou acesso a dados e produzir a resposta.

### `src/routes`

Declara os caminhos e associa cada endpoint ao controller correspondente.
Novos recursos publicos devem ser montados sob `/api/v1`.

### `src/middlewares`

Contem comportamentos transversais. A base inclui resposta para rota
inexistente e tratamento centralizado de erros.

## Variaveis de ambiente

Crie `.env` a partir de `.env.example`.

| Variavel | Finalidade | Padrao |
|---|---|---|
| `NODE_ENV` | ambiente da aplicacao | `development` |
| `PORT` | porta HTTP | `3000` |
| `CORS_ORIGIN` | origens permitidas, separadas por virgula | qualquer origem |
| `JSON_LIMIT` | limite do corpo JSON | `1mb` |
| `DB_HOST` | servidor MySQL | `localhost` |
| `DB_PORT` | porta MySQL | `3306` |
| `DB_USER` | usuario MySQL | `root` |
| `DB_PASSWORD` | senha MySQL | vazia |
| `DB_NAME` | banco da aplicacao | `transporte_mais` |
| `DB_CONNECTION_LIMIT` | maximo de conexoes do pool | `10` |
| `JWT_SECRET` | segredo para autenticacao futura | vazio |
| `JWT_EXPIRES_IN` | validade futura do token | `8h` |

O `.env` real nunca deve ser versionado. O `.env.example` deve conter somente
valores de exemplo, sem senhas ou segredos reais.

## Rotas iniciais

### `GET /`

Identifica o servico e informa que ele esta online.

### `GET /health`

Retorna o estado do processo, ambiente, tempo de atividade e horario atual.
Nao acessa o banco.

### `GET /health/db`

Executa `SELECT 1` no MySQL. Retorna HTTP 503 quando o banco estiver
indisponivel.

### `GET /api/v1`

Identifica a versao atual da API. As futuras rotas de negocio devem partir
deste prefixo, por exemplo `/api/v1/usuarios`.

## Comandos

```bash
npm install
npm run dev
npm run check
npm start
```

- `npm run dev`: desenvolvimento com reinicio automatico;
- `npm run check`: validacao de sintaxe de todos os arquivos JavaScript;
- `npm start`: execucao normal da API.

## Convencoes iniciais

- CommonJS e o formato de modulos desta primeira versao.
- Arquivos JavaScript usam nomes em `kebab-case`.
- Rotas usam substantivos e recebem versao sob `/api/v1`.
- Configuracoes passam por `src/config/env.js`.
- Erros esperados devem informar `statusCode` e uma mensagem publica.
- O banco usa `utf8mb4`.
- Segredos e credenciais nunca entram no repositorio.
- Regras de negocio nao devem ficar diretamente nos arquivos de rotas.

## Decisoes adiadas

Ainda nao foram escolhidos:

- tipo de transporte atendido;
- entidades centrais e relacionamentos;
- modelo de usuarios, empresas e permissoes;
- estrategia de autenticacao;
- geolocalizacao, mapas ou rastreamento;
- provedores externos;
- regras financeiras;
- hospedagem e pipeline de entrega.

Essas decisoes devem ser registradas aqui quando forem tomadas. A estrutura
pode receber futuramente pastas como `services`, `repositories`, `validators`
e `tests` quando houver comportamento real que justifique essas camadas.

## Proximos passos sugeridos

1. Definir quem usa o sistema e qual problema de transporte sera resolvido.
2. Mapear as primeiras entidades e fluxos.
3. Desenhar o schema inicial do MySQL.
4. Definir autenticacao e perfis de acesso.
5. Implementar o primeiro recurso sob `/api/v1`.
6. Adicionar testes automatizados conforme as regras surgirem.

## Historico

### Base inicial - 11/06/2026

- projeto Node.js e Express configurado;
- arquivos de ambiente e exclusoes do Git adicionados;
- servidor e aplicacao separados;
- conexao MySQL sob demanda preparada;
- rotas de identificacao e saude criadas;
- middlewares de seguranca, logs, rota inexistente e erro adicionados;
- scripts SQL iniciais criados sem entidades de dominio;
- validacao de sintaxe adicionada;
- documentacao inicial criada na pasta `agent`.

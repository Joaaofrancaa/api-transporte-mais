# Sobre a API - Transporte Mais

## Visão geral

Esta API é o backend do projeto Transporte+. Node.js, Express 5 e MySQL (`mysql2/promise`), com autenticação JWT já implementada e suporte a múltiplas instituições (multi-tenant).

Domínios cobertos:

- instituições (multi-tenant, cada uma com logo, dados de contato e opção de usar ou não acompanhamentos);
- usuários (perfis, setor, convênios permitidos);
- motoristas;
- setores, unidades, médicos, acompanhantes, convênios (cadastros auxiliares por instituição);
- solicitações de transporte;
- acompanhamentos de ambulância/UTI móvel (com faturamento);
- destinos favoritos;
- chamados de suporte (com envio de e-mail);
- contato público do site (Portfolio);
- notificações push (web push e FCM/Android nativo);
- auditoria de requisições.

## Perfis de usuário

O campo `perfil` de `usuarios` guarda o papel base e, opcionalmente, uma lista de "telas extras" liberadas, no formato `BASE|tela1,tela2` (ex.: `SOLICITANTE|acompanhamento,faturamento`).

| Perfil base | Regra |
| --- | --- |
| `SOLICITANTE` | Cria solicitações, acompanha o próprio histórico. Pode ganhar acesso extra a `acompanhamento`, `faturamento` e/ou `relatorios` via telas extras. |
| `MOTORISTA` | Vê e aceita solicitações pendentes na fila de Atendimento, inicia e conclui viagens. Não tem acesso a Acompanhamento. |
| `ADMINISTRADOR` | Acesso total dentro da própria instituição (exceto a fila de Atendimento do motorista). Único admin ativo por instituição (índice único `uk_usuarios_um_admin_por_instituicao`). |
| `MASTER` | Enxerga todas as instituições (não fica restrito por `instituicao_id`), usado para administração cross-tenant. Acesso de front limitado a Configurações. |

O front também reconhece um papel derivado `FATURISTA` (mapeado para `Faturista` na UI) para contas com acesso à tela de Faturamento; ao salvar, ele é gravado como `SOLICITANTE` com a tela extra `faturamento`.

A autorização por papel ainda é parcialmente aplicada — a maior parte das regras de negócio críticas (ex.: só `SOLICITANTE` dono pode editar a própria solicitação `PENDENTE`) está em hooks (`beforeUpdate`/`beforeCreate`) dos recursos, não em um middleware de autorização genérico.

## Stack

- Node.js 20+
- Express 5
- MySQL com `mysql2/promise`
- `dotenv`, `cors`, `helmet`, `morgan`, `nodemon`
- `web-push` (push notifications no navegador)
- `firebase-admin` (push notifications nativas Android/FCM)
- Envio de e-mail via SMTP cru (implementação própria em `utils/smtp-mailer.js`, sem `nodemailer`), com fallback opcional para Brevo, SendGrid ou Resend via API HTTP, conforme variáveis de ambiente configuradas.

## Estrutura

```txt
api-transporte+/
  agent/
    sobre-api.md
  scripts/
    check-js.js
  src/
    config/
      env.js
    controllers/
      auth-controller.js
      bootstrap-controller.js
      fcm-push-tokens-controller.js
      health-controller.js
      push-subscriptions-controller.js
      resource-controller-factory.js
      site-contact-controller.js
      solicitacoes-transporte-controller.js
    database/
      connection.js
      create.sql
      inserts.sql
      ensure-*.js (migrações incrementais, ver abaixo)
    middlewares/
      audit-logger.js
      authentication.js
      error-handler.js
      not-found.js
    repositories/
      crud-repository.js
    resources/
      resource-definitions.js
      support-ticket-hooks.js
    routes/
      api-v1-routes.js
      health-routes.js
      index.js
      resource-routes-factory.js
    services/
      database-backup.js
      fcm-notifications.js
      push-notifications.js
    utils/
      auth-token.js
      cpf-crypto.js
      http-error.js
      password-hash.js
      smtp-mailer.js
    app.js
    server.js
  .env.example
  .env.production.example
  index.js
  package.json
```

### Migrações incrementais (`database/ensure-*.js`)

`create.sql`/`inserts.sql` definem o schema base, mas o schema em produção evolui via pequenos scripts idempotentes chamados no boot (`server.js`), cada um verificando `information_schema.COLUMNS`/tabelas antes de alterar:

- `ensure-billing-status-column.js` — `faturamento_status` em `acompanhamentos_ambulancia`.
- `ensure-tracking-details-columns.js` — `convenio`, `codigo_carteirinha`, `paciente_entubado`, `tipo_trajeto`, `modo_espera` em `acompanhamentos_ambulancia`.
- `ensure-tracking-requester-column.js` — `solicitante_usuario_id` em `acompanhamentos_ambulancia` (quem registrou o acompanhamento).
- `ensure-request-routine-column.js` — `is_rotina` em `solicitacoes_transporte` (marca ocorrências geradas por rotina/recorrência).
- `ensure-user-health-plans-column.js` — `convenios_permitidos` em `usuarios`.
- `ensure-institution-contact-columns.js`, `ensure-institution-logo-column.js` — dados de contato e logo em `instituicoes`.
- `ensure-user-profile-column.js` — suporte ao formato `perfil` com telas extras.
- `ensure-fcm-push-tokens.js`, `ensure-push-subscriptions.js` — tabelas de push.
- `ensure-transport-request-notifications.js` — tabela de controle de notificação já enviada por solicitação.

Ao adicionar um campo novo, o padrão do projeto é: criar um `ensure-*.js`, chamá-lo em `server.js` antes do `app.listen`, liberar a coluna em `writableColumns` no recurso correspondente, e mapear no front em `services/transporteApi.js`.

## Banco de dados

Banco `transporte_mais`, `utf8mb4`. Todas as tabelas operacionais (exceto `chamados_suporte`, que aceita `instituicao_id` nulo, e `auditoria_logs`) são isoladas por `instituicao_id` (multi-tenant).

### Tabelas

| Tabela | Descrição |
| --- | --- |
| `instituicoes` | Tenant raiz: nome, CNPJ, endereço, telefone, `logo` (base64/texto longo), `usa_acompanhamento` (liga/desliga o módulo de acompanhamento para a instituição). |
| `usuarios` | `perfil` (base + telas extras), `convenios_permitidos` (JSON), CPF criptografado (`cpf` + `cpf_hash` para busca), coluna gerada `administrador_instituicao_id` que garante 1 admin ativo por instituição. |
| `motoristas` | CNH, situação (`DISPONIVEL`/`EM_SERVICO`/`INATIVO`), CPF criptografado, vínculo opcional com `usuarios`. |
| `setores`, `unidades`, `medicos`, `acompanhantes`, `convenios` | Cadastros auxiliares por instituição. |
| `solicitacoes_transporte` | Ver dicionário de campos abaixo. Situação `PENDENTE → ACEITA/EM_ANDAMENTO → CONCLUIDA` ou `CANCELADA`. `is_rotina` marca ocorrências de uma solicitação recorrente. |
| `acompanhamentos_ambulancia` | Registro administrativo de UTI móvel/ambulância, motorista já definido na criação. Situação só transiciona `AGENDADO → CANCELADO` — **não existe fluxo de conclusão** (é intencional: serve só de registro para o faturamento consultar). `faturamento_status` é independente da `situacao`. |
| `destinos_favoritos` | Favoritos por usuário (o front também mantém uma cópia em `localStorage`). |
| `chamados_suporte` | Chamados abertos pela tela de Suporte (dentro do app) e pelo formulário de contato do site (`/contato-site`); dispara e-mail via `afterCreate`. |
| `push_subscriptions` | Inscrições Web Push (VAPID) por usuário/perfil. |
| `fcm_push_tokens` | Tokens FCM para push nativo Android. |
| `solicitacoes_transporte_notificacoes` | Controla se uma solicitação já foi notificada, para o job de notificações agendadas não duplicar. |
| `auditoria_logs` | Log de toda requisição autenticada (método, rota, status, corpo, IP, user agent). |

## Rotas

### Sistema

- `GET /`, `GET /health`, `GET /health/db`, `GET /api/v1`

### Públicas (sem autenticação)

- `POST /api/v1/autenticacao/entrar`
- `POST /api/v1/autenticacao/esqueci-senha`
- `POST /api/v1/autenticacao/validar-codigo-recuperacao`
- `POST /api/v1/autenticacao/redefinir-senha`
- `POST /api/v1/contato-site` — formulário de contato do site institucional (Portfolio), envia e-mail para `SUPPORT_EMAIL`/`SMTP_FROM`.

### Autenticadas (Bearer token obrigatório a partir daqui)

- `GET /api/v1/bootstrap` — carga inicial otimizada (institutições, setores, unidades, usuários, motoristas, médicos, acompanhantes, convênios, solicitações, acompanhamentos) em vez de uma chamada por recurso. `MASTER` recebe só a lista de instituições.
- Push: `GET/POST/DELETE /api/v1/notificacoes-push/...` e `/notificacoes-push/fcm-inscricoes/...`.
- CRUD genérico por recurso (`GET/POST/PUT` + `PATCH /:id/inativar`) para: `instituicoes`, `usuarios`, `motoristas`, `setores`, `unidades`, `medicos`, `acompanhantes`, `convenios`, `destinos-favoritos`, `chamados-suporte`, `solicitacoes-transporte`, `acompanhamentos-ambulancia`.
- Ações de solicitação: `PATCH /solicitacoes-transporte/:id/{cancelar|aceitar|iniciar|concluir}`.

## Regras de negócio importantes

- Multi-tenant: toda query de recurso "tenant" filtra por `instituicao_id`, exceto para `MASTER`.
- Solicitante só edita a própria solicitação, e só enquanto `PENDENTE` (`prepareSolicitacaoUpdate` em `resource-definitions.js`).
- Acompanhamento só pode ser criado/editado se a instituição tiver `usa_acompanhamento = TRUE` (`ensureInstitutionUsesTracking`).
- CPF é sempre criptografado em repouso (`cpf`) com hash auxiliar (`cpf_hash`) para permitir busca/unicidade sem descriptografar.
- Notificação de nova solicitação ao motorista:
  - Solicitação avulsa (`saveRequest` no front): `notificar_motoristas_agora = true` → push imediato.
  - Solicitação de rotina/recorrência (`saveRecurringRequests`): `notificar_motoristas_antecedencia_minutos = 120` → push só ~2h antes do horário agendado daquela ocorrência (`is_rotina = true`).
  - Implementado em `services/push-notifications.js`, com um job (`startDueTransportRequestNotifications`, a cada 5s) que varre solicitações pendentes vencidas ainda não notificadas.
- Chamado de suporte e contato do site sempre disparam e-mail (`afterCreate`); se o SMTP não estiver configurado, a criação falha com erro amigável em vez de silenciar.

## Variáveis de ambiente (`config/env.js`)

| Variável | Uso |
| --- | --- |
| `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `JSON_LIMIT`, `TRUST_PROXY` | Configuração básica do servidor Express. |
| `BACKUP_AUTOMATICO`, `BACKUP_DIR`, `BACKUP_INTERVAL_HOURS` | Backup automático do banco (`services/database-backup.js`). |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_CONNECTION_LIMIT` | Conexão MySQL. |
| `JWT_SECRET` | Assinatura dos tokens de sessão. |
| `CPF_ENCRYPTION_KEY`, `CPF_HASH_SECRET` | Criptografia/hash de CPF. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push. |
| `FIREBASE_SERVICE_ACCOUNT_BASE64`/`FIREBASE_SERVICE_ACCOUNT_JSON` ou `FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` | Push nativo Android via FCM. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_STARTTLS`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_EHLO_DOMAIN` | Envio de e-mail via SMTP cru. |
| `BREVO_API_KEY`/`SENDGRID_API_KEY`/`RESEND_API_KEY` (+ `*_FROM_EMAIL`) | Alternativas de envio de e-mail via API HTTP (usadas antes do SMTP cru, se configuradas). |
| `SUPPORT_EMAIL` | Destino dos e-mails de chamado de suporte e do contato do site. |
| `APP_TIME_ZONE` | Fuso usado para calcular vencimento de notificações (padrão `America/Sao_Paulo`). |

## Comandos

```bash
npm install
npm run dev      # nodemon
npm start
npm run check    # scripts/check-js.js
npm run security:env
npm test
npm run verify   # check + security:env + test
npm run backup:db
```

## Segurança

- Senhas com hash (`utils/password-hash.js`), CPF criptografado (`utils/cpf-crypto.js`), sessão via JWT (`utils/auth-token.js`).
- Middleware de autenticação (`middlewares/authentication.js`) exige `Authorization: Bearer <token>` e recarrega o usuário do banco a cada requisição (garante que usuários inativos percam acesso imediatamente).
- `middlewares/audit-logger.js` grava toda requisição autenticada em `auditoria_logs`.
- `helmet` + CORS configurável + limite de tamanho de JSON.

## Próximos passos em aberto

- Middleware de autorização por perfil mais genérico (hoje as regras críticas estão espalhadas em hooks por recurso).
- Testes automatizados mais abrangentes (existe `npm test`, mas cobertura é parcial).
- Extrair regras de negócio complexas para uma camada de serviços dedicada.

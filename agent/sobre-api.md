# Sobre a API - Transporte Mais

## Visão geral

Esta API é o backend do projeto Transporte Mais. Ela foi estruturada em Node.js, Express e MySQL para atender o front-end do Transporte+.

A API agora possui estrutura inicial de domínio com:

- usuários;
- motoristas;
- veículos;
- setores;
- unidades;
- médicos;
- acompanhantes;
- solicitações de transporte;
- acompanhamentos de ambulância;
- destinos favoritos.

## Perfis de usuário

O sistema trabalha com três perfis:

| Perfil | Regra |
| --- | --- |
| `SOLICITANTE` | Solicita transporte, acompanha o próprio histórico e acessa configurações limitadas da própria conta. |
| `MOTORISTA` | Aceita, inicia e conclui viagens, acompanha o próprio histórico e acessa configurações limitadas da própria conta. |
| `ADMINISTRADOR` | Pode fazer tudo no sistema. |

As permissões ainda não estão aplicadas por middleware de autenticação, porque a autenticação real ainda será implementada. Mesmo assim, as rotas e tabelas já foram desenhadas considerando essas regras.

## Stack

- Node.js 20 ou superior
- Express 5
- MySQL com `mysql2/promise`
- `dotenv`
- `cors`
- `helmet`
- `morgan`
- `nodemon`

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
      resource-controller-factory.js
      solicitacoes-transporte-controller.js
    database/
      connection.js
      create.sql
      inserts.sql
    middlewares/
      error-handler.js
      not-found.js
    repositories/
      crud-repository.js
    resources/
      resource-definitions.js
    routes/
      api-v1-routes.js
      health-routes.js
      index.js
      resource-routes-factory.js
    utils/
      http-error.js
    app.js
    server.js
  .env.example
  .gitignore
  index.js
  package.json
  README.md
```

## Banco de dados

O banco se chama `transporte_mais` e usa `utf8mb4`.

Scripts:

- `src/database/create.sql`: cria banco, tabelas, chaves, índices e restrições.
- `src/database/inserts.sql`: insere dados iniciais de setores, unidade, usuários, motoristas, veículos, médicos e acompanhantes.

## Tabelas

### `usuarios`

Usuários que acessam o sistema.

Campos principais:

- `id`
- `setor_id`
- `nome`
- `nome_usuario`
- `cpf`
- `data_nascimento`
- `email`
- `telefone`
- `perfil`
- `senha_hash`
- `ativo`
- `criado_em`
- `atualizado_em`

Perfis permitidos:

- `SOLICITANTE`
- `MOTORISTA`
- `ADMINISTRADOR`

### `motoristas`

Cadastro de motoristas, podendo estar ligado a um usuário.

Campos principais:

- `id`
- `usuario_id`
- `nome`
- `cpf`
- `numero_cnh`
- `categoria_cnh`
- `validade_cnh`
- `telefone`
- `situacao`
- `ativo`

Situações permitidas:

- `DISPONIVEL`
- `EM_SERVICO`
- `INATIVO`

### `veiculos`

Cadastro de veículos usados nas viagens.

Campos principais:

- `id`
- `placa`
- `modelo`
- `ano`
- `quilometragem_atual`
- `situacao`
- `ativo`

Situações permitidas:

- `DISPONIVEL`
- `EM_SERVICO`
- `MANUTENCAO`
- `INATIVO`

### `setores`

Cadastro de setores usados por usuários, solicitações e acompanhamentos.

Campos principais:

- `id`
- `nome`
- `ativo`

### `unidades`

Cadastro de unidades usadas no acompanhamento de ambulância.

Campos principais:

- `id`
- `nome`
- `ativo`

### `medicos`

Cadastro de médicos usados em UTI móvel.

Campos principais:

- `id`
- `nome`
- `ativo`

### `acompanhantes`

Cadastro de profissionais acompanhantes.

Campos principais:

- `id`
- `nome`
- `tipo`
- `ativo`

Tipos permitidos:

- `ENFERMEIRO`
- `TECNICO`
- `AUXILIAR`

### `solicitacoes_transporte`

Solicitações de transporte abertas pelos solicitantes ou administradores.

Campos principais:

- `id`
- `solicitante_usuario_id`
- `setor_origem_id`
- `motorista_id`
- `veiculo_id`
- `tipo`
- `nome_paciente`
- `nome_destino`
- `endereco_destino`
- `numero_destino`
- `latitude_destino`
- `longitude_destino`
- `consulta_rota_destino`
- `agendado_para`
- `prioridade`
- `situacao`
- `observacoes_solicitante`
- `aceito_em`
- `iniciado_em`
- `finalizado_em`
- `cancelado_em`
- `saida_em`
- `retorno_em`
- `quilometragem_inicial`
- `quilometragem_final`
- `observacoes_atendimento`

Tipos permitidos:

- `PACIENTE`
- `MATERIAL`
- `DOCUMENTOS`
- `COLETA_EXAMES`
- `OUTROS`

Prioridades permitidas:

- `BAIXA`
- `MEDIA`
- `ALTA`
- `URGENTE`

Situações permitidas:

- `PENDENTE`
- `ACEITA`
- `EM_ANDAMENTO`
- `CONCLUIDA`
- `CANCELADA`

### `acompanhamentos_ambulancia`

Registros de acompanhamento para UTI móvel e ambulância comum.

Campos principais:

- `id`
- `unidade_id`
- `setor_id`
- `medico_id`
- `acompanhante_id`
- `motorista_id`
- `tipo`
- `nome_paciente`
- `quarto`
- `nome_destino`
- `endereco_destino`
- `numero_destino`
- `nome_medico_historico`
- `nome_acompanhante_historico`
- `tipo_acompanhante_historico`
- `nome_motorista_historico`
- `saida_em`
- `retorno_em`
- `situacao`
- `observacoes`

Tipos permitidos:

- `UTI_MOVEL`
- `AMBULANCIA_COMUM`

### `destinos_favoritos`

Destinos favoritos vinculados ao usuário.

Campos principais:

- `id`
- `usuario_id`
- `nome`
- `endereco_destino`
- `numero_destino`
- `latitude`
- `longitude`
- `consulta_rota`

## Rotas

### Sistema

- `GET /`
- `GET /health`
- `GET /health/db`
- `GET /api/v1`

### Recursos CRUD

Todos os recursos abaixo possuem:

- `GET /api/v1/{recurso}`
- `POST /api/v1/{recurso}`
- `GET /api/v1/{recurso}/:id`
- `PUT /api/v1/{recurso}/:id`
- `PATCH /api/v1/{recurso}/:id/inativar`

Recursos:

- `usuarios`
- `motoristas`
- `veiculos`
- `setores`
- `unidades`
- `medicos`
- `acompanhantes`
- `destinos-favoritos`
- `solicitacoes-transporte`
- `acompanhamentos-ambulancia`

### Ações de solicitação

- `PATCH /api/v1/solicitacoes-transporte/:id/cancelar`
- `PATCH /api/v1/solicitacoes-transporte/:id/aceitar`
- `PATCH /api/v1/solicitacoes-transporte/:id/iniciar`
- `PATCH /api/v1/solicitacoes-transporte/:id/concluir`

## Regras já refletidas na estrutura

- Solicitante cria solicitação e vê o próprio histórico.
- Motorista aceita e executa viagem.
- Motorista não deve aceitar nova viagem se já possuir viagem aberta.
- Administrador pode fazer tudo.
- Solicitação de paciente exige `nome_paciente`.
- Solicitação só pode ser cancelada quando está `PENDENTE`.
- Solicitação só pode ser aceita quando está `PENDENTE`.
- Solicitação só pode ser iniciada quando está `ACEITA`.
- Solicitação só pode ser concluída quando está `EM_ANDAMENTO`.
- UTI móvel exige médico ou nome histórico do médico.
- Quilometragem final não pode ser menor que a inicial.
- Retorno não pode ser anterior à saída.

Algumas dessas regras ainda precisam ser reforçadas com autenticação e serviços de domínio. Hoje parte delas está no banco e parte nas ações específicas de solicitação.

## Comandos

```bash
npm install
npm run dev
npm run check
npm start
```

## Próximos passos

1. Implementar autenticação com senha hash e JWT.
2. Criar middleware de autenticação.
3. Criar middleware de autorização por perfil.
4. Separar regras complexas em camada de serviços.
5. Aplicar filtros por usuário para histórico de solicitante e motorista.
6. Atualizar veículo e motorista automaticamente ao concluir viagem.
7. Criar relatórios da API.
8. Adicionar testes automatizados.

## Histórico

### Estrutura de domínio - 11/06/2026

- schema MySQL completo criado;
- seeds iniciais adicionados;
- CRUD genérico por recurso adicionado;
- rotas `/api/v1` adicionadas;
- ações de solicitação adicionadas;
- documentação atualizada para refletir perfis, tabelas e recursos.

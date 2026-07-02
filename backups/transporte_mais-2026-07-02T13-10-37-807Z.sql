-- Backup automatico do banco transporte_mais
-- Gerado em 2026-07-02T13:10:37.842Z
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `acompanhamentos_ambulancia`;

TRUNCATE TABLE `acompanhantes`;

TRUNCATE TABLE `auditoria_logs`;
INSERT INTO `auditoria_logs` (`id`, `usuario_id`, `instituicao_id`, `perfil`, `metodo`, `rota`, `status_http`, `ip`, `user_agent`, `corpo_requisicao`, `criado_em`) VALUES (1, 12, 6, 'ADMINISTRADOR', 'POST', '/api/v1/usuarios', 403, '::ffff:127.0.0.1', 'node', '[object Object]', '2026-07-02 12:45:45');
INSERT INTO `auditoria_logs` (`id`, `usuario_id`, `instituicao_id`, `perfil`, `metodo`, `rota`, `status_http`, `ip`, `user_agent`, `corpo_requisicao`, `criado_em`) VALUES (2, 13, 6, 'SOLICITANTE', 'POST', '/api/v1/usuarios', 403, '::ffff:127.0.0.1', 'node', '[object Object]', '2026-07-02 12:45:45');

TRUNCATE TABLE `chamados_suporte`;

TRUNCATE TABLE `convenios`;

TRUNCATE TABLE `destinos_favoritos`;

TRUNCATE TABLE `fcm_push_tokens`;

TRUNCATE TABLE `instituicoes`;
INSERT INTO `instituicoes` (`id`, `nome`, `cnpj`, `usa_acompanhamento`, `ativo`, `criado_em`, `atualizado_em`) VALUES (1, 'Transporte+', NULL, 1, 1, '2026-06-16 20:29:51', '2026-06-16 20:29:51');
INSERT INTO `instituicoes` (`id`, `nome`, `cnpj`, `usa_acompanhamento`, `ativo`, `criado_em`, `atualizado_em`) VALUES (6, 'Instituicao Teste', NULL, 1, 1, '2026-07-02 12:44:19', '2026-07-02 12:44:19');

TRUNCATE TABLE `medicos`;

TRUNCATE TABLE `motoristas`;

TRUNCATE TABLE `push_subscriptions`;

TRUNCATE TABLE `setores`;

TRUNCATE TABLE `solicitacoes_transporte`;

TRUNCATE TABLE `solicitacoes_transporte_notificacoes`;

TRUNCATE TABLE `unidades`;

TRUNCATE TABLE `usuarios`;
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (1, 1, NULL, 'Administrador Master', 'MASTER', '999.999.999-99', 'master@transporte.local', '(14) 00000-0000', 'MASTER', 'pbkdf2$sha256$120000$0e09f7e851191abefb9a350a71d6a83c$6ec890b7ecd2efeea6c400bcf307d48dad2856fd8469b41266388ecb26a218ff', 1, '2026-06-16 20:29:51', '2026-06-16 20:29:51', NULL);
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (11, 1, NULL, 'Administrador ADM', 'ADM', '000.000.000-01', 'adm@transporte.local', '(14) 00000-0001', 'ADMINISTRADOR', 'pbkdf2$sha256$120000$993521d9472df7bf69b781d9cdb7cbe3$f0b83fa1023b4b907514c1ba485d8a98c54e9e14330620f4f4b1d6301a5e7c5f', 1, '2026-06-25 14:01:51', '2026-06-25 14:01:51', 1);
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (12, 6, NULL, 'Kengi Administrador Teste', 'KENGI', '111.111.111-11', 'kengi.teste@transporte.local', '(14) 00000-0011', 'ADMINISTRADOR', 'pbkdf2$sha256$120000$5f1b21b3fa4f9dd5336969ba576bd39b$18261aa84583cdeeab6a4f80450b35ff3fec9d8710a156a2049e5261ff8246bb', 1, '2026-07-02 12:44:19', '2026-07-02 12:44:19', 6);
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (13, 6, NULL, 'Joao Solicitante Teste', 'JOAO', '222.222.222-22', 'joao.teste@transporte.local', '(14) 00000-0022', 'SOLICITANTE', 'pbkdf2$sha256$120000$e212173ab6f11e3a38f3e8ed90c2aee5$5b0c0dd1cfee9d6ab09868b46adcba2b38de36b3a1a91e7d876f278bf5dd676c', 1, '2026-07-02 12:44:19', '2026-07-02 12:44:19', NULL);

SET FOREIGN_KEY_CHECKS = 1;

-- Backup automatico do banco transporte_mais
-- Gerado em 2026-07-02T14:55:11.156Z
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `acompanhamentos_ambulancia`;
INSERT INTO `acompanhamentos_ambulancia` (`id`, `instituicao_id`, `unidade_id`, `setor_id`, `medico_id`, `acompanhante_id`, `motorista_id`, `tipo`, `nome_paciente`, `convenio`, `codigo_carteirinha`, `paciente_entubado`, `tipo_trajeto`, `quarto`, `nome_destino`, `endereco_destino`, `numero_destino`, `nome_medico_historico`, `nome_acompanhante_historico`, `tipo_acompanhante_historico`, `nome_motorista_historico`, `saida_em`, `retorno_em`, `situacao`, `observacoes`, `criado_em`, `atualizado_em`, `faturamento_status`) VALUES (1, 6, 1, 1, NULL, NULL, NULL, 'AMBULANCIA_COMUM', 'PACIENTE TESTE PLAYWRIGHT', NULL, NULL, NULL, NULL, '101', 'HOSPITAL TESTE', 'RUA TESTE, 123', NULL, NULL, 'ENFERMEIRA TESTE', 'ENFERMEIRO', 'MOTORISTA TESTE', '2026-07-01 13:00:00', '2026-07-01 15:00:00', 'CONCLUIDO', NULL, '2026-07-02 13:25:58', '2026-07-02 13:25:58', 'PENDENTE');

TRUNCATE TABLE `acompanhantes`;

TRUNCATE TABLE `auditoria_logs`;
INSERT INTO `auditoria_logs` (`id`, `usuario_id`, `instituicao_id`, `perfil`, `metodo`, `rota`, `status_http`, `ip`, `user_agent`, `corpo_requisicao`, `criado_em`) VALUES (1, 12, 6, 'ADMINISTRADOR', 'POST', '/api/v1/usuarios', 403, '::ffff:127.0.0.1', 'node', '[object Object]', '2026-07-02 12:45:45');
INSERT INTO `auditoria_logs` (`id`, `usuario_id`, `instituicao_id`, `perfil`, `metodo`, `rota`, `status_http`, `ip`, `user_agent`, `corpo_requisicao`, `criado_em`) VALUES (2, 13, 6, 'SOLICITANTE', 'POST', '/api/v1/usuarios', 403, '::ffff:127.0.0.1', 'node', '[object Object]', '2026-07-02 12:45:45');
INSERT INTO `auditoria_logs` (`id`, `usuario_id`, `instituicao_id`, `perfil`, `metodo`, `rota`, `status_http`, `ip`, `user_agent`, `corpo_requisicao`, `criado_em`) VALUES (3, 12, 6, 'ADMINISTRADOR', 'POST', '/api/v1/usuarios', 403, '::ffff:127.0.0.1', 'node', '[object Object]', '2026-07-02 14:54:49');
INSERT INTO `auditoria_logs` (`id`, `usuario_id`, `instituicao_id`, `perfil`, `metodo`, `rota`, `status_http`, `ip`, `user_agent`, `corpo_requisicao`, `criado_em`) VALUES (4, 13, 6, 'SOLICITANTE', 'POST', '/api/v1/usuarios', 403, '::ffff:127.0.0.1', 'node', '[object Object]', '2026-07-02 14:54:49');

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
INSERT INTO `setores` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (1, 6, 'Setor Teste', 1, '2026-07-02 13:25:58', '2026-07-02 13:25:58');

TRUNCATE TABLE `solicitacoes_transporte`;

TRUNCATE TABLE `solicitacoes_transporte_notificacoes`;

TRUNCATE TABLE `unidades`;
INSERT INTO `unidades` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (1, 6, 'Unidade Teste', 1, '2026-07-02 13:25:58', '2026-07-02 13:25:58');

TRUNCATE TABLE `usuarios`;
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `cpf_hash`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (1, 1, NULL, 'Administrador Master', 'MASTER', 'aes256gcm$v1$16f8d8fc372c67946e0ae06b$5e463d19044f6be6a537cb4e76b2424f$d6ee55fdf7fe2e29099b783f3451', 'hmac-sha256$v1$1862df4a7dca61cf270a47ce7d0b6995ed562f7e5d3defe1900e71b4ba751da1', 'master@transporte.local', '(14) 00000-0000', 'MASTER', 'pbkdf2$sha256$120000$0e09f7e851191abefb9a350a71d6a83c$6ec890b7ecd2efeea6c400bcf307d48dad2856fd8469b41266388ecb26a218ff', 1, '2026-06-16 20:29:51', '2026-07-02 14:53:24', NULL);
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `cpf_hash`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (11, 1, NULL, 'Administrador ADM', 'ADM', 'aes256gcm$v1$0711a797c783c8036ad7ce92$807d8590a38e68088499bfea4c720ba3$30a557a4cc4e4bfdf986c846dff2', 'hmac-sha256$v1$607098deb2896cfd192502d660e9d7c2d7ffd5b65d62d276f94474337f920638', 'adm@transporte.local', '(14) 00000-0001', 'ADMINISTRADOR', 'pbkdf2$sha256$120000$993521d9472df7bf69b781d9cdb7cbe3$f0b83fa1023b4b907514c1ba485d8a98c54e9e14330620f4f4b1d6301a5e7c5f', 1, '2026-06-25 14:01:51', '2026-07-02 14:53:24', 1);
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `cpf_hash`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (12, 6, NULL, 'Kengi Administrador Teste', 'KENGI', 'aes256gcm$v1$a1ae82884bcd22bcfbac620d$1ce2347c1d1550ffe8517fb5afb1f4a3$99b1c9d3c71d2df6888359ce86ff', 'hmac-sha256$v1$fc35b93e49a816b49bb4bc00ca4e6abf945d3a1351e0fbb43eceb56379a43005', 'kengi.teste@transporte.local', '(14) 00000-0011', 'ADMINISTRADOR', 'pbkdf2$sha256$120000$5f1b21b3fa4f9dd5336969ba576bd39b$18261aa84583cdeeab6a4f80450b35ff3fec9d8710a156a2049e5261ff8246bb', 1, '2026-07-02 12:44:19', '2026-07-02 14:53:24', 6);
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `cpf_hash`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (13, 6, NULL, 'Joao Solicitante Teste', 'JOAO', 'aes256gcm$v1$4e4fcbc519e5ed5969a7090a$9e5c7eadfc2456c98e4ed16facc49c72$56dd9c5557e3f310702672187c6d', 'hmac-sha256$v1$7b3ede61b5a61183b4e326647007acdea7f6476aac821dbd0d7e3c781d155c3e', 'joao.teste@transporte.local', '(14) 00000-0022', 'SOLICITANTE', 'pbkdf2$sha256$120000$e212173ab6f11e3a38f3e8ed90c2aee5$5b0c0dd1cfee9d6ab09868b46adcba2b38de36b3a1a91e7d876f278bf5dd676c', 1, '2026-07-02 12:44:19', '2026-07-02 14:53:24', NULL);

SET FOREIGN_KEY_CHECKS = 1;

-- Backup automatico do banco transporte_mais
-- Gerado em 2026-06-17T11:03:53.711Z
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `acompanhamentos_ambulancia`;

TRUNCATE TABLE `acompanhantes`;
INSERT INTO `acompanhantes` (`id`, `instituicao_id`, `nome`, `tipo`, `ativo`, `criado_em`, `atualizado_em`) VALUES (1, 3, 'MARCELA SOUZA', 'ENFERMEIRO', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `acompanhantes` (`id`, `instituicao_id`, `nome`, `tipo`, `ativo`, `criado_em`, `atualizado_em`) VALUES (2, 3, 'JOAO VICTOR', 'TECNICO', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `acompanhantes` (`id`, `instituicao_id`, `nome`, `tipo`, `ativo`, `criado_em`, `atualizado_em`) VALUES (3, 3, 'CAMILA RAMOS', 'AUXILIAR', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `acompanhantes` (`id`, `instituicao_id`, `nome`, `tipo`, `ativo`, `criado_em`, `atualizado_em`) VALUES (4, 3, 'RAFAELA MORAIS', 'ENFERMEIRO', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');

TRUNCATE TABLE `auditoria_logs`;
INSERT INTO `auditoria_logs` (`id`, `usuario_id`, `instituicao_id`, `perfil`, `metodo`, `rota`, `status_http`, `ip`, `user_agent`, `corpo_requisicao`, `criado_em`) VALUES (1, 6, 3, 'ADMINISTRADOR', 'POST', '/api/v1/usuarios', 403, '::ffff:127.0.0.1', 'node', '[object Object]', '2026-06-17 11:01:31');
INSERT INTO `auditoria_logs` (`id`, `usuario_id`, `instituicao_id`, `perfil`, `metodo`, `rota`, `status_http`, `ip`, `user_agent`, `corpo_requisicao`, `criado_em`) VALUES (2, 10, 3, 'SOLICITANTE', 'POST', '/api/v1/usuarios', 403, '::ffff:127.0.0.1', 'node', '[object Object]', '2026-06-17 11:01:31');
INSERT INTO `auditoria_logs` (`id`, `usuario_id`, `instituicao_id`, `perfil`, `metodo`, `rota`, `status_http`, `ip`, `user_agent`, `corpo_requisicao`, `criado_em`) VALUES (3, 6, 3, 'ADMINISTRADOR', 'POST', '/api/v1/usuarios', 403, '::ffff:127.0.0.1', 'node', '[object Object]', '2026-06-17 11:02:12');
INSERT INTO `auditoria_logs` (`id`, `usuario_id`, `instituicao_id`, `perfil`, `metodo`, `rota`, `status_http`, `ip`, `user_agent`, `corpo_requisicao`, `criado_em`) VALUES (4, 10, 3, 'SOLICITANTE', 'POST', '/api/v1/usuarios', 403, '::ffff:127.0.0.1', 'node', '[object Object]', '2026-06-17 11:02:12');

TRUNCATE TABLE `chamados_suporte`;

TRUNCATE TABLE `destinos_favoritos`;

TRUNCATE TABLE `instituicoes`;
INSERT INTO `instituicoes` (`id`, `nome`, `cnpj`, `usa_acompanhamento`, `ativo`, `criado_em`, `atualizado_em`) VALUES (1, 'Transporte+', NULL, 1, 1, '2026-06-16 20:29:51', '2026-06-16 20:29:51');
INSERT INTO `instituicoes` (`id`, `nome`, `cnpj`, `usa_acompanhamento`, `ativo`, `criado_em`, `atualizado_em`) VALUES (3, 'SANTA CASA DE TUPA', NULL, 1, 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `instituicoes` (`id`, `nome`, `cnpj`, `usa_acompanhamento`, `ativo`, `criado_em`, `atualizado_em`) VALUES (4, 'POSTO DE SAUDE DE ARCO IRIS', NULL, 1, 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');

TRUNCATE TABLE `medicos`;
INSERT INTO `medicos` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (1, 3, 'DRA. RENATA ALVES', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `medicos` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (2, 3, 'DR. GUSTAVO MELO', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `medicos` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (3, 3, 'DRA. HELENA DIAS', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `medicos` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (4, 3, 'DR. MATEUS ROCHA', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `medicos` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (5, 3, 'DRA. LIVIA CAMPOS', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');

TRUNCATE TABLE `motoristas`;
INSERT INTO `motoristas` (`id`, `instituicao_id`, `usuario_id`, `nome`, `cpf`, `numero_cnh`, `categoria_cnh`, `validade_cnh`, `telefone`, `situacao`, `ativo`, `criado_em`, `atualizado_em`) VALUES (1, 3, 5, 'Roberto Lima', '987.654.321-00', '04829381720', 'D', '2027-08-10 03:00:00', '(11) 97742-6630', 'DISPONIVEL', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `motoristas` (`id`, `instituicao_id`, `usuario_id`, `nome`, `cpf`, `numero_cnh`, `categoria_cnh`, `validade_cnh`, `telefone`, `situacao`, `ativo`, `criado_em`, `atualizado_em`) VALUES (2, 3, NULL, 'Claudia Nunes', '321.654.987-43', '03847592011', 'B', '2026-12-22 03:00:00', '(11) 97590-2211', 'EM_SERVICO', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `motoristas` (`id`, `instituicao_id`, `usuario_id`, `nome`, `cpf`, `numero_cnh`, `categoria_cnh`, `validade_cnh`, `telefone`, `situacao`, `ativo`, `criado_em`, `atualizado_em`) VALUES (3, 3, NULL, 'Paulo Henrique', '654.987.321-88', '05284739100', 'D', '2028-04-04 03:00:00', '(11) 98843-7780', 'DISPONIVEL', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');

TRUNCATE TABLE `setores`;
INSERT INTO `setores` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (1, 3, 'ADMINISTRACAO', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `setores` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (2, 3, 'ENFERMAGEM', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `setores` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (3, 3, 'FARMACIA', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `setores` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (4, 3, 'LABORATORIO', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `setores` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (5, 3, 'TRANSPORTE', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `setores` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (6, 3, 'UTI ADULTO', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `setores` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (7, 3, 'CENTRO CIRURGICO', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `setores` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (8, 4, 'ADMINISTRACAO', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `setores` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (9, 4, 'TRANSPORTE', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');

TRUNCATE TABLE `solicitacoes_transporte`;

TRUNCATE TABLE `unidades`;
INSERT INTO `unidades` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (1, 3, 'UNIDADE CENTRAL', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');
INSERT INTO `unidades` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (2, 4, 'POSTO DE SAUDE DE ARCO IRIS', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08');

TRUNCATE TABLE `usuarios`;
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (1, 1, NULL, 'Administrador Master', 'MASTER', '999.999.999-99', 'master@transporte.local', '(14) 00000-0000', 'MASTER', 'pbkdf2$sha256$120000$0e09f7e851191abefb9a350a71d6a83c$6ec890b7ecd2efeea6c400bcf307d48dad2856fd8469b41266388ecb26a218ff', 1, '2026-06-16 20:29:51', '2026-06-16 20:29:51', NULL);
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (4, 3, 2, 'Ana Paula Ribeiro', 'ANA.RIBEIRO', '123.456.789-10', 'ana.ribeiro@hospital.local', '(11) 98822-1045', 'SOLICITANTE', 'pbkdf2$sha256$120000$7704e5e18eb31f5e3b2f22a3327cbc1a$4c75faa1a66abc340f24bf0ca38f3648844bc80c1a1ab9cdac6dbb1c03adcb2c', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08', NULL);
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (5, 3, 5, 'Roberto Lima', 'ROBERTO.LIMA', '987.654.321-00', 'roberto.lima@hospital.local', '(11) 97742-6630', 'MOTORISTA', 'pbkdf2$sha256$120000$7704e5e18eb31f5e3b2f22a3327cbc1a$4c75faa1a66abc340f24bf0ca38f3648844bc80c1a1ab9cdac6dbb1c03adcb2c', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08', NULL);
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (6, 3, 1, 'Kengi Administrador', 'KENGI', '222.222.222-22', 'kengi@transporte.local', '(14) 00000-0001', 'ADMINISTRADOR', 'pbkdf2$sha256$120000$0f39b757599b6721a82deabb6fa82af8$2e73d2486d0201dcf923ea94a89d1e6780c93e097f5d456ccf0726ecb5736212', 1, '2026-06-17 11:00:08', '2026-06-17 11:01:19', 3);
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (7, 4, 8, 'Administrador Arco Iris', 'ADM.ARCOIRIS', '111.111.111-11', 'admin.arcoiris@posto.local', '(14) 00000-0000', 'ADMINISTRADOR', 'pbkdf2$sha256$120000$7704e5e18eb31f5e3b2f22a3327cbc1a$4c75faa1a66abc340f24bf0ca38f3648844bc80c1a1ab9cdac6dbb1c03adcb2c', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08', 4);
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (8, 3, 1, 'Administrador Master', 'MASTER', '999.999.999-99', 'master@transporte.local', '(14) 00000-0000', 'MASTER', 'pbkdf2$sha256$120000$7704e5e18eb31f5e3b2f22a3327cbc1a$4c75faa1a66abc340f24bf0ca38f3648844bc80c1a1ab9cdac6dbb1c03adcb2c', 1, '2026-06-17 11:00:08', '2026-06-17 11:00:08', NULL);
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (10, 3, 2, 'Joao Solicitante', 'JOAO', '333.333.333-33', 'joao@transporte.local', '(14) 00000-0002', 'SOLICITANTE', 'pbkdf2$sha256$120000$0f39b757599b6721a82deabb6fa82af8$2e73d2486d0201dcf923ea94a89d1e6780c93e097f5d456ccf0726ecb5736212', 1, '2026-06-17 11:00:42', '2026-06-17 11:01:19', NULL);

SET FOREIGN_KEY_CHECKS = 1;

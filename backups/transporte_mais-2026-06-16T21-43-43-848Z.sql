-- Backup automatico do banco transporte_mais
-- Gerado em 2026-06-16T21:43:43.945Z
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `acompanhamentos_ambulancia`;

TRUNCATE TABLE `acompanhantes`;

TRUNCATE TABLE `auditoria_logs`;
INSERT INTO `auditoria_logs` (`id`, `usuario_id`, `instituicao_id`, `perfil`, `metodo`, `rota`, `status_http`, `ip`, `user_agent`, `corpo_requisicao`, `criado_em`) VALUES (1, 1, 1, 'MASTER', 'PUT', '/api/v1/instituicoes/1', 200, '::1', 'node', '[object Object]', '2026-06-16 21:11:31');
INSERT INTO `auditoria_logs` (`id`, `usuario_id`, `instituicao_id`, `perfil`, `metodo`, `rota`, `status_http`, `ip`, `user_agent`, `corpo_requisicao`, `criado_em`) VALUES (2, 2, 2, 'ADMINISTRADOR', 'POST', '/api/v1/setores', 201, '::ffff:192.168.36.19', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '[object Object]', '2026-06-16 21:37:09');
INSERT INTO `auditoria_logs` (`id`, `usuario_id`, `instituicao_id`, `perfil`, `metodo`, `rota`, `status_http`, `ip`, `user_agent`, `corpo_requisicao`, `criado_em`) VALUES (3, 2, 2, 'ADMINISTRADOR', 'POST', '/api/v1/solicitacoes-transporte', 201, '::ffff:192.168.36.19', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '[object Object]', '2026-06-16 21:37:33');

TRUNCATE TABLE `chamados_suporte`;

TRUNCATE TABLE `destinos_favoritos`;

TRUNCATE TABLE `instituicoes`;
INSERT INTO `instituicoes` (`id`, `nome`, `cnpj`, `usa_acompanhamento`, `ativo`, `criado_em`, `atualizado_em`) VALUES (1, 'Transporte+', NULL, 1, 1, '2026-06-16 20:29:51', '2026-06-16 20:29:51');
INSERT INTO `instituicoes` (`id`, `nome`, `cnpj`, `usa_acompanhamento`, `ativo`, `criado_em`, `atualizado_em`) VALUES (2, 'SANTA CASA DE TUPÃ', '00.000.000/0000-00', 1, 1, '2026-06-16 21:04:30', '2026-06-16 21:04:30');

TRUNCATE TABLE `medicos`;

TRUNCATE TABLE `motoristas`;

TRUNCATE TABLE `setores`;
INSERT INTO `setores` (`id`, `instituicao_id`, `nome`, `ativo`, `criado_em`, `atualizado_em`) VALUES (1, 2, 'FATURAMENTO', 1, '2026-06-16 21:37:09', '2026-06-16 21:37:09');

TRUNCATE TABLE `solicitacoes_transporte`;
INSERT INTO `solicitacoes_transporte` (`id`, `instituicao_id`, `solicitante_usuario_id`, `setor_origem_id`, `motorista_id`, `tipo`, `nome_paciente`, `nome_destino`, `endereco_destino`, `numero_destino`, `latitude_destino`, `longitude_destino`, `consulta_rota_destino`, `agendado_para`, `prioridade`, `situacao`, `observacoes_solicitante`, `aceito_em`, `iniciado_em`, `finalizado_em`, `cancelado_em`, `saida_em`, `retorno_em`, `quilometragem_inicial`, `quilometragem_final`, `observacoes_atendimento`, `criado_em`, `atualizado_em`) VALUES (1, 2, 2, 1, NULL, 'MATERIAL', NULL, 'SANTA CASA', 'RUA MANOEL FERREIRA DAMIÃO - 426 - VILA SANTA TEREZINHA - TUPÃ - SP - 17601-901', NULL, NULL, NULL, NULL, '2026-06-16 22:00:00', 'BAIXA', 'PENDENTE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-16 21:37:33', '2026-06-16 21:37:33');

TRUNCATE TABLE `unidades`;

TRUNCATE TABLE `usuarios`;
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (1, 1, NULL, 'Administrador Master', 'MASTER', '999.999.999-99', 'master@transporte.local', '(14) 00000-0000', 'MASTER', 'pbkdf2$sha256$120000$0e09f7e851191abefb9a350a71d6a83c$6ec890b7ecd2efeea6c400bcf307d48dad2856fd8469b41266388ecb26a218ff', 1, '2026-06-16 20:29:51', '2026-06-16 20:29:51', NULL);
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (2, 2, NULL, 'JOÃO MARCOS FRANÇA', 'JOAO', '461.905.228-07', 'joaomarcosf647@gmail.com', '(14) 99678-4967', 'ADMINISTRADOR', 'pbkdf2$sha256$120000$e81a14cf1ef6bc107b236a3b7861bc28$62c86605e6064211a38ac02545e86a65ba499751027e62f630aa225cced182e4', 1, '2026-06-16 21:04:58', '2026-06-16 21:04:58', 2);

SET FOREIGN_KEY_CHECKS = 1;

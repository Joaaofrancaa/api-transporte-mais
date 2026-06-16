-- Backup automatico do banco transporte_mais
-- Gerado em 2026-06-16T21:11:04.815Z
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `acompanhamentos_ambulancia`;

TRUNCATE TABLE `acompanhantes`;

TRUNCATE TABLE `auditoria_logs`;

TRUNCATE TABLE `chamados_suporte`;

TRUNCATE TABLE `destinos_favoritos`;

TRUNCATE TABLE `instituicoes`;
INSERT INTO `instituicoes` (`id`, `nome`, `cnpj`, `usa_acompanhamento`, `ativo`, `criado_em`, `atualizado_em`) VALUES (1, 'Transporte+', NULL, 1, 1, '2026-06-16 20:29:51', '2026-06-16 20:29:51');
INSERT INTO `instituicoes` (`id`, `nome`, `cnpj`, `usa_acompanhamento`, `ativo`, `criado_em`, `atualizado_em`) VALUES (2, 'SANTA CASA DE TUPÃ', '00.000.000/0000-00', 1, 1, '2026-06-16 21:04:30', '2026-06-16 21:04:30');

TRUNCATE TABLE `medicos`;

TRUNCATE TABLE `motoristas`;

TRUNCATE TABLE `setores`;

TRUNCATE TABLE `solicitacoes_transporte`;

TRUNCATE TABLE `unidades`;

TRUNCATE TABLE `usuarios`;
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (1, 1, NULL, 'Administrador Master', 'MASTER', '999.999.999-99', 'master@transporte.local', '(14) 00000-0000', 'MASTER', 'pbkdf2$sha256$120000$0e09f7e851191abefb9a350a71d6a83c$6ec890b7ecd2efeea6c400bcf307d48dad2856fd8469b41266388ecb26a218ff', 1, '2026-06-16 20:29:51', '2026-06-16 20:29:51', NULL);
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (2, 2, NULL, 'JOÃO MARCOS FRANÇA', 'JOAO', '461.905.228-07', 'joaomarcosf647@gmail.com', '(14) 99678-4967', 'ADMINISTRADOR', 'pbkdf2$sha256$120000$e81a14cf1ef6bc107b236a3b7861bc28$62c86605e6064211a38ac02545e86a65ba499751027e62f630aa225cced182e4', 1, '2026-06-16 21:04:58', '2026-06-16 21:04:58', 2);

SET FOREIGN_KEY_CHECKS = 1;

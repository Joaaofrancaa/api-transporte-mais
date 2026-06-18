-- Backup automatico do banco transporte_mais
-- Gerado em 2026-06-18T13:20:14.327Z
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `acompanhamentos_ambulancia`;

TRUNCATE TABLE `acompanhantes`;

TRUNCATE TABLE `auditoria_logs`;

TRUNCATE TABLE `chamados_suporte`;

TRUNCATE TABLE `destinos_favoritos`;

TRUNCATE TABLE `instituicoes`;
INSERT INTO `instituicoes` (`id`, `nome`, `cnpj`, `usa_acompanhamento`, `ativo`, `criado_em`, `atualizado_em`) VALUES (1, 'Transporte+', NULL, 1, 1, '2026-06-16 20:29:51', '2026-06-16 20:29:51');

TRUNCATE TABLE `medicos`;

TRUNCATE TABLE `motoristas`;

TRUNCATE TABLE `push_subscriptions`;

TRUNCATE TABLE `setores`;

TRUNCATE TABLE `solicitacoes_transporte`;

TRUNCATE TABLE `unidades`;

TRUNCATE TABLE `usuarios`;
INSERT INTO `usuarios` (`id`, `instituicao_id`, `setor_id`, `nome`, `nome_usuario`, `cpf`, `email`, `telefone`, `perfil`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`, `administrador_instituicao_id`) VALUES (1, 1, NULL, 'Administrador Master', 'MASTER', '999.999.999-99', 'master@transporte.local', '(14) 00000-0000', 'MASTER', 'pbkdf2$sha256$120000$0e09f7e851191abefb9a350a71d6a83c$6ec890b7ecd2efeea6c400bcf307d48dad2856fd8469b41266388ecb26a218ff', 1, '2026-06-16 20:29:51', '2026-06-16 20:29:51', NULL);

SET FOREIGN_KEY_CHECKS = 1;

CREATE DATABASE IF NOT EXISTS transporte_mais
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE transporte_mais;

CREATE TABLE IF NOT EXISTS instituicoes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(160) NOT NULL,
  cnpj VARCHAR(18) NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_instituicoes_nome (nome),
  UNIQUE KEY uk_instituicoes_cnpj (cnpj)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS setores (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  instituicao_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(120) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_setores_instituicao_nome (instituicao_id, nome),
  CONSTRAINT fk_setores_instituicao
    FOREIGN KEY (instituicao_id) REFERENCES instituicoes (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS unidades (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  instituicao_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(120) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_unidades_instituicao_nome (instituicao_id, nome),
  CONSTRAINT fk_unidades_instituicao
    FOREIGN KEY (instituicao_id) REFERENCES instituicoes (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  instituicao_id BIGINT UNSIGNED NOT NULL,
  setor_id BIGINT UNSIGNED NULL,
  nome VARCHAR(160) NOT NULL,
  nome_usuario VARCHAR(80) NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  email VARCHAR(160) NOT NULL,
  telefone VARCHAR(30) NULL,
  perfil ENUM('SOLICITANTE', 'MOTORISTA', 'ADMINISTRADOR', 'MASTER') NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  administrador_instituicao_id BIGINT UNSIGNED GENERATED ALWAYS AS (
    CASE
      WHEN perfil = 'ADMINISTRADOR' AND ativo = TRUE THEN instituicao_id
      ELSE NULL
    END
  ) STORED,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_usuarios_instituicao_nome_usuario (instituicao_id, nome_usuario),
  UNIQUE KEY uk_usuarios_instituicao_cpf (instituicao_id, cpf),
  UNIQUE KEY uk_usuarios_instituicao_email (instituicao_id, email),
  UNIQUE KEY uk_usuarios_um_admin_por_instituicao (administrador_instituicao_id),
  KEY idx_usuarios_instituicao_id (instituicao_id),
  KEY idx_usuarios_setor_id (setor_id),
  CONSTRAINT fk_usuarios_instituicao
    FOREIGN KEY (instituicao_id) REFERENCES instituicoes (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_usuarios_setor
    FOREIGN KEY (setor_id) REFERENCES setores (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS motoristas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  instituicao_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NULL,
  nome VARCHAR(160) NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  numero_cnh VARCHAR(30) NOT NULL,
  categoria_cnh VARCHAR(5) NOT NULL,
  validade_cnh DATE NOT NULL,
  telefone VARCHAR(30) NULL,
  situacao ENUM('DISPONIVEL', 'EM_SERVICO', 'INATIVO') NOT NULL DEFAULT 'DISPONIVEL',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_motoristas_usuario_id (usuario_id),
  UNIQUE KEY uk_motoristas_cpf (cpf),
  UNIQUE KEY uk_motoristas_numero_cnh (numero_cnh),
  KEY idx_motoristas_instituicao_id (instituicao_id),
  KEY idx_motoristas_situacao (situacao),
  CONSTRAINT fk_motoristas_instituicao
    FOREIGN KEY (instituicao_id) REFERENCES instituicoes (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_motoristas_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS medicos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  instituicao_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(160) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_medicos_instituicao_nome (instituicao_id, nome),
  CONSTRAINT fk_medicos_instituicao
    FOREIGN KEY (instituicao_id) REFERENCES instituicoes (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS acompanhantes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  instituicao_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(160) NOT NULL,
  tipo ENUM('ENFERMEIRO', 'TECNICO', 'AUXILIAR') NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_acompanhantes_instituicao_nome_tipo (instituicao_id, nome, tipo),
  KEY idx_acompanhantes_nome (nome),
  CONSTRAINT fk_acompanhantes_instituicao
    FOREIGN KEY (instituicao_id) REFERENCES instituicoes (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS solicitacoes_transporte (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  instituicao_id BIGINT UNSIGNED NOT NULL,
  solicitante_usuario_id BIGINT UNSIGNED NOT NULL,
  setor_origem_id BIGINT UNSIGNED NOT NULL,
  motorista_id BIGINT UNSIGNED NULL,
  tipo ENUM('PACIENTE', 'MATERIAL', 'DOCUMENTOS', 'COLETA_EXAMES', 'OUTROS') NOT NULL,
  nome_paciente VARCHAR(160) NULL,
  nome_destino VARCHAR(160) NOT NULL,
  endereco_destino TEXT NOT NULL,
  numero_destino VARCHAR(30) NULL,
  latitude_destino DECIMAL(10, 7) NULL,
  longitude_destino DECIMAL(10, 7) NULL,
  consulta_rota_destino TEXT NULL,
  agendado_para DATETIME NOT NULL,
  prioridade ENUM('BAIXA', 'MEDIA', 'ALTA', 'URGENTE') NOT NULL,
  situacao ENUM('PENDENTE', 'ACEITA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA') NOT NULL DEFAULT 'PENDENTE',
  observacoes_solicitante TEXT NULL,
  aceito_em DATETIME NULL,
  iniciado_em DATETIME NULL,
  finalizado_em DATETIME NULL,
  cancelado_em DATETIME NULL,
  saida_em DATETIME NULL,
  retorno_em DATETIME NULL,
  quilometragem_inicial INT UNSIGNED NULL,
  quilometragem_final INT UNSIGNED NULL,
  observacoes_atendimento TEXT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_solicitacoes_transporte_situacao (situacao),
  KEY idx_solicitacoes_transporte_instituicao_id (instituicao_id),
  KEY idx_solicitacoes_transporte_agendado_para (agendado_para),
  KEY idx_solicitacoes_transporte_motorista_id (motorista_id),
  KEY idx_solicitacoes_transporte_solicitante_usuario_id (solicitante_usuario_id),
  KEY idx_solicitacoes_transporte_setor_origem_id (setor_origem_id),
  CONSTRAINT fk_solicitacoes_instituicao
    FOREIGN KEY (instituicao_id) REFERENCES instituicoes (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_solicitacoes_solicitante
    FOREIGN KEY (solicitante_usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_solicitacoes_setor_origem
    FOREIGN KEY (setor_origem_id) REFERENCES setores (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_solicitacoes_motorista
    FOREIGN KEY (motorista_id) REFERENCES motoristas (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT ck_solicitacoes_paciente
    CHECK (tipo <> 'PACIENTE' OR nome_paciente IS NOT NULL),
  CONSTRAINT ck_solicitacoes_quilometragem
    CHECK (quilometragem_final IS NULL OR quilometragem_inicial IS NULL OR quilometragem_final >= quilometragem_inicial),
  CONSTRAINT ck_solicitacoes_periodo
    CHECK (retorno_em IS NULL OR saida_em IS NULL OR retorno_em >= saida_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS acompanhamentos_ambulancia (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  instituicao_id BIGINT UNSIGNED NOT NULL,
  unidade_id BIGINT UNSIGNED NOT NULL,
  setor_id BIGINT UNSIGNED NOT NULL,
  medico_id BIGINT UNSIGNED NULL,
  acompanhante_id BIGINT UNSIGNED NULL,
  motorista_id BIGINT UNSIGNED NULL,
  tipo ENUM('UTI_MOVEL', 'AMBULANCIA_COMUM') NOT NULL,
  nome_paciente VARCHAR(160) NOT NULL,
  quarto VARCHAR(30) NOT NULL,
  nome_destino VARCHAR(160) NOT NULL,
  endereco_destino TEXT NOT NULL,
  numero_destino VARCHAR(30) NULL,
  nome_medico_historico VARCHAR(160) NULL,
  nome_acompanhante_historico VARCHAR(160) NOT NULL,
  tipo_acompanhante_historico VARCHAR(30) NOT NULL,
  nome_motorista_historico VARCHAR(160) NOT NULL,
  saida_em DATETIME NOT NULL,
  retorno_em DATETIME NOT NULL,
  situacao ENUM('AGENDADO', 'CONCLUIDO', 'CANCELADO') NOT NULL DEFAULT 'AGENDADO',
  observacoes TEXT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_acompanhamentos_instituicao_id (instituicao_id),
  KEY idx_acompanhamentos_tipo (tipo),
  KEY idx_acompanhamentos_saida_em (saida_em),
  KEY idx_acompanhamentos_motorista_id (motorista_id),
  KEY idx_acompanhamentos_unidade_id (unidade_id),
  KEY idx_acompanhamentos_setor_id (setor_id),
  CONSTRAINT fk_acompanhamentos_instituicao
    FOREIGN KEY (instituicao_id) REFERENCES instituicoes (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_acompanhamentos_unidade
    FOREIGN KEY (unidade_id) REFERENCES unidades (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_acompanhamentos_setor
    FOREIGN KEY (setor_id) REFERENCES setores (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_acompanhamentos_medico
    FOREIGN KEY (medico_id) REFERENCES medicos (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_acompanhamentos_acompanhante
    FOREIGN KEY (acompanhante_id) REFERENCES acompanhantes (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_acompanhamentos_motorista
    FOREIGN KEY (motorista_id) REFERENCES motoristas (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT ck_acompanhamentos_periodo
    CHECK (retorno_em >= saida_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS destinos_favoritos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  instituicao_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(160) NOT NULL,
  endereco_destino TEXT NOT NULL,
  numero_destino VARCHAR(30) NULL,
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  consulta_rota TEXT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_destinos_favoritos_instituicao_id (instituicao_id),
  KEY idx_destinos_favoritos_usuario_id (usuario_id),
  UNIQUE KEY uk_destinos_favoritos_usuario_endereco (instituicao_id, usuario_id, endereco_destino(180), numero_destino),
  CONSTRAINT fk_destinos_favoritos_instituicao
    FOREIGN KEY (instituicao_id) REFERENCES instituicoes (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_destinos_favoritos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chamados_suporte (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  instituicao_id BIGINT UNSIGNED NULL,
  usuario_id BIGINT UNSIGNED NULL,
  nome_usuario VARCHAR(160) NULL,
  email_usuario VARCHAR(160) NULL,
  assunto VARCHAR(180) NOT NULL,
  mensagem TEXT NOT NULL,
  situacao ENUM('ABERTO', 'EM_ANALISE', 'RESOLVIDO') NOT NULL DEFAULT 'ABERTO',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chamados_suporte_instituicao_id (instituicao_id),
  KEY idx_chamados_suporte_usuario_id (usuario_id),
  KEY idx_chamados_suporte_situacao (situacao),
  CONSTRAINT fk_chamados_suporte_instituicao
    FOREIGN KEY (instituicao_id) REFERENCES instituicoes (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_chamados_suporte_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

USE transporte_mais;

INSERT INTO instituicoes (nome) VALUES
  ('SANTA CASA DE TUPA'),
  ('POSTO DE SAUDE DE ARCO IRIS')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO setores (instituicao_id, nome) VALUES
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'ADMINISTRACAO'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'ENFERMAGEM'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'FARMACIA'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'LABORATORIO'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'TRANSPORTE'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'UTI ADULTO'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'CENTRO CIRURGICO'),
  ((SELECT id FROM instituicoes WHERE nome = 'POSTO DE SAUDE DE ARCO IRIS'), 'ADMINISTRACAO'),
  ((SELECT id FROM instituicoes WHERE nome = 'POSTO DE SAUDE DE ARCO IRIS'), 'TRANSPORTE')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO unidades (instituicao_id, nome) VALUES
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'UNIDADE CENTRAL'),
  ((SELECT id FROM instituicoes WHERE nome = 'POSTO DE SAUDE DE ARCO IRIS'), 'POSTO DE SAUDE DE ARCO IRIS')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO usuarios (
  instituicao_id,
  setor_id,
  nome,
  nome_usuario,
  cpf,
  email,
  telefone,
  perfil,
  senha_hash
) VALUES
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), (SELECT id FROM setores WHERE nome = 'ENFERMAGEM' AND instituicao_id = (SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA')), 'Ana Paula Ribeiro', 'ANA.RIBEIRO', '123.456.789-10', 'ana.ribeiro@hospital.local', '(11) 98822-1045', 'SOLICITANTE', 'pbkdf2$sha256$120000$7704e5e18eb31f5e3b2f22a3327cbc1a$4c75faa1a66abc340f24bf0ca38f3648844bc80c1a1ab9cdac6dbb1c03adcb2c'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), (SELECT id FROM setores WHERE nome = 'TRANSPORTE' AND instituicao_id = (SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA')), 'Roberto Lima', 'ROBERTO.LIMA', '987.654.321-00', 'roberto.lima@hospital.local', '(11) 97742-6630', 'MOTORISTA', 'pbkdf2$sha256$120000$7704e5e18eb31f5e3b2f22a3327cbc1a$4c75faa1a66abc340f24bf0ca38f3648844bc80c1a1ab9cdac6dbb1c03adcb2c'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), (SELECT id FROM setores WHERE nome = 'ADMINISTRACAO' AND instituicao_id = (SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA')), 'Marina Torres', 'MARINA.TORRES', '456.123.789-55', 'marina.torres@hospital.local', '(11) 96628-8401', 'ADMINISTRADOR', 'pbkdf2$sha256$120000$7704e5e18eb31f5e3b2f22a3327cbc1a$4c75faa1a66abc340f24bf0ca38f3648844bc80c1a1ab9cdac6dbb1c03adcb2c'),
  ((SELECT id FROM instituicoes WHERE nome = 'POSTO DE SAUDE DE ARCO IRIS'), (SELECT id FROM setores WHERE nome = 'ADMINISTRACAO' AND instituicao_id = (SELECT id FROM instituicoes WHERE nome = 'POSTO DE SAUDE DE ARCO IRIS')), 'Administrador Arco Iris', 'ADM.ARCOIRIS', '111.111.111-11', 'admin.arcoiris@posto.local', '(14) 00000-0000', 'ADMINISTRADOR', 'pbkdf2$sha256$120000$7704e5e18eb31f5e3b2f22a3327cbc1a$4c75faa1a66abc340f24bf0ca38f3648844bc80c1a1ab9cdac6dbb1c03adcb2c'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), (SELECT id FROM setores WHERE nome = 'ADMINISTRACAO' AND instituicao_id = (SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA')), 'Administrador Master', 'MASTER', '999.999.999-99', 'master@transporte.local', '(14) 00000-0000', 'MASTER', 'pbkdf2$sha256$120000$7704e5e18eb31f5e3b2f22a3327cbc1a$4c75faa1a66abc340f24bf0ca38f3648844bc80c1a1ab9cdac6dbb1c03adcb2c')
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  instituicao_id = VALUES(instituicao_id),
  perfil = VALUES(perfil),
  setor_id = VALUES(setor_id),
  senha_hash = VALUES(senha_hash);

INSERT INTO motoristas (
  instituicao_id,
  usuario_id,
  nome,
  cpf,
  numero_cnh,
  categoria_cnh,
  validade_cnh,
  telefone,
  situacao
) VALUES
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), (SELECT id FROM usuarios WHERE nome_usuario = 'ROBERTO.LIMA'), 'Roberto Lima', '987.654.321-00', '04829381720', 'D', '2027-08-10', '(11) 97742-6630', 'DISPONIVEL'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), NULL, 'Claudia Nunes', '321.654.987-43', '03847592011', 'B', '2026-12-22', '(11) 97590-2211', 'EM_SERVICO'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), NULL, 'Paulo Henrique', '654.987.321-88', '05284739100', 'D', '2028-04-04', '(11) 98843-7780', 'DISPONIVEL')
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  situacao = VALUES(situacao);


INSERT INTO medicos (instituicao_id, nome) VALUES
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'DRA. RENATA ALVES'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'DR. GUSTAVO MELO'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'DRA. HELENA DIAS'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'DR. MATEUS ROCHA'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'DRA. LIVIA CAMPOS')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO acompanhantes (instituicao_id, nome, tipo) VALUES
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'MARCELA SOUZA', 'ENFERMEIRO'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'JOAO VICTOR', 'TECNICO'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'CAMILA RAMOS', 'AUXILIAR'),
  ((SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'), 'RAFAELA MORAIS', 'ENFERMEIRO')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO solicitacoes_transporte (
  id,
  instituicao_id,
  solicitante_usuario_id,
  setor_origem_id,
  motorista_id,
  tipo,
  nome_paciente,
  nome_destino,
  endereco_destino,
  numero_destino,
  agendado_para,
  prioridade,
  situacao,
  observacoes_solicitante,
  aceito_em,
  iniciado_em,
  finalizado_em,
  saida_em,
  retorno_em,
  quilometragem_inicial,
  quilometragem_final,
  observacoes_atendimento
) VALUES
  (
    1001,
    (SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'),
    (SELECT id FROM usuarios WHERE nome_usuario = 'ANA.RIBEIRO'),
    (SELECT id FROM setores WHERE nome = 'UTI ADULTO'),
    NULL,
    NULL,
    'PACIENTE',
    'JOAO MARTINS',
    'HEMODINAMICA',
    'HEMODINAMICA',
    NULL,
    '2026-06-12 14:40:00',
    'URGENTE',
    'PENDENTE',
    'PACIENTE EM MONITORIZACAO CONTINUA.',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    1002,
    (SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'),
    (SELECT id FROM usuarios WHERE nome_usuario = 'MARINA.TORRES'),
    (SELECT id FROM setores WHERE nome = 'LABORATORIO'),
    (SELECT id FROM motoristas WHERE cpf = '321.654.987-43'),
    'COLETA_EXAMES',
    NULL,
    'UNIDADE SATELITE NORTE',
    'UNIDADE SATELITE NORTE',
    NULL,
    '2026-06-12 15:10:00',
    'ALTA',
    'EM_ANDAMENTO',
    'COLETA REFRIGERADA.',
    '2026-06-12 14:50:00',
    '2026-06-12 14:55:00',
    NULL,
    '2026-06-12 14:55:00',
    NULL,
    46190,
    NULL,
    'CAIXA TERMICA CONFERIDA NA SAIDA.'
  ),
  (
    1003,
    (SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'),
    (SELECT id FROM usuarios WHERE nome_usuario = 'MARINA.TORRES'),
    (SELECT id FROM setores WHERE nome = 'FARMACIA'),
    (SELECT id FROM motoristas WHERE cpf = '987.654.321-00'),
    'MATERIAL',
    NULL,
    'CENTRO CIRURGICO',
    'CENTRO CIRURGICO',
    NULL,
    '2026-06-11 10:30:00',
    'MEDIA',
    'CONCLUIDA',
    'MATERIAIS ESTERILIZADOS.',
    '2026-06-11 10:10:00',
    '2026-06-11 10:22:00',
    '2026-06-11 11:02:00',
    '2026-06-11 10:22:00',
    '2026-06-11 11:02:00',
    84202,
    84212,
    'ENTREGA REALIZADA AO ENFERMEIRO RESPONSAVEL.'
  )
ON DUPLICATE KEY UPDATE
  situacao = VALUES(situacao),
  motorista_id = VALUES(motorista_id),
  observacoes_atendimento = VALUES(observacoes_atendimento);

INSERT INTO acompanhamentos_ambulancia (
  id,
  instituicao_id,
  unidade_id,
  setor_id,
  medico_id,
  acompanhante_id,
  motorista_id,
  tipo,
  nome_paciente,
  quarto,
  nome_destino,
  endereco_destino,
  numero_destino,
  nome_medico_historico,
  nome_acompanhante_historico,
  tipo_acompanhante_historico,
  nome_motorista_historico,
  saida_em,
  retorno_em,
  situacao,
  observacoes
) VALUES
  (
    1,
    (SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'),
    (SELECT id FROM unidades WHERE nome = 'UNIDADE CENTRAL'),
    (SELECT id FROM setores WHERE nome = 'UTI ADULTO'),
    (SELECT id FROM medicos WHERE nome = 'DRA. RENATA ALVES'),
    (SELECT id FROM acompanhantes WHERE nome = 'MARCELA SOUZA' AND tipo = 'ENFERMEIRO'),
    (SELECT id FROM motoristas WHERE cpf = '987.654.321-00'),
    'UTI_MOVEL',
    'ANTONIO CARLOS',
    '302',
    'EXAME DE IMAGEM',
    'EXAME DE IMAGEM',
    NULL,
    'DRA. RENATA ALVES',
    'MARCELA SOUZA',
    'ENFERMEIRO',
    'ROBERTO LIMA',
    '2026-06-12 07:40:00',
    '2026-06-12 09:05:00',
    'AGENDADO',
    'PACIENTE COM MONITORIZACAO CONTINUA.'
  ),
  (
    2,
    (SELECT id FROM instituicoes WHERE nome = 'SANTA CASA DE TUPA'),
    (SELECT id FROM unidades WHERE nome = 'UNIDADE CENTRAL'),
    (SELECT id FROM setores WHERE nome = 'ENFERMAGEM'),
    NULL,
    (SELECT id FROM acompanhantes WHERE nome = 'JOAO VICTOR' AND tipo = 'TECNICO'),
    (SELECT id FROM motoristas WHERE cpf = '321.654.987-43'),
    'AMBULANCIA_COMUM',
    'BEATRIZ LIMA',
    '118',
    'CONSULTA EXTERNA',
    'CONSULTA EXTERNA',
    NULL,
    NULL,
    'JOAO VICTOR',
    'TECNICO',
    'CLAUDIA NUNES',
    '2026-06-12 10:20:00',
    '2026-06-12 11:12:00',
    'AGENDADO',
    'TRANSPORTE PARA CONSULTA EXTERNA.'
  )
ON DUPLICATE KEY UPDATE
  situacao = VALUES(situacao),
  observacoes = VALUES(observacoes);

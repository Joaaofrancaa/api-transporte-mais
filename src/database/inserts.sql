USE transporte_mais;

INSERT INTO setores (nome) VALUES
  ('ADMINISTRACAO'),
  ('ENFERMAGEM'),
  ('FARMACIA'),
  ('LABORATORIO'),
  ('TRANSPORTE'),
  ('UTI ADULTO'),
  ('CENTRO CIRURGICO')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO unidades (nome) VALUES
  ('UNIDADE CENTRAL')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO usuarios (
  setor_id,
  nome,
  nome_usuario,
  cpf,
  data_nascimento,
  email,
  telefone,
  perfil,
  senha_hash
) VALUES
  ((SELECT id FROM setores WHERE nome = 'ENFERMAGEM'), 'Ana Paula Ribeiro', 'ANA.RIBEIRO', '123.456.789-10', '1988-05-14', 'ana.ribeiro@hospital.local', '(11) 98822-1045', 'SOLICITANTE', '123456'),
  ((SELECT id FROM setores WHERE nome = 'TRANSPORTE'), 'Roberto Lima', 'ROBERTO.LIMA', '987.654.321-00', '1979-11-02', 'roberto.lima@hospital.local', '(11) 97742-6630', 'MOTORISTA', '123456'),
  ((SELECT id FROM setores WHERE nome = 'ADMINISTRACAO'), 'Marina Torres', 'MARINA.TORRES', '456.123.789-55', '1991-02-20', 'marina.torres@hospital.local', '(11) 96628-8401', 'ADMINISTRADOR', '123456')
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  perfil = VALUES(perfil),
  setor_id = VALUES(setor_id),
  senha_hash = VALUES(senha_hash);

INSERT INTO motoristas (
  usuario_id,
  nome,
  cpf,
  numero_cnh,
  categoria_cnh,
  validade_cnh,
  telefone,
  situacao
) VALUES
  ((SELECT id FROM usuarios WHERE nome_usuario = 'ROBERTO.LIMA'), 'Roberto Lima', '987.654.321-00', '04829381720', 'D', '2027-08-10', '(11) 97742-6630', 'DISPONIVEL'),
  (NULL, 'Claudia Nunes', '321.654.987-43', '03847592011', 'B', '2026-12-22', '(11) 97590-2211', 'EM_SERVICO'),
  (NULL, 'Paulo Henrique', '654.987.321-88', '05284739100', 'D', '2028-04-04', '(11) 98843-7780', 'DISPONIVEL')
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  situacao = VALUES(situacao);

INSERT INTO veiculos (placa, modelo, ano, quilometragem_atual) VALUES
  ('HSP-4D22', 'Fiat Ducato Ambulancia', 2021, 84230),
  ('MED-8A91', 'Renault Master', 2020, 109870),
  ('DOC-2B77', 'Chevrolet Spin', 2022, 46210)
ON DUPLICATE KEY UPDATE
  modelo = VALUES(modelo),
  quilometragem_atual = VALUES(quilometragem_atual);

INSERT INTO medicos (nome) VALUES
  ('DRA. RENATA ALVES'),
  ('DR. GUSTAVO MELO'),
  ('DRA. HELENA DIAS'),
  ('DR. MATEUS ROCHA'),
  ('DRA. LIVIA CAMPOS')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO acompanhantes (nome, tipo) VALUES
  ('MARCELA SOUZA', 'ENFERMEIRO'),
  ('JOAO VICTOR', 'TECNICO'),
  ('CAMILA RAMOS', 'AUXILIAR'),
  ('RAFAELA MORAIS', 'ENFERMEIRO')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO solicitacoes_transporte (
  id,
  solicitante_usuario_id,
  setor_origem_id,
  motorista_id,
  veiculo_id,
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
    (SELECT id FROM usuarios WHERE nome_usuario = 'MARINA.TORRES'),
    (SELECT id FROM setores WHERE nome = 'LABORATORIO'),
    (SELECT id FROM motoristas WHERE cpf = '321.654.987-43'),
    (SELECT id FROM veiculos WHERE placa = 'DOC-2B77'),
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
    (SELECT id FROM usuarios WHERE nome_usuario = 'MARINA.TORRES'),
    (SELECT id FROM setores WHERE nome = 'FARMACIA'),
    (SELECT id FROM motoristas WHERE cpf = '987.654.321-00'),
    (SELECT id FROM veiculos WHERE placa = 'HSP-4D22'),
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
  veiculo_id = VALUES(veiculo_id),
  observacoes_atendimento = VALUES(observacoes_atendimento);

INSERT INTO acompanhamentos_ambulancia (
  id,
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

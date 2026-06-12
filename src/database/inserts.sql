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
  ((SELECT id FROM setores WHERE nome = 'ENFERMAGEM'), 'Ana Paula Ribeiro', 'ANA.RIBEIRO', '123.456.789-10', '1988-05-14', 'ana.ribeiro@hospital.local', '(11) 98822-1045', 'SOLICITANTE', 'senha-pendente-de-hash'),
  ((SELECT id FROM setores WHERE nome = 'TRANSPORTE'), 'Roberto Lima', 'ROBERTO.LIMA', '987.654.321-00', '1979-11-02', 'roberto.lima@hospital.local', '(11) 97742-6630', 'MOTORISTA', 'senha-pendente-de-hash'),
  ((SELECT id FROM setores WHERE nome = 'ADMINISTRACAO'), 'Marina Torres', 'MARINA.TORRES', '456.123.789-55', '1991-02-20', 'marina.torres@hospital.local', '(11) 96628-8401', 'ADMINISTRADOR', 'senha-pendente-de-hash')
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  perfil = VALUES(perfil),
  setor_id = VALUES(setor_id);

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

CREATE DATABASE sistema_fiscal;

-- poderiamos usar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci para definfir padrões de caracteres e ordenações

USE sistema_fiscal;
SET foreign_key_checks = 1;


-- EMPRESAS (Entidade Forte Principal)
CREATE TABLE empresas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cnpj VARCHAR(14) NOT NULL UNIQUE COMMENT 'CNPJ sem formatação',
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    inscricao_estadual VARCHAR(20),
    inscricao_municipal VARCHAR(20),
    
    -- Endereço
    endereco_logradouro VARCHAR(255),
    endereco_numero VARCHAR(10),
    endereco_complemento VARCHAR(100),
    endereco_bairro VARCHAR(100),
    endereco_cidade VARCHAR(100),
    endereco_uf CHAR(2),
    endereco_cep CHAR(8),
    
    -- Contatos
    email_principal VARCHAR(255),
    telefone_principal VARCHAR(20),
    
    -- Matriz ou Filial
    empresa_matriz_id INT,
    
    -- Controle
    ativa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
	FOREIGN KEY (empresa_matriz_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    -- Empresa Matriz não pode ser sua própria filial
    -- CHECK (id != empresa_matriz_id) - não pode ser usado com FKS,
    -- um trigger pode ser criado ou iremos alterar isso na aplicação
    
   -- Para pesquisas mais rapidas
   
    INDEX idx_cnpj (cnpj),
    INDEX idx_razao_social (razao_social),
    INDEX idx_matriz (empresa_matriz_id)
);


-- ROLES (Perfis de Usuário)
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT,
    permissoes_base JSON,
    nivel_acesso TINYINT DEFAULT 1 COMMENT 'Hierarquia 1-5',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1 → nível mais baixo
-- 2 → colaborador 
-- 3 → supervisor
-- 4 → gerente 
-- 5 → administrador

-- USUÁRIOS
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    role_id INT NOT NULL,
    
    -- Dados Pessoais
    email VARCHAR(255) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(11) UNIQUE,
    telefone VARCHAR(20),
    
    -- Autenticação
    senha_hash VARCHAR(255) NOT NULL,
 --   ad_username VARCHAR(100) UNIQUE 'Login único para integração AD',
    
    -- Integração
 --   employee_id VARCHAR(50) 'Para integração Oracle',
    departamento VARCHAR(100),
    
    -- Controle
    ativo BOOLEAN DEFAULT TRUE,
    ultimo_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    
    INDEX idx_email (email),
    INDEX idx_empresa (empresa_id),
    INDEX idx_cpf (cpf)
);

-- FORNECEDORES
CREATE TABLE fornecedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Identificação
    cnpj_cpf VARCHAR(14) NOT NULL UNIQUE,
    tipo_pessoa ENUM('PF', 'PJ') NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    
    -- Endereço
    endereco_logradouro VARCHAR(255),
    endereco_numero VARCHAR(10),
    endereco_complemento VARCHAR(100),
    endereco_bairro VARCHAR(100),
    endereco_cidade VARCHAR(100),
    endereco_uf CHAR(2),
    endereco_cep CHAR(8),
    
    -- Dados Bancários
    dados_bancarios JSON,
    
    -- Contato
    email VARCHAR(255),
    telefone VARCHAR(20),
    
    -- Controle
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_cnpj_cpf (cnpj_cpf),
    INDEX idx_razao_social (razao_social)
);

-- EMPRESAS E FORNECEDORES ASSOCIADOS
CREATE TABLE empresa_fornecedor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    fornecedor_id INT NOT NULL,
    status_relacionamento ENUM('ATIVO', 'INATIVO', 'PENDENTE') DEFAULT 'ATIVO',
    data_inicio_contrato DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    
    UNIQUE KEY uk_associacao_unica (empresa_id, fornecedor_id)
);

-- CENTROS DE CUSTO
CREATE TABLE centros_custo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    
    -- Hierarquia
    centro_pai_id INT,
    nivel TINYINT DEFAULT 1,
    
    -- Orçamento
    orcamento_mensal DECIMAL(15,2),
    
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (centro_pai_id) REFERENCES centros_custo(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    
    UNIQUE KEY uk_codigo_empresa (empresa_id, codigo),
    INDEX idx_nome (nome)
);


-- PROJETOS
CREATE TABLE projetos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    
    -- Datas
    data_inicio DATE,
    data_fim_prevista DATE,
    data_fim_real DATE,
    
    -- Orçamento
    orcamento_total DECIMAL(15,2),
    valor_gasto DECIMAL(15,2) DEFAULT 0,
    
    -- Responsável
    responsavel_id INT,
    
    status ENUM('PLANEJAMENTO', 'ATIVO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO') DEFAULT 'PLANEJAMENTO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
    
    UNIQUE KEY uk_codigo_empresa (empresa_id, codigo),
    INDEX idx_status (status),
    INDEX idx_responsavel (responsavel_id)
);

-- ANEXOS
CREATE TABLE anexos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_arquivo VARCHAR(255) NOT NULL,
    nome_original VARCHAR(255) NOT NULL,
    tipo_arquivo VARCHAR(10) NOT NULL COMMENT 'PDF, XML, JPG, PNG, DOC',
    tamanho_bytes BIGINT NOT NULL,
    caminho_arquivo VARCHAR(500) NOT NULL,
    hash_arquivo VARCHAR(64) NOT NULL COMMENT 'SHA-256 para integridade',
    
    -- Auditoria
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (uploaded_by) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    
    INDEX idx_tipo_arquivo (tipo_arquivo),
    INDEX idx_hash (hash_arquivo)
);

-- DOCUMENTOS_FISCAIS
CREATE TABLE documentos_fiscais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    fornecedor_id INT NOT NULL,
    
    -- Identificação do Documento
    tipo_documento ENUM('NF-e', 'NFS-e', 'CT-e', 'NFC-e', 'BOLETO', 'CONTRATO', 'RECIBO', 'OUTROS') NOT NULL,
    numero_documento VARCHAR(50) NOT NULL,
    serie VARCHAR(10),
    chave_acesso VARCHAR(44) UNIQUE COMMENT 'Chave de acesso NFe/NFSe',
    
    -- Datas
    data_emissao DATE NOT NULL,
    data_recebimento DATE DEFAULT (CURRENT_DATE),
    data_vencimento DATE,
    data_competencia DATE COMMENT 'Mês de competência contábil',
    
    -- Valores
    valor_total DECIMAL(15,2) NOT NULL,
    valor_impostos DECIMAL(15,2) DEFAULT 0,
    valor_liquido DECIMAL(15,2) GENERATED ALWAYS AS (valor_total - valor_impostos) STORED,
    
    -- Descrição
    descricao_servico_produto TEXT,
    observacoes TEXT,
    
    -- Localização Fiscal
    uf_origem CHAR(2),
    uf_destino CHAR(2),
    municipio_prestacao VARCHAR(100),
    
    -- Arquivos
    xml_content LONGTEXT COMMENT 'Conteúdo do XML',
    arquivo_anexo VARCHAR(500) COMMENT 'Caminho do arquivo PDF/imagem',
    hash_arquivo VARCHAR(64) COMMENT 'Hash para integridade',
    
    -- Status de Processamento
    status_processamento ENUM('PENDENTE', 'PROCESSADO', 'ERRO', 'MANUAL', 'CANCELADO') DEFAULT 'PENDENTE',
    erro_processamento TEXT,
    
    -- Auditoria
    usuario_criacao_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (usuario_criacao_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
    
    INDEX idx_tipo_documento (tipo_documento),
    INDEX idx_data_emissao (data_emissao),
    INDEX idx_data_vencimento (data_vencimento),
    INDEX idx_fornecedor (fornecedor_id),
    INDEX idx_chave_acesso (chave_acesso),
    INDEX idx_status (status_processamento)
);

-- CATEGORIAS CONTABEIS
CREATE TABLE categorias_contabeis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    tipo ENUM('DESPESA', 'RECEITA', 'ATIVO', 'PASSIVO', 'PATRIMONIO') NOT NULL,
    
    -- Contas Contábeis Padrão
    conta_contabil_debito VARCHAR(20),
    conta_contabil_credito VARCHAR(20),
    
    -- Classificação Fiscal
    natureza_despesa VARCHAR(10) COMMENT 'Para SIAFI/SPED',
    
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    
    UNIQUE KEY uk_codigo_empresa (empresa_id, codigo),
    INDEX idx_tipo (tipo)
);


-- PROVISIONAMENTOS
CREATE TABLE provisionamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    documento_fiscal_id INT NOT NULL UNIQUE,
    empresa_id INT NOT NULL,
    fornecedor_id INT NOT NULL,
    
    -- Valores
    valor_provisionado DECIMAL(15,2) NOT NULL,
    valor_impostos_retidos DECIMAL(15,2) DEFAULT 0,
    valor_liquido DECIMAL(15,2) GENERATED ALWAYS AS (valor_provisionado - valor_impostos_retidos) STORED,
    
    -- Classificação
    data_competencia DATE NOT NULL,
    categoria_contabil_id INT NOT NULL,
    
    -- Aprovação
    status ENUM('RASCUNHO', 'PENDENTE_APROVACAO', 'APROVADO', 'REJEITADO', 'PAGO', 'CANCELADO') DEFAULT 'RASCUNHO',
    data_aprovacao TIMESTAMP NULL,
    usuario_aprovacao_id INT,
    observacoes_aprovacao TEXT,
    
    -- Pagamento
    forma_pagamento ENUM('BOLETO', 'TRANSFERENCIA', 'PIX', 'CHEQUE', 'DINHEIRO', 'CARTAO') DEFAULT 'TRANSFERENCIA',
    
    -- Auditoria
    usuario_criacao_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (documento_fiscal_id) REFERENCES documentos_fiscais(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (categoria_contabil_id) REFERENCES categorias_contabeis(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (usuario_criacao_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (usuario_aprovacao_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
    
    INDEX idx_status (status),
    INDEX idx_data_competencia (data_competencia),
    INDEX idx_fornecedor (fornecedor_id),
    INDEX idx_categoria (categoria_contabil_id)
);

-- CONTAS A PAGAR
CREATE TABLE contas_pagar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provisionamento_id INT NOT NULL UNIQUE,
    empresa_id INT NOT NULL,
    fornecedor_id INT NOT NULL,
    
    -- Valores
    valor_original DECIMAL(15,2) NOT NULL,
    valor_pago DECIMAL(15,2) DEFAULT 0,
    valor_pendente DECIMAL(15,2) GENERATED ALWAYS AS (valor_original - valor_pago) STORED,
    
    -- Datas
    data_vencimento DATE NOT NULL,
    data_pagamento TIMESTAMP NULL,
    
    -- Dados Bancários
    dados_bancarios JSON COMMENT 'Dados para pagamento',
    codigo_barras VARCHAR(200) COMMENT 'Para boletos',
    linha_digitavel VARCHAR(200) COMMENT 'Para boletos',
    
    -- Status
    status ENUM('PENDENTE', 'AGENDADO', 'PAGO', 'VENCIDO', 'CANCELADO') DEFAULT 'PENDENTE',
    
    -- Controle de Remessa CNAB
    remessa_id INT COMMENT 'ID da remessa CNAB',
    numero_documento_banco VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provisionamento_id) REFERENCES provisionamentos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    
    INDEX idx_status (status),
    INDEX idx_vencimento (data_vencimento),
    INDEX idx_fornecedor (fornecedor_id)
);

-- LANÇAMENTOS CONTÁBEIS
CREATE TABLE lancamentos_contabeis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provisionamento_id INT NOT NULL COMMENT 'Relacionamento 1:N',
    empresa_id INT NOT NULL,
    
    -- Classificação Contábil
    conta_contabil VARCHAR(20) NOT NULL,
    centro_custo_id INT,
    
    -- Lançamento
    tipo_lancamento ENUM('DEBITO', 'CREDITO') NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    historico VARCHAR(500) NOT NULL,
    
    -- Data
    data_lancamento DATE NOT NULL,
    
    -- Auditoria
    usuario_lancamento_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provisionamento_id) REFERENCES provisionamentos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (usuario_lancamento_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    
    INDEX idx_provisionamento (provisionamento_id),
    INDEX idx_conta_contabil (conta_contabil),
    INDEX idx_data_lancamento (data_lancamento),
    INDEX idx_centro_custo (centro_custo_id)
);

-- DOCUMENTO x CENTRO DE CUSTO (Entidade Associativa)
CREATE TABLE documento_centro_custo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    documento_fiscal_id INT NOT NULL,
    centro_custo_id INT NOT NULL,
    
    -- Atributos do Relacionamento
    percentual_rateio DECIMAL(5,2) NOT NULL COMMENT 'Percentual do rateio',
    valor_rateado DECIMAL(15,2) NOT NULL COMMENT 'Valor calculado do rateio',
    observacoes TEXT,
    
    -- Auditoria
    usuario_criacao_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (documento_fiscal_id) REFERENCES documentos_fiscais(id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (usuario_criacao_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    
    UNIQUE KEY uk_documento_centro (documento_fiscal_id, centro_custo_id),
    INDEX idx_centro_custo (centro_custo_id)
);

-- PROVISIONAMENTO x PROJETO (Entidade Associativa)
CREATE TABLE provisionamento_projetos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provisionamento_id INT NOT NULL,
    projeto_id INT NOT NULL,
    
    -- Atributos do Relacionamento
    percentual_alocacao DECIMAL(5,2) NOT NULL,
    valor_alocado DECIMAL(15,2) NOT NULL,
    observacoes TEXT,
    
    -- Auditoria
    usuario_criacao_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provisionamento_id) REFERENCES provisionamentos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (usuario_criacao_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    
    UNIQUE KEY uk_provisionamento_projeto (provisionamento_id, projeto_id),
    INDEX idx_projeto (projeto_id)
);

-- WORKFLOW DE APROVAÇÃO
CREATE TABLE workflows_aprovacao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    
    -- Critérios
    valor_minimo DECIMAL(15,2) DEFAULT 0,
    valor_maximo DECIMAL(15,2),
    categoria_contabil_id INT COMMENT 'Específico para categoria',
    centro_custo_id INT COMMENT 'Específico para centro de custo',
    
    -- Configuração
    ordem_obrigatoria BOOLEAN DEFAULT TRUE COMMENT 'Deve seguir ordem de aprovação',
    aprovacao_unanime BOOLEAN DEFAULT FALSE COMMENT 'Todos devem aprovar',
    
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (categoria_contabil_id) REFERENCES categorias_contabeis(id) ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id) ON UPDATE CASCADE ON DELETE SET NULL,
    
    INDEX idx_empresa (empresa_id),
    INDEX idx_valor_range (valor_minimo, valor_maximo)
);

-- APROVAÇÕES (Entidade Associativa N:M - Provisionamento x Usuário)
CREATE TABLE aprovacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provisionamento_id INT NOT NULL,
    workflow_id INT NOT NULL,
    usuario_aprovador_id INT NOT NULL,
    
    -- Atributos do Relacionamento
    ordem_aprovacao TINYINT NOT NULL COMMENT '1º, 2º, 3º aprovador',
    status ENUM('PENDENTE', 'APROVADO', 'REJEITADO', 'CANCELADO') DEFAULT 'PENDENTE',
    data_aprovacao TIMESTAMP NULL,
    observacoes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provisionamento_id) REFERENCES provisionamentos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (workflow_id) REFERENCES workflows_aprovacao(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (usuario_aprovador_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    
    UNIQUE KEY uk_provisionamento_usuario (provisionamento_id, usuario_aprovador_id),
    INDEX idx_workflow (workflow_id),
    INDEX idx_aprovador (usuario_aprovador_id),
    INDEX idx_status (status)
);

-- CONTATOS EMPRESAS (Entidade Fraca - Multivalorado)
CREATE TABLE empresa_contatos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    tipo_contato ENUM('EMAIL', 'TELEFONE', 'FAX', 'WHATSAPP') NOT NULL,
    valor_contato VARCHAR(255) NOT NULL,
    principal BOOLEAN DEFAULT FALSE,
    observacoes TEXT,
    
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE CASCADE,
    
    INDEX idx_empresa_tipo (empresa_id, tipo_contato)
);

-- SESSÕES DE USUÁRIO (Entidade Fraca)
CREATE TABLE user_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    empresa_id INT NOT NULL,
    
    -- Dados da Sessão
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Controle
    is_active BOOLEAN DEFAULT TRUE,
    logout_time TIMESTAMP NULL,
    logout_type ENUM('MANUAL', 'TIMEOUT', 'FORCED') NULL,
    
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE CASCADE,
    
    INDEX idx_user_active (user_id, is_active),
    INDEX idx_empresa (empresa_id)
);

-- REMESSAS CNAB
CREATE TABLE remessas_cnab (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo VARCHAR(500) NOT NULL,
    
    -- Dados da Remessa
    numero_remessa INT NOT NULL,
    data_geracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    quantidade_registros INT DEFAULT 0,
    valor_total DECIMAL(15,2) DEFAULT 0,
    
    -- Status
    status_remessa ENUM('GERADA', 'ENVIADA', 'PROCESSADA', 'ERRO') DEFAULT 'GERADA',
    data_envio TIMESTAMP NULL,
    
    -- Auditoria
    usuario_geracao_id INT NOT NULL,
    
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (usuario_geracao_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    
    INDEX idx_empresa (empresa_id),
    INDEX idx_status (status_remessa),
    INDEX idx_data_geracao (data_geracao)
);

-- RETORNOS CNAB (Entidade Fraca - Dependente de Remessa)
CREATE TABLE retornos_cnab (
    id INT AUTO_INCREMENT PRIMARY KEY,
    remessa_id INT NOT NULL,
    nome_arquivo_retorno VARCHAR(255) NOT NULL,
    caminho_arquivo VARCHAR(500) NOT NULL,
    
    -- Dados do Retorno
    data_retorno TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    quantidade_registros INT DEFAULT 0,
    
    -- Processamento
    processado BOOLEAN DEFAULT FALSE,
    data_processamento TIMESTAMP NULL,
    usuario_processamento_id INT,
    
    FOREIGN KEY (remessa_id) REFERENCES remessas_cnab(id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (usuario_processamento_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
    
    INDEX idx_remessa (remessa_id),
    INDEX idx_data_retorno (data_retorno)
);

-- DOCUMENTO x ANEXO (Entidade Associativa N:M)
CREATE TABLE documento_anexos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    documento_fiscal_id INT NOT NULL,
    anexo_id INT NOT NULL,
    
    -- Atributos do Relacionamento
    tipo_relacao ENUM('PRINCIPAL', 'COMPLEMENTAR', 'COMPROVANTE', 'CONTRATO') NOT NULL,
    observacoes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (documento_fiscal_id) REFERENCES documentos_fiscais(id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (anexo_id) REFERENCES anexos(id) ON UPDATE CASCADE ON DELETE CASCADE,
    
    UNIQUE KEY uk_documento_anexo (documento_fiscal_id, anexo_id),
    INDEX idx_anexo (anexo_id),
    INDEX idx_tipo_relacao (tipo_relacao)
);





-- INSERTS

-- 1. EMPRESAS (Matriz e Filial)
INSERT INTO empresas (cnpj, razao_social, nome_fantasia, inscricao_estadual, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_uf, endereco_cep, email_principal, telefone_principal, empresa_matriz_id) VALUES
('11222333000144', 'TechCorp Brasil LTDA', 'TechCorp', '123456789', 'Av. Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP', '01310100', 'contato@techcorp.com.br', '1133334444', NULL),
('11222333000225', 'TechCorp Filial Rio LTDA', 'TechCorp Rio', '987654321', 'Av. Copacabana', '500', 'Copacabana', 'Rio de Janeiro', 'RJ', '22070001', 'rio@techcorp.com.br', '2133334444', 1);

--
INSERT INTO empresa_contatos (empresa_id, tipo_contato, valor_contato, principal, observacoes) VALUES
(1, 'EMAIL', 'contato@techcorp.com.br', TRUE, 'Email principal'),
(1, 'EMAIL', 'financeiro@techcorp.com.br', FALSE, 'Email do financeiro'),
(1, 'TELEFONE', '1133334444', TRUE, 'Telefone principal'),
(1, 'WHATSAPP', '11999887766', FALSE, 'WhatsApp do João'),
(2, 'EMAIL', 'rio@techcorp.com.br', TRUE, 'Email filial Rio'),
(2, 'TELEFONE', '2133334444', TRUE, 'Telefone filial Rio');

-- Primeiro, criamos um perfil de usuário (role)
INSERT INTO roles (nome, descricao, nivel_acesso) VALUES
('ADMIN', 'Administrador do Sistema', 5),
('GERENTE_FINANCEIRO', 'Gerente Financeiro', 4),
('SUPERVISOR_CONTABIL', 'Supervisor Contábil', 3),
('ANALISTA_FISCAL', 'Analista Fiscal', 2),
('ASSISTENTE', 'Assistente Administrativo', 1);

SELECT * FROM ROLES;

-- Em seguida, criamos um usuário para a empresa e o vinculamos a esse perfil
INSERT INTO usuarios (empresa_id, role_id, nome, email, cpf, telefone, senha_hash, departamento) VALUES
(1, 1, 'João Silva', 'joao.silva@techcorp.com.br', '12345678901', '11999887766', 'exemplo_hash_senha_admin', 'TI'),
(1, 2, 'Maria Santos', 'maria.santos@techcorp.com.br', '23456789012', '11999887767', 'exemplo_hash_senha_gerente', 'Financeiro'),
(1, 3, 'Carlos Oliveira', 'carlos.oliveira@techcorp.com.br', '34567890123', '11999887768', 'exemplo_hash_senha_supervisor', 'Contabilidade');

-- Criação de Fornecedores
INSERT INTO fornecedores (cnpj_cpf, tipo_pessoa, razao_social, nome_fantasia, endereco_logradouro, endereco_numero, endereco_cidade, endereco_uf, endereco_cep, email, telefone, dados_bancarios) VALUES
('99888777000122', 'PJ', 'Fornecedor de TI LTDA', 'TechSupply', 'Rua das Flores', '123', 'São Paulo', 'SP', '01234567', 'contato@techsupply.com', '1144445555', '{"banco": "001", "agencia": "1234", "conta": "567890"}'),
('88777666000133', 'PJ', 'Serviços Contábeis ABC', 'Contábil ABC', 'Av. Brasil', '456', 'Rio de Janeiro', 'RJ', '20000000', 'contato@contabilabc.com', '2144445556', '{"banco": "237", "agencia": "5678", "conta": "123456"}'),
('12345678901', 'PF', 'José Consultor', NULL, 'Rua Consultoria', '789', 'Belo Horizonte', 'MG', '30000000', 'jose@consultor.com', '3144445557', '{"banco": "104", "agencia": "9012", "conta": "345678"}');

SELECT * FROM empresas;

-- Inserção de Centros de Custo definidos pela empresa ficticias
INSERT INTO centros_custo (empresa_id, codigo, nome, descricao, centro_pai_id, nivel, orcamento_mensal) VALUES
(1, 'CC001', 'Administração Geral', 'Centro de custo principal', NULL, 1, 50000.00),
(1, 'CC001.01', 'TI', 'Tecnologia da Informação', 1, 2, 20000.00),
(1, 'CC001.02', 'Financeiro', 'Departamento Financeiro', 1, 2, 15000.00),
(1, 'CC001.03', 'RH', 'Recursos Humanos', 1, 2, 10000.00),
(2, 'CC002', 'Filial Rio', 'Centro de custo da filial', NULL, 1, 30000.00);

-- Inserção de Projetos
INSERT INTO projetos (empresa_id, codigo, nome, descricao, data_inicio, data_fim_prevista, orcamento_total, responsavel_id, status) VALUES
(1, 'PROJ001', 'Modernização Sistema ERP', 'Projeto de atualização do sistema ERP', '2024-01-15', '2024-12-31', 500000.00, 1, 'ATIVO'),
(1, 'PROJ002', 'Expansão Filial Sul', 'Abertura de nova filial no Sul', '2024-03-01', '2024-08-31', 300000.00, 2, 'ATIVO'),
(2, 'PROJ003', 'Certificação ISO', 'Processo de certificação ISO 9001', '2024-02-01', '2024-10-31', 150000.00, 3, 'PLANEJAMENTO');

-- Inserção de documentos fiscais
INSERT INTO documentos_fiscais (empresa_id, fornecedor_id, tipo_documento, numero_documento, serie, chave_acesso, data_emissao, data_vencimento, data_competencia, valor_total, valor_impostos, descricao_servico_produto, uf_origem, uf_destino, usuario_criacao_id, status_processamento) VALUES
(1, 1, 'NF-e', '123456', '001', '35240311222333000144550010001234561234567890', '2024-03-15', '2024-04-15', '2024-03-01', 25000.00, 2500.00, 'Licenças de software e suporte técnico', 'SP', 'SP', 3, 'PROCESSADO'),
(1, 2, 'NFS-e', '789012', '001', '33240388777666000133550010007890121234567890', '2024-03-20', '2024-04-20', '2024-03-01', 8000.00, 800.00, 'Serviços de consultoria contábil', 'RJ', 'SP', 3, 'PROCESSADO'),
(2, 3, 'RECIBO', '345678', NULL, NULL, '2024-03-25', '2024-04-25', '2024-03-01', 5000.00, 0.00, 'Consultoria em processos', 'MG', 'RJ', 3, 'PROCESSADO');

-- Inserção simulação com anexos
INSERT INTO anexos (nome_arquivo, nome_original, tipo_arquivo, tamanho_bytes, caminho_arquivo, hash_arquivo, uploaded_by) VALUES
('doc_001_20240315.pdf', 'nota_fiscal_123456.pdf', 'PDF', 245760, '/uploads/2024/03/doc_001_20240315.pdf', 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456', 3),
('xml_001_20240315.xml', 'nfe_123456.xml', 'XML', 15360, '/uploads/2024/03/xml_001_20240315.xml', 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567a', 3),
('contrato_001.pdf', 'contrato_servicos_ti.pdf', 'PDF', 512000, '/uploads/2024/03/contrato_001.pdf', 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567ab2', 2);

INSERT INTO documento_anexos (documento_fiscal_id, anexo_id, tipo_relacao, observacoes) VALUES
(1, 1, 'PRINCIPAL', 'PDF da nota fiscal principal'),
(1, 2, 'COMPLEMENTAR', 'XML da NFe'),
(2, 3, 'CONTRATO', 'Contrato de prestação de serviços'),
(3, 1, 'COMPROVANTE', 'Comprovante do recibo');

-- Inserção de Categorias contabeis
INSERT INTO categorias_contabeis (empresa_id, codigo, nome, tipo, conta_contabil_debito, conta_contabil_credito, natureza_despesa) VALUES
(1, 'DESP001', 'Despesas com TI', 'DESPESA', '6.1.1.01.001', '2.1.1.01.001', '339030'),
(1, 'DESP002', 'Serviços Contábeis', 'DESPESA', '6.1.2.01.001', '2.1.1.01.002', '339039'),
(1, 'DESP003', 'Consultoria', 'DESPESA', '6.1.3.01.001', '2.1.1.01.003', '339039'),
(2, 'DESP004', 'Despesas Administrativas', 'DESPESA', '6.1.4.01.001', '2.1.1.01.004', '339030');

-- UPDATES e SELECTS

SELECT * FROM USUARIOS;

UPDATE usuarios 
SET role_id = 4, departamento = 'Fiscal' 
WHERE id = 3 AND nome = 'Carlos Oliveira';

UPDATE usuarios
JOIN roles ON roles.nome = 'GERENTE_FINANCEIRO'
SET usuarios.role_id = roles.id
WHERE usuarios.email = 'joao.silva@techcorp.com.br';

UPDATE documentos_fiscais
SET valor_total = 1850.75,
    updated_at = NOW()
WHERE id = 3;

select * from documentos_fiscais;

UPDATE documentos_fiscais
SET status_processamento = 'CANCELADO',
    updated_at = NOW()
WHERE numero_documento = '001' AND empresa_id = 1;


SELECT
    p.id AS projeto_id,
    p.nome AS nome_projeto,
    p.data_inicio, -- CAMPO ADICIONADO AQUI
    p.status,
    p.orcamento_total,
    u.nome AS responsavel_nome,
    e.razao_social AS empresa_nome,
    COUNT(DISTINCT df.id) AS total_documentos_fiscais,
    COALESCE(SUM(df.valor_total), 0) AS valor_total_documentos
FROM projetos p
    LEFT JOIN usuarios u ON p.responsavel_id = u.id
    INNER JOIN empresas e ON p.empresa_id = e.id
    LEFT JOIN provisionamento_projetos pp ON p.id = pp.projeto_id
    LEFT JOIN provisionamentos prov ON pp.provisionamento_id = prov.id
    LEFT JOIN documentos_fiscais df ON prov.documento_fiscal_id = df.id

WHERE p.status = 'ATIVO'

GROUP BY
    p.id, p.nome, p.data_inicio, p.status, p.orcamento_total, u.nome, e.razao_social -- ADICIONADO AO GROUP BY
ORDER BY p.data_inicio DESC;

select * from projetos;

-- usuarios ativos na empresa
SELECT 
    u.id AS usuario_id,
    u.nome AS usuario_nome,
    u.email,
    r.nome AS role,
    u.departamento,
    u.ultimo_login
FROM usuarios u
JOIN roles r ON u.role_id = r.id
WHERE u.ativo = TRUE
ORDER BY u.nome;

-- documentos fiscais por empresa e tipo
SELECT 
    e.razao_social AS empresa,
    df.tipo_documento,
    COUNT(*) AS total_documentos,
    SUM(df.valor_total) AS valor_total
FROM documentos_fiscais df
JOIN empresas e ON df.empresa_id = e.id
GROUP BY e.razao_social, df.tipo_documento
ORDER BY e.razao_social, df.tipo_documento;

-- centro de custo e projetos associados
SELECT 
    cc.codigo AS centro_custo,
    cc.nome AS centro_nome,
    COUNT(DISTINCT p.id) AS total_projetos
FROM centros_custo cc
LEFT JOIN projetos p ON cc.empresa_id = p.empresa_id
GROUP BY cc.id, cc.codigo, cc.nome
ORDER BY total_projetos DESC;


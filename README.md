# Sistema Fiscal - Updates e Selects + adicionais

> **Sistema de Gestão Fiscal e Contábil** - Banco de dados para controle de documentos fiscais, provisionamentos, contas a pagar e lançamentos contábeis.

[👩🏽‍💻SCRIPT DO BANCO](Banco_fiscal/Sistema_fiscal.sql)

---

# Índice

1. **[Visão Geral](#visão-geral)**

2. **[Características Principais](#características-principais)**

3. **[Exemplos de Inserts](#exemplos-de-inserts)**

   * [Cadastro de Empresas](#cadastro-de-empresas)
   * [Usuários e Roles](#usuários-e-roles)
   * [Fornecedores](#fornecedores)
   * [Centros de Custo](#centros-de-custo)
   * [Projetos](#projetos)
   * [Documentos Fiscais Completos](#documentos-fiscais-completos)
   * [Anexos e Documentos](#anexos-e-documentos)
   * [Categorias Contábeis](#categorias-contábeis)

4. **[Updates para Atualização](#updates-para-atualização)**

   * [Atualizações de Usuários](#atualizações-de-usuários)
   * [Atualizações de Documentos Fiscais](#atualizações-de-documentos-fiscais)

5. **[Consultas SELECT](#consultas-select)**

   * [Projetos Ativos com Documentos Associados](#consulta-de-projetos-ativos-com-documentos-associados)
   * [Usuários Ativos](#consulta-de-usuários-ativos)
   * [Documentos por Tipo](#consulta-de-documentos-por-tipo)
   * [Centros de Custo e Projetos](#consulta-de-centros-de-custo-e-projetos)

6. **[Conformidade OLTP e Estrutura de Qualidade](#conformidade-oltp-e-estrutura-de-qualidade)**

   * [Normas Implementadas](#normas-implementadas)
   * [Segregação de Funções](#segregação-de-funções)
   * [Rastreabilidade Completa](#rastreabilidade-completa)
   * [Compliance Contábil e Fiscal](#compliance-contábil-e-fiscal)
   * [Integridade de Dados](#integridade-de-dados)

7. **[Avaliação de Normalização e Trade-offs Estruturais](#avaliação-de-normalização-e-trade-offs-estruturais)**

   * [Conformidade com as Primeiras Formas Normais](#conformidade-com-as-primeiras-formas-normais)
   * [Terceira Forma Normal (3NF)](#terceira-forma-normal-3nf)
   * [Requisitos de Normalização](#requisitos-de-normalização)

8. **[Sobre os Códigos](#sobre-os-códigos)**

9. **[Arquitetura e Tecnologias](#arquitetura-e-tecnologias)**

   * [Backend](#backend)
   * [Frontend](#frontend)
   * [Banco de Dados](#banco-de-dados)

10. **[📁 Estrutura do Projeto](#-estrutura-do-projeto)**

---

## Visão Geral

O **Sistema Fiscal** é uma solução para gestão de documentos fiscais, controle financeiro e conformidade, possuindo **22 tabelas** organizadas de acordo com seus tipos de Entidades, que constam na Documentação final completa!

## Características Principais

- **Multi-empresa**: Suporte a matriz e filiais
- **Controle de Acesso**: Sistema de roles de usuários hierárquico (5 níveis)
- **Documentos Fiscais**: NFe, NFSe, CTe, Boletos, Contratos, Nacionais, Internacions
- **Gestão Financeira**: Provisionamentos e contas a pagar
- **Contabilidade**: Lançamentos contábeis automatizados
- **Workflow**: Sistema de aprovações configurável
- **CNAB**: Integração bancária para pagamentos
- **Anexos**: Gestão de arquivos e documentos

---

## Exemplos de Inserts

### Cadastro de Empresas

```sql
-- EMPRESAS (Matriz e Filial)
INSERT INTO empresas (cnpj, razao_social, nome_fantasia, inscricao_estadual, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_uf, endereco_cep, email_principal, telefone_principal, empresa_matriz_id) VALUES
('11222333000144', 'TechCorp Brasil LTDA', 'TechCorp', '123456789', 'Av. Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP', '01310100', 'contato@techcorp.com.br', '1133334444', NULL),
('11222333000225', 'TechCorp Filial Rio LTDA', 'TechCorp Rio', '987654321', 'Av. Copacabana', '500', 'Copacabana', 'Rio de Janeiro', 'RJ', '22070001', 'rio@techcorp.com.br', '2133334444', 1);

-- Contatos das Empresas
INSERT INTO empresa_contatos (empresa_id, tipo_contato, valor_contato, principal, observacoes) VALUES
(1, 'EMAIL', 'contato@techcorp.com.br', TRUE, 'Email principal'),
(1, 'EMAIL', 'financeiro@techcorp.com.br', FALSE, 'Email do financeiro'),
(1, 'TELEFONE', '1133334444', TRUE, 'Telefone principal'),
(1, 'WHATSAPP', '11999887766', FALSE, 'WhatsApp do João'),
(2, 'EMAIL', 'rio@techcorp.com.br', TRUE, 'Email filial Rio'),
(2, 'TELEFONE', '2133334444', TRUE, 'Telefone filial Rio');
```

### Usuários e Roles

```sql
-- Primeiro, criamos um perfil de usuário (role)
INSERT INTO roles (nome, descricao, nivel_acesso) VALUES
('ADMIN', 'Administrador do Sistema', 5),
('GERENTE_FINANCEIRO', 'Gerente Financeiro', 4),
('SUPERVISOR_CONTABIL', 'Supervisor Contábil', 3),
('ANALISTA_FISCAL', 'Analista Fiscal', 2),
('ASSISTENTE', 'Assistente Administrativo', 1);

-- Em seguida, criamos um usuário para a empresa e o vinculamos a esse perfil
INSERT INTO usuarios (empresa_id, role_id, nome, email, cpf, telefone, senha_hash, departamento) VALUES
(1, 1, 'João Silva', 'joao.silva@techcorp.com.br', '12345678901', '11999887766', 'exemplo_hash_senha_admin', 'TI'),
(1, 2, 'Maria Santos', 'maria.santos@techcorp.com.br', '23456789012', '11999887767', 'exemplo_hash_senha_gerente', 'Financeiro'),
(1, 3, 'Carlos Oliveira', 'carlos.oliveira@techcorp.com.br', '34567890123', '11999887768', 'exemplo_hash_senha_supervisor', 'Contabilidade');
```

### Fornecedores

```sql
-- Criação de Fornecedores
INSERT INTO fornecedores (cnpj_cpf, tipo_pessoa, razao_social, nome_fantasia, endereco_logradouro, endereco_numero, endereco_cidade, endereco_uf, endereco_cep, email, telefone, dados_bancarios) VALUES
('99888777000122', 'PJ', 'Fornecedor de TI LTDA', 'TechSupply', 'Rua das Flores', '123', 'São Paulo', 'SP', '01234567', 'contato@techsupply.com', '1144445555', '{"banco": "001", "agencia": "1234", "conta": "567890"}'),
('88777666000133', 'PJ', 'Serviços Contábeis ABC', 'Contábil ABC', 'Av. Brasil', '456', 'Rio de Janeiro', 'RJ', '20000000', 'contato@contabilabc.com', '2144445556', '{"banco": "237", "agencia": "5678", "conta": "123456"}'),
('12345678901', 'PF', 'José Consultor', NULL, 'Rua Consultoria', '789', 'Belo Horizonte', 'MG', '30000000', 'jose@consultor.com', '3144445557', '{"banco": "104", "agencia": "9012", "conta": "345678"}');
```

### Centros de Custo

```sql
-- Inserção de Centros de Custo definidos pela empresa ficticias
INSERT INTO centros_custo (empresa_id, codigo, nome, descricao, centro_pai_id, nivel, orcamento_mensal) VALUES
(1, 'CC001', 'Administração Geral', 'Centro de custo principal', NULL, 1, 50000.00),
(1, 'CC001.01', 'TI', 'Tecnologia da Informação', 1, 2, 20000.00),
(1, 'CC001.02', 'Financeiro', 'Departamento Financeiro', 1, 2, 15000.00),
(1, 'CC001.03', 'RH', 'Recursos Humanos', 1, 2, 10000.00),
(2, 'CC002', 'Filial Rio', 'Centro de custo da filial', NULL, 1, 30000.00);
```

### Projetos

```sql
-- Inserção de Projetos
INSERT INTO projetos (empresa_id, codigo, nome, descricao, data_inicio, data_fim_prevista, orcamento_total, responsavel_id, status) VALUES
(1, 'PROJ001', 'Modernização Sistema ERP', 'Projeto de atualização do sistema ERP', '2024-01-15', '2024-12-31', 500000.00, 1, 'ATIVO'),
(1, 'PROJ002', 'Expansão Filial Sul', 'Abertura de nova filial no Sul', '2024-03-01', '2024-08-31', 300000.00, 2, 'ATIVO'),
(2, 'PROJ003', 'Certificação ISO', 'Processo de certificação ISO 9001', '2024-02-01', '2024-10-31', 150000.00, 3, 'PLANEJAMENTO');
```

### Documentos Fiscais Completos

```sql
-- Inserção de documentos fiscais
INSERT INTO documentos_fiscais (empresa_id, fornecedor_id, tipo_documento, numero_documento, serie, chave_acesso, data_emissao, data_vencimento, data_competencia, valor_total, valor_impostos, descricao_servico_produto, uf_origem, uf_destino, usuario_criacao_id, status_processamento) VALUES
(1, 1, 'NF-e', '123456', '001', '35240311222333000144550010001234561234567890', '2024-03-15', '2024-04-15', '2024-03-01', 25000.00, 2500.00, 'Licenças de software e suporte técnico', 'SP', 'SP', 3, 'PROCESSADO'),
(1, 2, 'NFS-e', '789012', '001', '33240388777666000133550010007890121234567890', '2024-03-20', '2024-04-20', '2024-03-01', 8000.00, 800.00, 'Serviços de consultoria contábil', 'RJ', 'SP', 3, 'PROCESSADO'),
(2, 3, 'RECIBO', '345678', NULL, NULL, '2024-03-25', '2024-04-25', '2024-03-01', 5000.00, 0.00, 'Consultoria em processos', 'MG', 'RJ', 3, 'PROCESSADO');
```

### Anexos e Documentos

```sql
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
```

### Categorias Contábeis

```sql
-- Inserção de Categorias contabeis
INSERT INTO categorias_contabeis (empresa_id, codigo, nome, tipo, conta_contabil_debito, conta_contabil_credito, natureza_despesa) VALUES
(1, 'DESP001', 'Despesas com TI', 'DESPESA', '6.1.1.01.001', '2.1.1.01.001', '339030'),
(1, 'DESP002', 'Serviços Contábeis', 'DESPESA', '6.1.2.01.001', '2.1.1.01.002', '339039'),
(1, 'DESP003', 'Consultoria', 'DESPESA', '6.1.3.01.001', '2.1.1.01.003', '339039'),
(2, 'DESP004', 'Despesas Administrativas', 'DESPESA', '6.1.4.01.001', '2.1.1.01.004', '339030');
```

---

## Updates para Atualização

### Atualizações de Usuários

```sql
-- Consulta inicial de usuários
SELECT * FROM USUARIOS;

-- Alteração de Role por ID e Nome
UPDATE usuarios 
SET role_id = 4, departamento = 'Fiscal' 
WHERE id = 3 AND nome = 'Carlos Oliveira';

-- Alteração usando JOIN com tabela de roles
UPDATE usuarios
JOIN roles ON roles.nome = 'GERENTE_FINANCEIRO'
SET usuarios.role_id = roles.id
WHERE usuarios.email = 'joao.silva@techcorp.com.br';
```
![evidencia](Banco_fiscal/imagens/role_alt.png)

### Atualizações de Documentos Fiscais

```sql
-- Correção de valor de documento
UPDATE documentos_fiscais
SET valor_total = 1850.75,
    updated_at = NOW()
WHERE id = 3;

-- Consulta para verificar alterações
SELECT * FROM documentos_fiscais;

-- Cancelamento de documento por número
UPDATE documentos_fiscais
SET status_processamento = 'CANCELADO',
    updated_at = NOW()
WHERE numero_documento = '001' AND empresa_id = 1;
```

![evidencia](Banco_fiscal/imagens/status_c.png)

![evidencia](Banco_fiscal/imagens/valor_doc.png)

---

## Consultas SELECT

### Consulta de Projetos Ativos com Documentos Associados

```sql
-- Consulta de Projetos Ativos(com custos/e ou documentos ainda não alocados),Empresas relacionadas e Usuários Responsáveis
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
```
![evidencia](Banco_fiscal/imagens/ordem_atv.png)

### Consulta de Usuários Ativos

```sql
-- Usuários ativos na empresa
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
```

**Usa índice**: `idx_email` na tabela usuarios

![evidencia](Banco_fiscal/imagens/user_atv.png)

### Consulta de Documentos por Tipo

```sql
-- Documentos fiscais por empresa e tipo
SELECT 
    e.razao_social AS empresa,
    df.tipo_documento,
    COUNT(*) AS total_documentos,
    SUM(df.valor_total) AS valor_total
FROM documentos_fiscais df
JOIN empresas e ON df.empresa_id = e.id
GROUP BY e.razao_social, df.tipo_documento
ORDER BY e.razao_social, df.tipo_documento;
```
**Usa índices**:

- `idx_tipo_documento` para GROUP BY
- FK `empresa_id` para JOIN

![evidencia](Banco_fiscal/imagens/doc_empresa_tipo.png)

### Consulta de Centros de Custo e Projetos

```sql
-- Centro de custo e projetos associados
SELECT 
    cc.codigo AS centro_custo,
    cc.nome AS centro_nome,
    COUNT(DISTINCT p.id) AS total_projetos
FROM centros_custo cc
LEFT JOIN projetos p ON cc.empresa_id = p.empresa_id
GROUP BY cc.id, cc.codigo, cc.nome
ORDER BY total_projetos DESC;
```
**Usa índices**:

- `idx_nome` em centros_custo
- FK `empresa_id` em ambas tabelas

![evidencia](Banco_fiscal/imagens/centro_proj.png)

---

## Conformidade OLTP e Estrutura de Qualidade

### Normas Implementadas

O sistema foi projetado seguindo os princípios do **OLTP (Online Transaction Processing)**, garantindo **alta performance**, **integridade transacional** e **consistência dos dados** em ambientes críticos de negócio.

### Segregação de Funções

- Sistema de roles hierárquico (5 níveis)
- Separação entre criação, aprovação e pagamento (enforçado por FKs de usuários)
- Auditoria completa de todas as operações

### Rastreabilidade Completa

- Timestamps automáticos em todas as tabelas (`created_at`, `updated_at`)
- Referência de usuário em todas as operações
- Histórico de aprovações e rejeições (tabela `aprovacoes`)
- Hash de arquivos para garantir integridade e rastreabilidade (tabela `anexos`)

### Compliance Contábil e Fiscal

- Lançamentos contábeis automáticos (baseado em `provisionamentos`)
- Integração com documentos fiscais oficiais (NF-e, NFS-e, CTe)
- Controle de competência contábil (`data_competencia`)
- Padronização de campos (CNPJ, CPF, valores monetários)

### Integridade de Dados

- Chaves estrangeiras com **cascata controlada** (uso estratégico de `RESTRICT`, `CASCADE`, `SET NULL`)
- Índices únicos em campos críticos (CNPJ, CPF, chave de acesso da NF-e)
- Validação de documentos fiscais no momento da inserção (via `UNIQUE` em `chave_acesso`)

---

## Avaliação de Normalização e Trade-offs Estruturais

O modelo de dados do **Sistema Fiscal** foi conscientemente projetado para atingir o nível da **Terceira Forma Normal (3NF)**, optando por compromissos estratégicos em pontos específicos para priorizar a **flexibilidade** e a **eficiência de leitura (performance)**.

### Conformidade com as Primeiras Formas Normais

#### Segunda Forma Normal (2NF)
- **Status:** Totalmente cumprida  
- **Observação:** Não há dependências parciais; todos os atributos não-chave dependem da chave primária inteira.

#### Primeira Forma Normal (1NF) e JSON (Violação Intencional)
- **Status:** Violada intencionalmente  
- **Campos Impactados:** 
  - `dados_bancarios` (em `fornecedores`)  
  - `permissoes_base` (em `roles`)  
- **Justificativa:** A violação é aceita para **ganhar flexibilidade estrutural**, permitindo a adição de novas contas bancárias ou permissões sem alterar o esquema do banco de dados.

### Terceira Forma Normal (3NF)

O modelo **não atende estritamente à 3NF** devido à **denormalização seletiva** em campos de cadastro, visando **velocidade** em detrimento da redundância zero.

#### Violação de Endereços (Dependência Transitiva)
- **Campos Impactados:** `endereco_cidade`, `endereco_uf`, etc. (em `empresas` e `fornecedores`)  
- **Natureza da Violação:** Esses campos são transitivamente dependentes de um atributo não-chave (`CEP`).  
- **Justificativa:** Mantê-los aqui é um **trade-off de performance**, evitando JOINs constantes em consultas de leitura e otimizando a apresentação de cadastros.

### Requisitos de Normalização

#### Correção para 3NF Completa
- **Ação Necessária:** Mover os campos `endereco_*` de `empresas` e `fornecedores` para uma **nova tabela `ENDERECOS`** e vincular via **chave estrangeira**.  

#### Benefício Estrutural
- O uso extensivo de **Chaves Estrangeiras (FKs)** com `ON DELETE RESTRICT/CASCADE` (nas tabelas de provisão e fluxo) garante:
  - Que as transações financeiras sejam **rastreadas**  
  - Que dados cruciais **nunca sejam deletados**, mantendo a **Integridade Transacional**

## Sobre os Códigos

O **Sistema Fiscal (pasta Aplicacao)** é uma plataforma corporativa completa desenvolvida para centralizar, organizar e automatizar processos internos das empresas. O sistema integra em um único ambiente:

- **Controle de Documentos Fiscais**: NF-e, NFS-e, CTe, Boletos, Contratos e Outros.
- **Gestão Financeira**: Provisionamentos, contas a pagar, lançamentos contábeis
- **Centros de Custo e Projetos**: Controle orçamentário e alocação de custos
- **Remessas CNAB**: Geração e processamento de arquivos bancários
- **Auditoria e Relatórios**: Log completo de atividades e indicadores de desempenho
- **Gestão de Usuários**: Sistema de roles hierárquico com controle de acesso

### Características Principais

- ✅ **Multi-empresa**: Suporte a matriz e filiais
- ✅ **Controle de Acesso**: Sistema de roles hierárquico (5 níveis)
- ✅ **Documentos Fiscais**: Suporte a múltiplos tipos (NF-e, NFS-e, CTe, etc.)
- ✅ **Importação Inteligente**: Processamento automático de XMLs (NF-e e NFS-e)
- ✅ **Workflow Configurável**: Sistema de aprovações e revisões
- ✅ **CNAB**: Integração bancária para pagamentos
- ✅ **Dashboard Interativo**: KPIs, gráficos e indicadores em tempo real
- ✅ **Auditoria Completa**: Rastreabilidade de todas as operações
- ✅ **Acessibilidade**: Modo de alto contraste e navegação simplificada

---

## Arquitetura e Tecnologias

### Backend

- **FastAPI** - Framework assíncrono para construção da API REST
- **SQLAlchemy** - ORM para interação com banco de dados MySQL
- **PyMySQL** - Driver MySQL para Python
- **Passlib (bcrypt)** - Hashing seguro de senhas
- **Pydantic** - Validação e modelagem de dados
- **Jinja2** - Motor de templates HTML
- **xml.etree.ElementTree** - Parsing de arquivos XML
- **chardet** - Detecção automática de codificação
- **hashlib** - Geração de hash SHA256 para integridade de arquivos
- **Firebase Admin SDK** - Histórico de ações (com fallback local)

### Frontend

- **JavaScript Vanilla** - Manipulação de DOM e AJAX
- **Chart.js** - Gráficos e visualizações
- **Material Symbols** - Ícones
- **LocalStorage** - Persistência de sessão do usuário

### Banco de Dados

- **MySQL** - Banco de dados relacional
- **22 Tabelas** organizadas por tipos de entidades
- **Conformidade OLTP** - Otimizado para transações online
- **Normalização 3NF** - Estrutura normalizada com trade-offs estratégicos

---

## 📁 Estrutura do Projeto

```
projeto_bd_sistema_fiscal/
├── Banco_fiscal/
│   ├── Sistema_fiscal.sql          # Script de criação do banco
│   ├── Banco_Doc_Final.pdf         # Documentação completa
│   ├── MConceitual.pdf             # Modelo conceitual
│   ├── MFísico.pdf                 # Modelo físico
│   ├── MLógico1.pdf                # Modelo lógico (parte 1)
│   ├── MLógico2.pdf                # Modelo lógico (parte 2)
│   └── imagens/                    # Imagens de evidências
│       ├── centro_proj.png
│       ├── doc_empresa_tipo.png
│       ├── ordem_atv.png
│       ├── role_alt.png
│       ├── status_c.png
│       ├── user_atv.png
│       └── valor_doc.png
│
├── Aplicacao/
│   ├── assets/
│   │   └── images/
│   │       └── logorm.png          # Logo da aplicação
│   │
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css           # Estilos da aplicação
│   │   └── js/
│   │       ├── login.js            # Lógica de autenticação
│   │       └── script.js           # Lógica principal (SPA)
│   │
│   ├── templates/
│   │   ├── login.html              # Página de login
│   │   └── projeto.html            # Página principal (SPA)
│   │
│   ├── uploads/                    # Arquivos enviados (organizados por empresa/ano/mês)
│   │
│   ├── database.py                 # Configuração de conexão com MySQL
│   ├── firebase_historico.py       # Gerenciamento de histórico (Firebase/local)
│   ├── main.py                     # Aplicação FastAPI (rotas e endpoints)
│   ├── requirements.txt            # Dependências Python
│   └── .gitignore                  # Ignora env, venv, logs e arquivos sensíveis
│
└── README.md                       # Este arquivo
```

---

## Instalação e Configuração

### Pré-requisitos

- Python 3.8+
- MySQL 5.7+ ou 8.0+
- pip (gerenciador de pacotes Python)

### Passo 1: Clonar o Repositório

```bash
git clone <url-do-repositorio>
cd projeto_bd_sistema_fiscal
```

### Passo 2: Criar Ambiente Virtual

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### Passo 3: Instalar Dependências

```bash
pip install -r requirements.txt
```

### Passo 4: Configurar Banco de Dados

1. **Criar o banco de dados MySQL**:
   ```sql
   CREATE DATABASE sistema_fiscal;
   ```

2. **Executar o script SQL**:
   ```bash
   mysql -u root -p sistema_fiscal < Banco_fiscal/Sistema_fiscal.sql
   ```

3. **Configurar conexão** em `database.py`:
   ```python
   MYSQL_USER = "root"
   MYSQL_PASSWORD = "sua_senha"
   MYSQL_HOST = "localhost"
   MYSQL_PORT = "3306"
   MYSQL_DATABASE = "sistema_fiscal"
   ```

### Passo 5: Executar a Aplicação

```bash
# Com Uvicorn (recomendado)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Ou com FastAPI CLI
fastapi dev main.py
```

A aplicação estará disponível em: `http://localhost:8000`

### Passo 6: Acessar a Aplicação

- **Login**: `http://localhost:8000/login`
- **API Docs (Swagger)**: `http://localhost:8000/docs`
- **API Docs (ReDoc)**: `http://localhost:8000/redoc`

---

## 🔌 Rotas e Endpoints da API

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/` | Página inicial (redireciona para login) |
| `GET` | `/login` | Página de login |
| `GET` | `/projeto` | Página principal (requer autenticação) |
| `POST` | `/api/login` | Autenticação de usuário |
| `GET` | `/api/test-db` | Teste de conexão com banco de dados |

### Documentos Fiscais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/documentos-fiscais` | Lista documentos com filtros (search, tipo_data, data_inicial, data_final, tipo_documento, status, fornecedor_id) |
| `GET` | `/api/documentos-fiscais/{doc_id}` | Busca documento específico com anexos |
| `POST` | `/api/documentos-fiscais` | Cadastra novo documento fiscal |
| `PUT` | `/api/documentos-fiscais/{doc_id}` | Atualiza documento existente |
| `DELETE` | `/api/documentos-fiscais/{doc_id}` | Exclui documento fiscal |
| `POST` | `/api/importar-xml` | Importa e processa XML (NF-e ou NFS-e) |
| `POST` | `/api/documentos-fiscais/{doc_id}/confirmar` | Confirma documento (status → PROVISIONADO) |
| `POST` | `/api/documentos-fiscais/{doc_id}/revisar` | Marca documento para revisão (status → REVISAR) |
| `GET` | `/api/documentos-fiscais/{doc_id}/historico` | Obtém histórico de ações do documento |

### Anexos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/upload-arquivo` | Upload de arquivo (PDF, XML, imagens, etc.) |
| `DELETE` | `/api/anexos/{anexo_id}` | Exclui anexo (banco + arquivo físico) |

### Provisionamentos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/provisionamentos` | Lista provisionamentos com filtros |
| `POST` | `/api/provisionamentos/{prov_id}/aprovar` | Aprova provisionamento |
| `POST` | `/api/provisionamentos/{prov_id}/gerar-conta-pagar` | Gera conta a pagar a partir do provisionamento |

### Contas a Pagar

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/contas-pagar` | Lista contas a pagar (filtro por status) |

### Remessas CNAB

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/remessas-cnab` | Lista remessas geradas |
| `POST` | `/api/remessas-cnab` | Gera nova remessa CNAB |
| `POST` | `/api/processar-retorno-cnab` | Processa arquivo de retorno do banco |

### Cadastros Base

#### Empresas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/empresas` | Lista todas as empresas |
| `GET` | `/api/empresas/{empresa_id}` | Busca empresa específica |
| `POST` | `/api/empresas` | Cria nova empresa |
| `PUT` | `/api/empresas/{empresa_id}` | Atualiza empresa |
| `DELETE` | `/api/empresas/{empresa_id}` | Exclui empresa |

#### Fornecedores

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/fornecedores` | Lista fornecedores ativos |
| `GET` | `/api/fornecedores/{fornecedor_id}` | Busca fornecedor específico |
| `POST` | `/api/fornecedores` | Cria novo fornecedor |
| `PUT` | `/api/fornecedores/{fornecedor_id}` | Atualiza fornecedor |
| `DELETE` | `/api/fornecedores/{fornecedor_id}` | Exclui fornecedor |

#### Usuários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/usuarios` | Lista usuários |
| `GET` | `/api/usuarios-detalhado` | Lista usuários com detalhes (role, empresa) |
| `GET` | `/api/usuarios/{usuario_id}` | Busca usuário específico |
| `POST` | `/api/usuarios` | Cria novo usuário |
| `PUT` | `/api/usuarios/{usuario_id}` | Atualiza usuário |
| `PUT` | `/api/usuarios/{usuario_id}/senha` | Altera senha do usuário |
| `DELETE` | `/api/usuarios/{usuario_id}` | Exclui usuário |

#### Roles (Permissões)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/roles` | Lista roles/perfis disponíveis |

### Dashboard e Relatórios

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/dashboard/kpis` | Retorna KPIs principais (Total Provisionado, Contas Vencidas, Docs Pendentes, Docs para Revisar) |
| `GET` | `/api/dashboard/gastos_fornecedor` | Dados para gráfico de barras (Top 10 fornecedores) |
| `GET` | `/api/dashboard/docs_por_status` | Dados para gráfico de pizza (Documentos por status) |
| `GET` | `/api/auditoria/log_atividades` | Log unificado de atividades (últimos 500 eventos) |

---

## ⚙️ Funcionalidades Principais

### 1. Gestão de Documentos Fiscais

- **Cadastro Manual**: Inserção de documentos fiscais via formulário
- **Importação Automática**: Processamento inteligente de XMLs (NF-e e NFS-e)
  - Detecção automática de codificação (UTF-8, ISO-8859-1)
  - Extração de dados: número, série, chave de acesso, valores, fornecedor
  - Criação automática de fornecedor se não existir
  - Prevenção de duplicatas (ON DUPLICATE KEY UPDATE)
- **Filtros Avançados**: Busca por termo, tipo de data, intervalo, tipo de documento, status, fornecedor
- **Anexos**: Upload e vinculação de arquivos (PDF, XML, imagens, documentos)
- **Histórico**: Rastreamento completo de ações (confirmações, revisões)

### 2. Fluxo de Trabalho

- **Status do Documento**:
  - `PENDENTE` → Aguardando ação
  - `PROVISIONADO` → Confirmado e pronto para provisionamento
  - `REVISAR` → Marcado para revisão
  - `PROCESSADO` → Processado com sucesso, após Provisionado ter se tornado uma conta a pagar
  - `CANCELADO` → Cancelado

- **Ações Disponíveis**:
  - **Confirmar**: Altera status para `PROVISIONADO` (requer comentários)
  - **Revisar**: Marca para revisão (requer comentários)
  - **Visualizar Histórico**: Ver todas as ações realizadas no documento

### 3. Provisionamentos

- Listagem com filtros (status, data, fornecedor)
- Aprovação de provisionamentos
- Geração automática de contas a pagar a partir de provisionamentos aprovados

### 4. Contas a Pagar e CNAB(a ser completado futuramente, após todas formalidades de autorização bancária para envio e recebimento de arquivos .REM e.RET)

- Listagem de contas a pagar com filtros
- Geração de remessas CNAB
- Processamento de arquivos de retorno bancário
- Atualização automática de status (PENDENTE → AGENDADO → PAGO)

### 5. Dashboard Interativo

- **KPIs Principais**:
  - Total Provisionado (R$)
  - Contas Vencidas (R$)
  - Documentos Pendentes (quantidade)
  - Documentos para Revisar (quantidade)

- **Gráficos**:
  - Gastos por Fornecedor (Top 10) - Gráfico de barras
  - Documentos por Status - Gráfico de pizza

### 6. Auditoria e Relatórios

- Log unificado de atividades:
  - Criação de documentos fiscais
  - Upload de anexos
  - Criação de provisionamentos
  - Geração de remessas CNAB
  - Criação de usuários
- Últimos 500 eventos ordenados por data/hora

### 7. Gestão de Usuários

- Sistema de roles hierárquico (5 níveis):
  - `ADMIN` (nível 5)
  - `GERENTE_FINANCEIRO` (nível 4)
  - `SUPERVISOR_CONTABIL` (nível 3)
  - `ANALISTA_FISCAL` (nível 2)
  - `ASSISTENTE` (nível 1)
- Permissões baseadas em JSON no campo permissoes_base na tabela `roles`;
- Menu dinâmico conforme permissões do usuário
- Senhas hasheadas com bcrypt

### 8. Cadastros Base

- **Empresas**: Multi-empresa (matriz e filiais)
- **Fornecedores**: Pessoa física ou jurídica, com dados bancários em JSON
- **Usuários**: Vinculados a empresa e role
- **Roles**: Perfis com níveis de acesso e permissões

---

## 🗄️ Banco de Dados

### Estrutura e Consolidação

#### Refinamento do Schema (Versão Final)

O script do banco de dados foi unificado e limpo para ambiente de produção, eliminando artefatos de teste e comandos redundantes (`ALTER TABLE` tardios). A estrutura agora contempla nativamente todas as regras de negócio recentes:

* **Workflow Fiscal Nativo:** O campo `status_processamento` na tabela `documentos_fiscais` foi atualizado (ENUM) para suportar o fluxo completo: `PENDENTE` → `REVISAR` → `PROVISIONADO` → `PROCESSADO` (ou `ERRO`/`CANCELADO`).
* **Controle Bancário e CNAB:** Inclusão da flag `remessa_gerada` (BOOLEAN) na tabela `contas_pagar` para garantir a integridade dos lotes enviados ao banco e prevenir duplicidade de pagamentos.
* **Integridade Cadastral Multi-empresa:** Reforço nas chaves únicas compostas (`UNIQUE KEY uk_fornecedor_empresa`) na tabela de fornecedores. Isso permite que o mesmo CNPJ seja cadastrado para empresas diferentes (Matriz/Filial), mas nunca duplicado dentro da mesma empresa.
* **Permissões via JSON:** A tabela `roles` agora armazena as permissões de acesso em formato JSON estruturado (`permissoes_base`), facilitando a renderização dinâmica do menu no frontend.

#### 🧪 Dados de Teste (Seeds)

O script `Sistema_fiscal.sql` agora inclui uma rotina automática de **Seeding** que popula o banco com:
1.  **Hierarquia de Roles:** 5 níveis (Assistente a Admin) com permissões JSON definidas.
2.  **Usuários Padrão:** Um usuário de teste para cada nível de acesso.
3.  **Documentos Variados:** 10 documentos fiscais cobrindo diversos cenários (NF-e, Boleto, Contrato, Erro, Revisão) para validar o Dashboard imediatamente após a instalação.

🔗 **[Acesse aqui o Script SQL Definitivo](Aplicacao/sistema_fiscal_completo.sql)**

---

# 📥 **Importar o Banco de Dados — sistema_fiscal**

Para utilizar o banco **sistema_fiscal** já completo (com todos os dados inseridos), basta importar o arquivo:

```
sistema_fiscal_completo.sql
```

Abaixo estão dois métodos recomendados.

---

## 🟦 **Método 1 — Importação pelo MySQL Workbench (recomendado)**

1. Abra o **MySQL Workbench**
2. Clique no menu **Server → Data Import**
3. Selecione a opção **Import from Self-Contained File**
4. Clique em **…** e escolha o arquivo:

   ```
   sistema_fiscal_completo.sql
   ```
5. Em **Default Target Schema**, escolha um banco existente **ou** clique em
   **New… → Digite: sistema_fiscal**
6. Clique em **Start Import**
7. Aguarde a conclusão e atualize a lista de schemas (botão refresh)

Pronto! O banco estará disponível com **todos os dados**.

---

## 🟩 **Método 2 — Importação via Terminal (CMD, PowerShell ou Git Bash)**

1. Abra o terminal
2. Navegue até a pasta onde está o arquivo `.sql`, por exemplo:

   ```
   cd C:\Users\seu_usuario\Downloads
   ```
3. Execute o comando:

   ```
   mysql -u root -p sistema_fiscal < sistema_fiscal_completo.sql
   ```
4. Digite sua senha quando solicitado

Após a importação, o banco **sistema_fiscal** estará pronto para uso.

---

## 📝 **Observações importantes**

* O arquivo `.sql` já contém toda a estrutura + dados do sistema.
* Não é necessário rodar o script original de criação das tabelas.
* Após a importação, qualquer aplicação que use o banco estará pronta para conectar.
---

## Segurança e Autenticação

### Autenticação

- **Login**: Email e senha
- **Senhas**: Hash com bcrypt (suporte a senhas antigas em texto plano como fallback)
- **Sessão**: Token simples armazenado no localStorage
- **Proteção de Rotas**: Verificação de token no frontend

### Controle de Acesso

- **Sistema de Roles**: 5 níveis hierárquicos
- **Permissões Base**: Configuradas em JSON na tabela `roles`
- **Menu Dinâmico**: Construído conforme permissões do usuário
- **Validação**: Verificação de permissões no backend (TODO: implementar middleware)

### Integridade de Dados

- **Hash de Arquivos**: SHA256 para verificação de integridade
- **Validação de Tipos**: Pydantic para validação de dados
- **Transações**: Uso de transações SQL para operações críticas
- **Rollback**: Reversão automática em caso de erro

---

## 🔄 Fluxo de Trabalho

### Fluxo de Documento Fiscal, Provisionamentos e Remessas + Retornos CNAB

```
1. PENDENTE
   ↓ (Importação XML ou Cadastro Manual)
2. REVISAR (opcional - se marcado para revisão)
   ↓ (Confirmação com comentários)
3. PROVISIONADO
   ↓ (Criação de provisionamento)
4. APROVADO (provisionamento)
   ↓ (Geração de conta a pagar)
5. AGENDADO (conta a pagar)
   ↓ (Processamento de remessas)
6. PAGO
   ↓ (Processamento de retornos)

```
## Funções e Helpers Chave

### Backend (Python)

- **`detect_encoding(content: bytes)`**: Detecta codificação de arquivos XML
- **`importar_xml()`**: Processa XMLs (NF-e e NFS-e) com extração multi-formato
- **`fazer_login()`**: Autenticação com verificação de senha bcrypt
- **`registrar_acao()`**: Registra ações no histórico (Firebase ou local)

### Frontend (JavaScript)

- **`montarMenuDinamico(menus)`**: Constrói menu lateral conforme permissões
- **`loadPage(page)`**: Roteador interno para SPA
- **`popularSelectFornecedores(selector, options)`**: Preenche selects com fornecedores
- **`carregarDocumentos()`**: Busca e exibe documentos fiscais
- **`abrirModalComentarios(docId, acao)`**: Gerencia confirmação/revisão
- **`visualizarHistoricoDocumento(docId)`**: Exibe histórico de ações
- **Formatadores**: `formatarMoeda()`, `formatarData()`, `formatarCNPJ()`, etc.

---
## 📝 Notas de Desenvolvimento (Requisitos Atingidos)

### 📋 Requisitos Funcionais (RF)

- **RF001:** Cadastro de Empresas Clientes  
- **RF002:** Cadastro de usuários com permissões (Role)  
- **RF003:** Gestão completa de fornecedores  
- **RF004:** Fluxo completo de notas fiscais (criação, revisão, provisionamento, pagamento)  
- **RF006:** Inclusão automatizada de XML (NF-e, NFS-e, CT-e)  
- **RF007:** Inclusão parcial de documentos (boleto, contrato, impostos etc.)  
- **RF010:** Pesquisa geral de gastos  
- **RF011:** Restrições de segurança nas alterações  
- **RF012:** Verificação de status de pagamento  
- **RF014:** Log de auditoria (usuário, operação, timestamp)  
- **RF015:** Restrições baseadas na role  
- **RF016:** Limitação de sessões simultâneas por usuário  

---

### 📖 Requisitos Não-Funcionais (RNF)

- **RNF001:** Performance adequada para consultas grandes  
- **RNF003:** Estrutura escalável para alto volume de documentos  
- **RNF006:** Hash seguro de senhas (bcrypt)  
- **RNF008:** Prevenção de duplicidade e exclusão lógica  
- **RNF009:** Auditoria completa de operações  
- **RNF010:** Hash SHA-256 para integridade de anexos  

---

### 🔎 Regras de Negócio (RN)

- **RN001:** Chave de acesso única por documento  
- **RN002:** Sem duplicidade de CPF, CNPJ ou e-mail  
- **RN003:** Documento → Provisão → Conta a pagar  
- **RN005:** Lançamentos contábeis vinculados à provisão  
- **RN007:** Cálculo automático de valor líquido  
- **RN008:** Alocação de custos por centro de custo ou projeto  

---

## Requisitos Não Atingidos (Para Melhoria Futura)

### 📋 Funcionais (RF)

- **RF005:** Integração com Active Directory (AD)  
- **RF008 / RF009:** Regras específicas de campos obrigatórios por país (internacionalização fiscal)  
- **RF013:** Processamento completo de retorno bancário (CNAB .RET) – parser pendente  

---

### 📖 Não-Funcionais (RNF)

- **RNF002:** Relatórios consolidados em ≤ 30s para grandes bases  
- **RNF004:** Alta disponibilidade (≥ 99,5%) — ainda não há mecanismo de redundância / failover  
- **RNF005:** Backup automático + retenção + RTO e RPO definidos (dependência de infraestrutura)  
- **RNF007:** Criptografia AES-256 para dados sensíveis armazenados

---

### 🔎 Regras de Negócio (RN)

- **RN004:** Processo de aprovação baseado em limite financeiro / centro de custo (parcialmente implementado)  
- **RN006:** Validação rígida para evitar empresa ser matriz de si mesma (regra existe mas falta enforced global)

---

## 🚀 Propostas de Melhoria

- Implementar módulo de integração completa com Active Directory  
- Adicionar camada de criptografia AES-256 ao banco  
- Criar mecanismo automático de backup e versão incremental  
- Desenvolver parser completo do arquivo CNAB retorno (.RET)  
- Implementar sistema de aprovação com workflow visual  
- Otimizar consultas de relatórios com cache e paginação avançada  
- Suporte a ambiente distribuído (replicação + failover)
- Criação de Procedures, Views e Triggers complementares
  
---

## 🔍 Detalhes Técnicos Adicionais

### Arquitetura SPA (Single Page Application)

O frontend utiliza uma arquitetura SPA onde:
- **Navegação**: Toda a navegação é feita via JavaScript sem recarregar a página
- **Roteamento**: Sistema de roteamento interno através da função `loadPage()`
- **Estado**: Gerenciamento de estado via localStorage para sessão do usuário
- **Menu Dinâmico**: Menu lateral construído dinamicamente conforme permissões do usuário

### Sistema de Upload de Arquivos

- **Organização**: Arquivos são organizados por `empresa_id/ano/mês/` para facilitar backup e manutenção
- **Validação de Tipos**: Suporta PDF, XML, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX
- **Integridade**: Hash SHA256 calculado para cada arquivo para verificação de integridade
- **Metadados**: Armazenamento de nome original, tipo, tamanho e caminho no banco de dados
- **Vinculação**: Sistema flexível de vinculação de anexos a documentos fiscais

### Processamento de XML

O sistema possui processamento inteligente de XMLs com:
- **Detecção Automática de Codificação**: Suporta UTF-8, ISO-8859-1 e detecção via chardet
- **Multi-formato**: Suporta NF-e (padrão federal) e NFS-e (nota de serviço, ex: SP)
- **Ignorância de Namespaces**: Processamento robusto que ignora namespaces XML
- **Extração Automática**: Extrai automaticamente número, série, chave de acesso, valores, fornecedor
- **Criação de Fornecedor**: Cria automaticamente fornecedor se não existir no banco
- **Prevenção de Duplicatas**: Usa `ON DUPLICATE KEY UPDATE` para evitar documentos duplicados

### Sistema de Histórico

- **Firebase Realtime Database**: Histórico de ações armazenado no Firebase (opcional)
- **Fallback Local**: Se Firebase não estiver configurado, usa arquivos JSON locais
- **Rastreabilidade**: Cada ação registra documento_id, ação, usuário, comentários, data/hora
- **Integração**: Histórico busca nomes de usuários no MySQL para exibição completa

### Sistema de Status e Badges

O sistema utiliza badges coloridos para indicar status(conforme Style.css):
- **PENDENTE** : Amarelo
- **REVISAR**: Vermelho
- **PROVISIONADO** Verde
- **PROCESSADO** Azul
- **CANCELADO**: Rosa escuro/Vinho

De acordo com o que a Empresa precisar, podem ser criados novos Badges como "PAGO","APROVADO", "ERRO", dentre outros.

No entanto, para demonstração, no momento, o status de Provisionado, em caso de precisar ser retomado, pode ser repassado por uma Analista com permissão para "REVISAR", assim pedindo nova revisão do provisionamento gerado em casos de erro, ou pode ainda ser Editado e seu Status alterado para "CANCELADO".

Uma vez provisionado, o arquivo vira uma conta a pagar e então vai para uma Remessa CNAB, onde será efetivamente eviado ao banco/instituição bancária.


### Funcionalidades de Acessibilidade

- **Modo Alto Contraste**: Botão flutuante para ativar/desativar modo de acessibilidade
- **Navegação por Teclado**: Suporte a navegação via teclado
- **Tooltips**: Dicas visuais nos elementos do menu
- **Ícones Material Symbols**: Ícones consistentes e acessíveis

### Tratamento de Erros

- **Validação de Dados**: Pydantic valida todos os dados de entrada
- **Tratamento de Exceções**: Try/catch em todas as operações críticas
- **Rollback Automático**: Transações SQL com rollback em caso de erro
- **Mensagens de Erro**: Mensagens claras e específicas para o usuário
- **Logs Detalhados**: Logs no console para debug (prefixed com `[v0 Backend]`)

### Sistema de Filtros

- **Filtros Múltiplos**: Combinação de múltiplos filtros simultaneamente
- **Busca Textual**: Busca por número, fornecedor, valor ou tipo de documento
- **Filtro por Data**: Suporte a 4 tipos de data (emissão, recebimento, competência, vencimento)
- **Filtro por Status**: Filtro por status de processamento
- **Filtro por Fornecedor**: Seleção de fornecedor específico
- **Limpeza de Filtros**: Botão para limpar todos os filtros aplicados

### Formatação de Dados

O sistema possui funções auxiliares para formatação:
- **Moeda**: Formatação em Real brasileiro (R$)
- **Data**: Formatação DD/MM/AAAA
- **Data/Hora**: Formatação completa com hora
- **CNPJ/CPF**: Formatação automática com máscara
- **Valores**: Formatação numérica com separadores de milhar

### Sistema de Menu Dinâmico

- **Permissões Base**: Permissões armazenadas em JSON na tabela `roles`
- **Mapeamento**: MENU_MAP define ícones, labels e ordem de exibição
- **Ordenação**: Menus são ordenados automaticamente por prioridade
- **Ativação**: Menu ativo é destacado visualmente
- **Tooltips**: Dicas visuais ao passar o mouse (quando sidebar colapsada)

### Organização de Arquivos(exemplo)

```
uploads/
├── empresa_1/
│   ├── 2024/
│   │   ├── 01/  # Janeiro
│   │   ├── 02/  # Fevereiro
│   │   └── 03/  # Março
│   └── 2025/
│       └── 01/
├── remessas/
│   └── remessa_000001.rem
└── retornos/
    └── retorno_000001.ret
```

### Validações Implementadas

- **Email**: Validação de formato de email no login
- **Senha**: Verificação de senha com bcrypt
- **Arquivos**: Validação de extensão e tipo MIME
- **CNPJ/CPF**: Validação de duplicidade no banco
- **Chave de Acesso**: Validação de unicidade para documentos fiscais
- **Status**: Validação de transições de status permitidas

### Performance e Otimizações

- **Índices**: Índices em campos frequentemente consultados (email, tipo_documento, status)
- **Limite de Resultados**: Limitação de 100 registros por consulta (pode ser ajustado)
- **Queries Otimizadas**: Uso de JOINs eficientes e seleção apenas de campos necessários
- **Cache Local**: localStorage para dados de sessão do usuário

### Segurança Adicional

- **Hash de Arquivos**: SHA256 para verificação de integridade
- **Senhas Hasheadas**: Bcrypt com salt automático
- **Validação de Tipos**: Pydantic valida todos os tipos de dados
- **SQL Injection**: Proteção via parâmetros nomeados no SQLAlchemy
- **XSS**: Sanitização de dados de entrada

## Equipe de Desenvolvimento

Este projeto foi desenvolvido pelo **Grupo 1**:

- **Ana Beatriz** - Desenvolvedora
- **Brenda Mykaelle** - Desenvolvedora  
- **Paulo Higa** - Desenvolvedor

### Objetivos do Projeto(Conclusão final)

- **Automatização**: Redução de trabalho manual através de importação automática de XMLs
- **Rastreabilidade**: Histórico completo de todas as ações realizadas no sistema
- **Conformidade**: Garantia de conformidade com normas fiscais e contábeis
- **Eficiência**: Otimização do fluxo de trabalho desde a entrada do documento até o pagamento
- **Transparência**: Dashboard com indicadores em tempo real para tomada de decisão

---

*Esta documentação serve como referência para desenvolvedores, administradores de banco de dados e usuários do Sistema Fiscal que estejam explorando este projeto.*

[📑 Documentação Completa](Banco_fiscal/Banco_Doc_Final.pdf)

*Última atualização:  17/11/2025* 

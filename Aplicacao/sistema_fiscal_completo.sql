-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: sistema_fiscal
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `anexos`
--

DROP TABLE IF EXISTS `anexos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `anexos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome_arquivo` varchar(255) NOT NULL,
  `nome_original` varchar(255) NOT NULL,
  `tipo_arquivo` varchar(10) NOT NULL COMMENT 'PDF, XML, JPG, PNG, DOC',
  `tamanho_bytes` bigint NOT NULL,
  `caminho_arquivo` varchar(500) NOT NULL,
  `hash_arquivo` varchar(64) NOT NULL COMMENT 'SHA-256 para integridade',
  `uploaded_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `uploaded_by` (`uploaded_by`),
  KEY `idx_tipo_arquivo` (`tipo_arquivo`),
  KEY `idx_hash` (`hash_arquivo`),
  CONSTRAINT `anexos_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `anexos`
--

LOCK TABLES `anexos` WRITE;
/*!40000 ALTER TABLE `anexos` DISABLE KEYS */;
INSERT INTO `anexos` VALUES (1,'doc_001_20240315.pdf','nota_fiscal_123456.pdf','PDF',245760,'/uploads/2024/03/doc_001_20240315.pdf','a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',3,'2025-09-27 23:43:22'),(2,'xml_001_20240315.xml','nfe_123456.xml','XML',15360,'/uploads/2024/03/xml_001_20240315.xml','b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567a',3,'2025-09-27 23:43:22'),(3,'contrato_001.pdf','contrato_servicos_ti.pdf','PDF',512000,'/uploads/2024/03/contrato_001.pdf','c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567ab2',2,'2025-09-27 23:43:22'),(4,'20251114_004846_1e15ba77.xml','5641999.xml','XML',97965,'anexos/20251114_004846_1e15ba77.xml','1e15ba77f204de88aaf957567985cc8ded36d6f77e97bdf892c3c0d86dbbb82f',5,'2025-11-14 03:48:46'),(5,'25664f9055f7.pdf','Anelise.pdf','PDF',182842,'empresa_1/2025/11/25664f9055f7.pdf','bfa3f8cd8822849218c3a3a81f979998cc29b1955fef8dcaa0e22e50b63e5d81',5,'2025-11-14 21:58:00'),(7,'0668879c.xml','anexo2.xml','XML',7759,'/empresa_1/2025/11/0668879c.xml','1a769e3b9d25ec9f1c18c43844cde13dc30fd8bd2927dad6a9620ee50560681b',1,'2025-11-15 16:51:04'),(8,'9f5d148e.pdf','CR.pdf','PDF',150648,'/empresa_1/2025/11/9f5d148e.pdf','909b97a73980cdea573c64d9311a8b045dbb644d950927934b005e309d4ac1d5',1,'2025-11-15 22:23:04'),(9,'6da764e2.pdf','5641999.pdf','PDF',97965,'/empresa_1/2025/11/6da764e2.pdf','1e15ba77f204de88aaf957567985cc8ded36d6f77e97bdf892c3c0d86dbbb82f',1,'2025-11-18 20:37:42'),(10,'6d02fda4.pdf','5641999.pdf','PDF',97965,'/empresa_1/2025/11/6d02fda4.pdf','1e15ba77f204de88aaf957567985cc8ded36d6f77e97bdf892c3c0d86dbbb82f',1,'2025-11-18 20:42:56');
/*!40000 ALTER TABLE `anexos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `aprovacoes`
--

DROP TABLE IF EXISTS `aprovacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aprovacoes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provisionamento_id` int NOT NULL,
  `workflow_id` int NOT NULL,
  `usuario_aprovador_id` int NOT NULL,
  `ordem_aprovacao` tinyint NOT NULL COMMENT '1º, 2º, 3º aprovador',
  `status` enum('PENDENTE','APROVADO','REJEITADO','CANCELADO') DEFAULT 'PENDENTE',
  `data_aprovacao` timestamp NULL DEFAULT NULL,
  `observacoes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_provisionamento_usuario` (`provisionamento_id`,`usuario_aprovador_id`),
  KEY `idx_workflow` (`workflow_id`),
  KEY `idx_aprovador` (`usuario_aprovador_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `aprovacoes_ibfk_1` FOREIGN KEY (`provisionamento_id`) REFERENCES `provisionamentos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `aprovacoes_ibfk_2` FOREIGN KEY (`workflow_id`) REFERENCES `workflows_aprovacao` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `aprovacoes_ibfk_3` FOREIGN KEY (`usuario_aprovador_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `aprovacoes`
--

LOCK TABLES `aprovacoes` WRITE;
/*!40000 ALTER TABLE `aprovacoes` DISABLE KEYS */;
/*!40000 ALTER TABLE `aprovacoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categorias_contabeis`
--

DROP TABLE IF EXISTS `categorias_contabeis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias_contabeis` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `tipo` enum('DESPESA','RECEITA','ATIVO','PASSIVO','PATRIMONIO') NOT NULL,
  `conta_contabil_debito` varchar(20) DEFAULT NULL,
  `conta_contabil_credito` varchar(20) DEFAULT NULL,
  `natureza_despesa` varchar(10) DEFAULT NULL COMMENT 'Para SIAFI/SPED',
  `ativo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_codigo_empresa` (`empresa_id`,`codigo`),
  KEY `idx_tipo` (`tipo`),
  CONSTRAINT `categorias_contabeis_ibfk_1` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias_contabeis`
--

LOCK TABLES `categorias_contabeis` WRITE;
/*!40000 ALTER TABLE `categorias_contabeis` DISABLE KEYS */;
INSERT INTO `categorias_contabeis` VALUES (1,1,'DESP001','Despesas com TI','DESPESA','6.1.1.01.001','2.1.1.01.001','339030',1,'2025-09-27 23:39:28'),(2,1,'DESP002','Serviços Contábeis','DESPESA','6.1.2.01.001','2.1.1.01.002','339039',1,'2025-09-27 23:39:28'),(3,1,'DESP003','Consultoria','DESPESA','6.1.3.01.001','2.1.1.01.003','339039',1,'2025-09-27 23:39:28'),(4,2,'DESP004','Despesas Administrativas','DESPESA','6.1.4.01.001','2.1.1.01.004','339030',1,'2025-09-27 23:39:28');
/*!40000 ALTER TABLE `categorias_contabeis` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `centros_custo`
--

DROP TABLE IF EXISTS `centros_custo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `centros_custo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `descricao` text,
  `centro_pai_id` int DEFAULT NULL,
  `nivel` tinyint DEFAULT '1',
  `orcamento_mensal` decimal(15,2) DEFAULT NULL,
  `ativo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_codigo_empresa` (`empresa_id`,`codigo`),
  KEY `centro_pai_id` (`centro_pai_id`),
  KEY `idx_nome` (`nome`),
  CONSTRAINT `centros_custo_ibfk_1` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `centros_custo_ibfk_2` FOREIGN KEY (`centro_pai_id`) REFERENCES `centros_custo` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `centros_custo`
--

LOCK TABLES `centros_custo` WRITE;
/*!40000 ALTER TABLE `centros_custo` DISABLE KEYS */;
INSERT INTO `centros_custo` VALUES (1,1,'CC001','Administração Geral','Centro de custo principal',NULL,1,50000.00,1,'2025-09-27 23:35:24'),(2,1,'CC001.01','TI','Tecnologia da Informação',1,2,20000.00,1,'2025-09-27 23:35:24'),(3,1,'CC001.02','Financeiro','Departamento Financeiro',1,2,15000.00,1,'2025-09-27 23:35:24'),(4,1,'CC001.03','RH','Recursos Humanos',1,2,10000.00,1,'2025-09-27 23:35:24'),(5,2,'CC002','Filial Rio','Centro de custo da filial',NULL,1,30000.00,1,'2025-09-27 23:35:24');
/*!40000 ALTER TABLE `centros_custo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contas_pagar`
--

DROP TABLE IF EXISTS `contas_pagar`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contas_pagar` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provisionamento_id` int NOT NULL,
  `empresa_id` int NOT NULL,
  `fornecedor_id` int NOT NULL,
  `valor_original` decimal(15,2) NOT NULL,
  `valor_pago` decimal(15,2) DEFAULT '0.00',
  `valor_pendente` decimal(15,2) GENERATED ALWAYS AS ((`valor_original` - `valor_pago`)) STORED,
  `data_vencimento` date NOT NULL,
  `data_pagamento` timestamp NULL DEFAULT NULL,
  `dados_bancarios` json DEFAULT NULL COMMENT 'Dados para pagamento',
  `codigo_barras` varchar(200) DEFAULT NULL COMMENT 'Para boletos',
  `linha_digitavel` varchar(200) DEFAULT NULL COMMENT 'Para boletos',
  `status` enum('PENDENTE','AGENDADO','PAGO','VENCIDO','CANCELADO') DEFAULT 'PENDENTE',
  `remessa_id` int DEFAULT NULL COMMENT 'ID da remessa CNAB',
  `numero_documento_banco` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `remessa_gerada` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `provisionamento_id` (`provisionamento_id`),
  KEY `empresa_id` (`empresa_id`),
  KEY `idx_status` (`status`),
  KEY `idx_vencimento` (`data_vencimento`),
  KEY `idx_fornecedor` (`fornecedor_id`),
  CONSTRAINT `contas_pagar_ibfk_1` FOREIGN KEY (`provisionamento_id`) REFERENCES `provisionamentos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `contas_pagar_ibfk_2` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `contas_pagar_ibfk_3` FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contas_pagar`
--

LOCK TABLES `contas_pagar` WRITE;
/*!40000 ALTER TABLE `contas_pagar` DISABLE KEYS */;
INSERT INTO `contas_pagar` (`id`, `provisionamento_id`, `empresa_id`, `fornecedor_id`, `valor_original`, `valor_pago`, `data_vencimento`, `data_pagamento`, `dados_bancarios`, `codigo_barras`, `linha_digitavel`, `status`, `remessa_id`, `numero_documento_banco`, `created_at`, `updated_at`, `remessa_gerada`) VALUES (1,200,1,1,5000.00,0.00,'2025-10-30',NULL,NULL,NULL,NULL,'VENCIDO',NULL,NULL,'2025-11-15 06:14:20','2025-11-15 06:14:20',0),(2,201,1,2,1200.50,0.00,'2025-11-05',NULL,NULL,NULL,NULL,'PENDENTE',NULL,NULL,'2025-11-15 06:14:20','2025-11-15 06:14:20',0);
/*!40000 ALTER TABLE `contas_pagar` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documento_anexos`
--

DROP TABLE IF EXISTS `documento_anexos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documento_anexos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `documento_fiscal_id` int NOT NULL,
  `anexo_id` int NOT NULL,
  `tipo_relacao` enum('PRINCIPAL','COMPLEMENTAR','COMPROVANTE','CONTRATO') NOT NULL,
  `observacoes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_documento_anexo` (`documento_fiscal_id`,`anexo_id`),
  KEY `idx_anexo` (`anexo_id`),
  KEY `idx_tipo_relacao` (`tipo_relacao`),
  CONSTRAINT `documento_anexos_ibfk_1` FOREIGN KEY (`documento_fiscal_id`) REFERENCES `documentos_fiscais` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `documento_anexos_ibfk_2` FOREIGN KEY (`anexo_id`) REFERENCES `anexos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documento_anexos`
--

LOCK TABLES `documento_anexos` WRITE;
/*!40000 ALTER TABLE `documento_anexos` DISABLE KEYS */;
INSERT INTO `documento_anexos` VALUES (1,11,4,'COMPLEMENTAR',NULL,'2025-11-14 03:48:46'),(2,5,5,'COMPLEMENTAR',NULL,'2025-11-14 21:58:00'),(4,102,7,'COMPLEMENTAR',NULL,'2025-11-15 16:51:04'),(5,4,8,'COMPLEMENTAR',NULL,'2025-11-15 22:23:04');
/*!40000 ALTER TABLE `documento_anexos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documento_centro_custo`
--

DROP TABLE IF EXISTS `documento_centro_custo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documento_centro_custo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `documento_fiscal_id` int NOT NULL,
  `centro_custo_id` int NOT NULL,
  `percentual_rateio` decimal(5,2) NOT NULL COMMENT 'Percentual do rateio',
  `valor_rateado` decimal(15,2) NOT NULL COMMENT 'Valor calculado do rateio',
  `observacoes` text,
  `usuario_criacao_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_documento_centro` (`documento_fiscal_id`,`centro_custo_id`),
  KEY `usuario_criacao_id` (`usuario_criacao_id`),
  KEY `idx_centro_custo` (`centro_custo_id`),
  CONSTRAINT `documento_centro_custo_ibfk_1` FOREIGN KEY (`documento_fiscal_id`) REFERENCES `documentos_fiscais` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `documento_centro_custo_ibfk_2` FOREIGN KEY (`centro_custo_id`) REFERENCES `centros_custo` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `documento_centro_custo_ibfk_3` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documento_centro_custo`
--

LOCK TABLES `documento_centro_custo` WRITE;
/*!40000 ALTER TABLE `documento_centro_custo` DISABLE KEYS */;
/*!40000 ALTER TABLE `documento_centro_custo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documentos_fiscais`
--

DROP TABLE IF EXISTS `documentos_fiscais`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documentos_fiscais` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int NOT NULL,
  `fornecedor_id` int NOT NULL,
  `tipo_documento` enum('NF-e','NFS-e','CT-e','NFC-e','BOLETO','CONTRATO','RECIBO','OUTROS') NOT NULL,
  `numero_documento` varchar(50) NOT NULL,
  `serie` varchar(10) DEFAULT NULL,
  `chave_acesso` varchar(44) DEFAULT NULL COMMENT 'Chave de acesso NFe/NFSe',
  `data_emissao` date NOT NULL,
  `data_recebimento` date DEFAULT (curdate()),
  `data_vencimento` date DEFAULT NULL,
  `data_competencia` date DEFAULT NULL COMMENT 'Mês de competência contábil',
  `valor_total` decimal(15,2) NOT NULL,
  `valor_impostos` decimal(15,2) DEFAULT '0.00',
  `valor_liquido` decimal(15,2) GENERATED ALWAYS AS ((`valor_total` - `valor_impostos`)) STORED,
  `descricao_servico_produto` text,
  `observacoes` text,
  `uf_origem` char(2) DEFAULT NULL,
  `uf_destino` char(2) DEFAULT NULL,
  `municipio_prestacao` varchar(100) DEFAULT NULL,
  `xml_content` longtext COMMENT 'Conteúdo do XML',
  `arquivo_anexo` varchar(500) DEFAULT NULL COMMENT 'Caminho do arquivo PDF/imagem',
  `hash_arquivo` varchar(64) DEFAULT NULL COMMENT 'Hash para integridade',
  `status_processamento` enum('PENDENTE','PROVISIONADO','PROCESSADO','REVISAR','CANCELADO') DEFAULT 'PENDENTE',
  `erro_processamento` text,
  `usuario_criacao_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chave_acesso` (`chave_acesso`),
  KEY `empresa_id` (`empresa_id`),
  KEY `usuario_criacao_id` (`usuario_criacao_id`),
  KEY `idx_tipo_documento` (`tipo_documento`),
  KEY `idx_data_emissao` (`data_emissao`),
  KEY `idx_data_vencimento` (`data_vencimento`),
  KEY `idx_fornecedor` (`fornecedor_id`),
  KEY `idx_chave_acesso` (`chave_acesso`),
  KEY `idx_status` (`status_processamento`),
  CONSTRAINT `documentos_fiscais_ibfk_1` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `documentos_fiscais_ibfk_2` FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `documentos_fiscais_ibfk_3` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=113 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documentos_fiscais`
--

LOCK TABLES `documentos_fiscais` WRITE;
/*!40000 ALTER TABLE `documentos_fiscais` DISABLE KEYS */;
INSERT INTO `documentos_fiscais` (`id`, `empresa_id`, `fornecedor_id`, `tipo_documento`, `numero_documento`, `serie`, `chave_acesso`, `data_emissao`, `data_recebimento`, `data_vencimento`, `data_competencia`, `valor_total`, `valor_impostos`, `descricao_servico_produto`, `observacoes`, `uf_origem`, `uf_destino`, `municipio_prestacao`, `xml_content`, `arquivo_anexo`, `hash_arquivo`, `status_processamento`, `erro_processamento`, `usuario_criacao_id`, `created_at`, `updated_at`) VALUES (1,1,1,'NF-e','000123','1','35250399888777000122550010001230001234567890','2025-01-15','2025-01-15','2025-02-15','2025-01-01',15750.50,1575.05,'Serviços de consultoria de TI',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PENDENTE',NULL,1,'2025-11-10 23:36:40','2025-11-14 20:10:37'),(2,1,1,'NFS-e','000456',NULL,'35250499888777000122550010004560004567890123','2025-01-20','2025-01-21','2025-02-20','2025-01-01',8900.00,890.00,'Manutenção de software',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PENDENTE',NULL,1,'2025-11-10 23:36:40','2025-11-14 20:10:37'),(3,1,1,'BOLETO','789456',NULL,NULL,'2025-01-25','2025-01-25','2025-02-25','2025-01-01',5200.00,0.00,'Aluguel do escritório',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PENDENTE',NULL,2,'2025-11-10 23:36:40','2025-11-14 20:10:37'),(4,1,1,'NF-e','000789','1','35250599888777000122550010007890007890123456','2025-02-01','2025-02-02','2025-03-01','2025-02-01',12300.00,1230.00,'Equipamentos de informática',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PROVISIONADO',NULL,2,'2025-11-10 23:36:40','2025-11-18 20:40:19'),(5,1,1,'CONTRATO','CONT-2025-01',NULL,NULL,'2025-02-05','2025-02-05','2025-03-05','2025-02-01',25000.00,0.00,'Contrato de prestação de serviços',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PROVISIONADO',NULL,3,'2025-11-10 23:36:40','2025-11-18 20:40:05'),(6,1,1,'NFC-e','001234','1','35250699888777000122650010012340012345678901','2025-02-10','2025-02-10','2025-03-10','2025-02-01',450.75,45.08,'Material de escritório',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PROVISIONADO',NULL,3,'2025-11-10 23:36:40','2025-11-15 22:23:54'),(7,1,1,'RECIBO','REC-2025-02',NULL,NULL,'2025-02-15','2025-02-15','2025-03-15','2025-02-01',3500.00,0.00,'Serviços autônomos',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'REVISAR',NULL,4,'2025-11-10 23:36:40','2025-11-18 23:04:22'),(8,1,1,'NF-e','001001','2','35250799888777000122550020010010010101234567','2025-02-20','2025-02-21','2025-03-20','2025-02-01',18900.00,1890.00,'Licenças de software',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'REVISAR',NULL,4,'2025-11-10 23:36:40','2025-11-15 03:50:55'),(9,1,1,'CT-e','000111','1','35250899888777000122570010001110001112345678','2025-02-25','2025-02-25','2025-03-25','2025-02-01',1200.00,120.00,'Frete de equipamentos',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'REVISAR',NULL,5,'2025-11-10 23:36:40','2025-11-15 22:24:26'),(10,1,1,'OUTROS','OUT-2025-03',NULL,NULL,'2025-03-01','2025-03-01','2025-04-01','2025-03-01',7800.00,0.00,'Outros serviços administrativos',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'REVISAR',NULL,5,'2025-11-10 23:36:40','2025-11-14 21:15:40'),(11,1,3,'BOLETO','590000','1','03123828031028312083','2025-10-01','0225-10-01','2025-10-30','2025-10-20',500000.00,50.00,'Produto de teste','teste','DF','DF','DF',NULL,NULL,NULL,'REVISAR',NULL,1,'2025-11-11 22:55:36','2025-11-15 01:56:00'),(12,1,2,'CONTRATO','50607080','5','66667777727272717','2025-11-14','2025-11-15','2025-11-30','2025-12-30',90000.00,400.00,'Sim','teste','DF','RR','Brasilia',NULL,NULL,NULL,'REVISAR',NULL,1,'2025-11-14 22:07:12','2025-11-15 03:05:38'),(13,1,2,'RECIBO','88999494949','39','899393938300039','2025-11-12','2025-11-15','2025-12-31','2026-01-05',7000.00,7000.00,'bens','cadastromanual','RO','TO','Palmas',NULL,NULL,NULL,'PENDENTE',NULL,1,'2025-11-15 02:55:42','2025-11-15 02:57:07'),(100,1,1,'NF-e','1001',NULL,NULL,'2025-10-01','2025-11-15','2025-10-30',NULL,5000.00,0.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PROVISIONADO',NULL,1,'2025-11-15 06:14:05','2025-11-18 20:40:36'),(101,1,2,'BOLETO','1002',NULL,NULL,'2025-10-05','2025-11-15','2025-11-05',NULL,1200.50,0.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'REVISAR',NULL,1,'2025-11-15 06:14:05','2025-11-15 16:55:15'),(102,1,1,'CONTRATO','1003',NULL,NULL,'2025-10-10','2025-11-15','2025-11-10',NULL,7500.00,0.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PROVISIONADO',NULL,1,'2025-11-15 06:14:05','2025-11-15 23:19:12'),(103,1,2,'NFS-e','1004',NULL,NULL,'2025-10-12','2025-11-15','2025-11-12',NULL,300.00,0.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PENDENTE',NULL,1,'2025-11-15 06:14:05','2025-11-15 06:14:05'),(104,1,1,'RECIBO','1005',NULL,NULL,'2025-10-15','2025-11-15','2025-11-15',NULL,850.75,0.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PROVISIONADO',NULL,1,'2025-11-15 06:14:05','2025-11-18 20:39:29'),(106,1,5,'NF-e','12605','1','31250941722210000251550010000126051000118112','2025-09-09','2025-11-15',NULL,NULL,159.90,84.86,NULL,NULL,NULL,NULL,NULL,'<?xml version=\"1.0\" encoding=\"UTF-8\"?><nfeProc versao=\"4.00\" xmlns=\"http://www.portalfiscal.inf.br/nfe\"><NFe xmlns=\"http://www.portalfiscal.inf.br/nfe\"><infNFe Id=\"NFe31250941722210000251550010000126051000118112\" versao=\"4.00\"><ide><cUF>31</cUF><cNF>00011811</cNF><natOp>VENDA</natOp><mod>55</mod><serie>1</serie><nNF>12605</nNF><dhEmi>2025-09-09T20:55:19-03:00</dhEmi><dhSaiEnt>2025-09-09T20:55:19-03:00</dhSaiEnt><tpNF>1</tpNF><idDest>2</idDest><cMunFG>3104205</cMunFG><tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>2</cDV><tpAmb>1</tpAmb><finNFe>1</finNFe><indFinal>1</indFinal><indPres>2</indPres><indIntermed>0</indIntermed><procEmi>0</procEmi><verProc>Notazz v2.0.0</verProc></ide><emit><CNPJ>41722210000251</CNPJ><xNome>WL BLUE DIGITAL LTDA</xNome><xFant>WL BLUE DIGITAL LTDA FILIAL</xFant><enderEmit><xLgr>AV PROGRESSO</xLgr><nro>1387</nro><xCpl>ANDAR 2 SALA C</xCpl><xBairro>SAO BENTO</xBairro><cMun>3104205</cMun><xMun>ARCOS</xMun><UF>MG</UF><CEP>35598400</CEP><cPais>1058</cPais><xPais>Brasil</xPais><fone>0000000000</fone></enderEmit><IE>52105050093</IE><CRT>3</CRT></emit><dest><CPF>06249014160</CPF><xNome>Ana Beatriz Goncalves Bastos</xNome><enderDest><xLgr>Quadra QS 27 Conjunto 4</xLgr><nro>Condominio 38</nro><xCpl>Bloco A Apto 201</xCpl><xBairro>Riacho Fundo II</xBairro><cMun>5300108</cMun><xMun>Brasilia</xMun><UF>DF</UF><CEP>71884810</CEP><cPais>1058</cPais><xPais>Brasil</xPais><fone>61981340919</fone></enderDest><indIEDest>9</indIEDest><email>anatechbolinha@gmail.com</email></dest><det nItem=\"1\"><prod><cProd>hmWxo5BJ2w</cProd><cEAN>SEM GTIN</cEAN><xProd>Creme Adeus Clareador de Manchas 100g   Creme Adeus Clareador de Manchas 100g</xProd><NCM>33049910</NCM><CFOP>6108</CFOP><uCom>UN</uCom><qCom>1.0000</qCom><vUnCom>159.9000</vUnCom><vProd>159.90</vProd><cEANTrib>SEM GTIN</cEANTrib><uTrib>UN</uTrib><qTrib>1.0000</qTrib><vUnTrib>159.9000</vUnTrib><indTot>1</indTot></prod><imposto><vTotTrib>84.86</vTotTrib><ICMS><ICMS00><orig>0</orig><CST>00</CST><modBC>3</modBC><vBC>159.90</vBC><pICMS>7.00</pICMS><vICMS>11.19</vICMS></ICMS00></ICMS><PIS><PISAliq><CST>01</CST><vBC>159.90</vBC><pPIS>0.65</pPIS><vPIS>1.04</vPIS></PISAliq></PIS><COFINS><COFINSAliq><CST>01</CST><vBC>159.90</vBC><pCOFINS>3.00</pCOFINS><vCOFINS>4.80</vCOFINS></COFINSAliq></COFINS><ICMSUFDest><vBCUFDest>159.90</vBCUFDest><vBCFCPUFDest>159.90</vBCFCPUFDest><pFCPUFDest>0.00</pFCPUFDest><pICMSUFDest>20.00</pICMSUFDest><pICMSInter>7.00</pICMSInter><pICMSInterPart>100.00</pICMSInterPart><vFCPUFDest>0.00</vFCPUFDest><vICMSUFDest>20.79</vICMSUFDest><vICMSUFRemet>0.00</vICMSUFRemet></ICMSUFDest></imposto></det><total><ICMSTot><vBC>159.90</vBC><vICMS>11.19</vICMS><vICMSDeson>0.00</vICMSDeson><vFCPUFDest>0.00</vFCPUFDest><vICMSUFDest>20.79</vICMSUFDest><vICMSUFRemet>0.00</vICMSUFRemet><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>159.90</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>1.04</vPIS><vCOFINS>4.80</vCOFINS><vOutro>0.00</vOutro><vNF>159.90</vNF><vTotTrib>84.86</vTotTrib></ICMSTot></total><transp><modFrete>0</modFrete></transp><pag><detPag><indPag>0</indPag><tPag>01</tPag><vPag>159.90</vPag></detPag></pag><infAdic><infAdFisco>Somatorio do Grupo de Tributacao do ICMS para a UF de destino vICMSUFDest = 20.79 pICMSUFDest = 20.00 vICMSUFRemet = 0.00 vFCPUFDest = 0.00</infAdFisco><infCpl>-</infCpl></infAdic><infRespTec><CNPJ>19600655000129</CNPJ><xContato>NOTAZZ GESTAO FISCAL E LOGISTICA LTDA</xContato><email>suporte@notazz.com</email><fone>37999817657</fone></infRespTec></infNFe><Signature xmlns=\"http://www.w3.org/2000/09/xmldsig#\"><SignedInfo><CanonicalizationMethod Algorithm=\"http://www.w3.org/TR/2001/REC-xml-c14n-20010315\"/><SignatureMethod Algorithm=\"http://www.w3.org/2000/09/xmldsig#rsa-sha1\"/><Reference URI=\"#NFe31250941722210000251550010000126051000118112\"><Transforms><Transform Algorithm=\"http://www.w3.org/2000/09/xmldsig#enveloped-signature\"/><Transform Algorithm=\"http://www.w3.org/TR/2001/REC-xml-c14n-20010315\"/></Transforms><DigestMethod Algorithm=\"http://www.w3.org/2000/09/xmldsig#sha1\"/><DigestValue>bjvB7glq+E60Zr8KwtgmW5JLInY=</DigestValue></Reference></SignedInfo><SignatureValue>dJh0SqiKDmRINS0lBUd7FydtTk7Hb2XsSljzN8wpwDdX+TITl+C7ToBKG0pbPsao0x1afettDCj3jW/13Z64Mavb0BYiersE7nkF3kLYq2m2KhOdD9TgWbXzgF+YHOCR2RkLrjR7YjNCa3o+vhcQ5G6CqgitzTA5GTP8BrRpckIGfertVK8B2tcEOP8GWxZUCDLgHTN+czp0RPgcoUzzG/6jl1T6gxTcl4mHdcVmRWyyRj7KLqhfkCa8Q4DKylscpo4GnKZ66lzmmGN2x6z92IqMYBw0YPKNOe6k2a9Rp7xS40u6MDNLqLA1+cpNgAGhqJok5GL99Wxz6XWXx4Uvew==</SignatureValue><KeyInfo><X509Data><X509Certificate>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</X509Certificate></X509Data></KeyInfo></Signature></NFe><protNFe versao=\"4.00\"><infProt><tpAmb>1</tpAmb><verAplic>W-3.3.5</verAplic><chNFe>31250941722210000251550010000126051000118112</chNFe><dhRecbto>2025-09-09T20:55:19-03:00</dhRecbto><nProt>131256917531787</nProt><digVal>bjvB7glq+E60Zr8KwtgmW5JLInY=</digVal><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></nfeProc>',NULL,NULL,'PENDENTE',NULL,1,'2025-11-15 17:08:16','2025-11-18 23:06:08'),(112,1,6,'NFS-e','76574538',NULL,'DQVCPJBD','2025-08-21','2025-11-19',NULL,NULL,27.99,0.55,NULL,NULL,NULL,NULL,NULL,'<?xml version=\"1.0\" encoding=\"UTF-8\"?><RetornoConsulta xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" ><Cabecalho Versao=\"1\" xmlns=\"\"><Sucesso>true</Sucesso></Cabecalho><NFe xmlns=\"\"><Assinatura>dNBOFTChNC6ue3qvzbLR795KrTpdLhdRiMSbADzmAezKZAzjVZi1IqtGg0pUrck6EsHZHgCpMorxAdselNvkN4VdwqHiBTGcmVNqwExPu49M6UxCUcNsLiS1AjU0txCz3I5jpX57YtnCWdDhgPuOkb+CF3sMEf5mOtJETkWoNGNrX+B82+5HPQ2ETsRjiV5ht7sQ1ezX9I5o3TfCIOmy06fLjoslPjXIKTi7DINve7lWuZ0I5qytV/RNgOcyEtbl/ily3I4VI7bYoTAA0N3JLQ2GAqZwwJxaEbnuurKplbfvgsy3OONM76r1t8mFHY/we9/koqiqbhe7OnBiDSvklA==</Assinatura><ChaveNFe><InscricaoPrestador>22129014</InscricaoPrestador><NumeroNFe>76574538</NumeroNFe><CodigoVerificacao>DQVCPJBD</CodigoVerificacao></ChaveNFe><DataEmissaoNFe>2025-08-21T22:44:36</DataEmissaoNFe><NumeroLote>1545211129</NumeroLote><ChaveRPS><InscricaoPrestador>22129014</InscricaoPrestador><SerieRPS>A</SerieRPS><NumeroRPS>74161355</NumeroRPS></ChaveRPS><TipoRPS>RPS</TipoRPS><DataEmissaoRPS>2025-08-21</DataEmissaoRPS><DataFatoGeradorNFe>2025-08-21T00:00:00</DataFatoGeradorNFe><CPFCNPJPrestador><CNPJ>73042962000187</CNPJ></CPFCNPJPrestador><RazaoSocialPrestador>THE WALT DISNEY COMPANY (BRASIL) LTDA</RazaoSocialPrestador><EnderecoPrestador><TipoLogradouro>AV</TipoLogradouro><Logradouro>DAS NACOES UNIDAS 12551/12559</Logradouro><NumeroEndereco>12551</NumeroEndereco><ComplementoEndereco>12.555 E 12.559     AN</ComplementoEndereco><Bairro>BROOKLIN PAULISTA</Bairro><Cidade>3550308</Cidade><UF>SP</UF><CEP>4578903</CEP></EnderecoPrestador><StatusNFe>N</StatusNFe><TributacaoNFe>T</TributacaoNFe><OpcaoSimples>0</OpcaoSimples><ValorServicos>27.99</ValorServicos><CodigoServico>2966</CodigoServico><AliquotaServicos>0.02</AliquotaServicos><ValorISS>0.55</ValorISS><ValorCredito>0</ValorCredito><ISSRetido>false</ISSRetido><CPFCNPJTomador><CPF>06249014160</CPF></CPFCNPJTomador><RazaoSocialTomador /><Discriminacao>TWDC - (Disponibilização, sem cessão definitiva, de conteúdos de vídeo por meio da internet).\n\n\n\nTotal aproximado dos tributos:\n\nISS 2.00%: R$ 0.56\n\nPIS 1.65%: R$ 0.46\n\nCOFINS 7.60%: R$ 2.13\n\nFonte: IBPT-Instituto Brasileiro de Planejamento Tributário.</Discriminacao><FonteCargaTributaria /></NFe></RetornoConsulta>',NULL,NULL,'PENDENTE',NULL,1,'2025-11-19 17:28:53','2025-11-19 17:28:53');
/*!40000 ALTER TABLE `documentos_fiscais` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empresa_contatos`
--

DROP TABLE IF EXISTS `empresa_contatos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empresa_contatos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int NOT NULL,
  `tipo_contato` enum('EMAIL','TELEFONE','FAX','WHATSAPP') NOT NULL,
  `valor_contato` varchar(255) NOT NULL,
  `principal` tinyint(1) DEFAULT '0',
  `observacoes` text,
  PRIMARY KEY (`id`),
  KEY `idx_empresa_tipo` (`empresa_id`,`tipo_contato`),
  CONSTRAINT `empresa_contatos_ibfk_1` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empresa_contatos`
--

LOCK TABLES `empresa_contatos` WRITE;
/*!40000 ALTER TABLE `empresa_contatos` DISABLE KEYS */;
INSERT INTO `empresa_contatos` VALUES (1,1,'EMAIL','contato@techcorp.com.br',1,'Email principal'),(2,1,'EMAIL','financeiro@techcorp.com.br',0,'Email do financeiro'),(3,1,'TELEFONE','1133334444',1,'Telefone principal'),(4,1,'WHATSAPP','11999887766',0,'WhatsApp do João'),(5,2,'EMAIL','rio@techcorp.com.br',1,'Email filial Rio'),(6,2,'TELEFONE','2133334444',1,'Telefone filial Rio');
/*!40000 ALTER TABLE `empresa_contatos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empresa_fornecedor`
--

DROP TABLE IF EXISTS `empresa_fornecedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empresa_fornecedor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int NOT NULL,
  `fornecedor_id` int NOT NULL,
  `status_relacionamento` enum('ATIVO','INATIVO','PENDENTE') DEFAULT 'ATIVO',
  `data_inicio_contrato` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_associacao_unica` (`empresa_id`,`fornecedor_id`),
  KEY `fornecedor_id` (`fornecedor_id`),
  CONSTRAINT `empresa_fornecedor_ibfk_1` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `empresa_fornecedor_ibfk_2` FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empresa_fornecedor`
--

LOCK TABLES `empresa_fornecedor` WRITE;
/*!40000 ALTER TABLE `empresa_fornecedor` DISABLE KEYS */;
/*!40000 ALTER TABLE `empresa_fornecedor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empresas`
--

DROP TABLE IF EXISTS `empresas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empresas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cnpj` varchar(14) NOT NULL COMMENT 'CNPJ sem formatação',
  `razao_social` varchar(255) NOT NULL,
  `nome_fantasia` varchar(255) DEFAULT NULL,
  `inscricao_estadual` varchar(20) DEFAULT NULL,
  `inscricao_municipal` varchar(20) DEFAULT NULL,
  `endereco_logradouro` varchar(255) DEFAULT NULL,
  `endereco_numero` varchar(10) DEFAULT NULL,
  `endereco_complemento` varchar(100) DEFAULT NULL,
  `endereco_bairro` varchar(100) DEFAULT NULL,
  `endereco_cidade` varchar(100) DEFAULT NULL,
  `endereco_uf` char(2) DEFAULT NULL,
  `endereco_cep` char(8) DEFAULT NULL,
  `email_principal` varchar(255) DEFAULT NULL,
  `telefone_principal` varchar(20) DEFAULT NULL,
  `empresa_matriz_id` int DEFAULT NULL,
  `ativa` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cnpj` (`cnpj`),
  KEY `idx_cnpj` (`cnpj`),
  KEY `idx_razao_social` (`razao_social`),
  KEY `idx_matriz` (`empresa_matriz_id`),
  CONSTRAINT `empresas_ibfk_1` FOREIGN KEY (`empresa_matriz_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empresas`
--

LOCK TABLES `empresas` WRITE;
/*!40000 ALTER TABLE `empresas` DISABLE KEYS */;
INSERT INTO `empresas` VALUES (1,'11222333000144','TechCorp Brasil LTDA','TechCorp','123456789','','Av. Paulista','1000','','Bela Vista','São Paulo','SP','01310100','contato@techcorp.com.br','1133334444',NULL,1,'2025-09-27 23:24:00','2025-11-18 20:44:28'),(2,'11222333000225','TechCorp Filial Rio LTDA','TechCorp Rio','987654321',NULL,'Av. Copacabana','500',NULL,'Copacabana','Rio de Janeiro','RJ','22070001','rio@techcorp.com.br','2133334444',1,1,'2025-09-27 23:24:00','2025-09-27 23:24:00'),(3,'00.331.801/000','Catolica','UCB','90000098','90000099','','38','Apto','Taguatinga','Brasilia','DF','71884810','contato@ucb.com','(61)981340919',NULL,1,'2025-11-15 05:09:47','2025-11-15 05:09:47');
/*!40000 ALTER TABLE `empresas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fornecedores`
--

DROP TABLE IF EXISTS `fornecedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fornecedores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int NOT NULL,
  `cnpj_cpf` varchar(14) NOT NULL,
  `tipo_pessoa` enum('PF','PJ') NOT NULL,
  `razao_social` varchar(255) NOT NULL,
  `nome_fantasia` varchar(255) DEFAULT NULL,
  `endereco_logradouro` varchar(255) DEFAULT NULL,
  `endereco_numero` varchar(10) DEFAULT NULL,
  `endereco_complemento` varchar(100) DEFAULT NULL,
  `endereco_bairro` varchar(100) DEFAULT NULL,
  `endereco_cidade` varchar(100) DEFAULT NULL,
  `endereco_uf` char(2) DEFAULT NULL,
  `endereco_cep` char(8) DEFAULT NULL,
  `dados_bancarios` json DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefone` varchar(20) DEFAULT NULL,
  `ativo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cnpj_cpf` (`cnpj_cpf`),
  UNIQUE KEY `uk_fornecedor_empresa` (`empresa_id`,`cnpj_cpf`),
  KEY `idx_cnpj_cpf` (`cnpj_cpf`),
  KEY `idx_razao_social` (`razao_social`),
  CONSTRAINT `fk_fornecedores_empresas` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fornecedores`
--

LOCK TABLES `fornecedores` WRITE;
/*!40000 ALTER TABLE `fornecedores` DISABLE KEYS */;
INSERT INTO `fornecedores` VALUES (1,0,'99888777000122','PJ','Fornecedor de TI LTDA','TechSupply','Rua das Flores','123',NULL,NULL,'São Paulo','SP','01234567','{\"banco\": \"001\", \"conta\": \"567890\", \"agencia\": \"1234\"}','contato@techsupply.com','1144445555',1,'2025-09-27 23:33:11','2025-09-27 23:33:11'),(2,0,'88777666000133','PJ','Serviços Contábeis ABC','Contábil ABC','Av. Brasil','456',NULL,NULL,'Rio de Janeiro','RJ','20000000','{\"banco\": \"237\", \"conta\": \"123456\", \"agencia\": \"5678\"}','contato@contabilabc.com','2144445556',1,'2025-09-27 23:33:11','2025-09-27 23:33:11'),(3,0,'12345678901','PF','José Consultor',NULL,'Rua Consultoria','789',NULL,NULL,'Belo Horizonte','MG','30000000','{\"banco\": \"104\", \"conta\": \"345678\", \"agencia\": \"9012\"}','jose@consultor.com','3144445557',1,'2025-09-27 23:33:11','2025-09-27 23:33:11'),(4,1,'33014556000196','PJ','VentiladoresSA','SynAck','Av. Paulista','1000','4 andar ','Bela Vista','São Paulo','SP','01310100',NULL,'sa@contato.com','6130602539',1,'2025-11-15 06:04:49','2025-11-15 06:04:49'),(5,1,'41722210000251','PJ','WL BLUE DIGITAL LTDA',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2025-11-15 07:07:28','2025-11-15 07:07:28'),(6,1,'73042962000187','PJ','THE WALT DISNEY COMPANY (BRASIL) LTDA',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2025-11-15 17:56:42','2025-11-15 17:56:42');
/*!40000 ALTER TABLE `fornecedores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lancamentos_contabeis`
--

DROP TABLE IF EXISTS `lancamentos_contabeis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lancamentos_contabeis` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provisionamento_id` int NOT NULL COMMENT 'Relacionamento 1:N',
  `empresa_id` int NOT NULL,
  `conta_contabil` varchar(20) NOT NULL,
  `centro_custo_id` int DEFAULT NULL,
  `tipo_lancamento` enum('DEBITO','CREDITO') NOT NULL,
  `valor` decimal(15,2) NOT NULL,
  `historico` varchar(500) NOT NULL,
  `data_lancamento` date NOT NULL,
  `usuario_lancamento_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `empresa_id` (`empresa_id`),
  KEY `usuario_lancamento_id` (`usuario_lancamento_id`),
  KEY `idx_provisionamento` (`provisionamento_id`),
  KEY `idx_conta_contabil` (`conta_contabil`),
  KEY `idx_data_lancamento` (`data_lancamento`),
  KEY `idx_centro_custo` (`centro_custo_id`),
  CONSTRAINT `lancamentos_contabeis_ibfk_1` FOREIGN KEY (`provisionamento_id`) REFERENCES `provisionamentos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `lancamentos_contabeis_ibfk_2` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `lancamentos_contabeis_ibfk_3` FOREIGN KEY (`centro_custo_id`) REFERENCES `centros_custo` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `lancamentos_contabeis_ibfk_4` FOREIGN KEY (`usuario_lancamento_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lancamentos_contabeis`
--

LOCK TABLES `lancamentos_contabeis` WRITE;
/*!40000 ALTER TABLE `lancamentos_contabeis` DISABLE KEYS */;
/*!40000 ALTER TABLE `lancamentos_contabeis` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projetos`
--

DROP TABLE IF EXISTS `projetos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projetos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `descricao` text,
  `data_inicio` date DEFAULT NULL,
  `data_fim_prevista` date DEFAULT NULL,
  `data_fim_real` date DEFAULT NULL,
  `orcamento_total` decimal(15,2) DEFAULT NULL,
  `valor_gasto` decimal(15,2) DEFAULT '0.00',
  `responsavel_id` int DEFAULT NULL,
  `status` enum('PLANEJAMENTO','ATIVO','PAUSADO','CONCLUIDO','CANCELADO') DEFAULT 'PLANEJAMENTO',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_codigo_empresa` (`empresa_id`,`codigo`),
  KEY `idx_status` (`status`),
  KEY `idx_responsavel` (`responsavel_id`),
  CONSTRAINT `projetos_ibfk_1` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `projetos_ibfk_2` FOREIGN KEY (`responsavel_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projetos`
--

LOCK TABLES `projetos` WRITE;
/*!40000 ALTER TABLE `projetos` DISABLE KEYS */;
INSERT INTO `projetos` VALUES (4,1,'PROJ001','Modernização Sistema ERP','Projeto de atualização do sistema ERP','2024-01-15','2024-12-31',NULL,500000.00,0.00,1,'ATIVO','2025-09-27 23:36:39'),(5,1,'PROJ002','Expansão Filial Sul','Abertura de nova filial no Sul','2024-03-01','2024-08-31',NULL,300000.00,0.00,2,'ATIVO','2025-09-27 23:36:39'),(6,2,'PROJ003','Certificação ISO','Processo de certificação ISO 9001','2024-02-01','2024-10-31',NULL,150000.00,0.00,3,'PLANEJAMENTO','2025-09-27 23:36:39');
/*!40000 ALTER TABLE `projetos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `provisionamento_projetos`
--

DROP TABLE IF EXISTS `provisionamento_projetos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `provisionamento_projetos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provisionamento_id` int NOT NULL,
  `projeto_id` int NOT NULL,
  `percentual_alocacao` decimal(5,2) NOT NULL,
  `valor_alocado` decimal(15,2) NOT NULL,
  `observacoes` text,
  `usuario_criacao_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_provisionamento_projeto` (`provisionamento_id`,`projeto_id`),
  KEY `usuario_criacao_id` (`usuario_criacao_id`),
  KEY `idx_projeto` (`projeto_id`),
  CONSTRAINT `provisionamento_projetos_ibfk_1` FOREIGN KEY (`provisionamento_id`) REFERENCES `provisionamentos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `provisionamento_projetos_ibfk_2` FOREIGN KEY (`projeto_id`) REFERENCES `projetos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `provisionamento_projetos_ibfk_3` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provisionamento_projetos`
--

LOCK TABLES `provisionamento_projetos` WRITE;
/*!40000 ALTER TABLE `provisionamento_projetos` DISABLE KEYS */;
/*!40000 ALTER TABLE `provisionamento_projetos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `provisionamentos`
--

DROP TABLE IF EXISTS `provisionamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `provisionamentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `documento_fiscal_id` int NOT NULL,
  `empresa_id` int NOT NULL,
  `fornecedor_id` int NOT NULL,
  `valor_provisionado` decimal(15,2) NOT NULL,
  `valor_impostos_retidos` decimal(15,2) DEFAULT '0.00',
  `valor_liquido` decimal(15,2) GENERATED ALWAYS AS ((`valor_provisionado` - `valor_impostos_retidos`)) STORED,
  `data_competencia` date NOT NULL,
  `categoria_contabil_id` int NOT NULL,
  `status` enum('RASCUNHO','PENDENTE_APROVACAO','APROVADO','REJEITADO','PAGO','CANCELADO') DEFAULT 'RASCUNHO',
  `data_aprovacao` timestamp NULL DEFAULT NULL,
  `usuario_aprovacao_id` int DEFAULT NULL,
  `observacoes_aprovacao` text,
  `forma_pagamento` enum('BOLETO','TRANSFERENCIA','PIX','CHEQUE','DINHEIRO','CARTAO') DEFAULT 'TRANSFERENCIA',
  `usuario_criacao_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `documento_fiscal_id` (`documento_fiscal_id`),
  KEY `empresa_id` (`empresa_id`),
  KEY `usuario_criacao_id` (`usuario_criacao_id`),
  KEY `usuario_aprovacao_id` (`usuario_aprovacao_id`),
  KEY `idx_status` (`status`),
  KEY `idx_data_competencia` (`data_competencia`),
  KEY `idx_fornecedor` (`fornecedor_id`),
  KEY `idx_categoria` (`categoria_contabil_id`),
  CONSTRAINT `provisionamentos_ibfk_1` FOREIGN KEY (`documento_fiscal_id`) REFERENCES `documentos_fiscais` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `provisionamentos_ibfk_2` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `provisionamentos_ibfk_3` FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `provisionamentos_ibfk_4` FOREIGN KEY (`categoria_contabil_id`) REFERENCES `categorias_contabeis` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `provisionamentos_ibfk_5` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `provisionamentos_ibfk_6` FOREIGN KEY (`usuario_aprovacao_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=202 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provisionamentos`
--

LOCK TABLES `provisionamentos` WRITE;
/*!40000 ALTER TABLE `provisionamentos` DISABLE KEYS */;
INSERT INTO `provisionamentos` (`id`, `documento_fiscal_id`, `empresa_id`, `fornecedor_id`, `valor_provisionado`, `valor_impostos_retidos`, `data_competencia`, `categoria_contabil_id`, `status`, `data_aprovacao`, `usuario_aprovacao_id`, `observacoes_aprovacao`, `forma_pagamento`, `usuario_criacao_id`, `created_at`, `updated_at`) VALUES (200,100,1,1,5000.00,0.00,'2025-10-01',1,'APROVADO',NULL,NULL,NULL,'TRANSFERENCIA',1,'2025-11-15 06:14:20','2025-11-15 06:14:20'),(201,101,1,2,1200.50,0.00,'2025-10-05',1,'APROVADO',NULL,NULL,NULL,'TRANSFERENCIA',1,'2025-11-15 06:14:20','2025-11-15 06:14:20');
/*!40000 ALTER TABLE `provisionamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `remessas_cnab`
--

DROP TABLE IF EXISTS `remessas_cnab`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `remessas_cnab` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int NOT NULL,
  `nome_arquivo` varchar(255) NOT NULL,
  `caminho_arquivo` varchar(500) NOT NULL,
  `numero_remessa` int NOT NULL,
  `data_geracao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `quantidade_registros` int DEFAULT '0',
  `valor_total` decimal(15,2) DEFAULT '0.00',
  `status_remessa` enum('GERADA','ENVIADA','PROCESSADA','ERRO') DEFAULT 'GERADA',
  `data_envio` timestamp NULL DEFAULT NULL,
  `usuario_geracao_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `usuario_geracao_id` (`usuario_geracao_id`),
  KEY `idx_empresa` (`empresa_id`),
  KEY `idx_status` (`status_remessa`),
  KEY `idx_data_geracao` (`data_geracao`),
  CONSTRAINT `remessas_cnab_ibfk_1` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `remessas_cnab_ibfk_2` FOREIGN KEY (`usuario_geracao_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `remessas_cnab`
--

LOCK TABLES `remessas_cnab` WRITE;
/*!40000 ALTER TABLE `remessas_cnab` DISABLE KEYS */;
/*!40000 ALTER TABLE `remessas_cnab` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `retornos_cnab`
--

DROP TABLE IF EXISTS `retornos_cnab`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `retornos_cnab` (
  `id` int NOT NULL AUTO_INCREMENT,
  `remessa_id` int NOT NULL,
  `nome_arquivo_retorno` varchar(255) NOT NULL,
  `caminho_arquivo` varchar(500) NOT NULL,
  `data_retorno` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `quantidade_registros` int DEFAULT '0',
  `processado` tinyint(1) DEFAULT '0',
  `data_processamento` timestamp NULL DEFAULT NULL,
  `usuario_processamento_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `usuario_processamento_id` (`usuario_processamento_id`),
  KEY `idx_remessa` (`remessa_id`),
  KEY `idx_data_retorno` (`data_retorno`),
  CONSTRAINT `retornos_cnab_ibfk_1` FOREIGN KEY (`remessa_id`) REFERENCES `remessas_cnab` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `retornos_cnab_ibfk_2` FOREIGN KEY (`usuario_processamento_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `retornos_cnab`
--

LOCK TABLES `retornos_cnab` WRITE;
/*!40000 ALTER TABLE `retornos_cnab` DISABLE KEYS */;
/*!40000 ALTER TABLE `retornos_cnab` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(50) NOT NULL,
  `descricao` text,
  `permissoes_base` json DEFAULT NULL,
  `nivel_acesso` tinyint DEFAULT '1' COMMENT 'Hierarquia 1-5',
  `ativo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'ASSISTENTE','Assistente Administrativo','{\"menus\": [\"dashboard\", \"documentos_fiscais\"]}',1,1,'2025-11-10 23:34:27'),(2,'ANALISTA_FISCAL','Analista Fiscal','{\"menus\": [\"dashboard\", \"documentos_fiscais\", \"provisionamentos\", \"projetos\"]}',2,1,'2025-11-10 23:34:27'),(3,'SUPERVISOR_CONTABIL','Supervisor Contábil','{\"menus\": [\"dashboard\", \"documentos_fiscais\", \"provisionamentos\", \"projetos\", \"centros_custo\", \"remessas_cnab\", \"relatorios\"]}',3,1,'2025-11-10 23:34:27'),(4,'GERENTE_FINANCEIRO','Gerente Financeiro','{\"menus\": [\"dashboard\", \"documentos_fiscais\", \"provisionamentos\", \"projetos\", \"centros_custo\", \"remessas_cnab\", \"relatorios\", \"cadastros_base\"]}',4,1,'2025-11-10 23:34:27'),(5,'ADMIN','Administrador do Sistema','{\"menus\": [\"dashboard\", \"documentos_fiscais\", \"provisionamentos\", \"projetos\", \"centros_custo\", \"remessas_cnab\", \"relatorios\", \"cadastros_base\", \"usuarios\"]}',5,1,'2025-11-10 23:34:27');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `session_id` varchar(128) NOT NULL,
  `user_id` int NOT NULL,
  `empresa_id` int NOT NULL,
  `login_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_activity` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `is_active` tinyint(1) DEFAULT '1',
  `logout_time` timestamp NULL DEFAULT NULL,
  `logout_type` enum('MANUAL','TIMEOUT','FORCED') DEFAULT NULL,
  PRIMARY KEY (`session_id`),
  KEY `idx_user_active` (`user_id`,`is_active`),
  KEY `idx_empresa` (`empresa_id`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_sessions_ibfk_2` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sessions`
--

LOCK TABLES `user_sessions` WRITE;
/*!40000 ALTER TABLE `user_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int NOT NULL,
  `role_id` int NOT NULL,
  `email` varchar(255) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `cpf` varchar(11) DEFAULT NULL,
  `telefone` varchar(20) DEFAULT NULL,
  `senha_hash` varchar(255) NOT NULL,
  `departamento` varchar(100) DEFAULT NULL,
  `ativo` tinyint(1) DEFAULT '1',
  `ultimo_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `cpf` (`cpf`),
  KEY `role_id` (`role_id`),
  KEY `idx_email` (`email`),
  KEY `idx_empresa` (`empresa_id`),
  KEY `idx_cpf` (`cpf`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `usuarios_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,1,1,'assistente@bare.com','Carlos Silva',NULL,NULL,'123','Administrativo',1,NULL,'2025-11-10 23:35:19','2025-11-10 23:35:19'),(2,1,2,'analista@bare.com','Mariana Lopes',NULL,NULL,'$2b$12$gY9xSLzoseOZyAxgHaX4cOObangGqOcRZII8pP.X54iLxdRdzWOCC','Fiscal',1,NULL,'2025-11-10 23:35:19','2025-11-18 20:44:57'),(3,1,3,'supervisor@bare.com','Ricardo Torres',NULL,NULL,'123','Contabilidade',1,NULL,'2025-11-10 23:35:19','2025-11-10 23:35:19'),(4,1,4,'gerente@bare.com','Fernanda Almeida',NULL,NULL,'123','Financeiro',1,NULL,'2025-11-10 23:35:19','2025-11-10 23:35:19'),(5,1,5,'admin@bare.com','Administrador Geral',NULL,NULL,'123','TI',1,NULL,'2025-11-10 23:35:19','2025-11-10 23:35:19'),(6,3,5,'monica@bare.com','Monica Souza','86596403149','(61) 30602539','$2b$12$5jcjeNyOCKIxZ4HR2uBxOeEncUK81FomyZXR3KwwrHzeCGyH5I7Bm','Fiscal',1,NULL,'2025-11-15 06:13:02','2025-11-15 06:13:02');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workflows_aprovacao`
--

DROP TABLE IF EXISTS `workflows_aprovacao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflows_aprovacao` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int NOT NULL,
  `nome` varchar(255) NOT NULL,
  `descricao` text,
  `valor_minimo` decimal(15,2) DEFAULT '0.00',
  `valor_maximo` decimal(15,2) DEFAULT NULL,
  `categoria_contabil_id` int DEFAULT NULL COMMENT 'Específico para categoria',
  `centro_custo_id` int DEFAULT NULL COMMENT 'Específico para centro de custo',
  `ordem_obrigatoria` tinyint(1) DEFAULT '1' COMMENT 'Deve seguir ordem de aprovação',
  `aprovacao_unanime` tinyint(1) DEFAULT '0' COMMENT 'Todos devem aprovar',
  `ativo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `categoria_contabil_id` (`categoria_contabil_id`),
  KEY `centro_custo_id` (`centro_custo_id`),
  KEY `idx_empresa` (`empresa_id`),
  KEY `idx_valor_range` (`valor_minimo`,`valor_maximo`),
  CONSTRAINT `workflows_aprovacao_ibfk_1` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `workflows_aprovacao_ibfk_2` FOREIGN KEY (`categoria_contabil_id`) REFERENCES `categorias_contabeis` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `workflows_aprovacao_ibfk_3` FOREIGN KEY (`centro_custo_id`) REFERENCES `centros_custo` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workflows_aprovacao`
--

LOCK TABLES `workflows_aprovacao` WRITE;
/*!40000 ALTER TABLE `workflows_aprovacao` DISABLE KEYS */;
/*!40000 ALTER TABLE `workflows_aprovacao` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-19 16:52:00

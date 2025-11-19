# ==============================================================================
# ARQUIVO: main.py
# DESCRIÇÃO: Backend principal da aplicação (FastAPI).
#   - Gerenciamento de Rotas (Endpoints)
#   - Conexão com Banco de Dados (MySQL via SQLAlchemy)
#   - Lógica de Negócio (Login, Uploads, Processamento XML, Dashboards)
#   - Integração com Firebase (Histórico de Auditoria)
# ==============================================================================

from fastapi import FastAPI, Request, Depends, File, UploadFile, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from sqlalchemy import text
import json
import os
import hashlib
import uuid
from datetime import datetime
from typing import Optional
import xml.etree.ElementTree as ET
import chardet
import traceback
import pymysql # Adicionado para tratar erros de duplicidade (IntegrityError)

# --- IMPORTS LOCAIS ---
from database import get_db, engine
from firebase_historico import historico_db # Módulo de logs no Firebase

# ==============================================================================
# CONFIGURAÇÃO INICIAL DO APP
# ==============================================================================

app = FastAPI()

# Configuração de arquivos estáticos (CSS, JS)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

# Configuração do diretório de Uploads
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Configuração de Templates (Jinja2)
templates = Jinja2Templates(directory="templates")

# Configuração de Hash de Senhas (Bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Modelo de dados para Login
class LoginRequest(BaseModel):
    email: str
    senha: str

# ==============================================================================
# ROTAS DE NAVEGAÇÃO (FRONTEND)
# ==============================================================================

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Rota raiz: Redireciona para o login."""
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    """Renderiza a página de login."""
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/projeto", response_class=HTMLResponse)
async def projeto_page(request: Request):
    """Renderiza a página principal (Dashboard/SPA)."""
    return templates.TemplateResponse("projeto.html", {"request": request})

# ==============================================================================
# API: UTILITÁRIOS E LOGIN
# ==============================================================================

@app.get("/api/test-db")
async def test_database(db: Session = Depends(get_db)):
    """Testa a conexão com o banco de dados MySQL."""
    try:
        result = db.execute(text("SELECT DATABASE() as db_name, VERSION() as version"))
        row = result.fetchone()
        
        return {
            "status": "✅ Conectado com sucesso!",
            "banco": row[0],
            "versao_mysql": row[1]
        }
    except Exception as e:
        return {
            "status": "❌ Erro na conexão",
            "erro": str(e)
        }

@app.post("/api/login")
async def fazer_login(dados: LoginRequest, db: Session = Depends(get_db)):
    """
    Processa o login do usuário.
    Verifica credenciais, hash da senha e retorna o token + permissões.
    """
    try:
        query = text("""
            SELECT 
                u.id, u.nome, u.email, u.senha_hash, u.departamento,
                r.nome as role, r.permissoes_base, r.nivel_acesso,
                e.razao_social as empresa
            FROM usuarios u
            JOIN roles r ON u.role_id = r.id
            JOIN empresas e ON u.empresa_id = e.id
            WHERE u.email = :email AND u.ativo = 1
        """)

        result = db.execute(query, {"email": dados.email})
        usuario = result.fetchone()
        
        if not usuario:
            return JSONResponse(
                status_code=401,
                content={"success": False, "message": "Usuário não encontrado"}
            )
        
        senha_hash = usuario[3]
        
        # Verifica a senha (compatibilidade com versões antigas e novas de hash)
        if senha_hash and (senha_hash.startswith('$2b$') or senha_hash.startswith('$2a$')):
            if not pwd_context.verify(dados.senha, senha_hash):
                return JSONResponse(
                    status_code=401,
                    content={"success": False, "message": "Senha incorreta"}
                )
        else:
            if dados.senha != senha_hash:
                return JSONResponse(
                    status_code=401,
                    content={"success": False, "message": "Senha incorreta"}
                )
        
        # Processa as permissões do usuário (JSON)
        permissoes = usuario[6]
        if permissoes and isinstance(permissoes, str):
            try:
                permissoes = json.loads(permissoes)
            except:
                permissoes = {"menus": ["dashboard"]}
        elif not permissoes:
            permissoes = {"menus": ["dashboard"]}
        
        return {
            "success": True,
            "token": f"token-{usuario[0]}",
            "user": {
                "id": usuario[0],
                "nome": usuario[1],
                "email": usuario[2],
                "role": usuario[5],
                "nivel_acesso": usuario[7],
                "empresa": usuario[8],
                "departamento": usuario[4],
                "permissoes": permissoes
            }
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Erro no servidor: {str(e)}"}
        )

# ==============================================================================
# API: DOCUMENTOS FISCAIS (Listagem e Detalhes)
# ==============================================================================

@app.get("/api/documentos-fiscais")
async def listar_documentos(
    search: str = None,
    tipo_data: str = "emissao",
    data_inicial: str = None,
    data_final: str = None,
    tipo_documento: str = None,
    status: str = None,
    fornecedor_id: int = None,
    db: Session = Depends(get_db)
):
    """
    Lista documentos fiscais com suporte a múltiplos filtros dinâmicos.
    Constrói a query SQL baseada nos parâmetros opcionais fornecidos.
    """
    try:
        print(f"[v0 Backend] Parâmetros recebidos: search={search}, tipo_data={tipo_data}, data_inicial={data_inicial}, data_final={data_final}")
        
        query_base = """
            SELECT 
                df.id,
                df.data_emissao,
                df.data_recebimento,
                df.data_competencia,
                df.data_vencimento,
                df.numero_documento,
                df.tipo_documento,
                f.razao_social as fornecedor,
                df.valor_total,
                df.status_processamento
            FROM documentos_fiscais df
            JOIN fornecedores f ON df.fornecedor_id = f.id
            WHERE 1=1
        """
        
        conditions = []
        params = {}
        
        if search and search.strip():
            conditions.append("""
                (df.numero_documento LIKE :search 
                OR f.razao_social LIKE :search 
                OR CAST(df.valor_total AS CHAR) LIKE :search
                OR df.tipo_documento LIKE :search)
            """)
            params["search"] = f"%{search.strip()}%"
            print(f"[v0 Backend] Adicionando filtro de pesquisa: {search}")
        
        if data_inicial and data_final:
            campo_data = f"df.data_{tipo_data}"
            conditions.append(f"{campo_data} BETWEEN :data_inicial AND :data_final")
            params["data_inicial"] = data_inicial
            params["data_final"] = data_final
            print(f"[v0 Backend] Filtro de data: {campo_data} entre {data_inicial} e {data_final}")
        
        if tipo_documento:
            conditions.append("df.tipo_documento = :tipo_documento")
            params["tipo_documento"] = tipo_documento
        
        if status:
            conditions.append("df.status_processamento = :status")
            params["status"] = status
        
        if fornecedor_id:
            conditions.append("df.fornecedor_id = :fornecedor_id")
            params["fornecedor_id"] = fornecedor_id
        
        if conditions:
            query_base += " AND " + " AND ".join(conditions)
        
        query_base += " ORDER BY df.data_emissao DESC LIMIT 100"
        
        print(f"[v0 Backend] Query final: {query_base}")
        print(f"[v0 Backend] Parâmetros: {params}")
        
        result = db.execute(text(query_base), params)
        documentos = result.fetchall()
        
        print(f"[v0 Backend] Documentos encontrados: {len(documentos)}")
        
        return {
            "total": len(documentos),
            "documentos": [
                {
                    "id": row[0],
                    "data_emissao": str(row[1]) if row[1] else None,
                    "data_recebimento": str(row[2]) if row[2] else None,
                    "data_competencia": str(row[3]) if row[3] else None,
                    "data_vencimento": str(row[4]) if row[4] else None,
                    "numero_documento": row[5],
                    "tipo_documento": row[6],
                    "fornecedor": row[7],
                    "valor_total": float(row[8]) if row[8] else 0,
                    "status_processamento": row[9]
                }
                for row in documentos
            ]
        }
    except Exception as e:
        print(f"[v0 Backend] ERRO: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"erro": str(e)}
        )

@app.get("/api/documentos-fiscais/{doc_id}")
async def buscar_documento(doc_id: int, db: Session = Depends(get_db)):
    """
    Busca os detalhes completos de um documento, incluindo:
    - Dados cadastrais
    - Empresa e Fornecedor
    - Lista de Anexos vinculados
    """
    try:
        query = text("""
            SELECT 
                df.id, df.empresa_id, df.fornecedor_id, df.tipo_documento,
                df.numero_documento, df.serie, df.chave_acesso,
                df.data_emissao, df.data_recebimento, df.data_vencimento, df.data_competencia,
                df.valor_total, df.valor_impostos, df.valor_liquido,
                df.descricao_servico_produto, df.observacoes,
                df.uf_origem, df.uf_destino, df.municipio_prestacao,
                df.xml_content, df.arquivo_anexo, df.status_processamento,
                f.razao_social as fornecedor_nome,
                e.razao_social as empresa_nome
            FROM documentos_fiscais df
            JOIN fornecedores f ON df.fornecedor_id = f.id
            JOIN empresas e ON df.empresa_id = e.id
            WHERE df.id = :doc_id
        """)
        
        result = db.execute(query, {"doc_id": doc_id})
        row = result.fetchone()
        
        if not row:
            return JSONResponse(status_code=404, content={"erro": "Documento não encontrado"})
        
        # Buscar anexos
        anexos_query = text("""
            SELECT a.id, a.nome_original, a.tipo_arquivo, a.tamanho_bytes, a.caminho_arquivo
            FROM anexos a
            JOIN documento_anexos da ON a.id = da.anexo_id
            WHERE da.documento_fiscal_id = :doc_id
        """)
        anexos_result = db.execute(anexos_query, {"doc_id": doc_id})
        anexos = anexos_result.fetchall()
        
        return {
            "id": row[0],
            "empresa_id": row[1],
            "empresa_nome": row[23],
            "fornecedor_id": row[2],
            "fornecedor_nome": row[22],
            "tipo_documento": row[3],
            "numero_documento": row[4],
            "serie": row[5],
            "chave_acesso": row[6],
            "data_emissao": str(row[7]) if row[7] else None,
            "data_recebimento": str(row[8]) if row[8] else None,
            "data_vencimento": str(row[9]) if row[9] else None,
            "data_competencia": str(row[10]) if row[10] else None,
            "valor_total": float(row[11]) if row[11] else 0,
            "valor_impostos": float(row[12]) if row[12] else 0,
            "valor_liquido": float(row[13]) if row[13] else 0,
            "descricao_servico_produto": row[14],
            "observacoes": row[15],
            "uf_origem": row[16],
            "uf_destino": row[17],
            "municipio_prestacao": row[18],
            "status_processamento": row[21],
            "anexos": [
                {
                    "id": a[0],
                    "nome_original": a[1],
                    "tipo_arquivo": a[2],
                    "tamanho_bytes": a[3],
                    "caminho_arquivo": a[4]
                }
                for a in anexos
            ]
        }
    except Exception as e:
        print(f"[v0 Backend] Erro ao buscar documento: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"erro": str(e)})

# ==============================================================================
# API: UPLOAD E IMPORTAÇÃO (Arquivos e XML)
# ==============================================================================

@app.post("/api/upload-arquivo")
async def upload_arquivo(
    file: UploadFile = File(...),
    documento_id: Optional[int] = Form(None),
    tipo_relacao: str = Form("COMPLEMENTAR"),
    db: Session = Depends(get_db)
):
    """
    Recebe um arquivo, salva no disco (organizado por Empresa/Ano/Mês) e
    cria o registro na tabela 'anexos'. Se 'documento_id' for passado,
    cria o vínculo na tabela 'documento_anexos'.
    """
    try:
        # Validar tipo de arquivo
        ext = file.filename.split(".")[-1].upper()
        tipos_validos = ["PDF", "XML", "JPG", "JPEG", "PNG", "DOC", "DOCX", "XLS", "XLSX"]
        
        if ext not in tipos_validos:
            return JSONResponse(
                status_code=400,
                content={"erro": f"Tipo de arquivo não permitido. Use: {', '.join(tipos_validos)}"}
            )
        
        # Ler conteúdo do arquivo
        content = await file.read()
        
        # Gerar hash para integridade
        hash_arquivo = hashlib.sha256(content).hexdigest()
        
        # Gerar nome único para o arquivo
        nome_unico = f"{uuid.uuid4().hex[:8]}.{ext.lower()}"
        
        empresa_id = 1  # TODO: Obter da sessão do usuário
        
        ano = datetime.now().year
        mes = datetime.now().month
        
        pasta_destino = os.path.join(UPLOAD_DIR, f"empresa_{empresa_id}", str(ano), f"{mes:02d}")
        os.makedirs(pasta_destino, exist_ok=True)
        
        # Salvar arquivo
        caminho_completo = os.path.join(pasta_destino, nome_unico)
        with open(caminho_completo, "wb") as f:
            f.write(content)
        
        # Caminho relativo para armazenar no banco
        caminho_relativo = f"/empresa_{empresa_id}/{ano}/{mes:02d}/{nome_unico}"
        
        # Salvar no banco
        user_id = 1  # TODO: Ajustar conforme sessão do usuário
        
        query_anexo = text("""
            INSERT INTO anexos 
            (nome_arquivo, nome_original, tipo_arquivo, tamanho_bytes, caminho_arquivo, hash_arquivo, uploaded_by)
            VALUES 
            (:nome_arquivo, :nome_original, :tipo_arquivo, :tamanho, :caminho, :hash, :user_id)
        """)
        
        result = db.execute(query_anexo, {
            "nome_arquivo": nome_unico,
            "nome_original": file.filename,
            "tipo_arquivo": ext,
            "tamanho": len(content),
            "caminho": caminho_relativo,
            "hash": hash_arquivo,
            "user_id": user_id
        })
        
        anexo_id = result.lastrowid
        db.commit()
        
        # Se houver documento_id, vincular anexo ao documento
        if documento_id:
            query_vinculo = text("""
                INSERT INTO documento_anexos (documento_fiscal_id, anexo_id, tipo_relacao)
                VALUES (:doc_id, :anexo_id, :tipo_relacao)
            """)
            
            db.execute(query_vinculo, {
                "doc_id": documento_id,
                "anexo_id": anexo_id,
                "tipo_relacao": tipo_relacao
            })
            db.commit()
        
        return {
            "success": True,
            "anexo_id": anexo_id,
            "caminho_arquivo": caminho_relativo,
            "hash_arquivo": hash_arquivo
        }
        
    except Exception as e:
        print(f"[v0 Backend] Erro no upload: {str(e)}")
        db.rollback()
        return JSONResponse(status_code=500, content={"erro": str(e)})

# Função Helper para XML
def detect_encoding(content: bytes) -> str:
    """
    Detecta o encoding de um arquivo XML, pois muitos vêm como 'iso-8859-1'.
    Tenta ler o cabeçalho XML ou usa chardet como fallback.
    """
    try:
        # Tenta ler o cabeçalho XML (ex: <?xml version="1.0" encoding="UTF-8"?>)
        header = content[:100].decode('latin-1').lower()
        if 'encoding="utf-8"' in header:
            return 'utf-8'
        if 'encoding="iso-8859-1"' in header:
            return 'iso-8859-1'
    except Exception:
        pass # Ignora erros se não conseguir ler o cabeçalho
    
    # Se não encontrar, tenta adivinhar com chardet
    result = chardet.detect(content)
    encoding = result.get('encoding', 'utf-8')
    
    # Garante um fallback seguro
    if encoding.lower() not in ['utf-8', 'iso-8859-1', 'latin-1']:
        return 'utf-8'
        
    return encoding

@app.post("/api/importar-xml")
async def importar_xml(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Processa a importação de XMLs (NF-e e NFS-e).
    1. Detecta encoding e faz parse.
    2. Identifica se é NF-e (Federal) ou NFS-e (Serviço - Padrão SP).
    3. Extrai dados: Número, Valor, Datas, CNPJ Fornecedor.
    4. Cria o Fornecedor se não existir.
    5. Faz 'Upsert' do Documento Fiscal (Insere ou Atualiza se a chave já existir).
    """
    try:
        if not file.filename.lower().endswith('.xml'):
            return JSONResponse(status_code=400, content={"success": False, "erro": "Apenas arquivos .xml são permitidos"})
        
        content = await file.read()

        if content.startswith(b'%PDF-'):
            print("[v0 Backend] Erro: O arquivo é um PDF, não um XML.")
            return JSONResponse(
                status_code=400, 
                content={"success": False, "erro": "Arquivo inválido. O conteúdo é de um PDF, apesar da extensão .xml"}
            )

        try:
            encoding = detect_encoding(content)
            xml_string = content.decode(encoding)
        except UnicodeDecodeError as e:
            print(f"[v0 Backend] Erro de decodificação: {e}")
            return JSONResponse(
                status_code=400, 
                content={"success": False, "erro": f"Erro de decodificação. O arquivo pode estar corrompido: {e}"}
            )

        try:
            # Remove o namespace padrão (xmlns) se existir, pois ele atrapalha o find()
            xml_string = xml_string.replace('xmlns="http://www.prefeitura.sp.gov.br/nfe"', '', 1)
            root = ET.fromstring(xml_string)
        except ET.ParseError as e:
            print(f"[v0 Backend] Erro de Parse XML: {e}")
            return JSONResponse(
                status_code=400, 
                content={"success": False, "erro": f"Não foi possível ler o XML. O arquivo está mal formatado: {e}"}
            )
        
        # --- LÓGICA DE EXTRAÇÃO MULTI-FORMATO ---
        # A sintaxe .//*:[tag] ignora namespaces (como 'nfe:' ou 'sp:')
        
        numero = None
        serie = None
        chave_acesso = None
        data_emissao = None
        valor_total = 0
        valor_impostos = 0
        cnpj_fornecedor = None
        razao_fornecedor = None
        tipo_documento = 'OUTROS'

        # --- TENTATIVA 1: NF-e (Padrão Federal) ---
        infNFe = root.find('.//{*}infNFe')
        
        if infNFe is not None:
            print("[v0 Backend] Detectado XML de NF-e (Federal)")
            tipo_documento = 'NF-e'
            chave_acesso_el = infNFe.get('Id')
            if chave_acesso_el:
                chave_acesso = chave_acesso_el.replace('NFe', '')
            
            ide = infNFe.find('{*}ide')
            if ide is not None:
                numero_el = ide.find('{*}nNF')
                if numero_el is not None: numero = numero_el.text
                
                serie_el = ide.find('{*}serie')
                if serie_el is not None: serie = serie_el.text

                data_emissao_el = ide.find('{*}dhEmi')
                if data_emissao_el is not None: data_emissao = data_emissao_el.text[:10]

            total = infNFe.find('.//{*}ICMSTot')
            if total is not None:
                valor_total_el = total.find('{*}vNF')
                if valor_total_el is not None: valor_total = float(valor_total_el.text)
                
                valor_impostos_el = total.find('{*}vTotTrib')
                if valor_impostos_el is not None: valor_impostos = float(valor_impostos_el.text)

            emit = infNFe.find('{*}emit')
            if emit is not None:
                cnpj_el = emit.find('{*}CNPJ')
                if cnpj_el is not None: cnpj_fornecedor = cnpj_el.text
                
                razao_el = emit.find('{*}xNome')
                if razao_el is not None: razao_fornecedor = razao_el.text

        # --- TENTATIVA 2: NFS-e (Nota de Serviço, ex: SP) ---
        else:
            # Procura por tags comuns de NFS-e, ignorando namespaces
            nfe_sp = root.find('.//{*}NFe') # A tag <NFe>
            if nfe_sp is None:
                nfe_sp = root # Se não achar <NFe>, assume que o root é o documento

            print("[v0 Backend] Detectado XML de NFS-e (Nota de Serviço)")
            tipo_documento = 'NFS-e'

            # Tenta achar o número da nota
            numero_el = nfe_sp.find('.//{*}NumeroNFe')
            if numero_el is not None: numero = numero_el.text

            # Tenta achar o código de verificação
            chave_el = nfe_sp.find('.//{*}CodigoVerificacao')
            if chave_el is not None: chave_acesso = chave_el.text
            
            # Tenta achar a data de emissão
            data_emissao_el = nfe_sp.find('.//{*}DataEmissaoNFe')
            if data_emissao_el is None:
                data_emissao_el = nfe_sp.find('.//{*}DataEmissao') # Fallback
            if data_emissao_el is not None: data_emissao = data_emissao_el.text[:10]

            # Tenta achar o valor
            valor_el = nfe_sp.find('.//{*}ValorServicos')
            if valor_el is not None: valor_total = float(valor_el.text)
            
            # Tenta achar impostos
            imposto_el = nfe_sp.find('.//{*}ValorISS')
            if imposto_el is not None: valor_impostos = float(imposto_el.text)

            # --- ACHAR FORNECEDOR (PRESTADOR) ---
            # Tenta achar a Razão Social primeiro
            razao_el = nfe_sp.find('.//{*}RazaoSocialPrestador')
            if razao_el is not None: razao_fornecedor = razao_el.text
            
            # Tenta achar o CNPJ
            # Procura por <CNPJ> dentro de <CPFCNPJPrestador>
            prestador_cnpj_el = nfe_sp.find('.//{*}CPFCNPJPrestador/{*}CNPJ')
            if prestador_cnpj_el is not None:
                cnpj_fornecedor = prestador_cnpj_el.text
            else:
                # Fallback: Procura por <Cnpj> dentro de <PrestadorServico>
                prestador_cnpj_el_alt = nfe_sp.find('.//{*}PrestadorServico/{*}Cnpj')
                if prestador_cnpj_el_alt is not None:
                    cnpj_fornecedor = prestador_cnpj_el_alt.text

        # --- Validação dos dados extraídos ---
        if not cnpj_fornecedor or not razao_fornecedor:
            print(f"[v0 Backend] Erro: Não foi possível extrair CNPJ ({cnpj_fornecedor}) ou RazaoSocial ({razao_fornecedor}).")
            traceback.print_exc()
            return JSONResponse(
                status_code=400, 
                content={"success": False, "erro": "Não foi possível extrair o CNPJ ou a Razão Social do XML. Formato não suportado."}
            )

        # --- O resto da lógica (Banco de Dados) é a mesma ---
        
        # Buscar ou criar fornecedor
        query_fornecedor = text("SELECT id FROM fornecedores WHERE cnpj_cpf = :cnpj LIMIT 1")
        result = db.execute(query_fornecedor, {"cnpj": cnpj_fornecedor})
        fornecedor = result.fetchone()
        
        fornecedor_id = None
        if not fornecedor:
            try:
                insert_fornecedor = text("""
                    INSERT INTO fornecedores (empresa_id, cnpj_cpf, tipo_pessoa, razao_social, ativo)
                    VALUES (1, :cnpj, 'PJ', :razao, 1)
                """)
                result = db.execute(insert_fornecedor, {
                    "cnpj": cnpj_fornecedor,
                    "razao": razao_fornecedor
                })
                fornecedor_id = result.lastrowid
                db.commit() 
            except Exception as e_forn:
                 db.rollback()
                 print(f"[v0 Backend] Erro ao criar fornecedor: {str(e_forn)}")
                 return JSONResponse(status_code=500, content={"success": False, "erro": f"Erro ao criar fornecedor: {str(e_forn)}"})
        else:
            fornecedor_id = fornecedor[0]
        
        # Inserir documento fiscal
        query_doc = text("""
            INSERT INTO documentos_fiscais 
            (empresa_id, fornecedor_id, tipo_documento, numero_documento, serie, chave_acesso,
             data_emissao, valor_total, valor_impostos, xml_content, status_processamento, usuario_criacao_id)
            VALUES 
            (1, :fornecedor_id, :tipo_documento, :numero, :serie, :chave, :data_emissao, 
             :valor_total, :valor_impostos, :xml_content, 'PENDENTE', 1)
            ON DUPLICATE KEY UPDATE 
             valor_total = :valor_total,
             status_processamento = 'PENDENTE',
             xml_content = :xml_content,
             updated_at = CURRENT_TIMESTAMP
        """)
        
        result = db.execute(query_doc, {
            "fornecedor_id": fornecedor_id,
            "tipo_documento": tipo_documento,
            "numero": numero,
            "serie": serie,
            "chave": chave_acesso,
            "data_emissao": data_emissao,
            "valor_total": valor_total,
            "valor_impostos": valor_impostos,
            "xml_content": xml_string
        })
        
        doc_id = result.lastrowid
        if not doc_id:
             # Se foi ON DUPLICATE KEY UPDATE, precisamos pegar o ID
            query_get_id = text("SELECT id FROM documentos_fiscais WHERE chave_acesso = :chave LIMIT 1")
            result_id = db.execute(query_get_id, {"chave": chave_acesso})
            doc_id = result_id.scalar()

        db.commit() 
        
        return {
            "success": True,
            "documento_id": doc_id,
            "message": "XML importado com sucesso"
        }
        
    except Exception as e:
        db.rollback()
        print(f"[v0 Backend] Erro fatal ao importar XML: {str(e)}")
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "erro": str(e)})

# ==============================================================================
# API: CRUD DE DOCUMENTOS (Manual e Edição)
# ==============================================================================

@app.post("/api/documentos-fiscais")
async def cadastrar_documento(
    empresa_id: int = Form(...),
    fornecedor_id: int = Form(...),
    tipo_documento: str = Form(...),
    numero_documento: str = Form(...),
    serie: Optional[str] = Form(None),
    chave_acesso: Optional[str] = Form(None),
    data_emissao: str = Form(...),
    data_recebimento: Optional[str] = Form(None),
    data_vencimento: Optional[str] = Form(None),
    data_competencia: Optional[str] = Form(None),
    valor_total: float = Form(...),
    valor_impostos: float = Form(0),
    descricao_servico_produto: Optional[str] = Form(None),
    observacoes: Optional[str] = Form(None),
    uf_origem: Optional[str] = Form(None),
    uf_destino: Optional[str] = Form(None),
    municipio_prestacao: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    try:
        query = text("""
            INSERT INTO documentos_fiscais 
            (empresa_id, fornecedor_id, tipo_documento, numero_documento, serie, chave_acesso,
             data_emissao, data_recebimento, data_vencimento, data_competencia,
             valor_total, valor_impostos, descricao_servico_produto, observacoes,
             uf_origem, uf_destino, municipio_prestacao, status_processamento, usuario_criacao_id)
            VALUES 
            (:empresa_id, :fornecedor_id, :tipo_documento, :numero_documento, :serie, :chave_acesso,
             :data_emissao, :data_recebimento, :data_vencimento, :data_competencia,
             :valor_total, :valor_impostos, :descricao, :observacoes,
             :uf_origem, :uf_destino, :municipio, 'PENDENTE', 1)
        """)
        
        result = db.execute(query, {
            "empresa_id": empresa_id,
            "fornecedor_id": fornecedor_id,
            "tipo_documento": tipo_documento,
            "numero_documento": numero_documento,
            "serie": serie,
            "chave_acesso": chave_acesso,
            "data_emissao": data_emissao,
            "data_recebimento": data_recebimento,
            "data_vencimento": data_vencimento,
            "data_competencia": data_competencia,
            "valor_total": valor_total,
            "valor_impostos": valor_impostos,
            "descricao": descricao_servico_produto,
            "observacoes": observacoes,
            "uf_origem": uf_origem,
            "uf_destino": uf_destino,
            "municipio": municipio_prestacao
        })
        
        doc_id = result.lastrowid
        db.commit()
        
        return {
            "success": True,
            "documento_id": doc_id,
            "message": "Documento cadastrado com sucesso"
        }
        
    except Exception as e:
        print(f"[v0 Backend] Erro ao cadastrar documento: {str(e)}")
        db.rollback()
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.put("/api/documentos-fiscais/{doc_id}")
async def atualizar_documento(
    doc_id: int,
    fornecedor_id: int = Form(...),
    tipo_documento: str = Form(...),
    numero_documento: str = Form(...),
    serie: Optional[str] = Form(None),
    chave_acesso: Optional[str] = Form(None),
    data_emissao: str = Form(...),
    data_recebimento: Optional[str] = Form(None),
    data_vencimento: Optional[str] = Form(None),
    data_competencia: Optional[str] = Form(None),
    valor_total: float = Form(...),
    valor_impostos: float = Form(0),
    descricao_servico_produto: Optional[str] = Form(None),
    observacoes: Optional[str] = Form(None),
    uf_origem: Optional[str] = Form(None),
    uf_destino: Optional[str] = Form(None),
    municipio_prestacao: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    try:
        query = text("""
            UPDATE documentos_fiscais 
            SET fornecedor_id = :fornecedor_id,
                tipo_documento = :tipo_documento,
                numero_documento = :numero_documento,
                serie = :serie,
                chave_acesso = :chave_acesso,
                data_emissao = :data_emissao,
                data_recebimento = :data_recebimento,
                data_vencimento = :data_vencimento,
                data_competencia = :data_competencia,
                valor_total = :valor_total,
                valor_impostos = :valor_impostos,
                descricao_servico_produto = :descricao,
                observacoes = :observacoes,
                uf_origem = :uf_origem,
                uf_destino = :uf_destino,
                municipio_prestacao = :municipio,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :doc_id
        """)
        
        db.execute(query, {
            "doc_id": doc_id,
            "fornecedor_id": fornecedor_id,
            "tipo_documento": tipo_documento,
            "numero_documento": numero_documento,
            "serie": serie,
            "chave_acesso": chave_acesso,
            "data_emissao": data_emissao,
            "data_recebimento": data_recebimento,
            "data_vencimento": data_vencimento,
            "data_competencia": data_competencia,
            "valor_total": valor_total,
            "valor_impostos": valor_impostos,
            "descricao": descricao_servico_produto,
            "observacoes": observacoes,
            "uf_origem": uf_origem,
            "uf_destino": uf_destino,
            "municipio": municipio_prestacao
        })
        
        db.commit()
        
        return {
            "success": True,
            "message": "Documento atualizado com sucesso"
        }
        
    except Exception as e:
        print(f"[v0 Backend] Erro ao atualizar documento: {str(e)}")
        db.rollback()
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.delete("/api/documentos-fiscais/{doc_id}")
async def excluir_documento(doc_id: int, db: Session = Depends(get_db)):
    try:
        query = text("DELETE FROM documentos_fiscais WHERE id = :doc_id")
        db.execute(query, {"doc_id": doc_id})
        db.commit()
        
        return {
            "success": True,
            "message": "Documento excluído com sucesso"
        }
        
    except Exception as e:
        print(f"[v0 Backend] Erro ao excluir documento: {str(e)}")
        db.rollback()
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.delete("/api/anexos/{anexo_id}")
async def excluir_anexo(anexo_id: int, db: Session = Depends(get_db)):
    """
    Exclui um anexo específico (registro no banco e arquivo físico).
    """
    try:
        # 1. Encontrar o anexo para pegar o caminho do arquivo
        query_find = text("SELECT caminho_arquivo FROM anexos WHERE id = :anexo_id")
        result = db.execute(query_find, {"anexo_id": anexo_id})
        anexo = result.fetchone()
        
        if anexo:
            caminho_relativo = anexo[0]
            # Constrói o caminho completo baseado no UPLOAD_DIR
            # (Assume que UPLOAD_DIR está definido como "uploads")
            caminho_completo = os.path.join(UPLOAD_DIR, *caminho_relativo.strip('/').split('/'))
            
            # 2. Deletar o arquivo físico (se existir)
            if os.path.exists(caminho_completo):
                os.remove(caminho_completo)
                print(f"[v0 Backend] Arquivo físico deletado: {caminho_completo}")
            else:
                print(f"[v0 Backend] Aviso: Arquivo físico não encontrado: {caminho_completo}")
        
        # 3. Deletar o registro da tabela 'anexos'
        # Graças ao "ON DELETE CASCADE" no seu SQL, 
        # o vínculo em 'documento_anexos' será removido automaticamente.
        query_delete = text("DELETE FROM anexos WHERE id = :anexo_id")
        db.execute(query_delete, {"anexo_id": anexo_id})
        db.commit()
        
        return {"success": True, "message": "Anexo excluído com sucesso"}
        
    except Exception as e:
        db.rollback()
        print(f"[v0 Backend] Erro ao excluir anexo: {str(e)}")
        if "foreign key constraint" in str(e).lower():
             return JSONResponse(status_code=400, content={"erro": "Não é possível excluir o anexo, pois está em uso."})
        return JSONResponse(status_code=500, content={"erro": str(e)})

# ==============================================================================
# API: CADASTROS BASE (Fornecedores, Empresas, Usuários)
# ==============================================================================

@app.get("/api/fornecedores")
async def listar_fornecedores(db: Session = Depends(get_db)):
    try:
        query = text("""
            SELECT id, razao_social, cnpj_cpf, tipo_pessoa
            FROM fornecedores
            WHERE ativo = 1
            ORDER BY razao_social
        """)
        
        result = db.execute(query)
        fornecedores = result.fetchall()
        
        return {
            "total": len(fornecedores),
            "fornecedores": [
                {
                    "id": row[0],
                    "razao_social": row[1],
                    "cnpj_cpf": row[2],
                    "tipo_pessoa": row[3]
                }
                for row in fornecedores
            ]
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"erro": str(e)}
        )

@app.get("/api/usuarios")
async def listar_usuarios(db: Session = Depends(get_db)):
    try:
        query = text("""
            SELECT 
                u.id,
                u.nome,
                u.email,
                u.ativo,
                r.nome as role,
                e.razao_social as empresa
            FROM usuarios u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN empresas e ON u.empresa_id = e.id
        """)
        
        result = db.execute(query)
        usuarios = result.fetchall()
        
        return {
            "total": len(usuarios),
            "usuarios": [
                {
                    "id": row[0],
                    "nome": row[1],
                    "email": row[2],
                    "ativo": row[3],
                    "role": row[4],
                    "empresa": row[5]
                }
                for row in usuarios
            ]
        }
        
    except Exception as e:
        return {
            "status": "erro",
            "mensagem": str(e)
        }


@app.get("/api/empresas")
async def listar_empresas(db: Session = Depends(get_db)):
    try:
        query = text("""
            SELECT id, cnpj, razao_social, nome_fantasia, inscricao_estadual, inscricao_municipal,
                   endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro,
                   endereco_cidade, endereco_uf, endereco_cep, email_principal, telefone_principal, ativa
            FROM empresas
            ORDER BY razao_social
        """)
        
        result = db.execute(query)
        empresas = result.fetchall()
        
        return {
            "total": len(empresas),
            "empresas": [
                {
                    "id": row[0],
                    "cnpj": row[1],
                    "razao_social": row[2],
                    "nome_fantasia": row[3],
                    "inscricao_estadual": row[4],
                    "inscricao_municipal": row[5],
                    "endereco_logradouro": row[6],
                    "endereco_numero": row[7],
                    "endereco_complemento": row[8],
                    "endereco_bairro": row[9],
                    "endereco_cidade": row[10],
                    "endereco_uf": row[11],
                    "endereco_cep": row[12],
                    "email_principal": row[13],
                    "telefone_principal": row[14],
                    "ativa": bool(row[15])
                }
                for row in empresas
            ]
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.get("/api/empresas/{empresa_id}")
async def buscar_empresa(empresa_id: int, db: Session = Depends(get_db)):
    try:
        query = text("""
            SELECT id, cnpj, razao_social, nome_fantasia, inscricao_estadual, inscricao_municipal,
                   endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro,
                   endereco_cidade, endereco_uf, endereco_cep, email_principal, telefone_principal, ativa
            FROM empresas
            WHERE id = :id
        """)
        
        result = db.execute(query, {"id": empresa_id})
        row = result.fetchone()
        
        if not row:
            return JSONResponse(status_code=404, content={"erro": "Empresa não encontrada"})
        
        return {
            "id": row[0],
            "cnpj": row[1],
            "razao_social": row[2],
            "nome_fantasia": row[3],
            "inscricao_estadual": row[4],
            "inscricao_municipal": row[5],
            "endereco_logradouro": row[6],
            "endereco_numero": row[7],
            "endereco_complemento": row[8],
            "endereco_bairro": row[9],
            "endereco_cidade": row[10],
            "endereco_uf": row[11],
            "endereco_cep": row[12],
            "email_principal": row[13],
            "telefone_principal": row[14],
            "ativa": bool(row[15])
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.post("/api/empresas")
async def criar_empresa(
    cnpj: str = Form(...),
    razao_social: str = Form(...),
    nome_fantasia: Optional[str] = Form(None),
    inscricao_estadual: Optional[str] = Form(None),
    inscricao_municipal: Optional[str] = Form(None),
    endereco_logradouro: Optional[str] = Form(None),
    endereco_numero: Optional[str] = Form(None),
    endereco_complemento: Optional[str] = Form(None),
    endereco_bairro: Optional[str] = Form(None),
    endereco_cidade: Optional[str] = Form(None),
    endereco_uf: Optional[str] = Form(None),
    endereco_cep: Optional[str] = Form(None),
    email_principal: Optional[str] = Form(None),
    telefone_principal: Optional[str] = Form(None),
    ativa: bool = Form(True),
    db: Session = Depends(get_db)
):
    try:
        query = text("""
            INSERT INTO empresas (cnpj, razao_social, nome_fantasia, inscricao_estadual, inscricao_municipal,
                                  endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro,
                                  endereco_cidade, endereco_uf, endereco_cep, email_principal, telefone_principal, ativa)
            VALUES (:cnpj, :razao_social, :nome_fantasia, :inscricao_estadual, :inscricao_municipal,
                    :endereco_logradouro, :endereco_numero, :endereco_complemento, :endereco_bairro,
                    :endereco_cidade, :endereco_uf, :endereco_cep, :email_principal, :telefone_principal, :ativa)
        """)
        
        result = db.execute(query, {
            "cnpj": cnpj,
            "razao_social": razao_social,
            "nome_fantasia": nome_fantasia,
            "inscricao_estadual": inscricao_estadual,
            "inscricao_municipal": inscricao_municipal,
            "endereco_logradouro": endereco_logradouro,
            "endereco_numero": endereco_numero,
            "endereco_complemento": endereco_complemento,
            "endereco_bairro": endereco_bairro,
            "endereco_cidade": endereco_cidade,
            "endereco_uf": endereco_uf,
            "endereco_cep": endereco_cep,
            "email_principal": email_principal,
            "telefone_principal": telefone_principal,
            "ativa": ativa
        })
        
        empresa_id = result.lastrowid
        db.commit()
        
        return {"success": True, "empresa_id": empresa_id}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.put("/api/empresas/{empresa_id}")
async def atualizar_empresa(
    empresa_id: int,
    cnpj: str = Form(...),
    razao_social: str = Form(...),
    nome_fantasia: Optional[str] = Form(None),
    inscricao_estadual: Optional[str] = Form(None),
    inscricao_municipal: Optional[str] = Form(None),
    endereco_logradouro: Optional[str] = Form(None),
    endereco_numero: Optional[str] = Form(None),
    endereco_complemento: Optional[str] = Form(None),
    endereco_bairro: Optional[str] = Form(None),
    endereco_cidade: Optional[str] = Form(None),
    endereco_uf: Optional[str] = Form(None),
    endereco_cep: Optional[str] = Form(None),
    email_principal: Optional[str] = Form(None),
    telefone_principal: Optional[str] = Form(None),
    ativa: bool = Form(True),
    db: Session = Depends(get_db)
):
    try:
        query = text("""
            UPDATE empresas 
            SET cnpj = :cnpj, razao_social = :razao_social, nome_fantasia = :nome_fantasia,
                inscricao_estadual = :inscricao_estadual, inscricao_municipal = :inscricao_municipal,
                endereco_logradouro = :endereco_logradouro, endereco_numero = :endereco_numero,
                endereco_complemento = :endereco_complemento, endereco_bairro = :endereco_bairro,
                endereco_cidade = :endereco_cidade, endereco_uf = :endereco_uf, endereco_cep = :endereco_cep,
                email_principal = :email_principal, telefone_principal = :telefone_principal, ativa = :ativa
            WHERE id = :id
        """)
        
        db.execute(query, {
            "id": empresa_id,
            "cnpj": cnpj,
            "razao_social": razao_social,
            "nome_fantasia": nome_fantasia,
            "inscricao_estadual": inscricao_estadual,
            "inscricao_municipal": inscricao_municipal,
            "endereco_logradouro": endereco_logradouro,
            "endereco_numero": endereco_numero,
            "endereco_complemento": endereco_complemento,
            "endereco_bairro": endereco_bairro,
            "endereco_cidade": endereco_cidade,
            "endereco_uf": endereco_uf,
            "endereco_cep": endereco_cep,
            "email_principal": email_principal,
            "telefone_principal": telefone_principal,
            "ativa": ativa
        })
        
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.delete("/api/empresas/{empresa_id}")
async def excluir_empresa(empresa_id: int, db: Session = Depends(get_db)):
    try:
        query = text("DELETE FROM empresas WHERE id = :id")
        db.execute(query, {"id": empresa_id})
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.get("/api/fornecedores/{fornecedor_id}")
async def buscar_fornecedor(fornecedor_id: int, db: Session = Depends(get_db)):
    try:
        query = text("""
            SELECT id, empresa_id, cnpj_cpf, tipo_pessoa, razao_social, nome_fantasia,
                   endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro,
                   endereco_cidade, endereco_uf, endereco_cep, email, telefone, ativo
            FROM fornecedores
            WHERE id = :id
        """)
        
        result = db.execute(query, {"id": fornecedor_id})
        row = result.fetchone()
        
        if not row:
            return JSONResponse(status_code=404, content={"erro": "Fornecedor não encontrado"})
        
        return {
            "id": row[0],
            "empresa_id": row[1],
            "cnpj_cpf": row[2],
            "tipo_pessoa": row[3],
            "razao_social": row[4],
            "nome_fantasia": row[5],
            "endereco_logradouro": row[6],
            "endereco_numero": row[7],
            "endereco_complemento": row[8],
            "endereco_bairro": row[9],
            "endereco_cidade": row[10],
            "endereco_uf": row[11],
            "endereco_cep": row[12],
            "email": row[13],
            "telefone": row[14],
            "ativa": bool(row[15])
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.post("/api/fornecedores")
async def criar_fornecedor(
    empresa_id: int = Form(...),
    cnpj_cpf: str = Form(...),
    tipo_pessoa: str = Form(...),
    razao_social: str = Form(...),
    nome_fantasia: Optional[str] = Form(None),
    endereco_logradouro: Optional[str] = Form(None),
    endereco_numero: Optional[str] = Form(None),
    endereco_complemento: Optional[str] = Form(None),
    endereco_bairro: Optional[str] = Form(None),
    endereco_cidade: Optional[str] = Form(None),
    endereco_uf: Optional[str] = Form(None),
    endereco_cep: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    telefone: Optional[str] = Form(None),
    ativo: int = Form(...),
    db: Session = Depends(get_db)
):
    try:
        query = text("""
            INSERT INTO fornecedores (empresa_id, cnpj_cpf, tipo_pessoa, razao_social, nome_fantasia,
                                      endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro,
                                      endereco_cidade, endereco_uf, endereco_cep, email, telefone, ativo)
            VALUES (:empresa_id, :cnpj_cpf, :tipo_pessoa, :razao_social, :nome_fantasia,
                    :endereco_logradouro, :endereco_numero, :endereco_complemento, :endereco_bairro,
                    :endereco_cidade, :endereco_uf, :endereco_cep, :email, :telefone, :ativo)
        """)
        
        result = db.execute(query, {
            "empresa_id": empresa_id,
            "cnpj_cpf": cnpj_cpf,
            "tipo_pessoa": tipo_pessoa,
            "razao_social": razao_social,
            "nome_fantasia": nome_fantasia,
            "endereco_logradouro": endereco_logradouro,
            "endereco_numero": endereco_numero,
            "endereco_complemento": endereco_complemento,
            "endereco_bairro": endereco_bairro,
            "endereco_cidade": endereco_cidade,
            "endereco_uf": endereco_uf,
            "endereco_cep": endereco_cep,
            "email": email,
            "telefone": telefone,
            "ativo": ativo
        })
        
        fornecedor_id = result.lastrowid
        db.commit()
        
        return {"success": True, "fornecedor_id": fornecedor_id}
    except Exception as e:
        db.rollback()
        
        # ========================================
        # TRATAMENTO DE ERRO DE DUPLICIDADE
        # ========================================
        print("--- ERRO DETALHADO NO CADASTRO DE FORNECEDOR ---")
        traceback.print_exc()  # <-- 2. Isso vai imprimir o erro completo no console
        print("--------------------------------------------------")
        
        # Verifica se o erro é de duplicidade (código 1062)
        if isinstance(e.orig, pymysql.err.IntegrityError) and e.orig.args[0] == 1062:
            print("[v0 Backend] Erro: Tentativa de cadastrar CNPJ duplicado.")
            return JSONResponse(
                status_code=400, 
                content={"success": False, "erro": "Este CNPJ/CPF já está cadastrado para esta empresa."}
            )
            
        print(f"[v0 Backend] Erro ao cadastrar fornecedor: {str(e)}")
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.put("/api/fornecedores/{fornecedor_id}")
async def atualizar_fornecedor(
    fornecedor_id: int,
    empresa_id: int = Form(...),
    cnpj_cpf: str = Form(...),
    tipo_pessoa: str = Form(...),
    razao_social: str = Form(...),
    nome_fantasia: Optional[str] = Form(None),
    endereco_logradouro: Optional[str] = Form(None),
    endereco_numero: Optional[str] = Form(None),
    endereco_complemento: Optional[str] = Form(None),
    endereco_bairro: Optional[str] = Form(None),
    endereco_cidade: Optional[str] = Form(None),
    endereco_uf: Optional[str] = Form(None),
    endereco_cep: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    telefone: Optional[str] = Form(None),
    ativo: int = Form(...),
    db: Session = Depends(get_db)
):
    try:
        query = text("""
            UPDATE fornecedores 
            SET empresa_id = :empresa_id, cnpj_cpf = :cnpj_cpf, tipo_pessoa = :tipo_pessoa,
                razao_social = :razao_social, nome_fantasia = :nome_fantasia,
                endereco_logradouro = :endereco_logradouro, endereco_numero = :endereco_numero,
                endereco_complemento = :endereco_complemento, endereco_bairro = :endereco_bairro,
                endereco_cidade = :endereco_cidade, endereco_uf = :endereco_uf, endereco_cep = :endereco_cep,
                email = :email, telefone = :telefone, ativo = :ativo
            WHERE id = :id
        """)
        
        db.execute(query, {
            "id": fornecedor_id,
            "empresa_id": empresa_id,
            "cnpj_cpf": cnpj_cpf,
            "tipo_pessoa": tipo_pessoa,
            "razao_social": razao_social,
            "nome_fantasia": nome_fantasia,
            "endereco_logradouro": endereco_logradouro,
            "endereco_numero": endereco_numero,
            "endereco_complemento": endereco_complemento,
            "endereco_bairro": endereco_bairro,
            "endereco_cidade": endereco_cidade,
            "endereco_uf": endereco_uf,
            "endereco_cep": endereco_cep,
            "email": email,
            "telefone": telefone,
            "ativo": ativo
        })
        
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.delete("/api/fornecedores/{fornecedor_id}")
async def excluir_fornecedor(fornecedor_id: int, db: Session = Depends(get_db)):
    try:
        query = text("DELETE FROM fornecedores WHERE id = :id")
        db.execute(query, {"id": fornecedor_id})
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.get("/api/usuarios-detalhado")
async def listar_usuarios_detalhado(db: Session = Depends(get_db)):
    try:
        query = text("""
            SELECT 
                u.id, u.nome, u.email, u.cpf, u.telefone, u.departamento, u.ativo,
                u.empresa_id, u.role_id,
                r.nome as role,
                e.razao_social as empresa
            FROM usuarios u
            JOIN roles r ON u.role_id = r.id
            JOIN empresas e ON u.empresa_id = e.id
            ORDER BY u.nome
        """)
        
        result = db.execute(query)
        usuarios = result.fetchall()
        
        return {
            "total": len(usuarios),
            "usuarios": [
                {
                    "id": row[0],
                    "nome": row[1],
                    "email": row[2],
                    "cpf": row[3],
                    "telefone": row[4],
                    "departamento": row[5],
                    "ativo": bool(row[6]),
                    "empresa_id": row[7],
                    "role_id": row[8],
                    "role": row[9],
                    "empresa": row[10]
                }
                for row in usuarios
            ]
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.get("/api/usuarios/{usuario_id}")
async def buscar_usuario(usuario_id: int, db: Session = Depends(get_db)):
    try:
        query = text("""
            SELECT 
                u.id, u.nome, u.email, u.cpf, u.telefone, u.departamento, u.ativo,
                u.empresa_id, u.role_id
            FROM usuarios u
            WHERE u.id = :id
        """)
        
        result = db.execute(query, {"id": usuario_id})
        row = result.fetchone()
        
        if not row:
            return JSONResponse(status_code=404, content={"erro": "Usuário não encontrado"})
        
        return {
            "id": row[0],
            "nome": row[1],
            "email": row[2],
            "cpf": row[3],
            "telefone": row[4],
            "departamento": row[5],
            "ativo": bool(row[6]),
            "empresa_id": row[7],
            "role_id": row[8]
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.post("/api/usuarios")
async def criar_usuario(
    nome: str = Form(...),
    email: str = Form(...),
    cpf: Optional[str] = Form(None),
    telefone: Optional[str] = Form(None),
    departamento: Optional[str] = Form(None),
    empresa_id: int = Form(...),
    role_id: int = Form(...),
    senha: str = Form(...),
    ativo: bool = Form(True),
    db: Session = Depends(get_db)
):
    try:
        senha_hash = pwd_context.hash(senha)
        
        query = text("""
            INSERT INTO usuarios (nome, email, cpf, telefone, departamento, empresa_id, role_id, senha_hash, ativo)
            VALUES (:nome, :email, :cpf, :telefone, :departamento, :empresa_id, :role_id, :senha_hash, :ativo)
        """)
        
        result = db.execute(query, {
            "nome": nome,
            "email": email,
            "cpf": cpf,
            "telefone": telefone,
            "departamento": departamento,
            "empresa_id": empresa_id,
            "role_id": role_id,
            "senha_hash": senha_hash,
            "ativo": ativo
        })
        
        usuario_id = result.lastrowid
        db.commit()
        
        return {"success": True, "usuario_id": usuario_id}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.put("/api/usuarios/{usuario_id}")
async def atualizar_usuario(
    usuario_id: int,
    nome: str = Form(...),
    email: str = Form(...),
    cpf: Optional[str] = Form(None),
    telefone: Optional[str] = Form(None),
    departamento: Optional[str] = Form(None),
    empresa_id: int = Form(...),
    role_id: int = Form(...),
    ativo: bool = Form(True),
    db: Session = Depends(get_db)
):
    try:
        query = text("""
            UPDATE usuarios 
            SET nome = :nome, email = :email, cpf = :cpf, telefone = :telefone,
                departamento = :departamento, empresa_id = :empresa_id, role_id = :role_id, ativo = :ativo
            WHERE id = :id
        """)
        
        db.execute(query, {
            "id": usuario_id,
            "nome": nome,
            "email": email,
            "cpf": cpf,
            "telefone": telefone,
            "departamento": departamento,
            "empresa_id": empresa_id,
            "role_id": role_id,
            "ativo": ativo
        })
        
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.put("/api/usuarios/{usuario_id}/senha")
async def alterar_senha_usuario(
    usuario_id: int,
    senha: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        senha_hash = pwd_context.hash(senha)
        
        query = text("UPDATE usuarios SET senha_hash = :senha_hash WHERE id = :id")
        db.execute(query, {"id": usuario_id, "senha_hash": senha_hash})
        db.commit()
        
        return {"success": True}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.delete("/api/usuarios/{usuario_id}")
async def excluir_usuario(usuario_id: int, db: Session = Depends(get_db)):
    try:
        query = text("DELETE FROM usuarios WHERE id = :id")
        db.execute(query, {"id": usuario_id})
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.get("/api/roles")
async def listar_roles(db: Session = Depends(get_db)):
    try:
        query = text("""
            SELECT id, nome, descricao, nivel_acesso
            FROM roles
            WHERE ativo = 1
            ORDER BY nivel_acesso
        """)
        
        result = db.execute(query)
        roles = result.fetchall()
        
        return {
            "total": len(roles),
            "roles": [
                {
                    "id": row[0],
                    "nome": row[1],
                    "descricao": row[2],
                    "nivel_acesso": row[3]
                }
                for row in roles
            ]
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"erro": str(e)})

# ==============================================================================
# API: PROVISIONAMENTOS E FINANCEIRO
# ==============================================================================

@app.get("/api/provisionamentos")
async def listar_provisionamentos(
    status: str = None,
    data_inicial: str = None,
    data_final: str = None,
    fornecedor_id: int = None,
    db: Session = Depends(get_db)
):
    try:
        query_base = """
            SELECT 
                p.id,
                p.data_competencia,
                f.razao_social as fornecedor,
                df.numero_documento,
                p.valor_provisionado,
                p.valor_liquido,
                p.status,
                p.created_at
            FROM provisionamentos p
            JOIN fornecedores f ON p.fornecedor_id = f.id
            JOIN documentos_fiscais df ON p.documento_fiscal_id = df.id
            WHERE 1=1
        """
        
        conditions = []
        params = {}
        
        if status:
            conditions.append("p.status = :status")
            params["status"] = status
        
        if data_inicial and data_final:
            conditions.append("p.data_competencia BETWEEN :data_inicial AND :data_final")
            params["data_inicial"] = data_inicial
            params["data_final"] = data_final
        
        if fornecedor_id:
            conditions.append("p.fornecedor_id = :fornecedor_id")
            params["fornecedor_id"] = fornecedor_id
        
        if conditions:
            query_base += " AND " + " AND ".join(conditions)
        
        query_base += " ORDER BY p.data_competencia DESC LIMIT 100"
        
        result = db.execute(text(query_base), params)
        provisionamentos = result.fetchall()
        
        return {
            "total": len(provisionamentos),
            "provisionamentos": [
                {
                    "id": row[0],
                    "data_competencia": str(row[1]) if row[1] else None,
                    "fornecedor": row[2],
                    "numero_documento": row[3],
                    "valor_provisionado": float(row[4]) if row[4] else 0,
                    "valor_liquido": float(row[5]) if row[5] else 0,
                    "status": row[6],
                    "created_at": str(row[7]) if row[7] else None
                }
                for row in provisionamentos
            ]
        }
    except Exception as e:
        print(f"[v0 Backend] Erro ao listar provisionamentos: {str(e)}")
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.post("/api/provisionamentos/{prov_id}/aprovar")
async def aprovar_provisionamento(prov_id: int, db: Session = Depends(get_db)):
    try:
        user_id = 1  # TODO: Obter da sessão
        
        query = text("""
            UPDATE provisionamentos 
            SET status = 'APROVADO',
                data_aprovacao = NOW(),
                usuario_aprovacao_id = :user_id
            WHERE id = :prov_id
        """)
        
        db.execute(query, {"prov_id": prov_id, "user_id": user_id})
        db.commit()
        
        return {"success": True, "message": "Provisionamento aprovado"}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.post("/api/provisionamentos/{prov_id}/gerar-conta-pagar")
async def gerar_conta_pagar(prov_id: int, db: Session = Depends(get_db)):
    try:
        # Buscar dados do provisionamento
        query_prov = text("""
            SELECT p.empresa_id, p.fornecedor_id, p.valor_liquido, df.data_vencimento
            FROM provisionamentos p
            JOIN documentos_fiscais df ON p.documento_fiscal_id = df.id
            WHERE p.id = :prov_id AND p.status = 'APROVADO'
        """)
        
        result = db.execute(query_prov, {"prov_id": prov_id})
        prov = result.fetchone()
        
        if not prov:
            return JSONResponse(status_code=404, content={"erro": "Provisionamento não encontrado ou não aprovado"})
        
        # Criar conta a pagar
        query_conta = text("""
            INSERT INTO contas_pagar 
            (provisionamento_id, empresa_id, fornecedor_id, valor_original, data_vencimento, status)
            VALUES (:prov_id, :empresa_id, :fornecedor_id, :valor, :vencimento, 'PENDENTE')
        """)
        
        db.execute(query_conta, {
            "prov_id": prov_id,
            "empresa_id": prov[0],
            "fornecedor_id": prov[1],
            "valor": prov[2],
            "vencimento": prov[3]
        })
        
        db.commit()
        
        return {"success": True, "message": "Conta a pagar gerada com sucesso"}
    except Exception as e:
        db.rollback()
        print(f"[v0 Backend] Erro ao gerar conta a pagar: {str(e)}")
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.get("/api/contas-pagar")
async def listar_contas_pagar(
    status: str = None,
    db: Session = Depends(get_db)
):
    try:
        query_base = """
            SELECT 
                cp.id,
                f.razao_social as fornecedor,
                df.numero_documento,
                cp.valor_original,
                cp.data_vencimento,
                cp.status
            FROM contas_pagar cp
            JOIN fornecedores f ON cp.fornecedor_id = f.id
            JOIN provisionamentos p ON cp.provisionamento_id = p.id
            JOIN documentos_fiscais df ON p.documento_fiscal_id = df.id
            WHERE 1=1
        """
        
        params = {}
        
        if status:
            query_base += " AND cp.status = :status"
            params["status"] = status
        
        query_base += " ORDER BY cp.data_vencimento ASC"
        
        result = db.execute(text(query_base), params)
        contas = result.fetchall()
        
        return {
            "total": len(contas),
            "contas": [
                {
                    "id": row[0],
                    "fornecedor": row[1],
                    "numero_documento": row[2],
                    "valor_original": float(row[3]) if row[3] else 0,
                    "data_vencimento": str(row[4]) if row[4] else None,
                    "status": row[5]
                }
                for row in contas
            ]
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"erro": str(e)})

# ==============================================================================
# API: REMESSAS CNAB E RETORNO BANCÁRIO
# ==============================================================================

@app.get("/api/remessas-cnab")
async def listar_remessas(
    status: str = None,
    data_inicial: str = None,
    data_final: str = None,
    db: Session = Depends(get_db)
):
    try:
        query_base = """
            SELECT 
                r.id,
                r.numero_remessa,
                r.data_geracao,
                r.quantidade_registros,
                r.valor_total,
                r.status_remessa,
                EXISTS(SELECT 1 FROM retornos_cnab WHERE remessa_id = r.id) as tem_retorno
            FROM remessas_cnab r
            WHERE 1=1
        """
        
        conditions = []
        params = {}
        
        if status:
            conditions.append("r.status_remessa = :status")
            params["status"] = status
        
        if data_inicial and data_final:
            conditions.append("DATE(r.data_geracao) BETWEEN :data_inicial AND :data_final")
            params["data_inicial"] = data_inicial
            params["data_final"] = data_final
        
        if conditions:
            query_base += " AND " + " AND ".join(conditions)
        
        query_base += " ORDER BY r.data_geracao DESC LIMIT 100"
        
        result = db.execute(text(query_base), params)
        remessas = result.fetchall()
        
        return {
            "total": len(remessas),
            "remessas": [
                {
                    "id": row[0],
                    "numero_remessa": row[1],
                    "data_geracao": str(row[2]) if row[2] else None,
                    "quantidade_registros": row[3],
                    "valor_total": float(row[4]) if row[4] else 0,
                    "status_remessa": row[5],
                    "tem_retorno": bool(row[6])
                }
                for row in remessas
            ]
        }
    except Exception as e:
        print(f"[v0 Backend] Erro ao listar remessas: {str(e)}")
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.post("/api/remessas-cnab")
async def gerar_remessa(
    conta_ids: list = [],
    db: Session = Depends(get_db)
):
    try:
        from pydantic import BaseModel
        
        class RemessaRequest(BaseModel):
            conta_ids: list[int]
        
        # Obter próximo número de remessa
        query_num = text("SELECT COALESCE(MAX(numero_remessa), 0) + 1 FROM remessas_cnab WHERE empresa_id = 1")
        result = db.execute(query_num)
        numero_remessa = result.scalar()
        
        # Buscar contas a pagar
        query_contas = text("""
            SELECT cp.id, cp.valor_original
            FROM contas_pagar cp
            WHERE cp.id IN :conta_ids AND cp.status = 'PENDENTE'
        """)
        
        result = db.execute(query_contas, {"conta_ids": tuple(conta_ids) if conta_ids else (0,)})
        contas = result.fetchall()
        
        if not contas:
            return JSONResponse(status_code=400, content={"erro": "Nenhuma conta válida selecionada"})
        
        # Calcular totais
        quantidade = len(contas)
        valor_total = sum(float(c[1]) for c in contas)
        
        # Gerar nome do arquivo
        nome_arquivo = f"remessa_{numero_remessa:06d}.rem"
        caminho = f"/uploads/remessas/{nome_arquivo}"
        
        # Inserir remessa
        query_remessa = text("""
            INSERT INTO remessas_cnab 
            (empresa_id, nome_arquivo, caminho_arquivo, numero_remessa, quantidade_registros, valor_total, usuario_geracao_id)
            VALUES (1, :nome, :caminho, :numero, :qtd, :valor, 1)
        """)
        
        result = db.execute(query_remessa, {
            "nome": nome_arquivo,
            "caminho": caminho,
            "numero": numero_remessa,
            "qtd": quantidade,
            "valor": valor_total
        })
        
        remessa_id = result.lastrowid
        
        # Atualizar contas a pagar
        for conta_id, _ in contas:
            query_update = text("""
                UPDATE contas_pagar 
                SET remessa_id = :remessa_id, status = 'AGENDADO'
                WHERE id = :conta_id
            """)
            db.execute(query_update, {"remessa_id": remessa_id, "conta_id": conta_id})
        
        db.commit()
        
        return {
            "success": True,
            "remessa_id": remessa_id,
            "numero_remessa": numero_remessa,
            "message": "Remessa gerada com sucesso"
        }
    except Exception as e:
        db.rollback()
        print(f"[v0 Backend] Erro ao gerar remessa: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"erro": str(e)})

@app.post("/api/processar-retorno-cnab")
async def processar_retorno(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        # Ler conteúdo do arquivo de retorno
        content = await file.read()
        content_str = content.decode('latin-1')  # Arquivos CNAB geralmente usam latin-1
        
        # TODO: Implementar parser de arquivo CNAB de retorno
        # Por ora, vamos simular o processamento
        
        # Buscar remessas pendentes de retorno
        query_remessa = text("""
            SELECT id, numero_remessa 
            FROM remessas_cnab 
            WHERE status_remessa IN ('GERADA', 'ENVIADA')
            ORDER BY data_geracao DESC 
            LIMIT 1
        """)
        
        result = db.execute(query_remessa)
        remessa = result.fetchone()
        
        if not remessa:
            return JSONResponse(status_code=404, content={"erro": "Nenhuma remessa pendente encontrada"})
        
        remessa_id = remessa[0]
        
        # Salvar arquivo de retorno
        nome_arquivo_ret = f"retorno_{remessa[1]:06d}.ret"
        caminho_ret = f"/uploads/retornos/{nome_arquivo_ret}"
        
        query_retorno = text("""
            INSERT INTO retornos_cnab 
            (remessa_id, nome_arquivo_retorno, caminho_arquivo, processado, data_processamento, usuario_processamento_id, quantidade_registros)
            VALUES (:remessa_id, :nome, :caminho, TRUE, NOW(), 1, 0)
        """)
        
        db.execute(query_retorno, {
            "remessa_id": remessa_id,
            "nome": nome_arquivo_ret,
            "caminho": caminho_ret
        })
        
        # Atualizar status da remessa
        query_update_remessa = text("""
            UPDATE remessas_cnab 
            SET status_remessa = 'PROCESSADA'
            WHERE id = :remessa_id
        """)
        db.execute(query_update_remessa, {"remessa_id": remessa_id})
        
        # Atualizar contas a pagar para PAGO
        query_update_contas = text("""
            UPDATE contas_pagar 
            SET status = 'PAGO', data_pagamento = NOW(), valor_pago = valor_original
            WHERE remessa_id = :remessa_id
        """)
        result_contas = db.execute(query_update_contas, {"remessa_id": remessa_id})
        
        # Atualizar provisionamentos para PAGO
        query_update_prov = text("""
            UPDATE provisionamentos p
            JOIN contas_pagar cp ON p.id = cp.provisionamento_id
            SET p.status = 'PAGO'
            WHERE cp.remessa_id = :remessa_id
        """)
        db.execute(query_update_prov, {"remessa_id": remessa_id})
        
        db.commit()
        
        return {
            "success": True,
            "remessa_id": remessa_id,
            "processados": result_contas.rowcount,
            "message": "Retorno processado com sucesso"
        }
    except Exception as e:
        db.rollback()
        print(f"[v0 Backend] Erro ao processar retorno: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"erro": str(e)})

# ==============================================================================
# API: APROVAÇÃO E WORKFLOW DE DOCUMENTOS
# ==============================================================================

@app.post("/api/documentos-fiscais/{doc_id}/confirmar")
async def confirmar_documento(
    doc_id: int,
    comentarios: str = Form(...),
    usuario_id: int = Form(1),  # TODO: Obter da sessão
    db: Session = Depends(get_db)
):
    """
    Confirma um documento fiscal e muda status para PROVISIONADO
    Requer comentários obrigatórios
    """
    try:
        if not comentarios or not comentarios.strip():
            return JSONResponse(
                status_code=400,
                content={"erro": "Comentários são obrigatórios para confirmar"}
            )
        
        # Buscar documento
        query_doc = text("SELECT id, status_processamento FROM documentos_fiscais WHERE id = :doc_id")
        result = db.execute(query_doc, {"doc_id": doc_id})
        doc = result.fetchone()
        
        if not doc:
            return JSONResponse(status_code=404, content={"erro": "Documento não encontrado"})
        
        # Permite confirmar se estiver 'PENDENTE' ou 'REVISAR'
        allowed_status = ['PENDENTE', 'REVISAR']
        
        if doc[1] not in allowed_status:
            return JSONResponse(
                status_code=400,
                content={"erro": f"Documento não está em status PENDENTE ou REVISAR (atual: {doc[1]})"}
            )
        
        # Atualizar status do documento
        update_query = text("""
            UPDATE documentos_fiscais 
            SET status_processamento = 'PROVISIONADO',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :doc_id
        """)
        
        db.execute(update_query, {"doc_id": doc_id})
        db.commit()
        
        # Registrar histórico em Firebase
        historico_db.registrar_acao(
            documento_id=doc_id,
            acao="CONFIRMAR",
            usuario_id=usuario_id,
            comentarios=comentarios.strip(),
            novo_status="PROVISIONADO"
        )
        
        print(f"[v0] Documento {doc_id} confirmado com status PROVISIONADO")
        
        return {
            "success": True,
            "message": "Documento confirmado com sucesso",
            "novo_status": "PROVISIONADO"
        }
        
    except Exception as e:
        db.rollback()
        print(f"[v0 Backend] Erro ao confirmar documento: {str(e)}")
        return JSONResponse(status_code=500, content={"erro": str(e)})


@app.post("/api/documentos-fiscais/{doc_id}/revisar")
async def revisar_documento(
    doc_id: int,
    comentarios: str = Form(...),
    usuario_id: int = Form(1),  # TODO: Obter da sessão
    db: Session = Depends(get_db)
):
    """
    Marca um documento para revisão e muda status para REVISAR
    Requer comentários obrigatórios
    """
    try:
        if not comentarios or not comentarios.strip():
            return JSONResponse(
                status_code=400,
                content={"erro": "Comentários são obrigatórios para revisar"}
            )
        
        # Buscar documento
        query_doc = text("SELECT id, status_processamento FROM documentos_fiscais WHERE id = :doc_id")
        result = db.execute(query_doc, {"doc_id": doc_id})
        doc = result.fetchone()
        
        if not doc:
            return JSONResponse(status_code=404, content={"erro": "Documento não encontrado"})
        
        # Pode revisar documentos em vários status
        allowed_status = ['PENDENTE', 'PROVISIONADO', 'PROCESSADO']
        if doc[1] not in allowed_status:
            return JSONResponse(
                status_code=400,
                content={"erro": f"Documento não pode ser revisado (status atual: {doc[1]})"}
            )
        
        # Atualizar status do documento
        update_query = text("""
            UPDATE documentos_fiscais 
            SET status_processamento = 'REVISAR',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :doc_id
        """)
        
        db.execute(update_query, {"doc_id": doc_id})
        db.commit()
        
        # Registrar histórico em Firebase
        historico_db.registrar_acao(
            documento_id=doc_id,
            acao="REVISAR",
            usuario_id=usuario_id,
            comentarios=comentarios.strip(),
            novo_status="REVISAR"
        )
        
        print(f"[v0] Documento {doc_id} marcado para revisão")
        
        return {
            "success": True,
            "message": "Documento marcado para revisão",
            "novo_status": "REVISAR"
        }
        
    except Exception as e:
        db.rollback()
        print(f"[v0 Backend] Erro ao revisar documento: {str(e)}")
        return JSONResponse(status_code=500, content={"erro": str(e)})


@app.get("/api/documentos-fiscais/{doc_id}/historico")
async def obter_historico_documento(
    doc_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtém o histórico de ações (confirmações, revisões) de um documento,
    incluindo os nomes dos usuários.
    """
    try:
        # 1. Verificar se documento existe
        query_doc = text("SELECT id FROM documentos_fiscais WHERE id = :doc_id")
        result = db.execute(query_doc, {"doc_id": doc_id})
        doc = result.fetchone()
        
        if not doc:
            return JSONResponse(status_code=404, content={"erro": "Documento não encontrado"})
        
        # 2. Obter histórico "cru" (raw) do Firebase/local
        historico_raw = historico_db.obter_historico(doc_id)
        
        # 3. Se não houver histórico, retornar lista vazia
        if not historico_raw:
            return {
                "sucesso": True,
                "documento_id": doc_id,
                "total_acoes": 0,
                "historico": []
            }

        # 4. Extrair IDs de usuário únicos do histórico
        usuario_ids = list(set(item.get('usuario_id') for item in historico_raw if item.get('usuario_id')))

        # 5. Buscar nomes dos usuários no MySQL
        nomes_usuarios = {}
        if usuario_ids:
            # Consulta SQL para buscar IDs e Nomes da tabela 'usuarios'
            query_nomes = text("SELECT id, nome FROM usuarios WHERE id IN :ids")
            result_nomes = db.execute(query_nomes, {"ids": tuple(usuario_ids)})
            
            # Criar um mapa de ID -> Nome
            nomes_usuarios = {row[0]: row[1] for row in result_nomes}

        # 6. Processar o histórico para adicionar os nomes
        historico_processado = []
        for item in historico_raw:
            user_id = item.get('usuario_id')
            # Adiciona o nome encontrado no mapa, ou um texto padrão se não encontrar
            item['usuario_nome'] = nomes_usuarios.get(user_id, f"Usuário ID: {user_id}")
            historico_processado.append(item)
            
        # 7. Retornar o histórico processado
        return {
            "sucesso": True,
            "documento_id": doc_id,
            "total_acoes": len(historico_processado),
            "historico": historico_processado # Retorna a lista com nomes
        }
        
    except Exception as e:
        print(f"[v0 Backend] Erro ao obter histórico: {str(e)}")
        return JSONResponse(status_code=500, content={"erro": str(e)})

# ==============================================================================
# API: AUDITORIA E LOGS
# ==============================================================================

@app.get("/api/auditoria/log_atividades")
async def get_log_atividades(db: Session = Depends(get_db)):
    """
    Busca um log unificado de atividades de criação de várias tabelas 
    para a página de Auditoria.
    """
    try:
        # Esta é a query UNION que unifica os logs
        query_str = """
        (
            -- 1. Documentos Fiscais Criados
            SELECT
                df.created_at AS data_hora,
                COALESCE(u.nome, 'Sistema') AS usuario,
                'DOCUMENTO_CRIADO' AS acao,
                CONCAT('Doc Fiscal Nº ', df.numero_documento, ' (R$ ', FORMAT(df.valor_total, 2, 'pt_BR'), ') foi criado.') AS descricao,
                df.id AS referencia_id
            FROM documentos_fiscais df
            LEFT JOIN usuarios u ON df.usuario_criacao_id = u.id
        )
        UNION ALL
        (
            -- 2. Anexos Enviados
            SELECT
                a.created_at AS data_hora,
                u.nome AS usuario,
                'ANEXO_UPLOAD' AS acao,
                CONCAT('Arquivo ', a.nome_original, ' (', a.tipo_arquivo, ') foi enviado.') AS descricao,
                a.id AS referencia_id
            FROM anexos a
            JOIN usuarios u ON a.uploaded_by = u.id
        )
        UNION ALL
        (
            -- 3. Provisionamentos Criados
            SELECT
                p.created_at AS data_hora,
                u.nome AS usuario,
                'PROV_CRIADO' AS acao,
                CONCAT('Provisionamento (R$ ', FORMAT(p.valor_provisionado, 2, 'pt_BR'), ') criado para Doc ID ', p.documento_fiscal_id) AS descricao,
                p.id AS referencia_id
            FROM provisionamentos p
            JOIN usuarios u ON p.usuario_criacao_id = u.id
        )
        UNION ALL
        (
            -- 4. Remessas CNAB Geradas
            SELECT
                r.data_geracao AS data_hora,
                u.nome AS usuario,
                'REMESSA_GERADA' AS acao,
                CONCAT('Remessa CNAB Nº ', r.numero_remessa, ' (R$ ', FORMAT(r.valor_total, 2, 'pt_BR'), ') foi gerada.') AS descricao,
                r.id AS referencia_id
            FROM remessas_cnab r
            JOIN usuarios u ON r.usuario_geracao_id = u.id
        )
        UNION ALL
        (
            -- 5. Usuários Criados
            SELECT
                u.created_at AS data_hora,
                'Sistema' AS usuario, -- A tabela de usuários não tem "criado_por"
                'USUARIO_CRIADO' AS acao,
                CONCAT('Usuário ', u.nome, ' (', u.email, ') foi criado.') AS descricao,
                u.id AS referencia_id
            FROM usuarios u
        )
        
        -- Ordena o log unificado e limita aos 500 eventos mais recentes
        ORDER BY data_hora DESC
        LIMIT 500;
        """
        
        result = db.execute(text(query_str))
        logs = result.fetchall()
        
        # Formata a saída para JSON
        atividades = []
        for log in logs:
            atividades.append({
                "data_hora": log[0].isoformat() if log[0] else None,
                "usuario": log[1],
                "acao": log[2],
                "descricao": log[3],
                "referencia_id": log[4]
            })
            
        return {"success": True, "atividades": atividades}
        
    except Exception as e:
        print(f"[v0 Backend] Erro ao buscar log de auditoria: {str(e)}")
        # Trata o erro de "FORMAT" que pode não existir em todos os dialetos MySQL
        if "FUNCTION" in str(e).upper() and "FORMAT" in str(e).upper():
             return JSONResponse(status_code=500, content={"erro": "Função 'FORMAT' não encontrada. Verifique a versão do seu MySQL."})
        return JSONResponse(status_code=500, content={"erro": str(e)})

# ==============================================================================
# API: DASHBOARD E GRÁFICOS
# ==============================================================================

@app.get("/api/dashboard/kpis")
async def get_dashboard_kpis(db: Session = Depends(get_db)):
    """
    Retorna os 4 KPIs principais para os cards do dashboard.
    """
    try:
        # 1. Total Provisionado (Valor R$)
        # Soma o valor de todos os documentos que já foram confirmados
        q_prov = text("""
            SELECT SUM(valor_total) 
            FROM documentos_fiscais 
            WHERE status_processamento = 'PROVISIONADO'
        """)
        total_prov = db.execute(q_prov).scalar() or 0

        # 2. Contas Vencidas (Valor R$)
        # Soma contas 'VENCIDO' ou 'PENDENTE' com data de vencimento no passado
        q_venc = text("""
            SELECT SUM(valor_original) 
            FROM contas_pagar 
            WHERE status = 'VENCIDO' OR (status = 'PENDENTE' AND data_vencimento < CURDATE())
        """)
        total_venc = db.execute(q_venc).scalar() or 0

        # 3. Documentos Pendentes (Contagem)
        # Conta quantos documentos estão na fila de entrada
        q_pend = text("SELECT COUNT(id) FROM documentos_fiscais WHERE status_processamento = 'PENDENTE'")
        count_pend = db.execute(q_pend).scalar() or 0

        # 4. Documentos para Revisar (Contagem)
        # Conta quantos documentos foram marcados para revisão
        q_rev = text("SELECT COUNT(id) FROM documentos_fiscais WHERE status_processamento = 'REVISAR'")
        count_rev = db.execute(q_rev).scalar() or 0

        return {
            "success": True,
            "kpis": {
                "total_provisionado": float(total_prov),
                "contas_vencidas": float(total_venc),
                "docs_pendentes": int(count_pend),
                "docs_revisar": int(count_rev)
            }
        }
    except Exception as e:
        print(f"[v0 Backend] Erro ao buscar KPIs: {str(e)}")
        return JSONResponse(status_code=500, content={"erro": str(e)})


@app.get("/api/dashboard/gastos_fornecedor")
async def get_gastos_fornecedor(db: Session = Depends(get_db)):
    """
    Retorna dados para o gráfico de barras (Gastos Provisionados por Fornecedor).
    """
    try:
        query = text("""
            SELECT 
                f.razao_social, 
                SUM(df.valor_total) as total
            FROM documentos_fiscais df
            JOIN fornecedores f ON df.fornecedor_id = f.id
            WHERE df.status_processamento = 'PROVISIONADO'
            GROUP BY f.razao_social
            ORDER BY total DESC
            LIMIT 10;
        """)
        result = db.execute(query).fetchall()
        
        # Formata para Chart.js
        labels = [row[0] for row in result]
        data = [float(row[1]) for row in result]
        
        return {"success": True, "labels": labels, "data": data}
    except Exception as e:
        print(f"[v0 Backend] Erro nos gastos por fornecedor: {str(e)}")
        return JSONResponse(status_code=500, content={"erro": str(e)})


@app.get("/api/dashboard/docs_por_status")
async def get_docs_por_status(db: Session = Depends(get_db)):
    """
    Retorna dados para o gráfico de pizza (Documentos por Status).
    """
    try:
        query = text("""
            SELECT 
                status_processamento, 
                COUNT(id) as contagem
            FROM documentos_fiscais
            GROUP BY status_processamento;
        """)
        result = db.execute(query).fetchall()
        
        # Formata para Chart.js
        labels = [row[0] for row in result]
        data = [int(row[1]) for row in result]
        
        return {"success": True, "labels": labels, "data": data}
    except Exception as e:
        print(f"[v0 Backend] Erro nos docs por status: {str(e)}")
        return JSONResponse(status_code=500, content={"erro": str(e)})

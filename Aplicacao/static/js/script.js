// ================================
// Sistema de Gestão Fiscal - Frontend
// ================================

// ================================
// Controle da Sidebar (Menu Lateral)
// ================================

const sidebar = document.querySelector(".sidebar")
const sidebarToggler = document.querySelector(".sidebar-toggler")
let paginaAtual = "dashboard"; // Guarda qual página está sendo exibida

if (sidebarToggler) {
  // Alterna entre sidebar expandida e recolhida
  sidebarToggler.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed")
  })
}

// ================================
// Botão de Logout
// ================================

const logoutBtn = document.getElementById("logoutBtn")
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault()
    const confirmar = confirm("Deseja realmente sair do sistema?")
    if (!confirmar) return
    
    // Remove dados de autenticação salvos localmente
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    window.location.href = "/login"
  })
}

// ================================
// Verificação de Login e Montagem do Menu
// ================================

document.addEventListener("DOMContentLoaded", () => {
  // Só verifica login se não estiver na página de login
  if (!window.location.pathname.includes("/login")) {
    const userData = localStorage.getItem("user")
    const token = localStorage.getItem("token")
    
    // Se não tiver usuário logado, redireciona para login
    if (!userData || !token) {
      window.location.href = "/login"
      return
    }

    const user = JSON.parse(userData)
    console.log("[v0] Usuário logado:", user.nome, "Role:", user.role)
    console.log("[v0] Permissões:", user.permissoes)
    
    // Extrai os menus que o usuário pode acessar
    let menus = []
    if (user.permissoes) {
      if (typeof user.permissoes === "string") {
        try {
          const permObj = JSON.parse(user.permissoes)
          menus = permObj.menus || []
        } catch (e) {
          console.error("[v0] Erro ao parsear permissões:", e)
        }
      } else if (user.permissoes.menus) {
        menus = user.permissoes.menus
      }
    }
    
    console.log("[v0] Menus a serem montados:", menus)
    montarMenuDinamico(menus)
    
    // Carrega a página inicial (dashboard)
    loadPage('dashboard');
  }
})

// ================================
// Mapeamento dos Menus do Sistema
// Define ícones, labels e ordem de exibição
// ================================

const MENU_MAP = {
  dashboard: { label: "DashBoard KPI's", icon: "dashboard", order: 1 },
  documentos_fiscais: { label: "Documentos Fiscais", icon: "account_balance_wallet", order: 2 },
  provisionamentos: { label: "Provisionamentos", icon: "assured_workload", order: 3 },
  projetos: { label: "Projetos", icon: "partner_exchange", order: 4 },
  centros_custo: { label: "Centros de Custo", icon: "schema", order: 5 },
  remessas_cnab: { label: "Remessas CNAB", icon: "corporate_fare", order: 6 },
  relatorios: { label: "Auditoria e Relatórios", icon: "query_stats", order: 7 },
  cadastros_base: { label: "Cadastro Base", icon: "handshake", order: 8 },
  usuarios: { label: "Gestão de Usuários", icon: "person_edit", order: 9 },
}

// ================================
// Funções Auxiliares Globais
// ================================

/**
 * Fecha e remove qualquer modal da tela
 * @param {string} modalId - ID do modal (ex: "modalDocumento")
 */
function fecharModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.remove()
  }
}

/**
 * Abre/fecha menus dropdown nas tabelas (botão de ações)
 * @param {Event} event - Evento do clique
 */
function toggleActionsMenu(event) {
  event.stopPropagation(); // Evita que o clique se propague

  const button = event.currentTarget;
  const menu = button.nextElementSibling;
  
  if (!menu) {
    console.error("[v0] Menu dropdown não encontrado ao lado do botão");
    return;
  }

  const isAlreadyActive = menu.classList.contains("active");
  
  // Fecha todos os menus abertos antes
  document.querySelectorAll(".dropdown-menu.active, .actions-menu.active").forEach((m) => {
    m.classList.remove("active");
  });
  
  // Se o menu clicado estava fechado, abre ele
  if (!isAlreadyActive) {
    menu.classList.add("active");
  }
}

/**
 * Fecha menus dropdown quando clicar fora deles
 */
document.addEventListener("click", function (event) {
  const clickedElement = event.target;
  const isToggleButton = clickedElement.closest(".action-btn, .btn-icon");
  const isInsideMenu = clickedElement.closest(".dropdown-menu, .actions-menu");
  
  // Se clicou fora do botão e fora do menu, fecha tudo
  if (!isToggleButton && !isInsideMenu) {
    document.querySelectorAll(".dropdown-menu.active, .actions-menu.active").forEach(menu => {
      menu.classList.remove("active");
    });
  }
});

/**
 * Popula um <select> com a lista de fornecedores vindos da API
 * Conecta com: GET /api/fornecedores (main.py)
 * @param {string} selector - Seletor CSS do elemento (ex: "#meuSelect")
 * @param {object} options - Configurações opcionais
 * @param {any} options.valorSelecionado - ID do fornecedor a pré-selecionar
 * @param {string} options.placeholder - Texto da primeira opção
 */
async function popularSelectFornecedores(selector, { valorSelecionado = null, placeholder = "Todos" } = {}) {
  const select = document.querySelector(selector)
  if (!select) {
    console.warn(`[v0] Select não encontrado: ${selector}`)
    return
  }

  try {
    const response = await fetch("/api/fornecedores")
    const data = await response.json()
    
    if (!data.fornecedores) {
      select.innerHTML = '<option>Nenhum fornecedor</option>'
      return
    }

    let optionsHtml = ""
    if (placeholder) {
      optionsHtml += `<option value="">${placeholder}</option>`
    }

    data.fornecedores.forEach((f) => {
      const selecionado = f.id == valorSelecionado ? "selected" : ""
      optionsHtml += `<option value="${f.id}" ${selecionado}>${f.razao_social}</option>`
    })
    
    select.innerHTML = optionsHtml
  } catch (error) {
    console.error(`[v0] Erro ao carregar fornecedores para ${selector}:`, error)
    select.innerHTML = '<option>Erro ao carregar</option>'
  }
}

/**
 * Filtra linhas de uma tabela com base em texto digitado (busca client-side)
 * @param {string} inputId - ID do input de busca
 * @param {string} tableBodyId - ID do tbody da tabela
 */
function filtrarTabela(inputId, tableBodyId) {
  try {
    const search = document.getElementById(inputId).value.toLowerCase()
    const rows = document.querySelectorAll(`#${tableBodyId} tr`)
    
    rows.forEach((row) => {
      const text = row.textContent.toLowerCase()
      row.style.display = text.includes(search) ? "" : "none"
    })
  } catch (e) {
    console.error(`[v0] Erro ao filtrar tabela: ${e.message}`)
  }
}

// ================================
// Funções de Formatação
// ================================

/**
 * Formata um número para moeda brasileira (R$ 1.234,56)
 */
function formatarMoeda(valor) {
  if (typeof valor !== "number") {
    valor = Number.parseFloat(valor) || 0
  }
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

/**
 * Retorna a classe CSS do badge baseado no status
 */
function getStatusBadgeClass(status) {
  const classes = {
    RASCUNHO: "secondary",
    PENDENTE_APROVACAO: "warning",
    PENDENTE: "warning",
    APROVADO: "success",
    PROCESSADO: "success",
    PAGO: "success",
    REJEITADO: "danger",
    ERRO: "danger",
    CANCELADO: "secondary",
    GERADA: "info",
    ENVIADA: "info",
    PROCESSADA: "success",
    AGENDADO: "info",
    VENCIDO: "danger",
    PROVISIONADO: "info",
    REVISAR: "warning",
  }
  return classes[status] || "secondary"
}

/**
 * Retorna um badge HTML colorido para ações de auditoria
 * @param {string} acao - Nome da ação (ex: 'DOCUMENTO_CRIADO')
 */
function getAcaoBadge(acao) {
  let colorClass = "pendente"; // Amarelo por padrão
  
  if (acao.includes('CRIADO') || acao.includes('UPLOAD')) {
    colorClass = "processado"; // Azul claro
  } else if (acao.includes('APROVADA')) {
    colorClass = "aprovado"; // Verde
  } else if (acao.includes('GERADA')) {
    colorClass = "info"; // Azul
  } else if (acao.includes('LOGIN')) {
    colorClass = "cancelado"; // Cinza/Rosa
  }

  return `<span class="status-badge ${colorClass}">${acao.replace("_", " ")}</span>`;
}

/**
 * Formata uma data no padrão brasileiro (DD/MM/AAAA)
 */
function formatarData(data) {
  if (!data) return "-"
  try {
    // Adiciona horário zerado para interpretar como data local
    const d = new Date(data + "T00:00:00")
    if (isNaN(d.getTime())) return "-"
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
  } catch (e) {
    console.error("[v0] Erro ao formatar data:", data, e)
    return "-"
  }
}

/**
 * Formata um número com duas casas decimais (1234.56 → 1.234,56)
 */
function formatarValor(valor) {
  if (!valor) return "0,00"
  return Number.parseFloat(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Formata um CNPJ (12345678000195 → 12.345.678/0001-95)
 */
function formatarCNPJ(cnpj) {
  if (!cnpj) return "-"
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

/**
 * Formata CPF ou CNPJ dependendo do tipo de pessoa
 */
function formatarCNPJCPF(doc, tipo) {
  if (!doc) return "-"
  if (tipo === "PF") {
    return doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")
  } else {
    return doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
  }
}

/**
 * Formata data e hora no padrão brasileiro (DD/MM/AAAA HH:MM:SS)
 */
function formatarDataHora(dataISO) {
  if (!dataISO) return "-"
  const data = new Date(dataISO)
  return data.toLocaleString("pt-BR")
}

// ================================
// Montagem do Menu Dinâmico (Sidebar)
// Constrói o menu baseado nas permissões do usuário
// ================================

function montarMenuDinamico(menus) {
  const navList = document.querySelector(".primary-nav")
  if (!navList) {
    console.error("[v0] Elemento .primary-nav não encontrado!")
    return
  }

  navList.innerHTML = ""
  
  // Remove duplicatas e ordena pelos menus mapeados
  const uniqueMenus = Array.isArray(menus) ? [...new Set(menus)] : []
  console.log("[v0] Menus únicos:", uniqueMenus)

  uniqueMenus.sort((a, b) => {
    const oa = MENU_MAP[a] ? MENU_MAP[a].order : 999
    const ob = MENU_MAP[b] ? MENU_MAP[b].order : 999
    return oa - ob
  })

  uniqueMenus.forEach((key) => {
    const item = MENU_MAP[key]
    if (!item) {
      console.warn("[v0] Menu não mapeado:", key)
      return
    }

    const li = document.createElement("li")
    li.className = "nav-item"
    li.innerHTML = `
      <a href="#" class="nav-link" data-page="${key}">
        <span class="material-symbols-sharp">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
      </a>
      <span class="nav-tooltip">${item.label}</span>
    `
    navList.appendChild(li)
  })

  console.log("[v0] Menu montado com", uniqueMenus.length, "itens")

  // Adiciona listeners para trocar de página ao clicar
  document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault()
      const page = link.getAttribute("data-page")
      
      // Remove destaque dos outros links
      document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"))
      link.classList.add("active")
      
      loadPage(page)
    })
  })
}

// ================================
// Carregamento de Páginas (SPA)
// Funciona como um mini-router front-end
// ================================

function loadPage(page) {
  paginaAtual = page; // Atualiza a página atual
  
  const mainContent = document.querySelector(".main-content")
  if (!mainContent) return

  console.log("[v0] Carregando página:", page)

  switch (page) {
    case "dashboard":
      carregarDashboard();
      break
    case "documentos_fiscais":
      carregarDocumentosFiscais()
      break
    case "provisionamentos":
      carregarProvisionamentos()
      break
    case "relatorios":
      carregarAuditoriaRelatorios();
      break
    case "remessas_cnab":
      carregarRemessasCNAB()
      break
    case "cadastros_base":
      carregarCadastrosBase()
      break
    case "usuarios":
      carregarGestaoUsuarios()
      break
    default:
      mainContent.innerHTML = `
        <div class="welcome-message">
          <h1>O que vamos fazer hoje?</h1>
        </div>
      `
  }
}

// ================================
// PÁGINA: Documentos Fiscais
// Conecta com: GET /api/documentos-fiscais (main.py)
// ================================

async function carregarDocumentosFiscais() {
  const mainContent = document.querySelector(".main-content")
  
  // Renderiza o HTML da página (filtros, tabela, botões)
  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h1>Documentos Fiscais</h1>
        <p class="page-subtitle">Gerencie todos os documentos fiscais da empresa</p>
      </div>

      <!-- Barra de pesquisa -->
      <div class="search-bar">
        <span class="material-symbols-sharp search-icon">search</span>
        <input type="text" id="searchInput" placeholder="Buscar por número, fornecedor, descrição...">
      </div>

      <!-- Seção de filtros -->
      <div class="filters-section">
        <h3 class="filters-title">Filtros</h3>
        <div class="filters-grid">
          <div class="filter-group">
            <label>Tipo de Data</label>
            <select class="filter-select" id="filterTipoData">
              <option value="emissao">Data de Emissão</option>
              <option value="recebimento">Data de Recebimento</option>
              <option value="competencia">Data de Competência</option>
              <option value="vencimento">Data de Vencimento</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Data Inicial</label>
            <input type="date" class="filter-input" id="filterDataInicial">
          </div>
          <div class="filter-group">
            <label>Data Final</label>
            <input type="date" class="filter-input" id="filterDataFinal">
          </div>
          <div class="filter-group">
            <label>Tipo de Documento</label>
            <select class="filter-select" id="filterTipoDoc">
              <option value="">Todos</option>
              <option value="NF-e">NF-e</option>
              <option value="NFS-e">NFS-e</option>
              <option value="CT-e">CT-e</option>
              <option value="NFC-e">NFC-e</option>
              <option value="BOLETO">BOLETO</option>
              <option value="CONTRATO">CONTRATO</option>
              <option value="RECIBO">RECIBO</option>
              <option value="OUTROS">OUTROS</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Status</label>
            <select class="filter-select" id="filterStatus">
              <option value="">Todos</option>
              <option value="Pendente">Pendente</option>
              <option value="Processado">Processado</option>
              <option value="Provisionado">Provisionado</option>
              <option value="Revisar">Revisar</option>
              <option value="Erro">Erro</option>
              <option value="Manual">Manual</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Fornecedor</label>
            <select class="filter-select" id="filterFornecedor">
              <option value="">Todos</option>
            </select>
          </div>
        </div>
        <div class="filters-actions">
          <button class="btn btn-primary" onclick="aplicarFiltros()">
            <span class="material-symbols-sharp">filter_alt</span>
            Aplicar Filtros
          </button>
          <button class="btn btn-secondary" onclick="limparFiltros()">
            <span class="material-symbols-sharp">filter_alt_off</span>
            Limpar Filtros
          </button>
        </div>
      </div>

      <!-- Tabela de documentos -->
      <div class="table-container">
        <table class="documents-table">
          <thead>
            <tr>
              <th>Data Emissão</th>
              <th>Data Recebimento</th>
              <th>Data Competência</th>
              <th>Data Vencimento</th>
              <th>Número</th>
              <th>Tipo</th>
              <th>Fornecedor</th>
              <th>Valor Total</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="documentsTableBody">
            <tr><td colspan="10">Carregando documentos...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Botões de ação -->
      <div class="action-buttons">
        <button class="btn btn-upload" onclick="importarXML()">
          <span class="material-symbols-sharp">upload_file</span>
          Importar XML
        </button>
        <button class="btn btn-add" onclick="cadastrarManual()">
          <span class="material-symbols-sharp">add_circle</span>
          Cadastrar Manualmente
        </button>
      </div>
    </div>
  `

  // Após renderizar, busca os dados da API
  await popularSelectFornecedores("#filterFornecedor", { placeholder: "Todos" })
  await carregarDocumentos()

  // Adiciona listener no campo de busca
  const searchInput = document.getElementById("searchInput")
  if (searchInput) {
    searchInput.addEventListener("input", aplicarFiltros)
  }
}

// ================================
// Funções de Ação para Documentos
// (Confirmar, Revisar, Histórico)
// ================================

let documentoEmAcao = null // Armazena temporariamente qual doc está sendo confirmado/revisado

/**
 * Abre modal para adicionar comentários ao confirmar ou revisar um documento
 * @param {number} docId - ID do documento
 * @param {string} acao - "CONFIRMAR" ou "REVISAR"
 */
function abrirModalComentarios(docId, acao) {
  documentoEmAcao = { id: docId, acao: acao }
  
  const titulo = acao === "CONFIRMAR" ? "Confirmar Documento" : "Revisar Documento"
  const descricao = acao === "CONFIRMAR"
    ? "Ao confirmar, o status do documento será alterado para PROVISIONADO"
    : "Ao revisar, o documento será marcado para revisão"

  const modal = document.createElement("div")
  modal.id = "modal-comentarios"
  modal.className = "modal-overlay"
  modal.innerHTML = `
    <div class="modal-content modal-comentarios">
      <div class="modal-header">
        <h2>${titulo}</h2>
        <button class="close-btn" onclick="fecharModalComentarios()">
          <span class="material-symbols-sharp">close</span>
        </button>
      </div>
      <div class="modal-body">
        <p class="modal-descricao">${descricao}</p>
        <div class="form-group full-width">
          <label>Comentários *</label>
          <textarea id="comentarios-input" class="form-control" rows="5" required></textarea>
          <small class="form-text">Mínimo 10 caracteres</small>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-secondary-cancelar" onclick="fecharModalComentarios()">
          <span class="material-symbols-sharp">cancel</span>
          Cancelar
        </button>
        <button class="btn btn-primary btn-primary-confirmar" onclick="confirmarAcao()">
          <span class="material-symbols-sharp">check_circle</span>
          ${acao === "CONFIRMAR" ? "Confirmar" : "Revisar"}
        </button>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Dá foco no campo de texto
  setTimeout(() => {
    const textarea = document.getElementById("comentarios-input")
    if (textarea) textarea.focus()
  }, 100)
}

function fecharModalComentarios() {
  fecharModal("modal-comentarios")
  documentoEmAcao = null
}

/**
 * Envia a confirmação ou revisão do documento para o backend
 * Conecta com: POST /api/documentos-fiscais/{id}/confirmar ou /revisar (main.py)
 */
async function confirmarAcao() {
  if (!documentoEmAcao) return;

  const comentarios = document.getElementById("comentarios-input")?.value || "";

  // Valida se o campo tem pelo menos 10 caracteres
  if (!comentarios || comentarios.trim().length < 10) {
    alert("Por favor, digite comentários com no mínimo 10 caracteres");
    return;
  }

  try {
    const endpoint = documentoEmAcao.acao === "CONFIRMAR"
      ? `/api/documentos-fiscais/${documentoEmAcao.id}/confirmar`
      : `/api/documentos-fiscais/${documentoEmAcao.id}/revisar`;

    const formData = new FormData();
    formData.append("comentarios", comentarios.trim());
    formData.append("usuario_id", 1); // TODO: Pegar do localStorage

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Erro: ${error.erro}`);
      return;
    }

    const data = await response.json();
    fecharModalComentarios();
    alert(data.message);

    // Recarrega a lista correta dependendo da página atual
    if (paginaAtual === "provisionamentos") {
      await carregarDocumentosProvisionados();
    } else if (paginaAtual === "documentos_fiscais") {
      await carregarDocumentos();
    }

  } catch (error) {
    console.error("[v0] Erro ao confirmar ação:", error);
    alert("Erro ao processar solicitação");
  }
}

/**
 * Mostra o histórico de ações realizadas em um documento
 * Conecta com: GET /api/documentos-fiscais/{id}/historico (main.py)
 */
async function visualizarHistoricoDocumento(docId) {
  try {
    const response = await fetch(`/api/documentos-fiscais/${docId}/historico`)
    const data = await response.json()

    if (!data.sucesso) {
      alert("Erro ao carregar histórico")
      return
    }

    const modal = document.createElement("div")
    modal.id = "modal-historico"
    modal.className = "modal-overlay"

    let historicoHtml = ""
    if (data.historico && data.historico.length > 0) {
      historicoHtml = data.historico
        .map(
          (item) => `
          <div class="historico-item">
            <div class="historico-header">
              <span class="acao-badge ${item.acao.toLowerCase()}">${item.acao}</span>
              <span class="data-hora">${formatarDataHora(item.data_hora)}</span>
            </div>
            <div class="historico-body">
              <p><strong>Novo Status:</strong> ${item.novo_status}</p>
              <p><strong>Usuário:</strong> ${item.usuario_nome || 'Desconhecido'}</p>
              <p><strong>Comentários:</strong> ${item.comentarios}</p>
            </div>
          </div>
          `,
        )
        .join("")
    } else {
      historicoHtml = '<p class="historico-vazio">Nenhuma ação registrada</p>'
    }

    modal.innerHTML = `
      <div class="modal-content historico">
        <div class="modal-header">
          <h2>Histórico do Documento ${docId}</h2>
          <button class="close-btn" onclick="fecharModal('modal-historico')">
            <span class="material-symbols-sharp">close</span>
          </button>
        </div>
        <div class="modal-body">
          ${historicoHtml}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="fecharModal('modal-historico')">Fechar</button>
        </div>
      </div>
    `

    document.body.appendChild(modal)
  } catch (error) {
    console.error("[v0] Erro ao visualizar histórico:", error)
    alert("Erro ao carregar histórico")
  }
}

// ================================
// Carregamento da Lista de Documentos
// Conecta com: GET /api/documentos-fiscais (main.py)
// ================================

async function carregarDocumentos() {
  try {
    // Coleta os filtros preenchidos pelo usuário
    const searchTerm = document.getElementById("searchInput")?.value || ""
    const tipoData = document.getElementById("filterTipoData")?.value || "emissao"
    const dataInicial = document.getElementById("filterDataInicial")?.value || ""
    const dataFinal = document.getElementById("filterDataFinal")?.value || ""
    const tipoDoc = document.getElementById("filterTipoDoc")?.value || ""
    const status = document.getElementById("filterStatus")?.value || ""
    const fornecedorId = document.getElementById("filterFornecedor")?.value || ""

    // Monta a query string para a API
    const params = new URLSearchParams()
    if (searchTerm.trim()) params.append("search", searchTerm.trim())
    if (tipoData) params.append("tipo_data", tipoData)
    if (dataInicial) params.append("data_inicial", dataInicial)
    if (dataFinal) params.append("data_final", dataFinal)
    if (tipoDoc) params.append("tipo_documento", tipoDoc)
    if (status) params.append("status", status)
    if (fornecedorId) params.append("fornecedor_id", fornecedorId)

    const queryString = params.toString()
    const url = `/api/documentos-fiscais${queryString ? `?${queryString}` : ""}`

    console.log("[v0] Buscando documentos com URL:", url)

    const response = await fetch(url)
    const data = await response.json()

    console.log("[v0] Documentos recebidos:", data.total)

    const tbody = document.getElementById("documentsTableBody")
    if (!tbody) return

    // Se não houver documentos, mostra mensagem
    if (!data.documentos || data.documentos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 20px;">
            Nenhum documento fiscal encontrado
          </td>
        </tr>
      `
      return
    }

    // Preenche a tabela com os documentos
    tbody.innerHTML = data.documentos
      .map(
        (doc) => `
        <tr>
          <td>${formatarData(doc.data_emissao)}</td>
          <td>${formatarData(doc.data_recebimento)}</td>
          <td>${formatarData(doc.data_competencia)}</td>
          <td>${formatarData(doc.data_vencimento)}</td>
          <td>${doc.numero_documento || "-"}</td>
          <td><span class="tipo-badge">${doc.tipo_documento}</span></td>
          <td>${doc.fornecedor || "-"}</td>
          <td>R$ ${formatarValor(doc.valor_total)}</td>
          <td><span class="status-badge ${doc.status_processamento.toLowerCase()}">${doc.status_processamento}</span></td>
          <td>
            <div class="actions-menu">
              <button class="action-btn" onclick="toggleActionsMenu(event)">
                <span class="material-symbols-sharp">more_vert</span>
              </button>
              <div class="dropdown-menu">
                <button onclick="visualizarDoc(${doc.id})">
                  <span class="material-symbols-sharp">visibility</span>
                  Visualizar
                </button>
                <button onclick="editarDoc(${doc.id})">
                  <span class="material-symbols-sharp">edit</span>
                  Editar
                </button>
                <button onclick="abrirModalComentarios(${doc.id}, 'CONFIRMAR')">
                  <span class="material-symbols-sharp">check_circle</span>
                  Confirmar
                </button>
                <button onclick="abrirModalComentarios(${doc.id}, 'REVISAR')">
                  <span class="material-symbols-sharp">assignment</span>
                  Revisar
                </button>
                <button onclick="visualizarHistoricoDocumento(${doc.id})">
                  <span class="material-symbols-sharp">history</span>
                  Histórico
                </button>
                <button onclick="excluirDoc(${doc.id})">
                  <span class="material-symbols-sharp">delete</span>
                  Excluir
                </button>
              </div>
            </div>
          </td>
        </tr>
        `,
      )
      .join("")
  } catch (error) {
    console.error("[v0] Erro ao carregar documentos:", error)
    const tbody = document.getElementById("documentsTableBody")
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 20px; color: red;">
            Erro ao carregar documentos: ${error.message}
          </td>
        </tr>
      `
    }
  }
}

// ================================
// Funções de Filtro
// ================================

function aplicarFiltros() {
  carregarDocumentos()
}

function limparFiltros() {
  document.getElementById("searchInput").value = ""
  document.getElementById("filterTipoData").value = "emissao"
  document.getElementById("filterDataInicial").value = ""
  document.getElementById("filterDataFinal").value = ""
  document.getElementById("filterTipoDoc").value = ""
  document.getElementById("filterStatus").value = ""
  document.getElementById("filterFornecedor").value = ""
  carregarDocumentos()
}

// ================================
// Ações de Documento (Visualizar, Editar, Excluir)
// Conectam com main.py
// ================================

/**
 * Visualiza um documento fiscal específico
 * Conecta com: GET /api/documentos-fiscais/{id} (main.py)
 */
async function visualizarDoc(id) {
  try {
    const response = await fetch(`/api/documentos-fiscais/${id}`)
    const doc = await response.json()

    if (!response.ok) {
      alert("Erro ao carregar documento")
      return
    }

    mostrarModalDocumento(doc, "visualizar")
  } catch (error) {
    console.error("[v0] Erro ao visualizar documento:", error)
    alert("Erro ao carregar documento")
  }
}

/**
 * Edita um documento fiscal existente
 * Conecta com: GET /api/documentos-fiscais/{id} (main.py)
 */
async function editarDoc(id) {
  try {
    const response = await fetch(`/api/documentos-fiscais/${id}`)
    const doc = await response.json()

    if (!response.ok) {
      alert("Erro ao carregar documento")
      return
    }

    mostrarModalDocumento(doc, "editar")
  } catch (error) {
    console.error("[v0] Erro ao editar documento:", error)
    alert("Erro ao carregar documento")
  }
}

/**
 * Exclui um documento fiscal
 * Conecta com: DELETE /api/documentos-fiscais/{id} (main.py)
 */
async function excluirDoc(id) {
  if (!confirm("Deseja realmente excluir este documento?")) return

  try {
    const response = await fetch(`/api/documentos-fiscais/${id}`, {
      method: "DELETE",
    })

    const result = await response.json()

    if (result.success) {
      alert("Documento excluído com sucesso!")
      
      // Recarrega a lista correta
      if (paginaAtual === "provisionamentos") {
        carregarDocumentosProvisionados();
      } else {
        carregarDocumentos();
      }
    } else {
      alert("Erro ao excluir documento")
    }
  } catch (error) {
    console.error("[v0] Erro ao excluir documento:", error)
    alert("Erro ao excluir documento")
  }
}

// ================================
// Modal de Visualização/Edição de Documento
// ================================

function mostrarModalDocumento(doc, modo) {
  const readonly = modo === "visualizar"

  const modalHTML = `
    <div id="modalDocumento" class="modal-overlay">
      <div class="modal-content large">
        <div class="modal-header">
          <h2>${modo === "visualizar" ? "Visualizar" : "Editar"} Documento Fiscal</h2>
          <button class="close-btn" onclick="fecharModal('modalDocumento')">
            <span class="material-symbols-sharp">close</span>
          </button>
        </div>
        <form id="formDocumento" class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Empresa</label>
              <input type="text" value="${doc.empresa_nome}" disabled class="readonly-input">
            </div>
            
            <div class="form-group">
              <label>Fornecedor *</label>
              ${readonly 
                ? `<input type="text" value="${doc.fornecedor_nome}" disabled class="readonly-input">`
                : `<select name="fornecedor_id" required ${readonly ? "disabled" : ""}></select>`
              }
            </div>

            <div class="form-group">
              <label>Tipo de Documento *</label>
              <select name="tipo_documento" required ${readonly ? "disabled" : ""}>
                <option value="NF-e" ${doc.tipo_documento === "NF-e" ? "selected" : ""}>NF-e</option>
                <option value="NFS-e" ${doc.tipo_documento === "NFS-e" ? "selected" : ""}>NFS-e</option>
                <option value="CT-e" ${doc.tipo_documento === "CT-e" ? "selected" : ""}>CT-e</option>
                <option value="NFC-e" ${doc.tipo_documento === "NFC-e" ? "selected" : ""}>NFC-e</option>
                <option value="BOLETO" ${doc.tipo_documento === "BOLETO" ? "selected" : ""}>BOLETO</option>
                <option value="CONTRATO" ${doc.tipo_documento === "CONTRATO" ? "selected" : ""}>CONTRATO</option>
                <option value="RECIBO" ${doc.tipo_documento === "RECIBO" ? "selected" : ""}>RECIBO</option>
                <option value="OUTROS" ${doc.tipo_documento === "OUTROS" ? "selected" : ""}>OUTROS</option>
              </select>
            </div>

            <div class="form-group">
              <label>Número Documento *</label>
              <input type="text" name="numero_documento" value="${doc.numero_documento || ""}" required ${readonly ? "readonly" : ""}>
            </div>

            <div class="form-group">
              <label>Série</label>
              <input type="text" name="serie" value="${doc.serie || ""}" ${readonly ? "readonly" : ""}>
            </div>

            <div class="form-group full-width">
              <label>Chave de Acesso</label>
              <input type="text" name="chave_acesso" value="${doc.chave_acesso || ""}" ${readonly ? "readonly" : ""}>
            </div>

            <div class="form-group">
              <label>Data Emissão *</label>
              <input type="date" name="data_emissao" value="${doc.data_emissao || ""}" required ${readonly ? "readonly" : ""}>
            </div>

            <div class="form-group">
              <label>Data Recebimento</label>
              <input type="date" name="data_recebimento" value="${doc.data_recebimento || ""}" ${readonly ? "readonly" : ""}>
            </div>

            <div class="form-group">
              <label>Data Vencimento</label>
              <input type="date" name="data_vencimento" value="${doc.data_vencimento || ""}" ${readonly ? "readonly" : ""}>
            </div>

            <div class="form-group">
              <label>Data Competência</label>
              <input type="date" name="data_competencia" value="${doc.data_competencia || ""}" ${readonly ? "readonly" : ""}>
            </div>

            <div class="form-group">
              <label>Valor Total *</label>
              <input type="number" step="0.01" name="valor_total" value="${doc.valor_total || ""}" required ${readonly ? "readonly" : ""}>
            </div>

            <div class="form-group">
              <label>Valor Impostos</label>
              <input type="number" step="0.01" name="valor_impostos" value="${doc.valor_impostos || ""}" ${readonly ? "readonly" : ""}>
            </div>

            <div class="form-group">
              <label>Valor Líquido</label>
              <input type="number" step="0.01" name="valor_liquido" value="${doc.valor_liquido || ""}" ${readonly ? "readonly" : ""}>
            </div>

            <div class="form-group">
              <label>UF Origem</label>
              <input type="text" name="uf_origem" value="${doc.uf_origem || ""}" maxlength="2" ${readonly ? "readonly" : ""}>
            </div>

            <div class="form-group">
              <label>UF Destino</label>
              <input type="text" name="uf_destino" value="${doc.uf_destino || ""}" maxlength="2" ${readonly ? "readonly" : ""}>
            </div>

            <div class="form-group">
              <label>Município Prestação</label>
              <input type="text" name="municipio_prestacao" value="${doc.municipio_prestacao || ""}" ${readonly ? "readonly" : ""}>
            </div>

            <div class="form-group full-width">
              <label>Descrição do Serviço/Produto</label>
              <textarea name="descricao_servico_produto" rows="3" ${readonly ? "readonly" : ""}>${doc.descricao_servico_produto || ""}</textarea>
            </div>

            <div class="form-group full-width">
              <label>Observações</label>
              <textarea name="observacoes" rows="3" ${readonly ? "readonly" : ""}>${doc.observacoes || ""}</textarea>
            </div>
          </div>

          <!-- Seção de Anexos -->
          <div class="form-group full-width">
            <label>Anexos</label>
            <div class="anexos-list">
              ${
                doc.anexos && doc.anexos.length > 0
                  ? doc.anexos
                      .map(
                        (a) => `
                      <div class="anexo-item">
                        <span class="material-symbols-sharp">attach_file</span>
                        <a href="/api/download-arquivo/${a.id}" target="_blank">${a.nome_original}</a>
                        <span class="anexo-tipo">${a.tipo_arquivo}</span>
                        ${
                          !readonly
                            ? `
                          <button type="button" class="anexo-delete-btn" onclick="excluirAnexo(${doc.id}, ${a.id})">
                            <span class="material-symbols-sharp">delete</span>
                          </button>
                          `
                            : ""
                        }
                      </div>
                      `,
                      )
                      .join("")
                  : "<p>Nenhum anexo</p>"
              }
            </div>
            ${
              !readonly
                ? `
            <div class="upload-section">
              <input type="file" id="fileUpload">
              <button type="button" class="btn btn-secondary" onclick="uploadArquivo(${doc.id})">
                <span class="material-symbols-sharp">upload</span>
                Adicionar Anexo
              </button>
            </div>
            `
                : ""
            }
          </div>
        </form>

        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="fecharModal('modalDocumento')">
            ${readonly ? "Fechar" : "Cancelar"}
          </button>
          ${
            !readonly
              ? `
          <button class="btn btn-primary" onclick="salvarDocumento(${doc.id})">
            <span class="material-symbols-sharp">save</span>
            Salvar Alterações
          </button>
          `
              : ""
          }
        </div>
      </div>
    </div>
  `

  document.body.insertAdjacentHTML("beforeend", modalHTML)

  // Se for modo edição, carrega a lista de fornecedores
  if (modo === "editar") {
    popularSelectFornecedores("#modalDocumento [name='fornecedor_id']", {
      valorSelecionado: doc.fornecedor_id,
      placeholder: null,
    })
  }
}

/**
 * Salva as alterações de um documento editado
 * Conecta com: PUT /api/documentos-fiscais/{id} (main.py)
 */
async function salvarDocumento(id) {
  const form = document.getElementById("formDocumento")
  const formData = new FormData(form)

  try {
    const response = await fetch(`/api/documentos-fiscais/${id}`, {
      method: "PUT",
      body: formData,
    })

    const result = await response.json()

    if (result.success) {
      alert("Documento atualizado com sucesso!")
      fecharModal("modalDocumento")
      
      // Recarrega a lista correta
      if (paginaAtual === "provisionamentos") {
        carregarDocumentosProvisionados();
      } else {
        carregarDocumentos();
      }
    } else {
      alert("Erro ao atualizar documento")
    }
  } catch (error) {
    console.error("[v0] Erro ao salvar documento:", error)
    alert("Erro ao salvar documento")
  }
}

/**
 * Faz upload de um anexo para um documento
 * Conecta com: POST /api/upload-arquivo (main.py)
 */
async function uploadArquivo(documentoId) {
  const fileInput = document.getElementById("fileUpload")
  const file = fileInput.files[0]

  if (!file) {
    alert("Selecione um arquivo")
    return
  }

  const formData = new FormData()
  formData.append("file", file)
  formData.append("documento_id", documentoId)
  formData.append("tipo_relacao", "COMPLEMENTAR")

  try {
    const response = await fetch("/api/upload-arquivo", {
      method: "POST",
      body: formData,
    })

    const result = await response.json()

    if (result.success) {
      alert("Arquivo enviado com sucesso!")
      // Recarrega o modal para mostrar o novo anexo
      fecharModal("modalDocumento")
      editarDoc(documentoId)
    } else {
      alert("Erro ao enviar arquivo")
    }
  } catch (error) {
    console.error("[v0] Erro no upload:", error)
    alert("Erro ao enviar arquivo")
  }
}

/**
 * Exclui um anexo de um documento
 * Conecta com: DELETE /api/anexos/{id} (main.py)
 */
async function excluirAnexo(docId, anexoId) {
  if (!confirm("Deseja realmente excluir este anexo?")) return;

  try {
    const response = await fetch(`/api/anexos/${anexoId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (result.success) {
      alert("Anexo excluído com sucesso!");
      // Recarrega o modal de edição
      fecharModal('modalDocumento');
      editarDoc(docId);
    } else {
      alert("Erro ao excluir anexo: " + (result.erro || "Erro desconhecido"));
    }
  } catch (error) {
    console.error("[v0] Erro ao excluir anexo:", error);
    alert("Erro ao excluir anexo.");
  }
}

// ================================
// Importação de XML
// Conecta com: POST /api/importar-xml (main.py)
// ================================

function importarXML() {
  const modalHTML = `
    <div id="modalImportarXML" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Importar XML</h2>
          <button class="close-btn" onclick="fecharModal('modalImportarXML')">
            <span class="material-symbols-sharp">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="upload-area">
            <span class="material-symbols-sharp" style="font-size: 48px; color: #49609b;">upload_file</span>
            <h3>Selecione o arquivo XML</h3>
            <p>Formatos aceitos: NF-e, NFS-e, CT-e, NFC-e</p>
            <input type="file" id="xmlFileInput" accept=".xml" style="display: none;">
            <button class="btn btn-primary" onclick="document.getElementById('xmlFileInput').click()">
              Escolher Arquivo
            </button>
            <p id="selectedFile" style="margin-top: 10px; color: #636e72;"></p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="fecharModal('modalImportarXML')">Cancelar</button>
          <button class="btn btn-primary" onclick="processarXML()">
            <span class="material-symbols-sharp">check</span>
            Importar
          </button>
        </div>
      </div>
    </div>
  `

  document.body.insertAdjacentHTML("beforeend", modalHTML)

  // Mostra o nome do arquivo selecionado
  document.getElementById("xmlFileInput").addEventListener("change", (e) => {
    const fileName = e.target.files[0]?.name || ""
    document.getElementById("selectedFile").textContent = fileName ? `Arquivo: ${fileName}` : ""
  })
}

async function processarXML() {
  const fileInput = document.getElementById("xmlFileInput")
  const file = fileInput.files[0]

  if (!file) {
    alert("Selecione um arquivo XML")
    return
  }

  const formData = new FormData()
  formData.append("file", file)

  try {
    const response = await fetch("/api/importar-xml", {
      method: "POST",
      body: formData,
    })

    const result = await response.json()

    if (result.success) {
      alert("XML importado com sucesso!")
      fecharModal("modalImportarXML")
      carregarDocumentos()
    } else {
      alert(`Erro ao importar XML: ${result.erro || "Erro desconhecido"}`)
    }
  } catch (error) {
    console.error("[v0] Erro ao importar XML:", error)
    alert("Erro ao importar XML")
  }
}

// ================================
// Cadastro Manual de Documento
// Conecta com: POST /api/documentos-fiscais (main.py)
// ================================

function cadastrarManual() {
  const modalHTML = `
    <div id="modalCadastrar" class="modal-overlay">
      <div class="modal-content large">
        <div class="modal-header">
          <h2>Cadastrar Documento Fiscal</h2>
          <button class="close-btn" onclick="fecharModal('modalCadastrar')">
            <span class="material-symbols-sharp">close</span>
          </button>
        </div>
        <form id="formCadastro" class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Fornecedor *</label>
              <select name="fornecedor_id" required>
                <option value="">Selecione...</option>
              </select>
            </div>

            <div class="form-group">
              <label>Tipo de Documento *</label>
              <select name="tipo_documento" required>
                <option value="">Selecione...</option>
                <option value="NF-e">NF-e</option>
                <option value="NFS-e">NFS-e</option>
                <option value="CT-e">CT-e</option>
                <option value="NFC-e">NFC-e</option>
                <option value="BOLETO">BOLETO</option>
                <option value="CONTRATO">CONTRATO</option>
                <option value="RECIBO">RECIBO</option>
                <option value="OUTROS">OUTROS</option>
              </select>
            </div>

            <div class="form-group">
              <label>Número Documento *</label>
              <input type="text" name="numero_documento" required>
            </div>

            <div class="form-group">
              <label>Série</label>
              <input type="text" name="serie">
            </div>

            <div class="form-group full-width">
              <label>Chave de Acesso</label>
              <input type="text" name="chave_acesso">
            </div>

            <div class="form-group">
              <label>Data Emissão *</label>
              <input type="date" name="data_emissao" required>
            </div>

            <div class="form-group">
              <label>Data Recebimento</label>
              <input type="date" name="data_recebimento">
            </div>

            <div class="form-group">
              <label>Data Vencimento</label>
              <input type="date" name="data_vencimento">
            </div>

            <div class="form-group">
              <label>Data Competência</label>
              <input type="date" name="data_competencia">
            </div>

            <div class="form-group">
              <label>Valor Total *</label>
              <input type="number" step="0.01" name="valor_total" required>
            </div>

            <div class="form-group">
              <label>Valor Impostos</label>
              <input type="number" step="0.01" name="valor_impostos">
            </div>

            <div class="form-group">
              <label>UF Origem</label>
              <input type="text" name="uf_origem" maxlength="2">
            </div>

            <div class="form-group">
              <label>UF Destino</label>
              <input type="text" name="uf_destino" maxlength="2">
            </div>

            <div class="form-group">
              <label>Município Prestação</label>
              <input type="text" name="municipio_prestacao">
            </div>

            <div class="form-group full-width">
              <label>Descrição do Serviço/Produto</label>
              <textarea name="descricao_servico_produto" rows="3"></textarea>
            </div>

            <div class="form-group full-width">
              <label>Observações</label>
              <textarea name="observacoes" rows="3"></textarea>
            </div>

            <div class="form-group full-width">
              <label>Anexo (Opcional)</label>
              <input type="file" id="fileUploadCadastro">
            </div>
          </div>
        </form>

        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="fecharModal('modalCadastrar')">Cancelar</button>
          <button class="btn btn-primary" onclick="salvarNovo()">
            <span class="material-symbols-sharp">save</span>
            Salvar Documento
          </button>
        </div>
      </div>
    </div>
  `

  document.body.insertAdjacentHTML("beforeend", modalHTML)
  popularSelectFornecedores("#modalCadastrar [name='fornecedor_id']", { placeholder: "Selecione..." })
}

async function salvarNovo() {
  const form = document.getElementById("formCadastro");
  const fileInput = document.getElementById("fileUploadCadastro");
  const file = fileInput.files[0];

  if (!form.checkValidity()) {
    alert("Preencha todos os campos obrigatórios");
    return;
  }

  const formData = new FormData(form);

  try {
    // 1. Salva o documento fiscal
    const response = await fetch("/api/documentos-fiscais", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!result.success) {
      alert("Erro ao cadastrar documento: " + (result.erro || "Erro desconhecido"));
      return;
    }

    const novoDocumentoId = result.documento_id;

    // 2. Se houver arquivo anexado, faz o upload
    if (file && novoDocumentoId) {
      const fileFormData = new FormData();
      fileFormData.append("file", file);
      fileFormData.append("documento_id", novoDocumentoId);
      fileFormData.append("tipo_relacao", "PRINCIPAL");

      const uploadResponse = await fetch("/api/upload-arquivo", {
        method: "POST",
        body: fileFormData,
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResult.success) {
        alert("Documento e anexo cadastrados com sucesso!");
      } else {
        alert(`Documento salvo (ID: ${novoDocumentoId}), mas falha ao enviar anexo: ${uploadResult.erro}`);
      }
    } else {
      alert("Documento cadastrado com sucesso!");
    }

    fecharModal("modalCadastrar");
    carregarDocumentos();
  } catch (error) {
    console.error("[v0] Erro ao cadastrar:", error);
    alert("Erro ao cadastrar documento");
  }
}

// ================================
// PÁGINA: Cadastros Base (Empresas e Fornecedores)
// Conecta com: GET /api/empresas e GET /api/fornecedores (main.py)
// ================================

async function carregarCadastrosBase() {
  const mainContent = document.querySelector(".main-content")
  
  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h1>Cadastro Base</h1>
        <p class="page-subtitle">Gerencie empresas e fornecedores</p>
      </div>

      <!-- Sistema de Tabs -->
      <div class="tabs-container">
        <div class="tabs">
          <button class="tab-btn active" onclick="mostrarTab('empresas', this)">
            <span class="material-symbols-sharp">business</span>
            Empresas
          </button>
          <button class="tab-btn" onclick="mostrarTab('fornecedores', this)">
            <span class="material-symbols-sharp">local_shipping</span>
            Fornecedores
          </button>
        </div>

        <!-- Tab de Empresas -->
        <div id="tab-empresas" class="tab-content active">
          <div class="table-header">
            <div class="search-bar">
              <span class="material-symbols-sharp search-icon">search</span>
              <input type="text" id="searchEmpresas" placeholder="Buscar empresas..." onkeyup="filtrarTabela('searchEmpresas', 'empresasTableBody')">
            </div>
            <button class="btn btn-primary" onclick="novaEmpresa()">
              <span class="material-symbols-sharp">add</span>
              Nova Empresa
            </button>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>CNPJ</th>
                  <th>Razão Social</th>
                  <th>Nome Fantasia</th>
                  <th>Cidade/UF</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody id="empresasTableBody">
                <tr><td colspan="6">Carregando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab de Fornecedores -->
        <div id="tab-fornecedores" class="tab-content">
          <div class="table-header">
            <div class="search-bar">
              <span class="material-symbols-sharp search-icon">search</span>
              <input type="text" id="searchFornecedores" placeholder="Buscar fornecedores..." onkeyup="filtrarTabela('searchFornecedores', 'fornecedoresTableBody')">
            </div>
            <button class="btn btn-primary" onclick="novoFornecedor()">
              <span class="material-symbols-sharp">add</span>
              Novo Fornecedor
            </button>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>CNPJ/CPF</th>
                  <th>Tipo</th>
                  <th>Razão Social</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody id="fornecedoresTableBody">
                <tr><td colspan="7">Carregando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `

  // Carrega os dados após renderizar
  await carregarListaEmpresas()
  await carregarListaFornecedores()
}

function mostrarTab(tab, element) {
  // Remove destaque de todas as tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"))
  document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"))
  
  // Ativa a tab clicada
  element.classList.add("active")
  document.getElementById(`tab-${tab}`).classList.add("active")
}

// ================================
// Gerenciamento de Empresas
// ================================

/**
 * Carrega a lista de empresas
 * Conecta com: GET /api/empresas (main.py)
 */
async function carregarListaEmpresas() {
  try {
    const response = await fetch("/api/empresas")
    const data = await response.json()
    
    const tbody = document.getElementById("empresasTableBody")
    if (!tbody) return

    if (!data.empresas || data.empresas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhuma empresa cadastrada</td></tr>'
      return
    }

    tbody.innerHTML = data.empresas
      .map(
        (emp) => `
        <tr>
          <td>${formatarCNPJ(emp.cnpj)}</td>
          <td>${emp.razao_social}</td>
          <td>${emp.nome_fantasia || "-"}</td>
          <td>${emp.endereco_cidade || "-"}/${emp.endereco_uf || "-"}</td>
          <td><span class="status-badge ${emp.ativa ? "aprovado" : "erro"}">${emp.ativa ? "Ativa" : "Inativa"}</span></td>
          <td>
            <div class="actions-menu">
              <button class="action-btn" onclick="toggleActionsMenu(event)">
                <span class="material-symbols-sharp">more_vert</span>
              </button>
              <div class="dropdown-menu">
                <button onclick="editarEmpresa(${emp.id})">
                  <span class="material-symbols-sharp">edit</span>
                  Editar
                </button>
                <button onclick="excluirEmpresa(${emp.id})">
                  <span class="material-symbols-sharp">delete</span>
                  Excluir
                </button>
              </div>
            </div>
          </td>
        </tr>
        `,
      )
      .join("")
  } catch (error) {
    console.error("[v0] Erro ao carregar empresas:", error)
  }
}

function novaEmpresa() {
  mostrarModalEmpresa(null)
}

/**
 * Carrega dados de uma empresa para edição
 * Conecta com: GET /api/empresas/{id} (main.py)
 */
async function editarEmpresa(id) {
  try {
    const response = await fetch(`/api/empresas/${id}`)
    const empresa = await response.json()
    mostrarModalEmpresa(empresa)
  } catch (error) {
    console.error("[v0] Erro ao carregar empresa:", error)
    alert("Erro ao carregar empresa")
  }
}

function mostrarModalEmpresa(empresa) {
  const isEdit = empresa !== null

  const modalHTML = `
    <div id="modalEmpresa" class="modal-overlay">
      <div class="modal-content large">
        <div class="modal-header">
          <h2>${isEdit ? "Editar" : "Nova"} Empresa</h2>
          <button class="close-btn" onclick="fecharModal('modalEmpresa')">
            <span class="material-symbols-sharp">close</span>
          </button>
        </div>
        <form id="formEmpresa" class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>CNPJ *</label>
              <input type="text" name="cnpj" value="${empresa?.cnpj || ""}" required maxlength="18">
            </div>

            <div class="form-group">
              <label>Razão Social *</label>
              <input type="text" name="razao_social" value="${empresa?.razao_social || ""}" required>
            </div>

            <div class="form-group">
              <label>Nome Fantasia</label>
              <input type="text" name="nome_fantasia" value="${empresa?.nome_fantasia || ""}">
            </div>

            <div class="form-group">
              <label>Inscrição Estadual</label>
              <input type="text" name="inscricao_estadual" value="${empresa?.inscricao_estadual || ""}">
            </div>

            <div class="form-group">
              <label>Inscrição Municipal</label>
              <input type="text" name="inscricao_municipal" value="${empresa?.inscricao_municipal || ""}">
            </div>
          </div>

          <h3 style="margin-top: 20px; margin-bottom: 10px;">Endereço</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>CEP</label>
              <input type="text" name="endereco_cep" value="${empresa?.endereco_cep || ""}" maxlength="9">
            </div>

            <div class="form-group">
              <label>Logradouro</label>
              <input type="text" name="endereco_logradouro" value="${empresa?.endereco_logradouro || ""}">
            </div>

            <div class="form-group">
              <label>Número</label>
              <input type="text" name="endereco_numero" value="${empresa?.endereco_numero || ""}">
            </div>

            <div class="form-group">
              <label>Complemento</label>
              <input type="text" name="endereco_complemento" value="${empresa?.endereco_complemento || ""}">
            </div>

            <div class="form-group">
              <label>Bairro</label>
              <input type="text" name="endereco_bairro" value="${empresa?.endereco_bairro || ""}">
            </div>

            <div class="form-group">
              <label>Cidade</label>
              <input type="text" name="endereco_cidade" value="${empresa?.endereco_cidade || ""}">
            </div>

            <div class="form-group">
              <label>UF</label>
              <input type="text" name="endereco_uf" value="${empresa?.endereco_uf || ""}" maxlength="2">
            </div>
          </div>

          <h3 style="margin-top: 20px; margin-bottom: 10px;">Contato</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Email Principal</label>
              <input type="email" name="email_principal" value="${empresa?.email_principal || ""}">
            </div>

            <div class="form-group">
              <label>Telefone Principal</label>
              <input type="text" name="telefone_principal" value="${empresa?.telefone_principal || ""}">
            </div>

            <div class="form-group">
              <label>Status</label>
              <select name="ativa">
                <option value="true" ${empresa?.ativa !== false ? "selected" : ""}>Ativa</option>
                <option value="false" ${empresa?.ativa === false ? "selected" : ""}>Inativa</option>
              </select>
            </div>
          </div>
        </form>

        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="fecharModal('modalEmpresa')">Cancelar</button>
          <button class="btn btn-primary" onclick="salvarEmpresa(${empresa?.id || 'null'})">
            <span class="material-symbols-sharp">save</span>
            Salvar
          </button>
        </div>
      </div>
    </div>
  `

  document.body.insertAdjacentHTML("beforeend", modalHTML)
}

/**
 * Salva ou atualiza uma empresa
 * Conecta com: POST /api/empresas ou PUT /api/empresas/{id} (main.py)
 */
async function salvarEmpresa(id) {
  const form = document.getElementById("formEmpresa")
  
  if (!form.checkValidity()) {
    alert("Preencha todos os campos obrigatórios")
    return
  }

  const formData = new FormData(form)
  
  // Remove formatação do CNPJ antes de enviar
  const cnpjInput = form.querySelector('[name="cnpj"]');
  if (cnpjInput) {
    const cleanedCnpj = cnpjInput.value.replace(/\D/g, '');
    formData.set('cnpj', cleanedCnpj);
  }

  const url = id ? `/api/empresas/${id}` : "/api/empresas"
  const method = id ? "PUT" : "POST"

  try {
    const response = await fetch(url, {
      method: method,
      body: formData,
    })

    const result = await response.json()

    if (result.success) {
      alert(id ? "Empresa atualizada com sucesso!" : "Empresa cadastrada com sucesso!")
      fecharModal("modalEmpresa")
      carregarListaEmpresas()
    } else {
      alert("Erro ao salvar empresa: " + (result.erro || "Verifique os dados"));
    }
  } catch (error) {
    console.error("[v0] Erro ao salvar empresa:", error)
    alert("Erro ao salvar empresa")
  }
}

/**
 * Exclui uma empresa
 * Conecta com: DELETE /api/empresas/{id} (main.py)
 */
async function excluirEmpresa(id) {
  if (!confirm("Deseja realmente excluir esta empresa?")) return

  try {
    const response = await fetch(`/api/empresas/${id}`, {
      method: "DELETE",
    })

    const result = await response.json()

    if (result.success) {
      alert("Empresa excluída com sucesso!")
      carregarListaEmpresas()
    } else {
      alert("Erro ao excluir empresa")
    }
  } catch (error) {
    console.error("[v0] Erro ao excluir empresa:", error)
    alert("Erro ao excluir empresa")
  }
}

// ================================
// Gerenciamento de Fornecedores
// (Segue o mesmo padrão das empresas)
// ================================

/**
 * Carrega a lista de fornecedores
 * Conecta com: GET /api/fornecedores (main.py)
 */
async function carregarListaFornecedores() {
  try {
    const response = await fetch("/api/fornecedores")
    const data = await response.json()
    
    const tbody = document.getElementById("fornecedoresTableBody")
    if (!tbody) return

    if (!data.fornecedores || data.fornecedores.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum fornecedor cadastrado</td></tr>'
      return
    }

    tbody.innerHTML = data.fornecedores
      .map(
        (forn) => `
        <tr>
          <td>${formatarCNPJCPF(forn.cnpj_cpf, forn.tipo_pessoa)}</td>
          <td><span class="tipo-badge">${forn.tipo_pessoa}</span></td>
          <td>${forn.razao_social}</td>
          <td>${forn.email || "-"}</td>
          <td>${forn.telefone || "-"}</td>
          <td><span class="status-badge ${forn.ativo ? "aprovado" : "erro"}">${forn.ativo ? "Ativo" : "Inativo"}</span></td>
          <td>
            <div class="actions-menu">
              <button class="action-btn" onclick="toggleActionsMenu(event)">
                <span class="material-symbols-sharp">more_vert</span>
              </button>
              <div class="dropdown-menu">
                <button onclick="editarFornecedor(${forn.id})">
                  <span class="material-symbols-sharp">edit</span>
                  Editar
                </button>
                <button onclick="excluirFornecedor(${forn.id})">
                  <span class="material-symbols-sharp">delete</span>
                  Excluir
                </button>
              </div>
            </div>
          </td>
        </tr>
        `,
      )
      .join("")
  } catch (error) {
    console.error("[v0] Erro ao carregar fornecedores:", error)
  }
}

function novoFornecedor() {
  mostrarModalFornecedor(null)
}

async function editarFornecedor(id) {
  try {
    const response = await fetch(`/api/fornecedores/${id}`)
    const fornecedor = await response.json()
    mostrarModalFornecedor(fornecedor)
  } catch (error) {
    console.error("[v0] Erro ao carregar fornecedor:", error)
    alert("Erro ao carregar fornecedor")
  }
}

function mostrarModalFornecedor(fornecedor) {
  const isEdit = fornecedor !== null

  const modalHTML = `
    <div id="modalFornecedor" class="modal-overlay">
      <div class="modal-content large">
        <div class="modal-header">
          <h2>${isEdit ? "Editar" : "Novo"} Fornecedor</h2>
          <button class="close-btn" onclick="fecharModal('modalFornecedor')">
            <span class="material-symbols-sharp">close</span>
          </button>
        </div>
        <form id="formFornecedor" class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Tipo Pessoa *</label>
              <select name="tipo_pessoa" required onchange="alterarTipoPessoa()">
                <option value="PJ" ${fornecedor?.tipo_pessoa === "PJ" ? "selected" : ""}>Pessoa Jurídica</option>
                <option value="PF" ${fornecedor?.tipo_pessoa === "PF" ? "selected" : ""}>Pessoa Física</option>
              </select>
            </div>

            <div class="form-group">
              <label id="labelDocumento">${fornecedor?.tipo_pessoa === "PF" ? "CPF" : "CNPJ"} *</label>
              <input type="text" name="cnpj_cpf" value="${fornecedor?.cnpj_cpf || ""}" required>
            </div>

            <div class="form-group">
              <label>Razão Social / Nome *</label>
              <input type="text" name="razao_social" value="${fornecedor?.razao_social || ""}" required>
            </div>

            <div class="form-group">
              <label>Nome Fantasia</label>
              <input type="text" name="nome_fantasia" value="${fornecedor?.nome_fantasia || ""}">
            </div>
          </div>

          <h3 style="margin-top: 20px; margin-bottom: 10px;">Endereço</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>CEP</label>
              <input type="text" name="endereco_cep" value="${fornecedor?.endereco_cep || ""}">
            </div>

            <div class="form-group">
              <label>Logradouro</label>
              <input type="text" name="endereco_logradouro" value="${fornecedor?.endereco_logradouro || ""}">
            </div>

            <div class="form-group">
              <label>Número</label>
              <input type="text" name="endereco_numero" value="${fornecedor?.endereco_numero || ""}">
            </div>

            <div class="form-group">
              <label>Complemento</label>
              <input type="text" name="endereco_complemento" value="${fornecedor?.endereco_complemento || ""}">
            </div>

            <div class="form-group">
              <label>Bairro</label>
              <input type="text" name="endereco_bairro" value="${fornecedor?.endereco_bairro || ""}">
            </div>

            <div class="form-group">
              <label>Cidade</label>
              <input type="text" name="endereco_cidade" value="${fornecedor?.endereco_cidade || ""}">
            </div>

            <div class="form-group">
              <label>UF</label>
              <input type="text" name="endereco_uf" value="${fornecedor?.endereco_uf || ""}" maxlength="2">
            </div>
          </div>

          <h3 style="margin-top: 20px; margin-bottom: 10px;">Contato</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Email</label>
              <input type="email" name="email" value="${fornecedor?.email || ""}">
            </div>

            <div class="form-group">
              <label>Telefone</label>
              <input type="text" name="telefone" value="${fornecedor?.telefone || ""}">
            </div>

            <div class="form-group">
              <label>Status</label>
              <select name="ativo">
                <option value="true" ${fornecedor?.ativo !== false ? "selected" : ""}>Ativo</option>
                <option value="false" ${fornecedor?.ativo === false ? "selected" : ""}>Inativo</option>
              </select>
            </div>
          </div>
        </form>

        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="fecharModal('modalFornecedor')">Cancelar</button>
          <button class="btn btn-primary" onclick="salvarFornecedor(${fornecedor?.id || 'null'})">
            <span class="material-symbols-sharp">save</span>
            Salvar
          </button>
        </div>
      </div>
    </div>
  `

  document.body.insertAdjacentHTML("beforeend", modalHTML)
}

function alterarTipoPessoa() {
  const select = document.querySelector('[name="tipo_pessoa"]')
  const label = document.getElementById("labelDocumento")
  
  if (select.value === "PF") {
    label.textContent = "CPF *"
  } else {
    label.textContent = "CNPJ *"
  }
}

/**
 * Salva ou atualiza um fornecedor
 * Conecta com: POST /api/fornecedores ou PUT /api/fornecedores/{id} (main.py)
 */
async function salvarFornecedor(id) {
  const form = document.getElementById("formFornecedor")
  
  if (!form.checkValidity()) {
    alert("Preencha todos os campos obrigatórios")
    return
  }

  const formData = new FormData(form)
  
  // Remove formatação do CNPJ/CPF
  const cnpjCpfInput = form.querySelector('[name="cnpj_cpf"]');
  if (cnpjCpfInput) {
    const cleanedCnpjCpf = cnpjCpfInput.value.replace(/\D/g, '');
    formData.set('cnpj_cpf', cleanedCnpjCpf);
  }

  const url = id ? `/api/fornecedores/${id}` : "/api/fornecedores"
  const method = id ? "PUT" : "POST"

  try {
    const response = await fetch(url, {
      method: method,
      body: formData,
    })

    const result = await response.json()

    if (result.success) {
      alert(id ? "Fornecedor atualizado com sucesso!" : "Fornecedor cadastrado com sucesso!")
      fecharModal("modalFornecedor")
      carregarListaFornecedores()
    } else {
      alert("Erro ao salvar fornecedor: " + (result.erro || "Verifique os dados"));
    }
  } catch (error) {
    console.error("[v0] Erro ao salvar fornecedor:", error)
    alert("Erro ao salvar fornecedor")
  }
}

async function excluirFornecedor(id) {
  if (!confirm("Deseja realmente excluir este fornecedor?")) return

  try {
    const response = await fetch(`/api/fornecedores/${id}`, {
      method: "DELETE",
    })

    const result = await response.json()

    if (result.success) {
      alert("Fornecedor excluído com sucesso!")
      carregarListaFornecedores()
    } else {
      alert("Erro ao excluir fornecedor")
    }
  } catch (error) {
    console.error("[v0] Erro ao excluir fornecedor:", error)
    alert("Erro ao excluir fornecedor")
  }
}

// ================================
// PÁGINA: Gestão de Usuários
// Conecta com: GET /api/usuarios-detalhado (main.py)
// ================================

async function carregarGestaoUsuarios() {
  const mainContent = document.querySelector(".main-content")
  
  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h1>Gestão de Usuários</h1>
        <p class="page-subtitle">Gerencie usuários e permissões do sistema</p>
      </div>

      <div class="table-header">
        <div class="search-bar">
          <span class="material-symbols-sharp search-icon">search</span>
          <input type="text" id="searchUsuarios" placeholder="Buscar usuários..." onkeyup="filtrarTabela('searchUsuarios', 'usuariosTableBody')">
        </div>
        <button class="btn btn-primary" onclick="novoUsuario()">
          <span class="material-symbols-sharp">add</span>
          Novo Usuário
        </button>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>CPF</th>
              <th>Telefone</th>
              <th>Departamento</th>
              <th>Empresa</th>
              <th>Role</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="usuariosTableBody">
            <tr><td colspan="9">Carregando...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `

  await carregarListaUsuarios()
}

async function carregarListaUsuarios() {
  try {
    const response = await fetch("/api/usuarios-detalhado")
    const data = await response.json()
    
    const tbody = document.getElementById("usuariosTableBody")
    if (!tbody) return

    if (!data.usuarios || data.usuarios.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Nenhum usuário cadastrado</td></tr>'
      return
    }

    tbody.innerHTML = data.usuarios
      .map(
        (user) => `
        <tr>
          <td>${user.nome}</td>
          <td>${user.email}</td>
          <td>${user.cpf || "-"}</td>
          <td>${user.telefone || "-"}</td>
          <td>${user.departamento || "-"}</td>
          <td>${user.empresa}</td>
          <td><span class="tipo-badge">${user.role}</span></td>
          <td><span class="status-badge ${user.ativo ? "aprovado" : "erro"}">${user.ativo ? "Ativo" : "Inativo"}</span></td>
          <td>
            <div class="actions-menu">
              <button class="action-btn" onclick="toggleActionsMenu(event)">
                <span class="material-symbols-sharp">more_vert</span>
              </button>
              <div class="dropdown-menu">
                <button onclick="editarUsuario(${user.id})">
                  <span class="material-symbols-sharp">edit</span>
                  Editar
                </button>
                <button onclick="alterarSenhaUsuario(${user.id})">
                  <span class="material-symbols-sharp">key</span>
                  Alterar Senha
                </button>
                <button onclick="excluirUsuario(${user.id})">
                  <span class="material-symbols-sharp">delete</span>
                  Excluir
                </button>
              </div>
            </div>
          </td>
        </tr>
        `,
      )
      .join("")
  } catch (error) {
    console.error("[v0] Erro ao carregar usuários:", error)
  }
}

function novoUsuario() {
  mostrarModalUsuario(null)
}

async function editarUsuario(id) {
  try {
    const response = await fetch(`/api/usuarios/${id}`)
    const usuario = await response.json()
    mostrarModalUsuario(usuario)
  } catch (error) {
    console.error("[v0] Erro ao carregar usuário:", error)
    alert("Erro ao carregar usuário")
  }
}

/**
 * Modal de cadastro/edição de usuário
 * Busca também as empresas e roles disponíveis
 * Conecta com: GET /api/empresas e GET /api/roles (main.py)
 */
async function mostrarModalUsuario(usuario) {
  const isEdit = usuario !== null

  // Carrega empresas e roles para popular os selects
  const empresasResp = await fetch("/api/empresas")
  const empresasData = await empresasResp.json()
  
  const rolesResp = await fetch("/api/roles")
  const rolesData = await rolesResp.json()

  const modalHTML = `
    <div id="modalUsuario" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>${isEdit ? "Editar" : "Novo"} Usuário</h2>
          <button class="close-btn" onclick="fecharModal('modalUsuario')">
            <span class="material-symbols-sharp">close</span>
          </button>
        </div>
        <form id="formUsuario" class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Nome *</label>
              <input type="text" name="nome" value="${usuario?.nome || ""}" required>
            </div>

            <div class="form-group">
              <label>Email *</label>
              <input type="email" name="email" value="${usuario?.email || ""}" required>
            </div>

            <div class="form-group">
              <label>CPF</label>
              <input type="text" name="cpf" value="${usuario?.cpf || ""}" maxlength="14">
            </div>

            <div class="form-group">
              <label>Telefone</label>
              <input type="text" name="telefone" value="${usuario?.telefone || ""}">
            </div>

            <div class="form-group">
              <label>Departamento</label>
              <input type="text" name="departamento" value="${usuario?.departamento || ""}">
            </div>

            <div class="form-group">
              <label>Empresa *</label>
              <select name="empresa_id" required>
                ${empresasData.empresas
                  .map(
                    (emp) => `
                    <option value="${emp.id}" ${usuario?.empresa_id === emp.id ? "selected" : ""}>
                      ${emp.razao_social}
                    </option>
                    `,
                  )
                  .join("")}
              </select>
            </div>

            <div class="form-group">
              <label>Role (Nível de Acesso) *</label>
              <select name="role_id" required>
                ${rolesData.roles
                  .map(
                    (role) => `
                    <option value="${role.id}" ${usuario?.role_id === role.id ? "selected" : ""}>
                      ${role.descricao} (Nível ${role.nivel_acesso})
                    </option>
                    `,
                  )
                  .join("")}
              </select>
            </div>

            ${
              !isEdit
                ? `
            <div class="form-group">
              <label>Senha *</label>
              <input type="password" name="senha" required>
            </div>

            <div class="form-group">
              <label>Confirmar Senha *</label>
              <input type="password" name="senha_confirma" required>
            </div>
            `
                : ""
            }

            <div class="form-group">
              <label>Status</label>
              <select name="ativo">
                <option value="true" ${usuario?.ativo !== false ? "selected" : ""}>Ativo</option>
                <option value="false" ${usuario?.ativo === false ? "selected" : ""}>Inativo</option>
              </select>
            </div>
          </div>
        </form>

        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="fecharModal('modalUsuario')">Cancelar</button>
          <button class="btn btn-primary" onclick="salvarUsuario(${usuario?.id || 'null'})">
            <span class="material-symbols-sharp">save</span>
            Salvar
          </button>
        </div>
      </div>
    </div>
  `

  document.body.insertAdjacentHTML("beforeend", modalHTML)
}

/**
 * Salva ou atualiza um usuário
 * Conecta com: POST /api/usuarios ou PUT /api/usuarios/{id} (main.py)
 */
async function salvarUsuario(id) {
  const form = document.getElementById("formUsuario")
  
  if (!form.checkValidity()) {
    alert("Preencha todos os campos obrigatórios")
    return
  }

  const formData = new FormData(form)

  // Se for novo usuário, valida se as senhas conferem
  if (!id) {
    const senha = formData.get("senha")
    const senhaConfirma = formData.get("senha_confirma")
    
    if (senha !== senhaConfirma) {
      alert("As senhas não conferem")
      return
    }
  }

  const url = id ? `/api/usuarios/${id}` : "/api/usuarios"
  const method = id ? "PUT" : "POST"

  try {
    const response = await fetch(url, {
      method: method,
      body: formData,
    })

    const result = await response.json()

    if (result.success) {
      alert(id ? "Usuário atualizado com sucesso!" : "Usuário cadastrado com sucesso!")
      fecharModal("modalUsuario")
      carregarListaUsuarios()
    } else {
      alert(result.erro || "Erro ao salvar usuário")
    }
  } catch (error) {
    console.error("[v0] Erro ao salvar usuário:", error)
    alert("Erro ao salvar usuário")
  }
}

/**
 * Altera a senha de um usuário existente
 * Conecta com: PUT /api/usuarios/{id}/senha (main.py)
 */
async function alterarSenhaUsuario(id) {
  const novaSenha = prompt("Digite a nova senha:")
  if (!novaSenha) return

  const confirma = prompt("Confirme a nova senha:")
  if (novaSenha !== confirma) {
    alert("As senhas não conferem")
    return
  }

  try {
    const formData = new FormData()
    formData.append("senha", novaSenha)

    const response = await fetch(`/api/usuarios/${id}/senha`, {
      method: "PUT",
      body: formData,
    })

    const result = await response.json()

    if (result.success) {
      alert("Senha alterada com sucesso!")
    } else {
      alert("Erro ao alterar senha")
    }
  } catch (error) {
    console.error("[v0] Erro ao alterar senha:", error)
    alert("Erro ao alterar senha")
  }
}

async function excluirUsuario(id) {
  if (!confirm("Deseja realmente excluir este usuário?")) return

  try {
    const response = await fetch(`/api/usuarios/${id}`, {
      method: "DELETE",
    })

    const result = await response.json()

    if (result.success) {
      alert("Usuário excluído com sucesso!")
      carregarListaUsuarios()
    } else {
      alert("Erro ao excluir usuário")
    }
  } catch (error) {
    console.error("[v0] Erro ao excluir usuário:", error)
    alert("Erro ao excluir usuário")
  }
}

// ================================
// PÁGINA: Provisionamentos
// Mostra apenas documentos com status PROVISIONADO
// Conecta com: GET /api/documentos-fiscais?status=PROVISIONADO (main.py)
// ================================

async function carregarProvisionamentos() {
  const mainContent = document.querySelector(".main-content");

  // HTML é praticamente igual ao de documentos fiscais
  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h1>Provisionamentos</h1>
        <p class="page-subtitle">Gerencie documentos confirmados e prontos para pagamento.</p>
      </div>

      <div class="search-bar">
        <span class="material-symbols-sharp search-icon">search</span>
        <input type="text" id="searchInput" placeholder="Buscar por número, fornecedor, descrição...">
      </div>

      <div class="filters-section">
        <h3 class="filters-title">Filtros</h3>
        <div class="filters-grid">
          <div class="filter-group">
            <label>Tipo de Data</label>
            <select class="filter-select" id="filterTipoData">
              <option value="emissao">Data de Emissão</option>
              <option value="recebimento">Data de Recebimento</option>
              <option value="competencia">Data de Competência</option>
              <option value="vencimento">Data de Vencimento</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Data Inicial</label>
            <input type="date" class="filter-input" id="filterDataInicial">
          </div>
          <div class="filter-group">
            <label>Data Final</label>
            <input type="date" class="filter-input" id="filterDataFinal">
          </div>
          <div class="filter-group">
            <label>Tipo de Documento</label>
            <select class="filter-select" id="filterTipoDoc">
              <option value="">Todos</option>
              <option value="NF-e">NF-e</option>
              <option value="NFS-e">NFS-e</option>
              <option value="CT-e">CT-e</option>
              <option value="NFC-e">NFC-e</option>
              <option value="BOLETO">BOLETO</option>
              <option value="CONTRATO">CONTRATO</option>
              <option value="RECIBO">RECIBO</option>
              <option value="OUTROS">OUTROS</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Fornecedor</label>
            <select class="filter-select" id="filterFornecedor">
              <option value="">Todos</option>
            </select>
          </div>
        </div>
        <div class="filters-actions">
          <button class="btn btn-primary" onclick="aplicarFiltrosProvisionamentos()">
            <span class="material-symbols-sharp">filter_alt</span>
            Aplicar Filtros
          </button>
          <button class="btn btn-secondary" onclick="limparFiltrosProvisionamentos()">
            <span class="material-symbols-sharp">filter_alt_off</span>
            Limpar Filtros
          </button>
        </div>
      </div>

      <div class="table-container">
        <table class="documents-table">
          <thead>
            <tr>
              <th>Data Emissão</th>
              <th>Data Recebimento</th>
              <th>Data Competência</th>
              <th>Data Vencimento</th>
              <th>Número</th>
              <th>Tipo</th>
              <th>Fornecedor</th>
              <th>Valor Total</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="documentsTableBody">
            <tr><td colspan="10">Carregando provisionamentos...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  await popularSelectFornecedores("#filterFornecedor", { placeholder: "Todos" });
  await carregarDocumentosProvisionados();

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", aplicarFiltrosProvisionamentos);
  }
}

/**
 * Carrega apenas documentos com status PROVISIONADO
 * Conecta com: GET /api/documentos-fiscais?status=PROVISIONADO (main.py)
 */
async function carregarDocumentosProvisionados() {
  try {
    const searchTerm = document.getElementById("searchInput")?.value || "";
    const tipoData = document.getElementById("filterTipoData")?.value || "emissao";
    const dataInicial = document.getElementById("filterDataInicial")?.value || "";
    const dataFinal = document.getElementById("filterDataFinal")?.value || "";
    const tipoDoc = document.getElementById("filterTipoDoc")?.value || "";
    const fornecedorId = document.getElementById("filterFornecedor")?.value || "";

    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append("search", searchTerm.trim());
    if (tipoData) params.append("tipo_data", tipoData);
    if (dataInicial) params.append("data_inicial", dataInicial);
    if (dataFinal) params.append("data_final", dataFinal);
    if (tipoDoc) params.append("tipo_documento", tipoDoc);
    
    // FILTRO FIXO: apenas documentos provisionados
    params.append("status", "PROVISIONADO");
    
    if (fornecedorId) params.append("fornecedor_id", fornecedorId);

    const queryString = params.toString();
    const url = `/api/documentos-fiscais${queryString ? `?${queryString}` : ""}`;

    console.log("[v0] Buscando DOCUMENTOS PROVISIONADOS com URL:", url);

    const response = await fetch(url);
    const data = await response.json();

    console.log("[v0] Provisionamentos recebidos:", data.total);

    const tbody = document.getElementById("documentsTableBody");
    if (!tbody) return;

    if (!data.documentos || data.documentos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 20px;">
            Nenhum documento provisionado encontrado
          </td>
        </tr>
      `;
      return;
    }

    // Renderiza a tabela (idêntico à lista de documentos)
    tbody.innerHTML = data.documentos
      .map(
        (doc) => `
        <tr>
          <td>${formatarData(doc.data_emissao)}</td>
          <td>${formatarData(doc.data_recebimento)}</td>
          <td>${formatarData(doc.data_competencia)}</td>
          <td>${formatarData(doc.data_vencimento)}</td>
          <td>${doc.numero_documento || "-"}</td>
          <td><span class="tipo-badge">${doc.tipo_documento}</span></td>
          <td>${doc.fornecedor || "-"}</td>
          <td>R$ ${formatarValor(doc.valor_total)}</td>
          <td><span class="status-badge ${doc.status_processamento.toLowerCase()}">${doc.status_processamento}</span></td>
          <td>
            <div class="actions-menu">
              <button class="action-btn" onclick="toggleActionsMenu(event)">
                <span class="material-symbols-sharp">more_vert</span>
              </button>
              <div class="dropdown-menu">
                <button onclick="visualizarDoc(${doc.id})">
                  <span class="material-symbols-sharp">visibility</span>
                  Visualizar
                </button>
                <button onclick="editarDoc(${doc.id})">
                  <span class="material-symbols-sharp">edit</span>
                  Editar
                </button>
                <button onclick="abrirModalComentarios(${doc.id}, 'CONFIRMAR')">
                  <span class="material-symbols-sharp">check_circle</span>
                  Confirmar
                </button>
                <button onclick="abrirModalComentarios(${doc.id}, 'REVISAR')">
                  <span class="material-symbols-sharp">assignment</span>
                  Revisar
                </button>
                <button onclick="visualizarHistoricoDocumento(${doc.id})">
                  <span class="material-symbols-sharp">history</span>
                  Histórico
                </button>
                <button onclick="excluirDoc(${doc.id})">
                  <span class="material-symbols-sharp">delete</span>
                  Excluir
                </button>
              </div>
            </div>
          </td>
        </tr>
        `,
      )
      .join("");
  } catch (error) {
    console.error("[v0] Erro ao carregar provisionamentos:", error);
    const tbody = document.getElementById("documentsTableBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 20px; color: red;">
            Erro ao carregar provisionamentos: ${error.message}
          </td>
        </tr>
      `;
    }
  }
}

function aplicarFiltrosProvisionamentos() {
  carregarDocumentosProvisionados();
}

function limparFiltrosProvisionamentos() {
  document.getElementById("searchInput").value = "";
  document.getElementById("filterTipoData").value = "emissao";
  document.getElementById("filterDataInicial").value = "";
  document.getElementById("filterDataFinal").value = "";
  document.getElementById("filterTipoDoc").value = "";
  document.getElementById("filterFornecedor").value = "";
  carregarDocumentosProvisionados();
}

// ================================
// PÁGINA: Remessas CNAB
// Gerencia arquivos de remessa e retorno bancário
// Conecta com: GET /api/remessas-cnab (main.py)
// ================================

async function carregarRemessasCNAB() {
  const mainContent = document.querySelector(".main-content")
  
  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h1>Remessas CNAB</h1>
        <p class="page-subtitle">Gerencie arquivos de remessa e retorno bancário</p>
      </div>

      <div class="filters-section">
        <h3 class="filters-title">Filtros</h3>
        <div class="filters-grid">
          <div class="filter-group">
            <label>Status Remessa</label>
            <select class="filter-select" id="filterStatusRemessa">
              <option value="">Todos</option>
              <option value="RASCUNHO">Rascunho</option>
              <option value="GERADA">Gerada</option>
              <option value="ENVIADA">Enviada</option>
              <option value="PROCESSADA">Processada</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Data Inicial</label>
            <input type="date" class="filter-input" id="filterDataInicialRemessa">
          </div>
          <div class="filter-group">
            <label>Data Final</label>
            <input type="date" class="filter-input" id="filterDataFinalRemessa">
          </div>
        </div>
        <div class="filters-actions">
          <button class="btn btn-primary" onclick="aplicarFiltrosRemessa()">
            <span class="material-symbols-sharp">filter_alt</span>
            Aplicar Filtros
          </button>
          <button class="btn btn-secondary" onclick="limparFiltrosRemessa()">
            <span class="material-symbols-sharp">filter_alt_off</span>
            Limpar Filtros
          </button>
        </div>
      </div>

      <div class="table-container">
        <table class="documents-table">
          <thead>
            <tr>
              <th>Data Geração</th>
              <th>Nome Arquivo</th>
              <th>Tipo</th>
              <th>Banco</th>
              <th>Qtd Documentos</th>
              <th>Valor Total</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="remessasTableBody">
            <tr><td colspan="8">Carregando remessas...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="action-buttons">
        <button class="btn btn-primary" onclick="gerarNovaRemessa()">
          <span class="material-symbols-sharp">add_circle</span>
          Gerar Nova Remessa
        </button>
        <button class="btn btn-secondary" onclick="importarRetorno()">
          <span class="material-symbols-sharp">upload</span>
          Importar Retorno
        </button>
      </div>
    </div>
  `

  await carregarListaRemessas()
}

/**
 * Carrega a lista de remessas CNAB
 * Conecta com: GET /api/remessas-cnab (main.py)
 */
async function carregarListaRemessas() {
  try {
    const statusRemessa = document.getElementById("filterStatusRemessa")?.value || ""
    const dataInicial = document.getElementById("filterDataInicialRemessa")?.value || ""
    const dataFinal = document.getElementById("filterDataFinalRemessa")?.value || ""

    const params = new URLSearchParams()
    if (statusRemessa) params.append("status", statusRemessa)
    if (dataInicial) params.append("data_inicial", dataInicial)
    if (dataFinal) params.append("data_final", dataFinal)

    const queryString = params.toString()
    const url = `/api/remessas-cnab${queryString ? `?${queryString}` : ""}`

    const response = await fetch(url)
    const data = await response.json()

    const tbody = document.getElementById("remessasTableBody")
    if (!tbody) return

    if (!data.remessas || data.remessas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Nenhuma remessa encontrada</td></tr>'
      return
    }

    tbody.innerHTML = data.remessas
      .map(
        (rem) => `
        <tr>
          <td>${formatarDataHora(rem.data_geracao)}</td>
          <td>${rem.nome_arquivo}</td>
          <td><span class="tipo-badge">${rem.tipo_remessa}</span></td>
          <td>${rem.banco}</td>
          <td>${rem.quantidade_documentos}</td>
          <td>${formatarMoeda(rem.valor_total)}</td>
          <td><span class="status-badge ${rem.status.toLowerCase()}">${rem.status}</span></td>
          <td>
            <div class="actions-menu">
              <button class="action-btn" onclick="toggleActionsMenu(event)">
                <span class="material-symbols-sharp">more_vert</span>
              </button>
              <div class="dropdown-menu">
                <button onclick="downloadRemessa(${rem.id})">
                  <span class="material-symbols-sharp">download</span>
                  Download
                </button>
                <button onclick="visualizarDetalhesRemessa(${rem.id})">
                  <span class="material-symbols-sharp">visibility</span>
                  Detalhes
                </button>
                <button onclick="excluirRemessa(${rem.id})">
                  <span class="material-symbols-sharp">delete</span>
                  Excluir
                </button>
              </div>
            </div>
          </td>
        </tr>
        `,
      )
      .join("")
  } catch (error) {
    console.error("[v0] Erro ao carregar remessas:", error)
  }
}

function aplicarFiltrosRemessa() {
  carregarListaRemessas()
}

function limparFiltrosRemessa() {
  document.getElementById("filterStatusRemessa").value = ""
  document.getElementById("filterDataInicialRemessa").value = ""
  document.getElementById("filterDataFinalRemessa").value = ""
  carregarListaRemessas()
}

/**
 * Abre modal para gerar uma nova remessa CNAB
 * Lista os documentos disponíveis para incluir na remessa
 * Conecta com: GET /api/documentos-fiscais?status=PROVISIONADO (main.py)
 */
async function gerarNovaRemessa() {
  try {
    // Busca documentos provisionados disponíveis para remessa
    const response = await fetch("/api/documentos-fiscais?status=PROVISIONADO")
    const data = await response.json()

    const modalHTML = `
      <div id="modalGerarRemessa" class="modal-overlay">
        <div class="modal-content large">
          <div class="modal-header">
            <h2>Gerar Nova Remessa CNAB</h2>
            <button class="close-btn" onclick="fecharModal('modalGerarRemessa')">
              <span class="material-symbols-sharp">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label>Banco *</label>
                <select id="selectBanco" required>
                  <option value="">Selecione...</option>
                  <option value="001">Banco do Brasil</option>
                  <option value="033">Santander</option>
                  <option value="104">Caixa Econômica</option>
                  <option value="237">Bradesco</option>
                  <option value="341">Itaú</option>
                </select>
              </div>

              <div class="form-group">
                <label>Tipo Remessa *</label>
                <select id="selectTipoRemessa" required>
                  <option value="PAGAMENTO">Pagamento</option>
                  <option value="COBRANCA">Cobrança</option>
                </select>
              </div>

              <div class="form-group">
                <label>Data Pagamento *</label>
                <input type="date" id="dataPagamento" required>
              </div>
            </div>

            <h3 style="margin-top: 20px; margin-bottom: 10px;">Selecione os Documentos</h3>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" id="checkAll" onchange="toggleTodosDocumentos()"></th>
                    <th>Número</th>
                    <th>Fornecedor</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody id="documentosRemessaBody">
                  ${
                    data.documentos && data.documentos.length > 0
                      ? data.documentos
                          .map(
                            (doc) => `
                          <tr>
                            <td><input type="checkbox" class="doc-checkbox" value="${doc.id}"></td>
                            <td>${doc.numero_documento}</td>
                            <td>${doc.fornecedor}</td>
                            <td>${formatarData(doc.data_vencimento)}</td>
                            <td>${formatarMoeda(doc.valor_total)}</td>
                          </tr>
                          `,
                          )
                          .join("")
                      : '<tr><td colspan="5" style="text-align: center;">Nenhum documento disponível</td></tr>'
                  }
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="fecharModal('modalGerarRemessa')">Cancelar</button>
            <button class="btn btn-primary" onclick="processarGeracaoRemessa()">
              <span class="material-symbols-sharp">check</span>
              Gerar Remessa
            </button>
          </div>
        </div>
      </div>
    `

    document.body.insertAdjacentHTML("beforeend", modalHTML)
  } catch (error) {
    console.error("[v0] Erro ao abrir modal de remessa:", error)
    alert("Erro ao carregar documentos")
  }
}

/**
 * Marca/desmarca todos os documentos da lista
 */
function toggleTodosDocumentos() {
  const checkAll = document.getElementById("checkAll")
  const checkboxes = document.querySelectorAll(".doc-checkbox")
  
  checkboxes.forEach((cb) => {
    cb.checked = checkAll.checked
  })
}

/**
 * Envia solicitação para gerar arquivo CNAB
 * Conecta com: POST /api/remessas-cnab/gerar (main.py)
 */
async function processarGeracaoRemessa() {
  const banco = document.getElementById("selectBanco").value
  const tipoRemessa = document.getElementById("selectTipoRemessa").value
  const dataPagamento = document.getElementById("dataPagamento").value

  // Coleta os IDs dos documentos marcados
  const checkboxes = document.querySelectorAll(".doc-checkbox:checked")
  const documentosIds = Array.from(checkboxes).map((cb) => cb.value)

  if (!banco || !tipoRemessa || !dataPagamento) {
    alert("Preencha todos os campos obrigatórios")
    return
  }

  if (documentosIds.length === 0) {
    alert("Selecione ao menos um documento")
    return
  }

  try {
    const response = await fetch("/api/remessas-cnab/gerar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        banco: banco,
        tipo_remessa: tipoRemessa,
        data_pagamento: dataPagamento,
        documentos_ids: documentosIds,
      }),
    })

    const result = await response.json()

    if (result.success) {
      alert("Remessa gerada com sucesso!")
      fecharModal("modalGerarRemessa")
      carregarListaRemessas()
    } else {
      alert("Erro ao gerar remessa: " + (result.erro || "Erro desconhecido"))
    }
  } catch (error) {
    console.error("[v0] Erro ao gerar remessa:", error)
    alert("Erro ao gerar remessa")
  }
}

/**
 * Faz download do arquivo CNAB
 * Conecta com: GET /api/remessas-cnab/{id}/download (main.py)
 */
function downloadRemessa(id) {
  window.location.href = `/api/remessas-cnab/${id}/download`
}

/**
 * Mostra os detalhes de uma remessa (documentos incluídos)
 * Conecta com: GET /api/remessas-cnab/{id} (main.py)
 */
async function visualizarDetalhesRemessa(id) {
  try {
    const response = await fetch(`/api/remessas-cnab/${id}`)
    const remessa = await response.json()

    const modalHTML = `
      <div id="modalDetalhesRemessa" class="modal-overlay">
        <div class="modal-content large">
          <div class="modal-header">
            <h2>Detalhes da Remessa</h2>
            <button class="close-btn" onclick="fecharModal('modalDetalhesRemessa')">
              <span class="material-symbols-sharp">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label>Nome do Arquivo</label>
                <input type="text" value="${remessa.nome_arquivo}" readonly class="readonly-input">
              </div>
              <div class="form-group">
                <label>Data Geração</label>
                <input type="text" value="${formatarDataHora(remessa.data_geracao)}" readonly class="readonly-input">
              </div>
              <div class="form-group">
                <label>Banco</label>
                <input type="text" value="${remessa.banco}" readonly class="readonly-input">
              </div>
              <div class="form-group">
                <label>Status</label>
                <input type="text" value="${remessa.status}" readonly class="readonly-input">
              </div>
              <div class="form-group">
                <label>Quantidade Documentos</label>
                <input type="text" value="${remessa.quantidade_documentos}" readonly class="readonly-input">
              </div>
              <div class="form-group">
                <label>Valor Total</label>
                <input type="text" value="${formatarMoeda(remessa.valor_total)}" readonly class="readonly-input">
              </div>
            </div>

            <h3 style="margin-top: 20px; margin-bottom: 10px;">Documentos Incluídos</h3>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Fornecedor</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    remessa.documentos && remessa.documentos.length > 0
                      ? remessa.documentos
                          .map(
                            (doc) => `
                          <tr>
                            <td>${doc.numero_documento}</td>
                            <td>${doc.fornecedor}</td>
                            <td>${formatarData(doc.data_vencimento)}</td>
                            <td>${formatarMoeda(doc.valor_total)}</td>
                          </tr>
                          `,
                          )
                          .join("")
                      : '<tr><td colspan="4" style="text-align: center;">Nenhum documento</td></tr>'
                  }
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="fecharModal('modalDetalhesRemessa')">Fechar</button>
            <button class="btn btn-primary" onclick="downloadRemessa(${id})">
              <span class="material-symbols-sharp">download</span>
              Download
            </button>
          </div>
        </div>
      </div>
    `

    document.body.insertAdjacentHTML("beforeend", modalHTML)
  } catch (error) {
    console.error("[v0] Erro ao visualizar detalhes:", error)
    alert("Erro ao carregar detalhes")
  }
}

/**
 * Importa arquivo de retorno bancário
 * Conecta com: POST /api/remessas-cnab/importar-retorno (main.py)
 */
function importarRetorno() {
  const modalHTML = `
    <div id="modalImportarRetorno" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Importar Arquivo de Retorno</h2>
          <button class="close-btn" onclick="fecharModal('modalImportarRetorno')">
            <span class="material-symbols-sharp">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="upload-area">
            <span class="material-symbols-sharp" style="font-size: 48px; color: #49609b;">upload_file</span>
            <h3>Selecione o arquivo de retorno</h3>
            <p>Formatos aceitos: .RET, .TXT</p>
            <input type="file" id="retornoFileInput" accept=".ret,.txt" style="display: none;">
            <button class="btn btn-primary" onclick="document.getElementById('retornoFileInput').click()">
              Escolher Arquivo
            </button>
            <p id="selectedRetornoFile" style="margin-top: 10px; color: #636e72;"></p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="fecharModal('modalImportarRetorno')">Cancelar</button>
          <button class="btn btn-primary" onclick="processarRetorno()">
            <span class="material-symbols-sharp">check</span>
            Importar
          </button>
        </div>
      </div>
    </div>
  `

  document.body.insertAdjacentHTML("beforeend", modalHTML)

  document.getElementById("retornoFileInput").addEventListener("change", (e) => {
    const fileName = e.target.files[0]?.name || ""
    document.getElementById("selectedRetornoFile").textContent = fileName ? `Arquivo: ${fileName}` : ""
  })
}

async function processarRetorno() {
  const fileInput = document.getElementById("retornoFileInput")
  const file = fileInput.files[0]

  if (!file) {
    alert("Selecione um arquivo de retorno")
    return
  }

  const formData = new FormData()
  formData.append("file", file)

  try {
    const response = await fetch("/api/remessas-cnab/importar-retorno", {
      method: "POST",
      body: formData,
    })

    const result = await response.json()

    if (result.success) {
      alert("Retorno processado com sucesso!")
      fecharModal("modalImportarRetorno")
      carregarListaRemessas()
    } else {
      alert("Erro ao processar retorno: " + (result.erro || "Erro desconhecido"))
    }
  } catch (error) {
    console.error("[v0] Erro ao processar retorno:", error)
    alert("Erro ao processar retorno")
  }
}

async function excluirRemessa(id) {
  if (!confirm("Deseja realmente excluir esta remessa?")) return

  try {
    const response = await fetch(`/api/remessas-cnab/${id}`, {
      method: "DELETE",
    })

    const result = await response.json()

    if (result.success) {
      alert("Remessa excluída com sucesso!")
      carregarListaRemessas()
    } else {
      alert("Erro ao excluir remessa")
    }
  } catch (error) {
    console.error("[v0] Erro ao excluir remessa:", error)
    alert("Erro ao excluir remessa")
  }
}

// ================================
// PÁGINA: Dashboard com KPIs e Gráficos
// Conecta com: GET /api/dashboard/kpis (main.py)
// ================================

async function carregarDashboard() {
  const mainContent = document.querySelector(".main-content")

  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h1>Dashboard</h1>
        <p class="page-subtitle">Visão geral do sistema fiscal</p>
      </div>

      <!-- Grid de KPIs (indicadores principais) -->
      <div class="kpi-grid">
        <div class="kpi-card kpi-provisionado">
          <div class="kpi-icon">
            <span class="material-symbols-sharp">check_circle</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-title">Provisionados</span>
            <span class="kpi-value" id="kpi-provisionado">-</span>
          </div>
        </div>

        <div class="kpi-card kpi-vencido">
          <div class="kpi-icon">
            <span class="material-symbols-sharp">error</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-title">Vencidos</span>
            <span class="kpi-value" id="kpi-vencido">-</span>
          </div>
        </div>

        <div class="kpi-card kpi-pendente">
          <div class="kpi-icon">
            <span class="material-symbols-sharp">pending</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-title">Pendentes</span>
            <span class="kpi-value" id="kpi-pendente">-</span>
          </div>
        </div>

        <div class="kpi-card kpi-revisar">
          <div class="kpi-icon">
            <span class="material-symbols-sharp">assignment</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-title">A Revisar</span>
            <span class="kpi-value" id="kpi-revisar">-</span>
          </div>
        </div>
      </div>

      <!-- Grid de Gráficos -->
      <div class="charts-grid">
        <div class="chart-container">
          <h3>Gastos por Fornecedor (Top 5)</h3>
          <canvas id="graficoGastosFornecedor"></canvas>
        </div>

        <div class="chart-container">
          <h3>Documentos por Status</h3>
          <canvas id="graficoDocsStatus"></canvas>
        </div>
      </div>
    </div>
  `

  // Carrega os dados dos KPIs e gráficos
  await carregarDadosDashboard()
}

/**
 * Busca os dados do dashboard e renderiza KPIs e gráficos
 * Conecta com: GET /api/dashboard/kpis (main.py)
 */
async function carregarDadosDashboard() {
  try {
    const response = await fetch("/api/dashboard/kpis")
    const data = await response.json()

    console.log("[v0] Dados do dashboard:", data)

    // Atualiza os valores dos KPIs
    document.getElementById("kpi-provisionado").textContent = data.provisionados || 0
    document.getElementById("kpi-vencido").textContent = data.vencidos || 0
    document.getElementById("kpi-pendente").textContent = data.pendentes || 0
    document.getElementById("kpi-revisar").textContent = data.revisar || 0

    // Renderiza gráfico de gastos por fornecedor (barras horizontais)
    if (data.gastos_fornecedor && data.gastos_fornecedor.length > 0) {
      const ctx1 = document.getElementById("graficoGastosFornecedor")
      if (ctx1) {
        new Chart(ctx1, {
          type: "bar",
          data: {
            labels: data.gastos_fornecedor.map((f) => f.fornecedor),
            datasets: [
              {
                label: "Valor Total (R$)",
                data: data.gastos_fornecedor.map((f) => f.total),
                backgroundColor: "#49609b",
                borderColor: "#3a4d7f",
                borderWidth: 1,
              },
            ],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              },
            },
            scales: {
              x: {
                beginAtZero: true,
                ticks: {
                  callback: function (value) {
                    return "R$ " + value.toLocaleString("pt-BR")
                  },
                },
              },
            },
          },
        })
      }
    }

    // Renderiza gráfico de documentos por status (pizza/donut)
    if (data.docs_por_status && data.docs_por_status.length > 0) {
      const ctx2 = document.getElementById("graficoDocsStatus")
      if (ctx2) {
        new Chart(ctx2, {
          type: "doughnut",
          data: {
            labels: data.docs_por_status.map((s) => s.status),
            datasets: [
              {
                data: data.docs_por_status.map((s) => s.quantidade),
                backgroundColor: [
                  "#27ae60", // Provisionado
                  "#e74c3c", // Vencido
                  "#f39c12", // Pendente
                  "#9b59b6", // Revisar
                  "#3498db", // Processado
                  "#95a5a6", // Outros
                ],
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
              },
            },
          },
        })
      }
    }
  } catch (error) {
    console.error("[v0] Erro ao carregar dashboard:", error)
  }
}

// ================================
// PÁGINA: Auditoria e Relatórios
// Registra todas as ações realizadas no sistema
// Conecta com: GET /api/auditoria (main.py)
// ================================

async function carregarAuditoriaRelatorios() {
  const mainContent = document.querySelector(".main-content")

  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h1>Auditoria e Relatórios</h1>
        <p class="page-subtitle">Acompanhe todas as ações realizadas no sistema</p>
      </div>

      <div class="filters-section">
        <h3 class="filters-title">Filtros</h3>
        <div class="filters-grid">
          <div class="filter-group">
            <label>Data Inicial</label>
            <input type="date" class="filter-input" id="filterDataInicialAudit">
          </div>
          <div class="filter-group">
            <label>Data Final</label>
            <input type="date" class="filter-input" id="filterDataFinalAudit">
          </div>
          <div class="filter-group">
            <label>Usuário</label>
            <select class="filter-select" id="filterUsuarioAudit">
              <option value="">Todos</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Tipo de Ação</label>
            <select class="filter-select" id="filterTipoAcao">
              <option value="">Todas</option>
              <option value="DOCUMENTO_CRIADO">Documento Criado</option>
              <option value="DOCUMENTO_EDITADO">Documento Editado</option>
              <option value="DOCUMENTO_CONFIRMADO">Documento Confirmado</option>
              <option value="DOCUMENTO_REVISADO">Documento Revisado</option>
              <option value="REMESSA_GERADA">Remessa Gerada</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </div>
        </div>
        <div class="filters-actions">
          <button class="btn btn-primary" onclick="aplicarFiltrosAuditoria()">
            <span class="material-symbols-sharp">filter_alt</span>
            Aplicar Filtros
          </button>
          <button class="btn btn-secondary" onclick="limparFiltrosAuditoria()">
            <span class="material-symbols-sharp">filter_alt_off</span>
            Limpar Filtros
          </button>
          <button class="btn btn-secondary" onclick="exportarAuditoria()">
            <span class="material-symbols-sharp">download</span>
            Exportar CSV
          </button>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Usuário</th>
              <th>Ação</th>
              <th>Descrição</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody id="auditoriaTableBody">
            <tr><td colspan="5">Carregando registros...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `

  // Carrega lista de usuários para o filtro
  await popularSelectUsuarios()
  await carregarRegistrosAuditoria()
}

/**
 * Popula o select de usuários no filtro de auditoria
 * Conecta com: GET /api/usuarios (main.py)
 */
async function popularSelectUsuarios() {
  try {
    const response = await fetch("/api/usuarios")
    const data = await response.json()

    const select = document.getElementById("filterUsuarioAudit")
    if (!select) return

    if (data.usuarios && data.usuarios.length > 0) {
      let optionsHtml = '<option value="">Todos</option>'
      data.usuarios.forEach((u) => {
        optionsHtml += `<option value="${u.id}">${u.nome}</option>`
      })
      select.innerHTML = optionsHtml
    }
  } catch (error) {
    console.error("[v0] Erro ao carregar usuários:", error)
  }
}

/**
 * Carrega os registros de auditoria
 * Conecta com: GET /api/auditoria (main.py)
 */
async function carregarRegistrosAuditoria() {
  try {
    const dataInicial = document.getElementById("filterDataInicialAudit")?.value || ""
    const dataFinal = document.getElementById("filterDataFinalAudit")?.value || ""
    const usuarioId = document.getElementById("filterUsuarioAudit")?.value || ""
    const tipoAcao = document.getElementById("filterTipoAcao")?.value || ""

    const params = new URLSearchParams()
    if (dataInicial) params.append("data_inicial", dataInicial)
    if (dataFinal) params.append("data_final", dataFinal)
    if (usuarioId) params.append("usuario_id", usuarioId)
    if (tipoAcao) params.append("tipo_acao", tipoAcao)

    const queryString = params.toString()
    const url = `/api/auditoria${queryString ? `?${queryString}` : ""}`

    const response = await fetch(url)
    const data = await response.json()

    const tbody = document.getElementById("auditoriaTableBody")
    if (!tbody) return

    if (!data.registros || data.registros.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum registro encontrado</td></tr>'
      return
    }

    tbody.innerHTML = data.registros
      .map(
        (reg) => `
        <tr>
          <td>${formatarDataHora(reg.data_hora)}</td>
          <td>${reg.usuario_nome || "-"}</td>
          <td>${getAcaoBadge(reg.acao)}</td>
          <td>${reg.descricao || "-"}</td>
          <td>${reg.ip_address || "-"}</td>
        </tr>
        `,
      )
      .join("")
  } catch (error) {
    console.error("[v0] Erro ao carregar auditoria:", error)
  }
}

function aplicarFiltrosAuditoria() {
  carregarRegistrosAuditoria()
}

function limparFiltrosAuditoria() {
  document.getElementById("filterDataInicialAudit").value = ""
  document.getElementById("filterDataFinalAudit").value = ""
  document.getElementById("filterUsuarioAudit").value = ""
  document.getElementById("filterTipoAcao").value = ""
  carregarRegistrosAuditoria()
}

/**
 * Exporta os registros de auditoria em formato CSV
 * Conecta com: GET /api/auditoria/exportar (main.py)
 */
function exportarAuditoria() {
  const dataInicial = document.getElementById("filterDataInicialAudit")?.value || ""
  const dataFinal = document.getElementById("filterDataFinalAudit")?.value || ""
  const usuarioId = document.getElementById("filterUsuarioAudit")?.value || ""
  const tipoAcao = document.getElementById("filterTipoAcao")?.value || ""

  const params = new URLSearchParams()
  if (dataInicial) params.append("data_inicial", dataInicial)
  if (dataFinal) params.append("data_final", dataFinal)
  if (usuarioId) params.append("usuario_id", usuarioId)
  if (tipoAcao) params.append("tipo_acao", tipoAcao)

  const queryString = params.toString()
  const url = `/api/auditoria/exportar${queryString ? `?${queryString}` : ""}`

  // Força o download do arquivo CSV
  window.location.href = url
}

// ================================
// Modo de Acessibilidade (Alto Contraste)
// Alterna entre modo normal e modo de alto contraste
// ================================

/**
 * Inicializa o botão de acessibilidade
 */
document.addEventListener("DOMContentLoaded", () => {
  // Verifica se já estava no modo acessibilidade
  if (localStorage.getItem("accessibilityMode") === "true") {
    document.body.classList.add("accessibility-mode")
    atualizarBotaoAcessibilidade(true)
  }

  // Adiciona listener ao botão de acessibilidade (se existir)
  const accessBtn = document.querySelector(".accessibility-btn")
  if (accessBtn) {
    accessBtn.addEventListener("click", toggleAccessibilityMode)
  }
})

/**
 * Alterna o modo de acessibilidade
 */
function toggleAccessibilityMode() {
  const isActive = document.body.classList.toggle("accessibility-mode")
  
  // Salva a preferência no localStorage
  localStorage.setItem("accessibilityMode", isActive.toString())
  
  atualizarBotaoAcessibilidade(isActive)
}

/**
 * Atualiza o visual do botão de acessibilidade
 */
function atualizarBotaoAcessibilidade(isActive) {
  const accessBtn = document.querySelector(".accessibility-btn")
  if (accessBtn) {
    accessBtn.setAttribute("aria-pressed", isActive.toString())
    
    const label = accessBtn.querySelector("span:last-child")
    if (label) {
      label.textContent = isActive ? "Modo Normal" : "Alto Contraste"
    }
  }
}

console.log("[v0] Sistema carregado e pronto!")

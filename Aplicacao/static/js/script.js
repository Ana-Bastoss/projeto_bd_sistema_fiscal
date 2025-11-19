// ==========================================================
// ABRE E FECHA SIDEBAR
// ==========================================================
const sidebar = document.querySelector(".sidebar")
const sidebarToggler = document.querySelector(".sidebar-toggler")

let paginaAtual = "dashboard"; 

if (sidebarToggler) {
  sidebarToggler.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed")
  })
}

// ==========================================================
// BOTÃO LOGOUT
// ==========================================================
const logoutBtn = document.getElementById("logoutBtn")

if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault()

    const confirmar = confirm("Deseja realmente sair do sistema?")
    if (!confirmar) return

    localStorage.removeItem("user")
    localStorage.removeItem("token")

    window.location.href = "/login"
  })
}

// ==========================================================
// VERIFICA LOGIN E MONTA MENU
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  if (!window.location.pathname.includes("/login")) {
    const userData = localStorage.getItem("user")
    const token = localStorage.getItem("token")

    if (!userData || !token) {
      window.location.href = "/login"
      return
    }

    const user = JSON.parse(userData)
    console.log("[v0] Usuário logado:", user.nome, "Role:", user.role)
    console.log("[v0] Permissões:", user.permissoes)

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
    
    // Carrega o dashboard por padrão
    loadPage('dashboard');
  }
})

// ==========================================================
// MAPEAMENTO DE MENUS
// ==========================================================
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

// ==========================================================
// FUNÇÕES AUXILIARES GLOBAIS (Refatoradas e Movidas para Cima)
// ==========================================================

/**
 * Função unificada para fechar e remover um modal da tela.
 * @param {string} modalId - O ID do modal (ex: "modalDocumento")
 */
function fecharModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.remove()
  }
}

/**
 * Função unificada para alternar menus de ação (dropdowns) em tabelas.
 * @param {Event} event - O evento de clique
 */
function toggleActionsMenu(event) {
  // Impede que o clique no botão se propague para o listener global (document)
  event.stopPropagation();
  
  const button = event.currentTarget;
  const menu = button.nextElementSibling;
  
  if (!menu) {
    console.error("[v0] Não foi possível encontrar o menu dropdown adjacente.");
    return;
  }
  
  const isAlreadyActive = menu.classList.contains("active");

  // Primeiro, fecha TODOS os menus que estiverem abertos
  document.querySelectorAll(".dropdown-menu.active, .actions-menu.active").forEach((m) => {
    m.classList.remove("active");
  });

  // Se o menu clicado não estava ativo, ele o abre.
  if (!isAlreadyActive) {
    menu.classList.add("active");
  }
  // Se já estava ativo, ele simplesmente permanece fechado (pois o passo anterior já o fechou).
}

/**
 * Listener global para fechar menus de ação (dropdowns) ao clicar fora.
 */
document.addEventListener("click", function (event) {
  // Encontra o elemento que foi clicado
  const clickedElement = event.target;

  // Verifica se o clique foi EM UM BOTÃO de toggle ou DENTRO DE UM MENU
  const isToggleButton = clickedElement.closest(".action-btn, .btn-icon");
  const isInsideMenu = clickedElement.closest(".dropdown-menu, .actions-menu");

  // Se o clique NÃO foi em um botão E NEM dentro de um menu, fecha tudo.
  if (!isToggleButton && !isInsideMenu) {
    document.querySelectorAll(".dropdown-menu.active, .actions-menu.active").forEach(menu => {
      menu.classList.remove("active");
    });
  }
});


/**
 * Função unificada para carregar e popular <select> de fornecedores.
 * @param {string} selector - O seletor CSS (ex: "#meuId" ou "[name='meuName']")
 * @param {object} options - Opções de configuração
 * @param {any} [options.valorSelecionado=null] - O ID do fornecedor a ser pré-selecionado
 * @param {string} [options.placeholder=null] - Texto para a primeira <option> (ex: "Selecione...")
 */
async function popularSelectFornecedores(selector, { valorSelecionado = null, placeholder = "Todos" } = {}) {
  const select = document.querySelector(selector)
  if (!select) {
    console.warn(`[v0] Select de fornecedor não encontrado: ${selector}`)
    return
  }

  try {
    const response = await fetch("/api/fornecedores")
    const data = await response.json()

    if (!data.fornecedores) {
      select.innerHTML = '<option value="">Nenhum fornecedor</option>'
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
    select.innerHTML = '<option value="">Erro ao carregar</option>'
  }
}

/**
 * Filtra uma tabela (client-side) com base em um campo de busca.
 * @param {string} inputId - O ID do <input> de busca
 * @param {string} tableBodyId - O ID do <tbody> da tabela
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

// Helper to format currency
function formatarMoeda(valor) {
  if (typeof valor !== "number") {
    valor = Number.parseFloat(valor) || 0
  }
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

// Helper to get status badge class
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
 * Retorna um HTML de badge colorido para Ações de Auditoria
 * @param {string} acao - O nome da ação (ex: 'DOCUMENTO_CRIADO')
 */
function getAcaoBadge(acao) {
  let colorClass = "pendente"; // Amarelo (default)
  
  if (acao.includes('CRIADO') || acao.includes('UPLOAD')) {
      colorClass = "processado"; // Azul claro
  } else if (acao.includes('APROVADA')) {
      colorClass = "aprovado"; // Verde claro
  } else if (acao.includes('GERADA')) {
      colorClass = "info"; // Azul (baseado na classe de remessas)
  } else if (acao.includes('LOGIN')) {
      colorClass = "cancelado"; // Cinza/Rosa
  }
  
  // Reusa a classe 'status-badge' que já tem cores definidas
  return `<span class="status-badge ${colorClass}">${acao.replace("_", " ")}</span>`;
}


// FUNÇÕES AUXILIARES DE FORMATAÇÃO
function formatarData(data) {
  if (!data) return "-"
  try {
    // Adiciona T00:00:00 para garantir que seja interpretado como data local
    const d = new Date(data + "T00:00:00")
    if (isNaN(d.getTime())) return "-"
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
  } catch (e) {
    console.error("[v0] Erro ao formatar data:", data, e)
    return "-"
  }
}

function formatarValor(valor) {
  if (!valor) return "0,00"
  return Number.parseFloat(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatarCNPJ(cnpj) {
  if (!cnpj) return "-"
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

function formatarCNPJCPF(doc, tipo) {
  if (!doc) return "-"
  if (tipo === "PF") {
    return doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")
  } else {
    return doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
  }
}

// Helper to format date and time (Corrigindo o erro de referência)
function formatarDataHora(dataISO) {
  if (!dataISO) return "-"
  const data = new Date(dataISO)
  return data.toLocaleString("pt-BR")
}

// ==========================================================
// MONTA MENU DINÂMICO
// ==========================================================
function montarMenuDinamico(menus) {
  const navList = document.querySelector(".primary-nav")
  if (!navList) {
    console.error("[v0] Elemento .primary-nav não encontrado!")
    return
  }

  navList.innerHTML = ""

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
        <span class="nav-icon material-symbols-sharp">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
      </a>
      <span class="nav-tooltip">${item.label}</span>
    `

    navList.appendChild(li)
  })

  console.log("[v0] Menu montado com", uniqueMenus.length, "itens")

  document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault()
      const page = link.getAttribute("data-page")

      document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"))
      link.classList.add("active")

      loadPage(page)
    })
  })
}

// ==========================================================
// CARREGA CONTEÚDO DAS PÁGINAS
// ==========================================================
function loadPage(page) {
  paginaAtual = page; // <-- ATUALIZA A VARIÁVEL GLOBAL
  const mainContent = document.querySelector(".main-content")
  if (!mainContent) return

  console.log("[v0] Carregando página:", page)

  switch (page) {
    case "dashboard":
      carregarDashboard(); // <-- MUDANÇA AQUI
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

// ==========================================================
// PÁGINA DE DOCUMENTOS FISCAIS
// ==========================================================
async function carregarDocumentosFiscais() {
  const mainContent = document.querySelector(".main-content")

  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h1>Documentos Fiscais</h1>
        <p class="page-subtitle">Gerencie todos os documentos fiscais da empresa</p>
      </div>

      <div class="search-bar">
        <span class="material-symbols-sharp search-icon">search</span>
        <input type="text" id="searchInput" placeholder="Pesquisar por número, fornecedor, valor..." />
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
            <input type="date" class="filter-input" id="filterDataInicial" />
          </div>

          <div class="filter-group">
            <label>Data Final</label>
            <input type="date" class="filter-input" id="filterDataFinal" />
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
              <option value="PENDENTE">Pendente</option>
              <option value="PROCESSADO">Processado</option>
              <option value="PROVISIONADO">Provisionado</option>
              <option value="REVISAR">Revisar</option>
              <option value="ERRO">Erro</option>
              <option value="MANUAL">Manual</option>
              <option value="CANCELADO">Cancelado</option>
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
            <tr>
              <td colspan="10" style="text-align: center; padding: 40px;">
                Carregando documentos...
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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

  // Carrega dados do backend
  await popularSelectFornecedores("#filterFornecedor", { placeholder: "Todos" })
  await carregarDocumentos()

  const searchInput = document.getElementById("searchInput")
  if (searchInput) {
    searchInput.addEventListener("input", aplicarFiltros)
  }
}

// ========================================
// EXTENSÕES PARA FUNCIONALIDADES DE CONFIRMAR E REVISAR
// ========================================

let documentoEmAcao = null // Armazena o documento em ação

function abrirModalComentarios(docId, acao) {
  documentoEmAcao = { id: docId, acao: acao }

  const titulo = acao === "CONFIRMAR" ? "Confirmar Documento" : "Revisar Documento"
  const descricao =
    acao === "CONFIRMAR"
      ? "Ao confirmar, o status do documento será alterado para PROVISIONADO"
      : "Ao revisar, o documento será marcado para revisão"

  const modal = document.createElement("div")
  modal.id = "modal-comentarios"
  modal.className = "modal-overlay"
  modal.innerHTML = `
    <div class="modal-content modal-comentarios">
      <div class="modal-header">
        <h2>${titulo}</h2>
        <button class="modal-close" onclick="fecharModal('modal-comentarios')">
          <span class="material-symbols-sharp">close</span>
        </button>
      </div>
      
      <div class="modal-body">
        <p class="modal-descricao">${descricao}</p>
        
        <div class="form-group">
          <label for="comentarios-input">Comentários <span class="required">*</span></label>
          <textarea 
            id="comentarios-input" 
            class="form-control" 
            placeholder="Digite seus comentários..." 
            rows="5"
            required></textarea>
          <small class="form-text">Mínimo 10 caracteres</small>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="fecharModal('modal-comentarios')">
          <span class="material-symbols-sharp">cancel</span>
          Cancelar
        </button>
        <button class="btn btn-primary" onclick="confirmarAcao()">
          <span class="material-symbols-sharp">check_circle</span>
          ${acao === "CONFIRMAR" ? "Confirmar" : "Revisar"}
        </button>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Focar no textarea
  setTimeout(() => {
    const textarea = document.getElementById("comentarios-input")
    if (textarea) textarea.focus()
  }, 100)
}

function fecharModalComentarios() {
  fecharModal("modal-comentarios")
  documentoEmAcao = null
}

async function confirmarAcao() {
  if (!documentoEmAcao) return;

  const comentarios = document.getElementById("comentarios-input")?.value || "";

  // Validar comentários
  if (!comentarios || comentarios.trim().length < 10) {
    alert("Por favor, digite comentários com no mínimo 10 caracteres");
    return;
  }

  try {
    const endpoint =
      documentoEmAcao.acao === "CONFIRMAR"
        ? `/api/documentos-fiscais/${documentoEmAcao.id}/confirmar`
        : `/api/documentos-fiscais/${documentoEmAcao.id}/revisar`;

    const formData = new FormData();
    formData.append("comentarios", comentarios.trim());
    formData.append("usuario_id", 1); // TODO: Obter do localStorage

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

    // Verifica qual página recarregar com base na variável global
    if (paginaAtual === "provisionamentos") {
      await carregarDocumentosProvisionados(); // Recarrega a lista de provisionados
    } else if (paginaAtual === "documentos_fiscais") {
      await carregarDocumentos(); // Recarrega a lista principal de documentos
    }

  } catch (error) {
    console.error("[v0] Erro ao confirmar ação:", error);
    alert("Erro ao processar solicitação");
  }
}


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
            <span class="acao-badge acao-${item.acao.toLowerCase()}">${item.acao}</span>
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
      historicoHtml = '<p class="no-history">Nenhuma ação registrada</p>'
    }

    modal.innerHTML = `
      <div class="modal-content modal-historico">
        <div class="modal-header">
          <h2>Histórico do Documento ${docId}</h2>
          <button class="modal-close" onclick="fecharModal('modal-historico')">
            <span class="material-symbols-sharp">close</span>
          </button>
        </div>
        
        <div class="modal-body historico-body">
          <div class="historico-list">
            ${historicoHtml}
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="fecharModal('modal-historico')">
            Fechar
          </button>
        </div>
      </div>
    `

    document.body.appendChild(modal)
  } catch (error) {
    console.error("[v0] Erro ao visualizar histórico:", error)
    alert("Erro ao carregar histórico")
  }
}

// ========================================
// ATUALIZAÇÃO DA FUNÇÃO carregarDocumentos()
// ========================================

async function carregarDocumentos() {
  try {
    const searchTerm = document.getElementById("searchInput")?.value || ""
    const tipoData = document.getElementById("filterTipoData")?.value || "emissao"
    const dataInicial = document.getElementById("filterDataInicial")?.value || ""
    const dataFinal = document.getElementById("filterDataFinal")?.value || ""
    const tipoDoc = document.getElementById("filterTipoDoc")?.value || ""
    const status = document.getElementById("filterStatus")?.value || ""
    const fornecedorId = document.getElementById("filterFornecedor")?.value || ""

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

    if (!data.documentos || data.documentos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 40px; color: #636e72;">
            Nenhum documento fiscal encontrado
          </td>
        </tr>
      `
      return
    }

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
              <button onclick="abrirModalComentarios(${doc.id}, 'CONFIRMAR')" class="action-confirm">
                <span class="material-symbols-sharp">check_circle</span>
                Confirmar
              </button>
              <button onclick="abrirModalComentarios(${doc.id}, 'REVISAR')" class="action-review">
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
          <td colspan="10" style="text-align: center; padding: 40px; color: #e74c3c;">
            Erro ao carregar documentos: ${error.message}
          </td>
        </tr>
      `
    }
  }
}

// ==========================================================
// FUNÇÕES DE AÇÃO (Documentos Fiscais)
// ==========================================================
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

// ==========================================================
// FUNÇÕES DE MODAL (Documentos Fiscais)
// ==========================================================
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

async function excluirDoc(id) {
  if (!confirm("Deseja realmente excluir este documento?")) return

  try {
    const response = await fetch(`/api/documentos-fiscais/${id}`, {
      method: "DELETE",
    })

    const result = await response.json()

    if (result.success) {
      alert("Documento excluído com sucesso!")
      
      // Recarrega a página certa
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

function mostrarModalDocumento(doc, modo) {
  const readonly = modo === "visualizar"

  const modalHTML = `
    <div class="modal-overlay" id="modalDocumento">
      <div class="modal-content large">
        <div class="modal-header">
          <h2>${modo === "visualizar" ? "Visualizar" : "Editar"} Documento Fiscal</h2>
          <button class="close-btn" onclick="fecharModal('modalDocumento')">
            <span class="material-symbols-sharp">close</span>
          </button>
        </div>
        
        <div class="modal-body">
          <form id="formDocumento" ${readonly ? "disabled" : ""}>
            <div class="form-grid">
              
              <div class="form-group">
                <label>Empresa</label>
                <input type="text" value="${doc.empresa_nome || ""}" readonly class="readonly-input" />
              </div>
              
              <div class="form-group">
                <label>Fornecedor *</label>
                <select name="fornecedor_id" ${readonly ? "disabled" : ""} required>
                  <option value="${doc.fornecedor_id}">${doc.fornecedor_nome}</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>Tipo de Documento *</label>
                <select name="tipo_documento" ${readonly ? "disabled" : ""} required>
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
                <input type="text" name="numero_documento" value="${doc.numero_documento || ""}" ${readonly ? "readonly" : ""} required />
              </div>
              
              <div class="form-group">
                <label>Série</label>
                <input type="text" name="serie" value="${doc.serie || ""}" ${readonly ? "readonly" : ""} />
              </div>
              
              <div class="form-group full-width">
                <label>Chave de Acesso</label>
                <input type="text" name="chave_acesso" value="${doc.chave_acesso || ""}" ${readonly ? "readonly" : ""} />
              </div>
              
              <div class="form-group">
                <label>Data Emissão *</label>
                <input type="date" name="data_emissao" value="${doc.data_emissao || ""}" ${readonly ? "readonly" : ""} required />
              </div>
              
              <div class="form-group">
                <label>Data Recebimento</label>
                <input type="date" name="data_recebimento" value="${doc.data_recebimento || ""}" ${readonly ? "readonly" : ""} />
              </div>
              
              <div class="form-group">
                <label>Data Vencimento</label>
                <input type="date" name="data_vencimento" value="${doc.data_vencimento || ""}" ${readonly ? "readonly" : ""} />
              </div>
              
              <div class="form-group">
                <label>Data Competência</label>
                <input type="date" name="data_competencia" value="${doc.data_competencia || ""}" ${readonly ? "readonly" : ""} />
              </div>
              
              <div class="form-group">
                <label>Valor Total *</label>
                <input type="number" name="valor_total" value="${doc.valor_total || 0}" step="0.01" ${readonly ? "readonly" : ""} required />
              </div>
              
              <div class="form-group">
                <label>Valor Impostos</label>
                <input type="number" name="valor_impostos" value="${doc.valor_impostos || 0}" step="0.01" ${readonly ? "readonly" : ""} />
              </div>
              
              <div class="form-group">
                <label>Valor Líquido</label>
                <input type="number" value="${doc.valor_liquido || 0}" step="0.01" readonly class="readonly-input" />
              </div>
              
              <div class="form-group">
                <label>UF Origem</label>
                <input type="text" name="uf_origem" value="${doc.uf_origem || ""}" maxlength="2" ${readonly ? "readonly" : ""} />
              </div>
              
              <div class="form-group">
                <label>UF Destino</label>
                <input type="text" name="uf_destino" value="${doc.uf_destino || ""}" maxlength="2" ${readonly ? "readonly" : ""} />
              </div>
              
              <div class="form-group">
                <label>Município Prestação</label>
                <input type="text" name="municipio_prestacao" value="${doc.municipio_prestacao || ""}" ${readonly ? "readonly" : ""} />
              </div>
              
              <div class="form-group full-width">
                <label>Descrição do Serviço/Produto</label>
                <textarea name="descricao_servico_produto" rows="3" ${readonly ? "readonly" : ""}>${doc.descricao_servico_produto || ""}</textarea>
              </div>
              
              <div class="form-group full-width">
                <label>Observações</label>
                <textarea name="observacoes" rows="3" ${readonly ? "readonly" : ""}>${doc.observacoes || ""}</textarea>
              </div>
              
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
                      <a href="/uploads${a.caminho_arquivo}" target="_blank">${a.nome_original}</a>
                      <span class="anexo-tipo">${a.tipo_arquivo}</span>
                      ${
                        !readonly
                          ? `<button type="button" class="anexo-delete-btn" onclick="excluirAnexo(${doc.id}, ${a.id})">
                               <span class="material-symbols-sharp">delete</span>
                             </button>`
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
                    <input type="file" id="fileUpload" accept=".pdf,.xml,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" />
                    <button type="button" class="btn btn-secondary" onclick="uploadArquivo(${doc.id})">
                      <span class="material-symbols-sharp">upload</span>
                      Adicionar Anexo
                    </button>
                  </div>
                `
                    : ""
                }
              </div>
            </div>
          </form>
        </div>
        
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

  // Carregar fornecedores no select se for modo edição
  if (modo === "editar") {
    popularSelectFornecedores("#modalDocumento [name='fornecedor_id']", {
      valorSelecionado: doc.fornecedor_id,
      placeholder: null,
    })
  }
}

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
      
      // Recarrega a página certa
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
      // Recarregar modal
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

async function excluirAnexo(docId, anexoId) {
  if (!confirm("Deseja realmente excluir este anexo?")) return;

  try {
    const response = await fetch(`/api/anexos/${anexoId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (result.success) {
      alert("Anexo excluído com sucesso!");
      // Recarrega o modal de edição para mostrar a lista de anexos atualizada
      fecharModal('modalDocumento');
      editarDoc(docId); // Reabre o modal de edição
    } else {
      alert("Erro ao excluir anexo: " + (result.erro || "Erro desconhecido"));
    }
  } catch (error) {
    console.error("[v0] Erro ao excluir anexo:", error);
    alert("Erro ao excluir anexo.");
  }
}

function importarXML() {
  const modalHTML = `
    <div class="modal-overlay" id="modalImportarXML">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Importar XML</h2>
          <button class="close-btn" onclick="fecharModal('modalImportarXML')">
            <span class="material-symbols-sharp">close</span>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="upload-area">
            <span class="material-symbols-sharp" style="font-size: 48px; color: var(--primary-color);">upload_file</span>
            <h3>Selecione o arquivo XML</h3>
            <p>Formatos aceitos: NF-e, NFS-e, CT-e, NFC-e</p>
            <input type="file" id="xmlFileInput" accept=".xml" style="display: none;" />
            <button class="btn btn-primary" onclick="document.getElementById('xmlFileInput').click()">
              Escolher Arquivo
            </button>
            <div id="selectedFile" style="margin-top: 20px; font-weight: bold;"></div>
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

  // Listener para mostrar arquivo selecionado
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

function cadastrarManual() {
  const modalHTML = `
    <div class="modal-overlay" id="modalCadastrar">
      <div class="modal-content large">
        <div class="modal-header">
          <h2>Cadastrar Documento Fiscal</h2>
          <button class="close-btn" onclick="fecharModal('modalCadastrar')">
            <span class="material-symbols-sharp">close</span>
          </button>
        </div>
        
        <div class="modal-body">
          <form id="formCadastro">
            <input type="hidden" name="empresa_id" value="1" />
            
            <div class="form-grid">
              
              <div class="form-group">
                <label>Fornecedor *</label>
                <select name="fornecedor_id" required id="selectFornecedor">
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
                <input type="text" name="numero_documento" required />
              </div>
              
              <div class="form-group">
                <label>Série</label>
                <input type="text" name="serie" />
              </div>
              
              <div class="form-group full-width">
                <label>Chave de Acesso</label>
                <input type="text" name="chave_acesso" maxlength="44" />
              </div>
              
              <div class="form-group">
                <label>Data Emissão *</label>
                <input type="date" name="data_emissao" required />
              </div>
              
              <div class="form-group">
                <label>Data Recebimento</label>
                <input type="date" name="data_recebimento" />
              </div>
              
              <div class="form-group">
                <label>Data Vencimento</label>
                <input type="date" name="data_vencimento" />
              </div>
              
              <div class="form-group">
                <label>Data Competência</label>
                <input type="date" name="data_competencia" />
              </div>
              
              <div class="form-group">
                <label>Valor Total *</label>
                <input type="number" name="valor_total" step="0.01" required />
              </div>
              
              <div class="form-group">
                <label>Valor Impostos</label>
                <input type="number" name="valor_impostos" step="0.01" value="0" />
              </div>
              
              <div class="form-group">
                <label>UF Origem</label>
                <input type="text" name="uf_origem" maxlength="2" />
              </div>
              
              <div class="form-group">
                <label>UF Destino</label>
                <input type="text" name="uf_destino" maxlength="2" />
              </div>
              
              <div class="form-group">
                <label>Município Prestação</label>
                <input type="text" name="municipio_prestacao" />
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
                <div class="upload-section">
                  <input type="file" id="fileUploadCadastro" accept=".pdf,.xml,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" />
                </div>
              </div>

            </div>
          </form>
        </div>
        
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

    // 2. Se houver um arquivo, faz o upload
    if (file && novoDocumentoId) {
      const fileFormData = new FormData();
      fileFormData.append("file", file);
      fileFormData.append("documento_id", novoDocumentoId);
      fileFormData.append("tipo_relacao", "PRINCIPAL"); // Define como anexo principal

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
    carregarDocumentos(); // Recarrega a tabela

  } catch (error) {
    console.error("[v0] Erro ao cadastrar:", error);
    alert("Erro ao cadastrar documento");
  }
}


// ==========================================================
// PÁGINA DE CADASTROS BASE (EMPRESAS E FORNECEDORES)
// ==========================================================
async function carregarCadastrosBase() {
  const mainContent = document.querySelector(".main-content")

  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h1>Cadastro Base</h1>
        <p class="page-subtitle">Gerencie empresas e fornecedores</p>
      </div>

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

        <div id="tab-empresas" class="tab-content active">
          <div class="table-header">
            <div class="search-bar">
              <span class="material-symbols-sharp search-icon">search</span>
              <input type="text" id="searchEmpresas" placeholder="Pesquisar empresas..." onkeyup="filtrarTabela('searchEmpresas', 'empresasTableBody')" />
            </div>
            <button class="btn btn-add" onclick="novaEmpresa()">
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
                <tr>
                  <td colspan="6" style="text-align: center; padding: 40px;">Carregando...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="tab-fornecedores" class="tab-content">
          <div class="table-header">
            <div class="search-bar">
              <span class="material-symbols-sharp search-icon">search</span>
              <input type="text" id="searchFornecedores" placeholder="Pesquisar fornecedores..." onkeyup="filtrarTabela('searchFornecedores', 'fornecedoresTableBody')" />
            </div>
            <button class="btn btn-add" onclick="novoFornecedor()">
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
                <tr>
                  <td colspan="7" style="text-align: center; padding: 40px;">Carregando...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `

  await carregarListaEmpresas()
  await carregarListaFornecedores()
}

function mostrarTab(tab, element) {
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"))
  document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"))

  element.classList.add("active")
  document.getElementById(`tab-${tab}`).classList.add("active")
}

// EMPRESAS
async function carregarListaEmpresas() {
  try {
    const response = await fetch("/api/empresas")
    const data = await response.json()

    const tbody = document.getElementById("empresasTableBody")
    if (!tbody) return

    if (!data.empresas || data.empresas.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center; padding: 40px;">Nenhuma empresa cadastrada</td></tr>'
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
        <td><span class="status-badge ${emp.ativa ? "processado" : "cancelado"}">${emp.ativa ? "Ativa" : "Inativa"}</span></td>
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
    <div class="modal-overlay" id="modalEmpresa">
      <div class="modal-content large">
        <div class="modal-header">
          <h2>${isEdit ? "Editar" : "Nova"} Empresa</h2>
          <button class="close-btn" onclick="fecharModal('modalEmpresa')">
            <span class="material-symbols-sharp">close</span>
          </button>
        </div>
        
        <div class="modal-body">
          <form id="formEmpresa">
            <div class="form-grid">
              <div class="form-group">
                <label>CNPJ *</label>
                <input type="text" name="cnpj" value="${empresa?.cnpj || ""}" maxlength="18" required />
              </div>
              
              <div class="form-group">
                <label>Razão Social *</label>
                <input type="text" name="razao_social" value="${empresa?.razao_social || ""}" required />
              </div>
              
              <div class="form-group">
                <label>Nome Fantasia</label>
                <input type="text" name="nome_fantasia" value="${empresa?.nome_fantasia || ""}" />
              </div>
              
              <div class="form-group">
                <label>Inscrição Estadual</label>
                <input type="text" name="inscricao_estadual" value="${empresa?.inscricao_estadual || ""}" />
              </div>
              
              <div class="form-group">
                <label>Inscrição Municipal</label>
                <input type="text" name="inscricao_municipal" value="${empresa?.inscricao_municipal || ""}" />
              </div>
              
              <div class="form-group full-width">
                <h3 style="margin-top: 20px;">Endereço</h3>
              </div>
              
              <div class="form-group">
                <label>CEP</label>
                <input type="text" name="endereco_cep" value="${empresa?.endereco_cep || ""}" maxlength="9" />
              </div>
              
              <div class="form-group">
                <label>Logradouro</label>
                <input type="text" name="endereco_logradouro" value="${empresa?.endereco_logradouro || ""}" />
              </div>
              
              <div class="form-group">
                <label>Número</label>
                <input type="text" name="endereco_numero" value="${empresa?.endereco_numero || ""}" />
              </div>
              
              <div class="form-group">
                <label>Complemento</label>
                <input type="text" name="endereco_complemento" value="${empresa?.endereco_complemento || ""}" />
              </div>
              
              <div class="form-group">
                <label>Bairro</label>
                <input type="text" name="endereco_bairro" value="${empresa?.endereco_bairro || ""}" />
              </div>
              
              <div class="form-group">
                <label>Cidade</label>
                <input type="text" name="endereco_cidade" value="${empresa?.endereco_cidade || ""}" />
              </div>
              
              <div class="form-group">
                <label>UF</label>
                <input type="text" name="endereco_uf" value="${empresa?.endereco_uf || ""}" maxlength="2" />
              </div>
              
              <div class="form-group full-width">
                <h3 style="margin-top: 20px;">Contato</h3>
              </div>
              
              <div class="form-group">
                <label>Email Principal</label>
                <input type="email" name="email_principal" value="${empresa?.email_principal || ""}" />
              </div>
              
              <div class="form-group">
                <label>Telefone Principal</label>
                <input type="text" name="telefone_principal" value="${empresa?.telefone_principal || ""}" />
              </div>
              
              <div class="form-group">
                <label>Status</label>
                <select name="ativa">
                  <option value="1" ${!empresa || empresa.ativa ? "selected" : ""}>Ativa</option>
                  <option value="0" ${empresa && !empresa.ativa ? "selected" : ""}>Inativa</option>
                </select>
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="fecharModal('modalEmpresa')">Cancelar</button>
          <button class="btn btn-primary" onclick="salvarEmpresa(${empresa?.id || "null"})">
            <span class="material-symbols-sharp">save</span>
            Salvar
          </button>
        </div>
      </div>
    </div>
  `

  document.body.insertAdjacentHTML("beforeend", modalHTML)
}

async function salvarEmpresa(id) {
  const form = document.getElementById("formEmpresa")
  if (!form.checkValidity()) {
    alert("Preencha todos os campos obrigatórios")
    return
  }

  const formData = new FormData(form)

  const cnpjInput = form.querySelector('[name="cnpj"]');
  if (cnpjInput) {
    const cleanedCnpj = cnpjInput.value.replace(/\D/g, ''); // Remove tudo que não for dígito
    formData.set('cnpj', cleanedCnpj); // Sobrescreve o valor no formulário
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

// FORNECEDORES
async function carregarListaFornecedores() {
  try {
    const response = await fetch("/api/fornecedores")
    const data = await response.json()

    const tbody = document.getElementById("fornecedoresTableBody")
    if (!tbody) return

    if (!data.fornecedores || data.fornecedores.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align: center; padding: 40px;">Nenhum fornecedor cadastrado</td></tr>'
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
        <td><span class="status-badge ${forn.ativo ? "processado" : "cancelado"}">${forn.ativo ? "Ativo" : "Inativo"}</span></td>
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
    <div class="modal-overlay" id="modalFornecedor">
      <div class="modal-content large">
        <div class="modal-header">
          <h2>${isEdit ? "Editar" : "Novo"} Fornecedor</h2>
          <button class="close-btn" onclick="fecharModal('modalFornecedor')">
            <span class="material-symbols-sharp">close</span>
          </button>
        </div>
        
        <div class="modal-body">
          <form id="formFornecedor">
            <input type="hidden" name="empresa_id" value="1" />
            
            <div class="form-grid">
              <div class="form-group">
                <label>Tipo Pessoa *</label>
                <select name="tipo_pessoa" required onchange="alterarTipoPessoa()">
                  <option value="PJ" ${!fornecedor || fornecedor.tipo_pessoa === "PJ" ? "selected" : ""}>Pessoa Jurídica</option>
                  <option value="PF" ${fornecedor && fornecedor.tipo_pessoa === "PF" ? "selected" : ""}>Pessoa Física</option>
                </select>
              </div>
              
              <div class="form-group">
                <label id="labelDocumento">CNPJ *</label>
                <input type="text" name="cnpj_cpf" value="${fornecedor?.cnpj_cpf || ""}" required />
              </div>
              
              <div class="form-group">
                <label>Razão Social / Nome *</label>
                <input type="text" name="razao_social" value="${fornecedor?.razao_social || ""}" required />
              </div>
              
              <div class="form-group">
                <label>Nome Fantasia</label>
                <input type="text" name="nome_fantasia" value="${fornecedor?.nome_fantasia || ""}" />
              </div>
              
              <div class="form-group full-width">
                <h3 style="margin-top: 20px;">Endereço</h3>
              </div>
              
              <div class="form-group">
                <label>CEP</label>
                <input type="text" name="endereco_cep" value="${fornecedor?.endereco_cep || ""}" maxlength="8" />
              </div>
              
              <div class="form-group">
                <label>Logradouro</label>
                <input type="text" name="endereco_logradouro" value="${fornecedor?.endereco_logradouro || ""}" />
              </div>
              
              <div class="form-group">
                <label>Número</label>
                <input type="text" name="endereco_numero" value="${fornecedor?.endereco_numero || ""}" />
              </div>
              
              <div class="form-group">
                <label>Complemento</label>
                <input type="text" name="endereco_complemento" value="${fornecedor?.endereco_complemento || ""}" />
              </div>
              
              <div class="form-group">
                <label>Bairro</label>
                <input type="text" name="endereco_bairro" value="${fornecedor?.endereco_bairro || ""}" />
              </div>
              
              <div class="form-group">
                <label>Cidade</label>
                <input type="text" name="endereco_cidade" value="${fornecedor?.endereco_cidade || ""}" />
              </div>
              
              <div class="form-group">
                <label>UF</label>
                <input type="text" name="endereco_uf" value="${fornecedor?.endereco_uf || ""}" maxlength="2" />
              </div>
              
              <div class="form-group full-width">
                <h3 style="margin-top: 20px;">Contato</h3>
              </div>
              
              <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" value="${fornecedor?.email || ""}" />
              </div>
              
              <div class="form-group">
                <label>Telefone</label>
                <input type="text" name="telefone" value="${fornecedor?.telefone || ""}" />
              </div>
              
              <div class="form-group">
                <label>Status</label>
                <select name="ativo">
                  <option value="1" ${!fornecedor || fornecedor.ativo ? "selected" : ""}>Ativo</option>
                  <option value="0" ${fornecedor && !fornecedor.ativo ? "selected" : ""}>Inativo</option>
                </select>
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="fecharModal('modalFornecedor')">Cancelar</button>
          <button class="btn btn-primary" onclick="salvarFornecedor(${fornecedor?.id || "null"})">
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

async function salvarFornecedor(id) {
  const form = document.getElementById("formFornecedor")
  if (!form.checkValidity()) {
    alert("Preencha todos os campos obrigatórios")
    return
  }

  const formData = new FormData(form)

  const cnpjCpfInput = form.querySelector('[name="cnpj_cpf"]');
  if (cnpjCpfInput) {
    const cleanedCnpjCpf = cnpjCpfInput.value.replace(/\D/g, ''); // Remove tudo que não for dígito
    formData.set('cnpj_cpf', cleanedCnpjCpf); // Sobrescreve o valor no formulário
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

// ==========================================================
// PÁGINA DE GESTÃO DE USUÁRIOS
// ==========================================================
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
          <input type="text" id="searchUsuarios" placeholder="Pesquisar usuários..." onkeyup="filtrarTabela('searchUsuarios', 'usuariosTableBody')" />
        </div>
        <button class="btn btn-add" onclick="novoUsuario()">
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
            <tr>
              <td colspan="9" style="text-align: center; padding: 40px;">Carregando...</td>
            </tr>
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
      tbody.innerHTML =
        '<tr><td colspan="9" style="text-align: center; padding: 40px;">Nenhum usuário cadastrado</td></tr>'
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
        <td><span class="status-badge ${user.ativo ? "processado" : "cancelado"}">${user.ativo ? "Ativo" : "Inativo"}</span></td>
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

async function mostrarModalUsuario(usuario) {
  const isEdit = usuario !== null

  // Carregar empresas e roles
  const empresasResp = await fetch("/api/empresas")
  const empresasData = await empresasResp.json()

  const rolesResp = await fetch("/api/roles")
  const rolesData = await rolesResp.json()

  const modalHTML = `
    <div class="modal-overlay" id="modalUsuario">
      <div class="modal-content large">
        <div class="modal-header">
          <h2>${isEdit ? "Editar" : "Novo"} Usuário</h2>
          <button class="close-btn" onclick="fecharModal('modalUsuario')">
            <span class="material-symbols-sharp">close</span>
          </button>
        </div>
        
        <div class="modal-body">
          <form id="formUsuario">
            <div class="form-grid">
              <div class="form-group">
                <label>Nome *</label>
                <input type="text" name="nome" value="${usuario?.nome || ""}" required />
              </div>
              
              <div class="form-group">
                <label>Email *</label>
                <input type="email" name="email" value="${usuario?.email || ""}" required />
              </div>
              
              <div class="form-group">
                <label>CPF</label>
                <input type="text" name="cpf" value="${usuario?.cpf || ""}" maxlength="11" />
              </div>
              
              <div class="form-group">
                <label>Telefone</label>
                <input type="text" name="telefone" value="${usuario?.telefone || ""}" />
              </div>
              
              <div class="form-group">
                <label>Departamento</label>
                <input type="text" name="departamento" value="${usuario?.departamento || ""}" />
              </div>
              
              <div class="form-group">
                <label>Empresa *</label>
                <select name="empresa_id" required>
                  ${empresasData.empresas
                    .map(
                      (emp) => `
                    <option value="${emp.id}" ${usuario && usuario.empresa_id === emp.id ? "selected" : ""}>
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
                    <option value="${role.id}" ${usuario && usuario.role_id === role.id ? "selected" : ""}>
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
                  <input type="password" name="senha" required />
                </div>
                
                <div class="form-group">
                  <label>Confirmar Senha *</label>
                  <input type="password" name="senha_confirma" required />
                </div>
              `
                  : ""
              }
              
              <div class="form-group">
                <label>Status</label>
                <select name="ativo">
                  <option value="1" ${!usuario || usuario.ativo ? "selected" : ""}>Ativo</option>
                  <option value="0" ${usuario && !usuario.ativo ? "selected" : ""}>Inativo</option>
                </select>
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="fecharModal('modalUsuario')">Cancelar</button>
          <button class="btn btn-primary" onclick="salvarUsuario(${usuario?.id || "null"})">
            <span class="material-symbols-sharp">save</span>
            Salvar
          </button>
        </div>
      </div>
    </div>
  `

  document.body.insertAdjacentHTML("beforeend", modalHTML)
}

async function salvarUsuario(id) {
  const form = document.getElementById("formUsuario")
  if (!form.checkValidity()) {
    alert("Preencha todos os campos obrigatórios")
    return
  }

  const formData = new FormData(form)

  // Validar senhas se for novo usuário
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

// ==========================================================
// PÁGINA DE PROVISIONAMENTOS (REFATORADA)
// ==========================================================
async function carregarProvisionamentos() {
  const mainContent = document.querySelector(".main-content");

  // HTML é 99% igual ao de carregarDocumentosFiscais()
  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h1>Provisionamentos</h1>
        <p class="page-subtitle">Gerencie documentos confirmados e prontos para pagamento.</p>
      </div>

      <div class="search-bar">
        <span class="material-symbols-sharp search-icon">search</span>
        <input type="text" id="searchInput" placeholder="Pesquisar por número, fornecedor, valor..." />
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
            <input type="date" class="filter-input" id="filterDataInicial" />
          </div>

          <div class="filter-group">
            <label>Data Final</label>
            <input type="date" class="filter-input" id="filterDataFinal" />
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
            <tr>
              <td colspan="10" style="text-align: center; padding: 40px;">
                Carregando provisionamentos...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="action-buttons">
      </div>
    </div>
  `;
  
  // Carrega dados do backend
  await popularSelectFornecedores("#filterFornecedor", { placeholder: "Todos" });
  await carregarDocumentosProvisionados(); // <-- Chama a nova função de busca
  
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    // Chama a nova função de filtro
    searchInput.addEventListener("input", aplicarFiltrosProvisionamentos); 
  }
}

async function carregarDocumentosProvisionados() {
  try {
    const searchTerm = document.getElementById("searchInput")?.value || "";
    const tipoData = document.getElementById("filterTipoData")?.value || "emissao";
    const dataInicial = document.getElementById("filterDataInicial")?.value || "";
    const dataFinal = document.getElementById("filterDataFinal")?.value || "";
    const tipoDoc = document.getElementById("filterTipoDoc")?.value || "";
    // const status = document.getElementById("filterStatus")?.value || ""; // NÃO USA O FILTRO
    const fornecedorId = document.getElementById("filterFornecedor")?.value || "";

    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append("search", searchTerm.trim());
    if (tipoData) params.append("tipo_data", tipoData);
    if (dataInicial) params.append("data_inicial", dataInicial);
    if (dataFinal) params.append("data_final", dataFinal);
    if (tipoDoc) params.append("tipo_documento", tipoDoc);
    
    params.append("status", "PROVISIONADO"); // <-- MUDANÇA PRINCIPAL
    
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
          <td colspan="10" style="text-align: center; padding: 40px; color: #636e72;">
            Nenhum documento provisionado encontrado
          </td>
        </tr>
      `;
      return;
    }

    // O HTML da tabela é idêntico ao de 'carregarDocumentos'
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
              <button onclick="abrirModalComentarios(${doc.id}, 'CONFIRMAR')" class="action-confirm">
                <span class="material-symbols-sharp">check_circle</span>
                Confirmar
              </button>
              <button onclick="abrirModalComentarios(${doc.id}, 'REVISAR')" class="action-review">
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
          <td colspan="10" style="text-align: center; padding: 40px; color: #e74c3c;">
            Erro ao carregar provisionamentos: ${error.message}
          </td>
        </tr>
      `;
    }
  }
}

// NOVAS Funções de filtro para a nova página
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

// ==========================================================
// PÁGINA DE REMESSAS CNAB
// ==========================================================
async function carregarRemessasCNAB() {
  const mainContent = document.querySelector(".main-content")

  mainContent.innerHTML = `
    <div class="page-header">
      <h1>Remessas CNAB</h1>
      <p class="subtitle">Gerencie arquivos de remessa e retorno bancário</p>
    </div>

    <div class="filters-card">
      <h3>Filtros</h3>
      <div class="filters-grid">
        <div class="filter-group">
          <label>Status Remessa</label>
          <select id="filtro-status-remessa">
            <option value="">Todos</option>
            <option value="GERADA">Gerada</option>
            <option value="ENVIADA">Enviada</option>
            <option value="PROCESSADA">Processada</option>
            <option value="ERRO">Erro</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Data Inicial</label>
          <input type="date" id="filtro-data-inicial-remessa" />
        </div>
        <div class="filter-group">
          <label>Data Final</label>
          <input type="date" id="filtro-data-final-remessa" />
        </div>
      </div>
      <div class="filters-actions">
        <button class="btn-primary" onclick="aplicarFiltrosRemessas()">
          <span class="material-icons">filter_alt</span>
          Aplicar Filtros
        </button>
        <button classD="btn-secondary" onclick="limparFiltrosRemessas()">
          <span class="material-icons">clear</span>
          Limpar
        </button>
      </div>
    </div>

    <div class="documentos-table-container">
      <table class="documentos-table">
        <thead>
          <tr>
            <th>Número Remessa</th>
            <th>Data Geração</th>
            <th>Qtd. Registros</th>
            <th>Valor Total</th>
            <th>Status</th>
            <th>Retorno</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="remessas-tbody">
          <tr>
            <td colspan="7" style="text-align: center; padding: 40px;">
              <span class="material-icons" style="font-size: 48px; color: #ccc;">hourglass_empty</span>
              <p>Carregando remessas...</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="page-actions">
      <button class="btn-success" onclick="abrirModalNovaRemessa()">
        <span class="material-icons">upload_file</span>
        Gerar Nova Remessa
      </button>
      <button class="btn-primary" onclick="abrirModalImportarRetorno()">
        <span class="material-icons">download</span>
        Importar Retorno
      </button>
    </div>
  `

  await listarRemessas()
}

async function listarRemessas(filtros = {}) {
  try {
    const params = new URLSearchParams()
    if (filtros.status) params.append("status", filtros.status)
    if (filtros.data_inicial) params.append("data_inicial", filtros.data_inicial)
    if (filtros.data_final) params.append("data_final", filtros.data_final)

    const response = await fetch(`/api/remessas-cnab?${params}`)
    const data = await response.json()

    const tbody = document.getElementById("remessas-tbody")

    if (!data.remessas || data.remessas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px;">
            <span class="material-icons" style="font-size: 48px; color: #ccc;">inbox</span>
            <p>Nenhuma remessa encontrada</p>
          </td>
        </tr>
      `
      return
    }

    tbody.innerHTML = data.remessas
      .map(
        (remessa) => `
      <tr>
        <td>${remessa.numero_remessa}</td>
        <td>${formatarDataHora(remessa.data_geracao)}</td>
        <td>${remessa.quantidade_registros}</td>
        <td>${formatarMoeda(remessa.valor_total)}</td>
        <td><span class="badge badge-${getStatusBadgeClass(remessa.status_remessa)}">${remessa.status_remessa}</span></td>
        <td>
          ${
            remessa.tem_retorno
              ? `<span class="badge badge-success">
              <span class="material-icons" style="font-size: 16px;">check_circle</span>
              Processado
            </span>`
              : `<span class="badge badge-warning">Aguardando</span>`
          }
        </td>
        <td>
          <div class="actions-dropdown">
            <button class="btn-icon" onclick="toggleActionsMenu(event)">
              <span class="material-icons">more_vert</span>
            </button>
            <div class="actions-menu">
              <button onclick="visualizarRemessa(${remessa.id})">
                <span class="material-icons">visibility</span>
                Visualizar
              </button>
              <button onclick="baixarArquivoRemessa(${remessa.id})">
                <span class="material-icons">download</span>
                Baixar Arquivo
              </button>
              ${
                !remessa.tem_retorno
                  ? `
              <button onclick="importarRetornoRemessa(${remessa.id})">
                <span class="material-icons">upload</span>
                Importar Retorno
              </button>
              `
                  : ""
              }
            </div>
          </div>
        </td>
      </tr>
    `,
      )
      .join("")
  } catch (error) {
    console.error("[v0] Erro ao listar remessas:", error)
    alert("Erro ao carregar remessas")
  }
}

function aplicarFiltrosRemessas() {
  const filtros = {
    status: document.getElementById("filtro-status-remessa").value,
    data_inicial: document.getElementById("filtro-data-inicial-remessa").value,
    data_final: document.getElementById("filtro-data-final-remessa").value,
  }

  listarRemessas(filtros)
}

function limparFiltrosRemessas() {
  document.getElementById("filtro-status-remessa").value = ""
  document.getElementById("filtro-data-inicial-remessa").value = ""
  document.getElementById("filtro-data-final-remessa").value = ""

  listarRemessas()
}

async function abrirModalNovaRemessa() {
  // Buscar contas a pagar pendentes
  const response = await fetch("/api/contas-pagar?status=PENDENTE")
  const data = await response.json()

  const modal = document.getElementById("modal-generico") || criarModalGenerico()

  modal.innerHTML = `
    <div class="modal-content modal-large">
      <div class="modal-header">
        <h2>Gerar Nova Remessa CNAB</h2>
        <button class="modal-close" onclick="fecharModal('modal-generico')">
          <span class="material-icons">close</span>
        </button>
      </div>
      <div class="modal-body">
        <p class="info-text">
          Selecione as contas a pagar que deseja incluir na remessa bancária.
        </p>
        
        <div class="contas-pagar-list">
          ${
            data.contas.length === 0
              ? `
            <p style="text-align: center; padding: 40px; color: #999;">
              Nenhuma conta a pagar pendente
            </p>
          `
              : data.contas
                  .map(
                    (conta) => `
            <div class="conta-pagar-item">
              <input type="checkbox" id="conta-${conta.id}" value="${conta.id}" onchange="atualizarTotalRemessa()">
              <label for="conta-${conta.id}">
                <strong>${conta.fornecedor}</strong> - 
                ${conta.numero_documento} - 
                Venc: ${formatarData(conta.data_vencimento)} - 
                <strong>${formatarMoeda(conta.valor_original)}</strong>
              </label>
            </div>
          `,
                  )
                  .join("")
          }
        </div>

        <div class="remessa-total">
          <h3>Total Selecionado: <span id="total-remessa">R$ 0,00</span></h3>
          <p>Quantidade: <span id="qtd-remessa">0</span> pagamentos</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="fecharModal('modal-generico')">Cancelar</button>
        <button class="btn-success" onclick="confirmarGerarRemessa()">
          <span class="material-icons">upload_file</span>
          Gerar Remessa
        </button>
      </div>
    </div>
  `

  modal.style.display = "flex"
}

function atualizarTotalRemessa() {
  const checkboxes = document.querySelectorAll('.conta-pagar-item input[type="checkbox"]:checked')
  let total = 0

  checkboxes.forEach((checkbox) => {
    const label = checkbox.nextElementSibling.textContent
    const valorMatch = label.match(/R\$ ([\d.,]+)/)
    if (valorMatch) {
      const valor = Number.parseFloat(valorMatch[1].replace(/\./g, "").replace(",", "."))
      total += valor
    }
  })

  document.getElementById("total-remessa").textContent = formatarMoeda(total)
  document.getElementById("qtd-remessa").textContent = checkboxes.length
}

async function confirmarGerarRemessa() {
  const checkboxes = document.querySelectorAll('.conta-pagar-item input[type="checkbox"]:checked')
  const contaIds = Array.from(checkboxes).map((cb) => Number.parseInt(cb.value))

  if (contaIds.length === 0) {
    alert("Selecione ao menos uma conta a pagar")
    return
  }

  try {
    const response = await fetch("/api/remessas-cnab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conta_ids: contaIds }),
    })

    const result = await response.json()

    if (result.success) {
      alert("Remessa gerada com sucesso!")
      fecharModal("modal-generico")
      listarRemessas()
    } else {
      alert("Erro ao gerar remessa: " + result.erro)
    }
  } catch (error) {
    console.error("[v0] Erro ao gerar remessa:", error)
    alert("Erro ao gerar remessa")
  }
}

async function abrirModalImportarRetorno() {
  const modal = document.getElementById("modal-generico") || criarModalGenerico()

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Importar Retorno CNAB</h2>
        <button class="modal-close" onclick="fecharModal('modal-generico')">
          <span class="material-icons">close</span>
        </button>
      </div>
      <div class="modal-body">
        <p class="info-text">
          Selecione o arquivo de retorno (.RET) enviado pelo banco para processar os pagamentos.
        </p>
        
        <div class="form-group">
          <label>Arquivo de Retorno (.RET)</label>
          <input type="file" id="arquivo-retorno" accept=".ret,.RET,.txt" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="fecharModal('modal-generico')">Cancelar</button>
        <button class="btn-primary" onclick="confirmarImportarRetorno()">
          <span class="material-icons">upload</span>
          Importar e Processar
        </button>
      </div>
    </div>
  `

  modal.style.display = "flex"
}

async function confirmarImportarRetorno() {
  const fileInput = document.getElementById("arquivo-retorno")
  const file = fileInput.files[0]

  if (!file) {
    alert("Selecione um arquivo de retorno")
    return
  }

  const formData = new FormData()
  formData.append("file", file)

  try {
    const response = await fetch("/api/processar-retorno-cnab", {
      method: "POST",
      body: formData,
    })

    const result = await response.json()

    if (result.success) {
      alert(`Retorno processado com sucesso!\n${result.processados} pagamentos atualizados.`)
      fecharModal("modal-generico")
      listarRemessas()
    } else {
      alert("Erro ao processar retorno: " + result.erro)
    }
  } catch (error) {
    console.error("[v0] Erro ao importar retorno:", error)
    alert("Erro ao importar retorno")
  }
}

// Utility function to create a generic modal if it doesn't exist
function criarModalGenerico() {
  const modalContainer = document.createElement("div")
  modalContainer.id = "modal-generico"
  modalContainer.className = "modal-overlay"
  modalContainer.style.display = "none" // Hidden by default
  document.body.appendChild(modalContainer)
  return modalContainer
}

// Placeholder functions for provisionamentos and CNAB remessas actions
function visualizarProvisionamento(id) {
  console.log("Visualizar Provisionamento:", id)
}
function aprovarProvisionamento(id) {
  console.log("Aprovar Provisionamento:", id)
}
function rejeitarProvisionamento(id) {
  console.log("Rejeitar Provisionamento:", id)
}
function gerarContaPagar(id) {
  console.log("Gerar Conta a Pagar para Provisionamento:", id)
}
function visualizarRemessa(id) {
  console.log("Visualizar Remessa CNAB:", id)
}
function baixarArquivoRemessa(id) {
  console.log("Baixar Arquivo Remessa CNAB:", id)
}
function importarRetornoRemessa(id) {
  console.log("Importar Retorno Remessa CNAB:", id)
}


// ==========================================================
// PÁGINA DE AUDITORIA E RELATÓRIOS (NOVA SEÇÃO)
// ==========================================================

/**
 * Renderiza a "casca" da página de Auditoria e Relatórios
 */
async function carregarAuditoriaRelatorios() {
  const mainContent = document.querySelector(".main-content");

  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h1>Auditoria e Relatórios</h1>
        <p class="page-subtitle">Visualize o log de atividades do sistema e relatórios gerenciais.</p>
      </div>

      <div class="table-header">
        <h3>Log de Atividades Recentes</h3>
      </div>

      <div class="table-container">
        <table class="data-table"> <thead>
            <tr>
              <th style="width: 20%;">Data/Hora</th>
              <th style="width: 15%;">Usuário</th>
              <th style="width: 20%;">Ação</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody id="auditoriaTableBody">
            <tr>
              <td colspan="4" style="text-align: center; padding: 40px;">
                <span class="material-symbols-sharp">hourglass_empty</span>
                Carregando log de atividades...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Após renderizar a "casca", busca os dados
  await buscarLogAtividades();
}

/**
 * Busca os dados do endpoint de log e preenche a tabela
 */
async function buscarLogAtividades() {
  try {
    const response = await fetch("/api/auditoria/log_atividades");
    const data = await response.json();

    const tbody = document.getElementById("auditoriaTableBody");
    if (!tbody) return;

    if (!data.success || !data.atividades || data.atividades.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 40px; color: #636e72;">
            Nenhum log de atividade encontrado.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.atividades.map(log => {
      // Usa a nova função auxiliar para criar o badge
      const acaoBadge = getAcaoBadge(log.acao);

      return `
        <tr>
          <td>${formatarDataHora(log.data_hora)}</td>
          <td>${log.usuario}</td>
          <td>${acaoBadge}</td>
          <td>${log.descricao}</td>
        </tr>
      `;
    }).join("");

  } catch (error) {
    console.error("[v0] Erro ao buscar log de auditoria:", error);
    const tbody = document.getElementById("auditoriaTableBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 40px; color: #e74c3c;">
            Erro ao carregar log de auditoria: ${error.message}
          </td>
        </tr>
      `;
    }
  }
}


// ==========================================================
// PÁGINA DE DASHBOARD (NOVA SEÇÃO)
// ==========================================================

/**
 * Renderiza a "casca" da página de Dashboard e inicia a busca de dados
 */
async function carregarDashboard() {
  const mainContent = document.querySelector(".main-content");

  mainContent.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h1>Dashboard</h1>
        <p class="page-subtitle">Resumo financeiro e operacional da empresa.</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card kpi-provisionado">
          <div class="kpi-icon">
            <span class="material-symbols-sharp">check_circle</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-title">Total Provisionado</span>
            <span class="kpi-value" id="kpi-total-provisionado">R$ 0,00</span>
          </div>
        </div>
        
        <div class="kpi-card kpi-vencido">
          <div class="kpi-icon">
            <span class="material-symbols-sharp">error</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-title">Contas Vencidas</span>
            <span class="kpi-value" id="kpi-contas-vencidas">R$ 0,00</span>
          </div>
        </div>

        <div class="kpi-card kpi-pendente">
          <div class="kpi-icon">
            <span class="material-symbols-sharp">pending_actions</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-title">Docs Pendentes</span>
            <span class="kpi-value" id="kpi-docs-pendentes">0</span>
          </div>
        </div>

        <div class="kpi-card kpi-revisar">
          <div class="kpi-icon">
            <span class="material-symbols-sharp">rate_review</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-title">Docs para Revisar</span>
            <span class="kpi-value" id="kpi-docs-revisar">0</span>
          </div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-container">
          <h3>Gastos Provisionados por Fornecedor</h3>
          <canvas id="graficoGastosFornecedor"></canvas>
        </div>
        <div class="chart-container">
          <h3>Documentos por Status</h3>
          <canvas id="graficoDocsStatus"></canvas>
        </div>
      </div>
    </div>
  `;

  // Após renderizar a "casca", busca os dados
  await buscarKPIsDashboard();
  await desenharGraficosDashboard();
}

/**
 * Busca os dados dos 4 KPIs e preenche os cards
 */
async function buscarKPIsDashboard() {
  try {
    const response = await fetch("/api/dashboard/kpis");
    const data = await response.json();

    if (!data.success) throw new Error("Erro ao buscar KPIs");

    const kpis = data.kpis;
    document.getElementById("kpi-total-provisionado").textContent = formatarMoeda(kpis.total_provisionado);
    document.getElementById("kpi-contas-vencidas").textContent = formatarMoeda(kpis.contas_vencidas);
    document.getElementById("kpi-docs-pendentes").textContent = kpis.docs_pendentes;
    document.getElementById("kpi-docs-revisar").textContent = kpis.docs_revisar;

  } catch (error) {
    console.error("[v0] Erro ao buscar KPIs:", error);
    // Deixa os valores zerados em caso de erro
  }
}

/**
 * Busca os dados dos gráficos e os desenha usando Chart.js
 */
async function desenharGraficosDashboard() {
  // 1. Gráfico de Barras (Gastos por Fornecedor)
  try {
    const response = await fetch("/api/dashboard/gastos_fornecedor");
    const data = await response.json();
    const ctx = document.getElementById('graficoGastosFornecedor').getContext('2d');

    if (!data.success) throw new Error("Erro ao buscar dados do gráfico");

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Valor Provisionado (R$)',
          data: data.data,
          backgroundColor: '#49609B',
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `R$ ${context.parsed.y.toLocaleString('pt-BR')}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return 'R$ ' + (value / 1000) + 'k'; // Formata para "R$ 5k"
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error("[v0] Erro ao desenhar gráfico de gastos:", error);
  }

  // 2. Gráfico de Pizza (Documentos por Status)
  try {
    const response = await fetch("/api/dashboard/docs_por_status");
    const data = await response.json();
    const ctx = document.getElementById('graficoDocsStatus').getContext('2d');

    if (!data.success) throw new Error("Erro ao buscar dados do gráfico");
    
    // Mapeia os status para as cores dos badges
    const backgroundColors = data.labels.map(label => {
      const statusClass = label.toLowerCase();
      const badges = {
        pendente: '#fff3cd',
        revisar: '#ffe0e0',
        provisionado: '#d5f4e6',
        processado: '#d1ecf1',
        cancelado: '#f8d7da',
        aprovado: '#d4edda',
      };
      return badges[statusClass] || '#dfe6e9'; // Cor padrão
    });
    
    const borderColors = data.labels.map(label => {
      const statusClass = label.toLowerCase();
      const badges = {
        pendente: '#856404',
        revisar: '#c0392b',
        provisionado: '#27ae60',
        processado: '#0c5460',
        cancelado: '#721c24',
        aprovado: '#155724',
      };
      return badges[statusClass] || '#636e72'; // Cor padrão
    });

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Documentos',
          data: data.data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
        }
      }
    });
  } catch (error) {
    console.error("[v0] Erro ao desenhar gráfico de status:", error);
  }
}


// ==========================================================
// BOTÃO DE ACESSIBILIDADE
// ==========================================================
const accessibilityBtn = document.getElementById("accessibility-toggle")
if (accessibilityBtn) {
  accessibilityBtn.addEventListener("click", () => {
    const isPressed = accessibilityBtn.getAttribute("aria-pressed") === "true"
    accessibilityBtn.setAttribute("aria-pressed", String(!isPressed))

    const btnText = accessibilityBtn.querySelector(".btn-text")
    if (!isPressed) {
      btnText.textContent = "Modo Normal"
      document.body.classList.add("accessibility-mode")
    } else {
      btnText.textContent = "Modo Acessibilidade"
      document.body.classList.remove("accessibility-mode")
    }
  })
}
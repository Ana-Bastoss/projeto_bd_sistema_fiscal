// ======================================================================
// LOGIN.JS – Fluxo de autenticação no lado do cliente (frontend)
// ======================================================================
// O JS não realiza verificação de senha, hash ou comparação
// criptográfica. Ele apenas coleta o email e a senha digitada pelo usuário
// e envia para o backend.
// Toda a lógica sensível e crítica de autenticação está centralizada no
// arquivo main.py (backend FastAPI):
//
// O backend utiliza passlib + bcrypt para gerar hashes de senha pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
// Durante a criação/alteração de usuários, o backend salva apenas o hash: senha_hash = pwd_context.hash(senha)
// Durante o login (/api/login), o backend valida assim: pwd_context.verify(senha_digitada, hash_no_banco)
// frontend nunca lida com senhas reais após o envio, nunca compara senha no navegador, nunca acessa o hash salvo e toda segurança está no main.py.
//
// Este script é apenas a *porta de entrada* do usuário. Ele envia as credenciais e recebe:{ user: {...}, token: "..." }
//
// A partir disso, salva no localStorage e redireciona.
//
// ======================================================================

document.addEventListener("DOMContentLoaded", () => {

  // Identifica o formulário de login na página.
  // Protege contra erro caso este script seja carregado em outra página.
  const loginForm = document.getElementById("loginForm")

  if (loginForm) {

    // Evento disparado quando o usuário clica em "Entrar".
    loginForm.addEventListener("submit", async (e) => {

      // Evita o refresh automático da página.
      e.preventDefault()

      // Captura o email e a senha informados.
      // (Aqui o valor ainda é plain-text, e só existe até ser enviado via fetch.)
      const email = document.getElementById("email").value
      const senha = document.getElementById("senha").value

      try {
        // Envia a requisição para a rota de login do backend.
        // A API deve:
        // - Validar email/senha
        // - Comparar com o hash salvo
        // - Retornar erro caso inválido
        // - Retornar { user, token } caso válido
        const response = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, senha }),
        })

        // Caso o backend retorne erro (400, 401, etc.)
        if (!response.ok) {
          const error = await response.json()
          alert(error.detail || "Erro ao fazer login")
          return
        }

        // Aqui o login foi bem-sucedido:
        // Recebemos o usuário logado e o token JWT (ou equivalente).
        const data = await response.json()

        // ================================================
        // ARMAZENAMENTO LOCAL (mantém sessão no frontend)
        // ================================================

        // Salva todos os dados do usuário em formato texto.
        // Importante: localStorage não é seguro para informações sensíveis,
        // mas é adequado para dados básicos de sessão no client-side.
        localStorage.setItem("user", JSON.stringify(data.user))

        // Guarda o token de autenticação.
        // Este token deverá ser enviado em futuras requisições:
        // fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        localStorage.setItem("token", data.token)

        // ================================================
        // REDIRECIONAMENTO APÓS LOGIN
        // ================================================

        // Envia o usuário para o painel principal.
        window.location.href = "/projeto"

      } catch (error) {
        // Captura erros de rede ou servidor indisponível.
        console.error("Erro ao comunicar com o servidor:", error)
        alert("Erro ao conectar com o servidor")
      }
    })
  }
})

// ========================================
// LOGIN.JS - Gerenciamento de Login
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm")

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const email = document.getElementById("email").value
      const senha = document.getElementById("senha").value

      try {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, senha }),
        })

        if (!response.ok) {
          const error = await response.json()
          alert(error.detail || "Erro ao fazer login")
          return
        }

        const data = await response.json()

        // Salva no localStorage
        localStorage.setItem("user", JSON.stringify(data.user))
        localStorage.setItem("token", data.token)

        // Redireciona para a página principal
        window.location.href = "/projeto"
      } catch (error) {
        console.error("Erro:", error)
        alert("Erro ao conectar com o servidor")
      }
    })
  }
})

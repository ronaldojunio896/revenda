(function () {
  const phone = "5531984180609";
  const yearNode = document.querySelector("[data-year]");
  const menuButton = document.querySelector(".menu-btn");
  const navLinks = document.querySelector(".nav-links");
  const revealNodes = document.querySelectorAll(".reveal");
  const whatsappForm = document.querySelector("[data-whatsapp-form]");

  window.RonaldoTecnologia = {
    version: "2026.08.09",
    pages: ["home", "sobre", "servicos", "torge", "implantacao", "contato"],
    contact: {
      whatsapp: phone,
      email: "ronaldo@ronaldotecnologia.com.br",
      city: "Belo Horizonte - MG"
    }
  };

  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }

  if (menuButton && navLinks) {
    menuButton.addEventListener("click", () => {
      const isOpen = document.body.classList.toggle("nav-open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    });

    navLinks.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        document.body.classList.remove("nav-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Abrir menu");
      }
    });
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );

    revealNodes.forEach((node) => observer.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
  }

  if (whatsappForm) {
    whatsappForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(whatsappForm);
      const lines = [
        "Olá! Vim pelo site da Ronaldo Tecnologia.",
        "",
        `Nome: ${formData.get("nome") || ""}`,
        `Empresa: ${formData.get("empresa") || ""}`,
        `Interesse: ${formData.get("interesse") || ""}`,
        `Mensagem: ${formData.get("mensagem") || ""}`
      ];

      const message = encodeURIComponent(lines.join("\n"));
      window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noopener");
    });
  }
})();

(function () {
  const phone = "5531984180609";
  const root = document.documentElement;
  const yearNode = document.querySelector("[data-year]");
  const menuButton = document.querySelector(".menu-btn");
  const navLinks = document.querySelector(".nav-links");
  const revealNodes = document.querySelectorAll(".reveal");
  const whatsappForm = document.querySelector("[data-whatsapp-form]");

  root.classList.add("js");

  window.RonaldoTecnologia = {
    version: "2026.09.29",
    pages: ["home", "sobre", "servicos", "modelos", "torge", "implantacao", "contato"],
    contact: {
      whatsapp: phone,
      email: "ronaldo@ronaldotecnologia.com.br",
      city: "Belo Horizonte - MG"
    }
  };

  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }

  const closeMenu = () => {
    if (!menuButton) return;
    document.body.classList.remove("nav-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Abrir menu");
  };

  if (menuButton && navLinks) {
    menuButton.addEventListener("click", () => {
      const isOpen = document.body.classList.toggle("nav-open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    });

    navLinks.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("click", (event) => {
      if (document.body.classList.contains("nav-open") && !event.target.closest(".site-header")) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
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
      { threshold: 0.14, rootMargin: "0px 0px -40px" }
    );

    revealNodes.forEach((node) => observer.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
  }

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const bounds = card.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${y * -2.2}deg) rotateY(${x * 2.2}deg) translateY(-5px)`;
      });

      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
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

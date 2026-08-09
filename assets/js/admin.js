(() => {
  const state = {
    token: "",
    owner: "ronaldojunio896",
    repo: "revenda",
    branch: "main",
    page: "index.html",
    sha: "",
    doc: null,
    originalHtml: "",
    textNodes: [],
    imageNodes: [],
    pendingImages: new Map(),
    pendingFiles: new Map(),
    dirty: false,
    connected: false
  };

  const els = {
    status: document.querySelector("[data-status]"),
    token: document.querySelector('[data-field="token"]'),
    owner: document.querySelector('[data-field="owner"]'),
    repo: document.querySelector('[data-field="repo"]'),
    branch: document.querySelector('[data-field="branch"]'),
    page: document.querySelector('[data-field="page"]'),
    textFilter: document.querySelector('[data-field="text-filter"]'),
    textList: document.querySelector('[data-list="texts"]'),
    imageList: document.querySelector('[data-list="images"]'),
    seoList: document.querySelector('[data-list="seo"]'),
    preview: document.querySelector("[data-preview]"),
    log: document.querySelector("[data-log]"),
    commitMessage: document.querySelector('[data-field="commit-message"]'),
    pendingCount: document.querySelector("[data-pending-count]"),
    newPageDialog: document.querySelector('[data-dialog="new-page"]')
  };

  const textSelector = [
    "h1", "h2", "h3", "h4", "p", "a", "span", "strong", "small", "li", "button", "label", "option"
  ].join(",");

  function log(message, type = "info") {
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const line = document.createElement("div");
    line.textContent = `[${time}] ${message}`;
    line.dataset.type = type;
    els.log.prepend(line);
  }

  function setStatus(text, mode = "") {
    els.status.textContent = text;
    els.status.className = `status-pill ${mode}`.trim();
  }

  function markDirty() {
    state.dirty = true;
    setStatus("Alterações pendentes", "dirty");
    updatePendingCount();
  }

  function updatePendingCount() {
    const count = (state.dirty ? 1 : 0) + state.pendingImages.size + state.pendingFiles.size;
    els.pendingCount.textContent = String(count);
  }

  function getSettings() {
    state.token = els.token.value.trim();
    state.owner = els.owner.value.trim() || "ronaldojunio896";
    state.repo = els.repo.value.trim() || "revenda";
    state.branch = els.branch.value.trim() || "main";
    state.page = els.page.value;
  }

  function encodeBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function decodeBase64(content) {
    const binary = atob(content.replace(/\n/g, ""));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  }

  async function fileToBase64(file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return dataUrl.split(",")[1];
  }

  function safeFileName(name) {
    const clean = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    return `${stamp}-${clean || "imagem.webp"}`;
  }

  async function github(path, options = {}) {
    if (!state.token) {
      throw new Error("Informe um token do GitHub para usar a API.");
    }

    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${state.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`GitHub ${response.status}: ${detail}`);
    }

    return response.json();
  }

  async function getGithubFile(filePath) {
    const data = await github(`/repos/${state.owner}/${state.repo}/contents/${filePath}?ref=${encodeURIComponent(state.branch)}`);
    return {
      sha: data.sha,
      text: decodeBase64(data.content)
    };
  }

  async function getGithubFileSha(filePath) {
    try {
      const data = await github(`/repos/${state.owner}/${state.repo}/contents/${filePath}?ref=${encodeURIComponent(state.branch)}`);
      return data.sha;
    } catch (error) {
      if (String(error.message).includes("GitHub 404")) return "";
      throw error;
    }
  }

  async function putGithubFile(filePath, contentBase64, message, sha = "") {
    const payload = {
      message,
      content: contentBase64,
      branch: state.branch
    };

    if (sha) payload.sha = sha;

    return github(`/repos/${state.owner}/${state.repo}/contents/${filePath}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  async function loadPage() {
    getSettings();
    setStatus("Carregando...", "dirty");
    log(`Carregando ${state.page}`);

    let html;
    let sha = "";

    if (state.token) {
      const remote = await getGithubFile(state.page);
      html = remote.text;
      sha = remote.sha;
      state.connected = true;
    } else {
      const response = await fetch(state.page);
      if (!response.ok) throw new Error(`Não consegui carregar ${state.page} localmente.`);
      html = await response.text();
      state.connected = false;
    }

    state.sha = sha;
    state.originalHtml = html;
    state.doc = new DOMParser().parseFromString(html, "text/html");
    state.dirty = false;

    collectEditableNodes();
    renderAll();
    setStatus(state.connected ? "Conectado" : "Prévia local", state.connected ? "ok" : "");
    log(`${state.page} carregada com sucesso`, "success");
  }

  function collectEditableNodes() {
    const body = state.doc.body;
    const nodes = Array.from(body.querySelectorAll(textSelector));

    state.textNodes = nodes
      .filter((node) => !node.closest("script, style, svg") && node.textContent.trim().length > 0)
      .filter((node) => !node.matches("[data-year]"))
      .map((node, index) => ({
        id: index,
        node,
        tag: node.tagName.toLowerCase(),
        text: node.textContent.trim().replace(/\s+/g, " ")
      }));

    state.imageNodes = Array.from(body.querySelectorAll("img")).map((node, index) => ({
      id: index,
      node,
      src: node.getAttribute("src") || "",
      alt: node.getAttribute("alt") || ""
    }));
  }

  function renderAll() {
    renderCounts();
    renderTexts();
    renderImages();
    renderSeo();
    renderPreview();
    updatePendingCount();
  }

  function renderCounts() {
    document.querySelector('[data-count="texts"]').textContent = String(state.textNodes.length);
    document.querySelector('[data-count="images"]').textContent = String(state.imageNodes.length);
    document.querySelector('[data-count="seo"]').textContent = String(getSeoFields().length);
  }

  function renderTexts() {
    const filter = (els.textFilter.value || "").toLowerCase();
    els.textList.innerHTML = "";

    state.textNodes
      .filter((item) => !filter || item.text.toLowerCase().includes(filter) || item.tag.includes(filter))
      .forEach((item) => {
        const row = document.createElement("article");
        row.className = "text-item";
        row.innerHTML = `
          <header>
            <span class="node-label">${item.tag} #${item.id + 1}</span>
            <button class="mini-btn" type="button">Localizar na prévia</button>
          </header>
          <textarea aria-label="Texto ${item.id + 1}"></textarea>
        `;

        const textarea = row.querySelector("textarea");
        textarea.value = item.node.textContent.trim();
        textarea.addEventListener("input", () => {
          item.node.textContent = textarea.value;
          item.text = textarea.value;
          markDirty();
          renderPreview();
        });

        row.querySelector("button").addEventListener("click", () => {
          flashPreviewText(textarea.value);
        });

        els.textList.appendChild(row);
      });

    if (!els.textList.children.length) {
      els.textList.innerHTML = '<p class="panel-note">Nenhum texto encontrado com esse filtro.</p>';
    }
  }

  function flashPreviewText(text) {
    const frame = els.preview.contentDocument;
    if (!frame) return;
    const candidates = Array.from(frame.body.querySelectorAll(textSelector));
    const target = candidates.find((node) => node.textContent.trim() === text.trim());
    if (target) {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      target.style.outline = "3px solid #19d7ff";
      setTimeout(() => {
        target.style.outline = "";
      }, 1400);
    }
  }

  function renderImages() {
    els.imageList.innerHTML = "";

    state.imageNodes.forEach((item) => {
      const row = document.createElement("article");
      row.className = "image-item";
      row.innerHTML = `
        <img src="${escapeAttr(item.src)}" alt="">
        <div class="image-fields">
          <header><span class="node-label">Imagem #${item.id + 1}</span></header>
          <label>Caminho da imagem<input data-image-src value="${escapeAttr(item.src)}"></label>
          <label>Texto alternativo<input data-image-alt value="${escapeAttr(item.alt)}"></label>
          <label class="upload-button">Trocar por upload<input type="file" accept="image/*" data-image-file></label>
        </div>
      `;

      row.querySelector("[data-image-src]").addEventListener("input", (event) => {
        item.node.setAttribute("src", event.target.value.trim());
        item.src = event.target.value.trim();
        markDirty();
        renderPreview();
      });

      row.querySelector("[data-image-alt]").addEventListener("input", (event) => {
        item.node.setAttribute("alt", event.target.value);
        item.alt = event.target.value;
        markDirty();
        renderPreview();
      });

      row.querySelector("[data-image-file]").addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const path = `assets/images/${safeFileName(file.name)}`;
        const content = await fileToBase64(file);
        state.pendingImages.set(path, { content, file });
        item.node.setAttribute("src", path);
        item.node.setAttribute("alt", item.alt || file.name.replace(/\.[^.]+$/, ""));
        item.src = path;
        row.querySelector("[data-image-src]").value = path;
        row.querySelector("img").src = path;
        markDirty();
        renderPreview();
        log(`Imagem preparada para upload: ${path}`);
      });

      els.imageList.appendChild(row);
    });

    if (!els.imageList.children.length) {
      els.imageList.innerHTML = '<p class="panel-note">Nenhuma imagem encontrada nesta página.</p>';
    }
  }

  function getSeoFields() {
    const head = state.doc.head;
    return [
      { label: "Título do navegador", type: "title", node: head.querySelector("title"), attr: "textContent" },
      { label: "Meta description", selector: 'meta[name="description"]', attrName: "content" },
      { label: "URL canonical", selector: 'link[rel="canonical"]', attrName: "href" },
      { label: "Open Graph título", selector: 'meta[property="og:title"]', attrName: "content" },
      { label: "Open Graph descrição", selector: 'meta[property="og:description"]', attrName: "content" },
      { label: "Open Graph imagem", selector: 'meta[property="og:image"]', attrName: "content" }
    ].map((field) => {
      if (!field.node && field.selector) field.node = head.querySelector(field.selector);
      return field;
    }).filter((field) => field.node);
  }

  function renderSeo() {
    els.seoList.innerHTML = "";

    getSeoFields().forEach((field) => {
      const value = field.attr === "textContent"
        ? field.node.textContent
        : field.node.getAttribute(field.attrName) || "";
      const row = document.createElement("label");
      row.className = "seo-item";
      row.textContent = field.label;
      const input = document.createElement(field.label.includes("descrição") || field.label.includes("description") ? "textarea" : "input");
      input.value = value;
      input.addEventListener("input", () => {
        if (field.attr === "textContent") field.node.textContent = input.value;
        else field.node.setAttribute(field.attrName, input.value);
        markDirty();
        renderPreview();
      });
      row.appendChild(input);
      els.seoList.appendChild(row);
    });
  }

  function serializeHtml() {
    if (!state.doc) return "";
    return `<!doctype html>\n${state.doc.documentElement.outerHTML}\n`;
  }

  function renderPreview() {
    if (!state.doc) return;
    const origin = location.origin === "null" ? "" : `${location.origin}/`;
    const html = serializeHtml().replace(/<head>/i, `<head><base href="${origin}">`);
    els.preview.srcdoc = html;
  }

  function escapeAttr(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function firstContainer(selectors) {
    for (const selector of selectors) {
      const node = state.doc.querySelector(selector);
      if (node) return node;
    }
    return null;
  }

  function addService() {
    const container = firstContainer([".service-grid", ".grid-3"]);
    if (!container) {
      log("Não encontrei uma grade de serviços nesta página.", "error");
      return;
    }

    const article = state.doc.createElement("article");
    article.className = "service-card reveal";
    article.innerHTML = `
      <div class="body">
        <div class="service-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16v12H4zM8 10h8M8 14h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <h3>Novo serviço</h3>
        <p>Descreva aqui o novo serviço da Ronaldo Tecnologia.</p>
        <a class="link" href="contato.html">Solicitar orçamento</a>
      </div>
    `;
    container.appendChild(article);
    collectEditableNodes();
    markDirty();
    renderAll();
    log("Novo serviço adicionado.");
  }

  function addPlan() {
    const container = firstContainer([".pricing-grid", ".price-grid"]);
    if (!container) {
      log("Não encontrei uma grade de planos nesta página.", "error");
      return;
    }

    const article = state.doc.createElement("article");
    article.className = "price-card reveal";
    article.innerHTML = `
      <span class="promo-label">Novo plano</span>
      <h3>Plano Novo</h3>
      <div class="price">R$ 0,00<span>/mês</span></div>
      <p>Descreva para quem este plano é indicado.</p>
      <ul>
        <li>Recurso principal</li>
        <li>Suporte incluso</li>
        <li>Configuração inicial</li>
      </ul>
      <a class="btn btn-primary" href="https://wa.me/5531984180609?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20o%20novo%20plano." target="_blank" rel="noopener">Contratar pelo WhatsApp</a>
    `;
    container.appendChild(article);
    collectEditableNodes();
    markDirty();
    renderAll();
    log("Novo plano adicionado.");
  }

  function addCta() {
    const main = state.doc.querySelector("main");
    if (!main) return;

    const section = state.doc.createElement("section");
    section.className = "section";
    section.innerHTML = `
      <div class="container">
        <div class="cta-panel reveal">
          <div>
            <h2>Nova chamada do site</h2>
            <p>Escreva aqui a mensagem para orientar o visitante para o próximo passo.</p>
          </div>
          <a class="btn btn-whatsapp" href="https://wa.me/5531984180609" target="_blank" rel="noopener">Falar no WhatsApp</a>
        </div>
      </div>
    `;
    main.appendChild(section);
    collectEditableNodes();
    markDirty();
    renderAll();
    log("Nova seção CTA adicionada.");
  }

  function createPageTemplate(slug, title, description) {
    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | Ronaldo Tecnologia</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#020713">
  <link rel="canonical" href="https://ronaldotecnologia.com.br/${slug}">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body data-page="${slug.replace(/\.html$/, "")}">
  <a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
  <div class="topbar"><div class="container"><span>Belo Horizonte - MG | Atendimento remoto em todo o Brasil</span><span>WhatsApp: (31) 98418-0609</span></div></div>
  <header class="site-header">
    <div class="container nav">
      <a class="brand" href="index.html" aria-label="Ronaldo Tecnologia - Início"><span class="brand-logo-wrap"><img src="assets/images/logo-small.png" width="296" height="88" alt="Ronaldo Tecnologia"></span></a>
      <button class="menu-btn" type="button" aria-label="Abrir menu" aria-expanded="false">☰</button>
      <nav class="nav-links" aria-label="Navegação principal">
        <a href="index.html">Início</a><a href="servicos.html">Serviços</a><a href="index.html#planos">Planos</a><a href="torge.html">Sistema Torge</a><a href="implantacao.html">Implantação</a><a href="sobre.html">Sobre</a><a href="contato.html">Contato</a>
      </nav>
    </div>
  </header>
  <main id="conteudo">
    <section class="page-hero"><div class="container"><span class="kicker">Nova página</span><h1>${title}</h1><p>${description}</p></div></section>
    <section class="section"><div class="container"><div class="section-head reveal"><span class="eyebrow">Conteúdo</span><h2>Edite esta seção pelo painel.</h2><p>Use o editor para trocar textos, criar novos blocos e ajustar o conteúdo da página.</p></div></div></section>
  </main>
  <footer class="footer"><div class="container"><div class="footer-bottom"><span>© <span data-year></span> Ronaldo Tecnologia. Todos os direitos reservados.</span><span>ronaldotecnologia.com.br</span></div></div></footer>
  <a class="whatsapp-float" href="https://wa.me/5531984180609" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">WA</a>
  <script src="assets/js/main.js" defer></script>
</body>
</html>
`;
  }

  function openCreatePageDialog() {
    els.newPageDialog.showModal();
  }

  function confirmCreatePage() {
    const slugInput = document.querySelector('[data-new-page="slug"]');
    const titleInput = document.querySelector('[data-new-page="title"]');
    const descriptionInput = document.querySelector('[data-new-page="description"]');
    let slug = slugInput.value.trim().toLowerCase().replace(/[^a-z0-9-_.]+/g, "-");
    if (!slug.endsWith(".html")) slug += ".html";
    const title = titleInput.value.trim() || "Nova página";
    const description = descriptionInput.value.trim() || "Nova página da Ronaldo Tecnologia.";
    const html = createPageTemplate(slug, title, description);

    state.pendingFiles.set(slug, { content: encodeBase64(html), text: html });
    const option = document.createElement("option");
    option.value = slug;
    option.textContent = slug;
    els.page.appendChild(option);
    els.page.value = slug;
    state.page = slug;
    state.sha = "";
    state.doc = new DOMParser().parseFromString(html, "text/html");
    state.dirty = false;
    collectEditableNodes();
    renderAll();
    updatePendingCount();
    els.newPageDialog.close();
    log(`Nova página preparada: ${slug}`);
  }

  async function publish() {
    getSettings();
    if (!state.token) {
      log("Informe o token do GitHub antes de publicar.", "error");
      setStatus("Token necessário", "dirty");
      return;
    }

    const message = els.commitMessage.value.trim() || "Atualiza conteúdo pelo painel admin";
    setStatus("Publicando...", "dirty");

    try {
      for (const [path, image] of state.pendingImages.entries()) {
        const sha = await getGithubFileSha(path);
        await putGithubFile(path, image.content, `${message}: imagem ${path}`, sha);
        log(`Imagem publicada: ${path}`, "success");
      }

      for (const [path, file] of state.pendingFiles.entries()) {
        const sha = await getGithubFileSha(path);
        await putGithubFile(path, file.content, `${message}: ${path}`, sha);
        log(`Arquivo publicado: ${path}`, "success");
      }

      if (state.doc && state.dirty) {
        const currentSha = state.sha || await getGithubFileSha(state.page);
        const html = serializeHtml();
        await putGithubFile(state.page, encodeBase64(html), `${message}: ${state.page}`, currentSha);
        const refreshed = await getGithubFile(state.page);
        state.sha = refreshed.sha;
        state.originalHtml = html;
        state.dirty = false;
        log(`Página publicada: ${state.page}`, "success");
      }

      state.pendingImages.clear();
      state.pendingFiles.clear();
      updatePendingCount();
      setStatus("Sincronizado", "ok");
      log("Publicação concluída.", "success");
    } catch (error) {
      setStatus("Erro ao publicar", "dirty");
      log(error.message, "error");
    }
  }

  function bindEvents() {
    document.querySelectorAll("[data-tab-target]").forEach((button) => {
      button.addEventListener("click", () => activateTab(button.dataset.tabTarget));
    });

    document.querySelectorAll("[data-tab-jump]").forEach((button) => {
      button.addEventListener("click", () => activateTab(button.dataset.tabJump));
    });

    document.querySelector('[data-action="connect"]').addEventListener("click", () => {
      loadPage().catch((error) => {
        setStatus("Erro ao carregar", "dirty");
        log(error.message, "error");
      });
    });

    document.querySelectorAll('[data-action="publish"]').forEach((button) => {
      button.addEventListener("click", publish);
    });

    document.querySelector('[data-action="reload-page"]').addEventListener("click", () => {
      loadPage().catch((error) => log(error.message, "error"));
    });

    els.page.addEventListener("change", () => {
      if (state.dirty && !confirm("Você tem alterações não publicadas. Trocar de página mesmo assim?")) {
        els.page.value = state.page;
        return;
      }
      loadPage().catch((error) => log(error.message, "error"));
    });

    els.textFilter.addEventListener("input", renderTexts);

    document.querySelector('[data-action="add-service"]').addEventListener("click", addService);
    document.querySelector('[data-action="add-plan"]').addEventListener("click", addPlan);
    document.querySelector('[data-action="add-cta"]').addEventListener("click", addCta);
    document.querySelector('[data-action="create-page"]').addEventListener("click", openCreatePageDialog);
    document.querySelector('[data-action="confirm-create-page"]').addEventListener("click", confirmCreatePage);

    document.querySelector('[data-field="global-upload"]').addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const path = `assets/images/${safeFileName(file.name)}`;
      state.pendingImages.set(path, { content: await fileToBase64(file), file });
      updatePendingCount();
      log(`Imagem adicionada à fila: ${path}`);
    });

    document.querySelectorAll("[data-preview-size]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelector(".preview-card").classList.toggle("mobile", button.dataset.previewSize === "mobile");
      });
    });
  }

  function activateTab(tab) {
    document.querySelectorAll("[data-tab-target]").forEach((button) => {
      button.classList.toggle("active", button.dataset.tabTarget === tab);
    });
    document.querySelectorAll("[data-tab]").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.tab === tab);
    });
  }

  bindEvents();
  loadPage().catch((error) => log(error.message, "error"));
})();

(() => {
  const grid = document.querySelector("[data-model-grid]");
  const filters = document.querySelectorAll("[data-filter]");
  const count = document.querySelector("[data-visible-count]");
  if (!grid || !filters.length || !count) return;

  const cards = [...grid.querySelectorAll("[data-category]")];
  filters.forEach((button) => {
    button.addEventListener("click", () => {
      const selected = button.dataset.filter;
      filters.forEach((filter) => {
        const active = filter === button;
        filter.classList.toggle("is-active", active);
        filter.setAttribute("aria-pressed", String(active));
      });

      let visible = 0;
      cards.forEach((card) => {
        const show = selected === "all" || card.dataset.category === selected;
        card.hidden = !show;
        if (show) visible += 1;
      });
      count.textContent = String(visible);
    });
  });
})();

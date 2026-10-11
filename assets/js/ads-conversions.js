(function () {
  const conversionId = "AW-18499819518/APzqCImov5QdEP6vs_VE";

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest('a[href*="wa.me"]');
    if (!link) return;

    let destination;
    try {
      destination = new URL(link.href, window.location.href);
    } catch {
      return;
    }

    if (destination.hostname !== "wa.me" || typeof window.gtag !== "function") return;

    window.gtag("event", "conversion", {
      send_to: conversionId,
      value: 1.0,
      currency: "BRL",
      transport_type: "beacon"
    });
  }, true);
})();

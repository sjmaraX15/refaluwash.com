(() => {
  "use strict";
  const cfg = window.K4N_CONFIG || {};
  if (!window.supabase?.createClient || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;

  const style = document.createElement("style");
  style.textContent = `.brand-logo-image{display:block;max-width:190px;max-height:54px;object-fit:contain}.brand.has-custom-logo .brand-mark,.brand.has-custom-logo .brand-copy{display:none!important}.brand-mark{background:var(--site-accent,#1269c7)!important}.nav .nav-admin{background:var(--site-accent,#1269c7)!important}`;
  document.head.appendChild(style);

  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  client.from("site_settings").select("settings").eq("id", "main").maybeSingle().then(({ data, error }) => {
    if (error || !data?.settings) return;
    const settings = data.settings;
    const brand = document.querySelector(".brand");
    const logoUrl = settings.logoUrl;
    if (brand && logoUrl) {
      try {
        const url = new URL(logoUrl, window.location.href);
        if (["https:", "http:"].includes(url.protocol)) {
          const image = document.createElement("img");
          image.className = "brand-logo-image";
          image.src = url.href;
          image.alt = settings.siteName || "Website logo";
          brand.classList.add("has-custom-logo");
          brand.insertBefore(image, brand.firstChild);
        }
      } catch (_) { /* Ignore invalid logo URLs and keep the text brand. */ }
    }
    if (/^#[0-9a-f]{6}$/i.test(settings.headerColor || "")) {
      document.documentElement.style.setProperty("--site-accent", settings.headerColor);
    }
  }).catch(error => console.error("Homepage settings could not be loaded:", error));
})();

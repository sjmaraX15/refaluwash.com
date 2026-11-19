(() => {
  "use strict";
  const cfg = window.K4N_CONFIG || {};
  if (!window.supabase?.createClient || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;

  const styles = document.createElement("style");
  styles.textContent = `
    .brand-logo-image{display:block;max-width:190px;max-height:54px;object-fit:contain}
    .brand.has-custom-logo .brand-mark,.brand.has-custom-logo .brand-copy{display:none!important}
    .brand-mark{background:var(--site-accent,#1269c7)!important}
    .nav .nav-admin{background:var(--site-accent,#1269c7)!important}
    .nav a[aria-current=page]{background:#e8f2ff;color:#1269c7}
    .home-dashboard{padding:25px 0;background:#e9f2fb;border-bottom:1px solid #dce8f3}
    .home-dashboard-inner{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:24px 28px;border:1px solid #dce7f0;border-radius:16px;background:#fff;box-shadow:0 10px 28px #173c5910}
    .home-dashboard .eyebrow{margin:0 0 7px;color:#1269c7;font-size:10px;font-weight:800;letter-spacing:.13em}
    .home-dashboard h1{margin:0;font:400 clamp(27px,4vw,40px)/1.1 'DM Serif Display',Georgia,serif;color:#13283b}
    .home-dashboard h1 span{color:#1269c7}
    .home-dashboard p{margin:8px 0 0;color:#6d7f8e;font-size:13px}
    .home-dashboard-links{display:flex;flex-wrap:wrap;gap:9px}
    .home-dashboard-links a{padding:10px 13px;border:1px solid #dce7f0;border-radius:9px;color:#1269c7;font-size:12px;font-weight:800;white-space:nowrap}
    .home-dashboard-links a:hover{background:#e8f2ff}
    .homepage-gallery{padding:28px 0 32px;background:#10283f;color:#fff}
    .homepage-gallery .shell{width:min(1180px,calc(100% - 48px));margin:0 auto}
    .gallery-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:0 0 14px}
    .gallery-heading .eyebrow{margin:0 0 5px;color:#8fc9ff;font-size:10px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
    .gallery-heading h2{margin:0;font:400 clamp(24px,3vw,34px)/1.1 'DM Serif Display',Georgia,serif}
    .gallery-count{color:#bfd2e3;font-size:12px;font-weight:700}
    .gallery-frame{height:clamp(250px,40vw,480px);position:relative;overflow:hidden;border:1px solid #ffffff20;border-radius:16px;background:#183c5b;box-shadow:0 15px 35px #06192b55}
    .gallery-slide{position:absolute;inset:0;opacity:0;transition:opacity .65s ease;pointer-events:none}
    .gallery-slide.is-active{opacity:1;pointer-events:auto}
    .gallery-slide img{width:100%;height:100%;display:block;object-fit:cover}
    .gallery-slide:after{content:'';position:absolute;inset:45% 0 0;background:linear-gradient(transparent,rgba(8,27,45,.76))}
    .gallery-caption{position:absolute;z-index:1;left:25px;right:25px;bottom:22px;color:#fff;font-size:14px;font-weight:700;text-shadow:0 2px 8px #0008}
    .gallery-control{position:absolute;z-index:2;top:50%;width:42px;height:42px;transform:translateY(-50%);border:1px solid #ffffff70;border-radius:50%;background:#10283fcc;color:#fff;font-size:22px;cursor:pointer;display:grid;place-items:center}
    .gallery-control:hover,.gallery-control:focus-visible{background:#1269c7}
    .gallery-prev{left:16px}.gallery-next{right:16px}
    .gallery-bottom{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:12px}
    .gallery-dots{display:flex;gap:7px;align-items:center}
    .gallery-dot{width:8px;height:8px;padding:0;border:0;border-radius:99px;background:#6c849b;cursor:pointer}
    .gallery-dot[aria-current=true]{width:24px;background:#8fc9ff}
    .gallery-pause{border:0;background:transparent;color:#bfd2e3;font:600 11px 'DM Sans',Arial,sans-serif;cursor:pointer}
    @media(max-width:700px){.home-dashboard-inner{align-items:flex-start;flex-direction:column;padding:20px}.home-dashboard-links{width:100%}.home-dashboard-links a{flex:1;text-align:center}.homepage-gallery{padding:23px 0}.homepage-gallery .shell{width:calc(100% - 32px)}.gallery-frame{height:260px}.gallery-caption{left:16px;right:16px;bottom:15px;font-size:12px}.gallery-control{width:36px;height:36px}.gallery-prev{left:10px}.gallery-next{right:10px}}
    @media(prefers-reduced-motion:reduce){.gallery-slide{transition:none}}
  `;
  document.head.appendChild(styles);

  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  client.from("site_settings").select("settings").eq("id", "main").maybeSingle().then(({ data, error }) => {
    if (error || !data?.settings) return;
    const settings = data.settings;
    const brand = document.querySelector(".brand");
    if (brand && settings.logoUrl) {
      try {
        const url = new URL(settings.logoUrl, location.href);
        if (["https:", "http:"].includes(url.protocol)) {
          const image = document.createElement("img");
          image.className = "brand-logo-image";
          image.src = url.href;
          image.alt = settings.siteName || "Website logo";
          brand.classList.add("has-custom-logo");
          brand.insertBefore(image, brand.firstChild);
        }
      } catch (_) {}
    }
    if (/^#[0-9a-f]{6}$/i.test(settings.headerColor || "")) document.documentElement.style.setProperty("--site-accent", settings.headerColor);

    const nav = document.querySelector(".nav");
    if (nav) {
      const links = [...nav.querySelectorAll("a")];
      const home = links.find(link => /^(home|latest)$/i.test(link.textContent.trim()));
      if (home) {
        home.textContent = "Home";
        home.href = "index.html";
      } else {
        const link = document.createElement("a");
        link.href = "index.html";
        link.textContent = "Home";
        nav.prepend(link);
      }
      const routes = { latest: "latest.html", islands: "islands.html", culture: "culture.html", about: "about.html" };
      [...nav.querySelectorAll("a")].forEach(link => {
        const label = link.textContent.trim().toLowerCase().replace(/\s+.*/, "");
        if (routes[label]) link.href = routes[label];
        const current = location.pathname.split("/").pop() || "index.html";
        if (link.getAttribute("href") === current) link.setAttribute("aria-current", "page");
      });
    }

    const main = document.querySelector("main");
    const hero = main?.querySelector(".hero");
    if (main && hero && !document.querySelector(".home-dashboard")) {
      const dashboard = document.createElement("section");
      dashboard.className = "home-dashboard";
      dashboard.innerHTML = `<div class="shell home-dashboard-inner"><div><p class="eyebrow">KAMORAL • COMMUNITY NEWS DASHBOARD</p><h1>Welcome to <span>KAMORAL</span></h1><p>Your home for the latest stories, island news, culture, and community voices.</p></div><nav class="home-dashboard-links" aria-label="Explore Refaluwash"><a href="latest.html">Latest stories →</a><a href="islands.html">Explore islands →</a><a href="culture.html">Culture →</a></nav></div>`;
      hero.before(dashboard);
    }

    const galleries = settings.galleryImagesBySection || {};
    const photos = Array.isArray(galleries.home) ? galleries.home : (Array.isArray(settings.galleryImages) ? settings.galleryImages : []);
    renderGallery(main, photos, "home");
  }).catch(error => console.error("Homepage settings could not be loaded:", error));

  function renderGallery(main, photos, section) {
    if (!main || !Array.isArray(photos) || !photos.length || main.querySelector(`.homepage-gallery[data-gallery="${section}"]`)) return;
    const valid = photos.map(item => {
      const rawUrl = typeof item === "string" ? item : item?.url;
      try {
        const url = new URL(rawUrl || "", location.href);
        if (!["https:", "http:"].includes(url.protocol)) return null;
        return { url: url.href, alt: typeof item === "string" ? "Island photo" : (item.alt || "Island photo") };
      } catch (_) { return null; }
    }).filter(Boolean);
    if (!valid.length) return;
    const gallery = document.createElement("section");
    gallery.className = "homepage-gallery";
    gallery.dataset.gallery = section;
    gallery.setAttribute("aria-label", "Homepage photo gallery");
    gallery.innerHTML = `<div class="shell"><div class="gallery-heading"><div><p class="eyebrow">A VIEW FROM THE ISLANDS</p><h2>Island photo gallery</h2></div><span class="gallery-count" aria-live="polite"></span></div><div class="gallery-frame" aria-roledescription="carousel" aria-label="Island photo slideshow"><button class="gallery-control gallery-prev" type="button" aria-label="Previous photo">‹</button><button class="gallery-control gallery-next" type="button" aria-label="Next photo">›</button></div><div class="gallery-bottom"><div class="gallery-dots" role="group" aria-label="Choose a photo"></div><button class="gallery-pause" type="button">Pause slideshow</button></div></div>`;
    const hero = main.querySelector(".hero");
    main.insertBefore(gallery, hero || main.firstChild);
    const frame = gallery.querySelector(".gallery-frame"), dots = gallery.querySelector(".gallery-dots"), count = gallery.querySelector(".gallery-count"), pause = gallery.querySelector(".gallery-pause");
    let active = 0, timer;
    let paused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const slides = valid.map((photo, index) => {
      const slide = document.createElement("div");
      slide.className = `gallery-slide${index === 0 ? " is-active" : ""}`;
      slide.setAttribute("role", "group"); slide.setAttribute("aria-roledescription", "slide"); slide.setAttribute("aria-label", `${index + 1} of ${valid.length}`);
      const img = document.createElement("img"); img.src = photo.url; img.alt = photo.alt; img.loading = index === 0 ? "eager" : "lazy";
      const caption = document.createElement("span"); caption.className = "gallery-caption"; caption.textContent = photo.alt;
      slide.append(img, caption); frame.insertBefore(slide, frame.querySelector(".gallery-prev"));
      const dot = document.createElement("button"); dot.className = "gallery-dot"; dot.type = "button"; dot.setAttribute("aria-label", `Show photo ${index + 1}`); dot.setAttribute("aria-current", index === 0 ? "true" : "false"); dot.addEventListener("click", () => show(index)); dots.appendChild(dot);
      return { slide, dot };
    });
    function show(index) { active = (index + valid.length) % valid.length; slides.forEach((item, i) => { item.slide.classList.toggle("is-active", i === active); item.dot.setAttribute("aria-current", i === active ? "true" : "false"); }); count.textContent = `${String(active + 1).padStart(2, "0")} / ${String(valid.length).padStart(2, "0")}`; }
    function start() { clearInterval(timer); if (!paused && valid.length > 1) timer = setInterval(() => show(active + 1), 5000); }
    gallery.querySelector(".gallery-prev").addEventListener("click", () => { show(active - 1); start(); });
    gallery.querySelector(".gallery-next").addEventListener("click", () => { show(active + 1); start(); });
    pause.addEventListener("click", () => { paused = !paused; pause.textContent = paused ? "Play slideshow" : "Pause slideshow"; start(); });
    gallery.addEventListener("mouseenter", () => clearInterval(timer)); gallery.addEventListener("mouseleave", start); gallery.addEventListener("focusin", () => clearInterval(timer)); gallery.addEventListener("focusout", start);
    if (valid.length < 2) { gallery.querySelector(".gallery-prev").hidden = true; gallery.querySelector(".gallery-next").hidden = true; pause.hidden = true; dots.hidden = true; }
    show(0); start();
  }
})();

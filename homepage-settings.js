(() => {
  'use strict';
  const cfg = window.K4N_CONFIG || {};
  if (!window.supabase?.createClient || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;

  const style = document.createElement('style');
  style.textContent = `
    .homepage-gallery{padding:28px 0 32px;background:#10283f;color:#fff}.homepage-gallery .shell{width:min(1180px,calc(100% - 48px));margin:0 auto}.gallery-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:0 0 14px}.gallery-heading .eyebrow{margin:0 0 5px;color:#8fc9ff;font-size:10px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.gallery-heading h2{margin:0;font:400 clamp(24px,3vw,34px)/1.1 'DM Serif Display',Georgia,serif}.gallery-count{color:#bfd2e3;font-size:12px;font-weight:700}.gallery-frame{height:clamp(250px,40vw,480px);position:relative;overflow:hidden;border:1px solid #ffffff20;border-radius:16px;background:#183c5b}.gallery-slide{position:absolute;inset:0;opacity:0;transition:opacity .65s ease;pointer-events:none}.gallery-slide.is-active{opacity:1;pointer-events:auto}.gallery-slide img{width:100%;height:100%;display:block;object-fit:cover}.gallery-slide:after{content:'';position:absolute;inset:45% 0 0;background:linear-gradient(transparent,rgba(8,27,45,.88))}.gallery-caption-wrap{position:absolute;z-index:2;left:25px;right:25px;bottom:22px;max-width:760px}.gallery-caption-title{display:block;margin:0 0 5px;color:#fff;font:400 clamp(20px,3vw,30px)/1.15 'DM Serif Display',Georgia,serif;text-shadow:0 2px 8px #0008}.gallery-caption-description{display:block;color:#e3edf6;font-size:13px;line-height:1.55;text-shadow:0 2px 8px #0008}.gallery-control{position:absolute;z-index:3;top:50%;width:42px;height:42px;transform:translateY(-50%);border:1px solid #ffffff70;border-radius:50%;background:#10283fcc;color:#fff;font-size:22px;cursor:pointer}.gallery-prev{left:16px}.gallery-next{right:16px}.gallery-bottom{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:12px}.gallery-dots{display:flex;gap:7px}.gallery-dot{width:8px;height:8px;padding:0;border:0;border-radius:99px;background:#6c849b;cursor:pointer}.gallery-dot[aria-current=true]{width:24px;background:#8fc9ff}.gallery-pause{border:0;background:transparent;color:#bfd2e3;font-size:11px;font-weight:700;cursor:pointer}.brand-logo-image{display:block;max-width:190px;max-height:54px;object-fit:contain}.brand.has-custom-logo .brand-mark,.brand.has-custom-logo .brand-copy{display:none!important}.brand-mark,.nav .nav-admin{background:var(--site-accent,#1269c7)!important}@media(max-width:700px){.homepage-gallery{padding:23px 0}.homepage-gallery .shell{width:calc(100% - 32px)}.gallery-frame{height:280px}.gallery-caption-wrap{left:16px;right:16px;bottom:15px}.gallery-caption-title{font-size:21px}.gallery-caption-description{font-size:12px}.gallery-control{width:36px;height:36px}.gallery-prev{left:10px}.gallery-next{right:10px}}
  `;
  document.head.appendChild(style);

  function safeUrl(value) {
    try { const url = new URL(String(value || ''), location.href); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
    catch (_) { return ''; }
  }

  function renderGallery(main, photos, section) {
    if (!main || !Array.isArray(photos) || !photos.length) return;
    if (main.querySelector(`.homepage-gallery[data-gallery="${section}"]`)) return;
    const valid = photos.map(item => {
      const url = safeUrl(typeof item === 'string' ? item : item?.url);
      if (!url) return null;
      return {
        url,
        title: typeof item === 'string' ? '' : (item.title || item.alt || ''),
        description: typeof item === 'string' ? '' : (item.description || '')
      };
    }).filter(Boolean);
    if (!valid.length) return;

    const gallery = document.createElement('section');
    gallery.className = 'homepage-gallery'; gallery.dataset.gallery = section;
    gallery.setAttribute('aria-label', `${section} photo gallery`);
    gallery.innerHTML = `<div class="shell"><div class="gallery-heading"><div><p class="eyebrow">A VIEW FROM THE ISLANDS</p><h2>Photo gallery</h2></div><span class="gallery-count" aria-live="polite"></span></div><div class="gallery-frame" aria-roledescription="carousel"><button class="gallery-control gallery-prev" type="button" aria-label="Previous photo">‹</button><button class="gallery-control gallery-next" type="button" aria-label="Next photo">›</button></div><div class="gallery-bottom"><div class="gallery-dots" role="group" aria-label="Choose a photo"></div><button class="gallery-pause" type="button">Pause slideshow</button></div></div>`;

    const hero = main.querySelector('.hero');
    const dashboard = main.querySelector('.home-dashboard');
    if (section === 'home' && dashboard) dashboard.after(gallery);
    else main.insertBefore(gallery, hero || main.firstChild);

    const frame = gallery.querySelector('.gallery-frame'), dots = gallery.querySelector('.gallery-dots'), count = gallery.querySelector('.gallery-count'), pause = gallery.querySelector('.gallery-pause');
    let active = 0, timer, paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const slides = valid.map((photo, index) => {
      const slide = document.createElement('div'); slide.className = `gallery-slide${index === 0 ? ' is-active' : ''}`;
      const img = document.createElement('img'); img.src = photo.url; img.alt = photo.title || 'Island photo'; img.loading = index === 0 ? 'eager' : 'lazy';
      const caption = document.createElement('div'); caption.className = 'gallery-caption-wrap';
      if (photo.title) { const title = document.createElement('strong'); title.className = 'gallery-caption-title'; title.textContent = photo.title; caption.appendChild(title); }
      if (photo.description) { const description = document.createElement('span'); description.className = 'gallery-caption-description'; description.textContent = photo.description; caption.appendChild(description); }
      slide.append(img, caption); frame.insertBefore(slide, frame.querySelector('.gallery-prev'));
      const dot = document.createElement('button'); dot.type = 'button'; dot.className = 'gallery-dot'; dot.setAttribute('aria-label', `Show photo ${index + 1}`); dot.setAttribute('aria-current', index === 0 ? 'true' : 'false'); dot.addEventListener('click', () => show(index)); dots.appendChild(dot);
      return { slide, dot };
    });

    function show(index) { active = (index + valid.length) % valid.length; slides.forEach((item, i) => { item.slide.classList.toggle('is-active', i === active); item.dot.setAttribute('aria-current', i === active ? 'true' : 'false'); }); count.textContent = `${String(active + 1).padStart(2, '0')} / ${String(valid.length).padStart(2, '0')}`; }
    function start() { clearInterval(timer); if (!paused && valid.length > 1) timer = setInterval(() => show(active + 1), 5000); }
    gallery.querySelector('.gallery-prev').addEventListener('click', () => { show(active - 1); start(); });
    gallery.querySelector('.gallery-next').addEventListener('click', () => { show(active + 1); start(); });
    pause.addEventListener('click', () => { paused = !paused; pause.textContent = paused ? 'Play slideshow' : 'Pause slideshow'; start(); });
    gallery.addEventListener('mouseenter', () => clearInterval(timer)); gallery.addEventListener('mouseleave', start);
    if (valid.length < 2) { gallery.querySelector('.gallery-prev').hidden = true; gallery.querySelector('.gallery-next').hidden = true; pause.hidden = true; dots.hidden = true; }
    show(0); start();
  }

  async function init() {
    const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    try {
      const { data, error } = await client.from('site_settings').select('settings').eq('id', 'main').maybeSingle();
      if (error || !data?.settings) return;
      const settings = data.settings;
      const section = document.body.dataset.section || 'home';
      const photos = settings.galleryImagesBySection?.[section] || (section === 'home' && Array.isArray(settings.galleryImages) ? settings.galleryImages : []);
      renderGallery(document.querySelector('main'), photos, section);
      if (/^#[0-9a-f]{6}$/i.test(settings.headerColor || '')) document.documentElement.style.setProperty('--site-accent', settings.headerColor);
      const brand = document.querySelector('.brand');
      if (brand && settings.logoUrl) { const url = safeUrl(settings.logoUrl); if (url) { const image = document.createElement('img'); image.className = 'brand-logo-image'; image.src = url; image.alt = settings.siteName || 'Website logo'; brand.classList.add('has-custom-logo'); brand.insertBefore(image, brand.firstChild); } }
    } catch (error) { console.error('Gallery loading failed:', error); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();

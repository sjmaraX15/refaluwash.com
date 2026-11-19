(() => {
  'use strict';

  const cfg = window.K4N_CONFIG || {};
  const states = [
    { name: 'Yap', key: 'yap' },
    { name: 'Chuuk', key: 'chuuk' },
    { name: 'Pohnpei', key: 'pohnpei' },
    { name: 'Kosrae', key: 'kosrae' }
  ];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const safeUrl = value => {
    try {
      const url = new URL(String(value || ''), location.href);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  };
  const articleUrl = article => `article.html?id=${encodeURIComponent(article.id)}`;
  const publishedDate = article => {
    const date = article.published_at || article.created_at;
    return date ? new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
  };

  const style = document.createElement('style');
  style.textContent = `
    #dynamic-sections{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:22px;padding:24px 0 34px}
    .home-featured-card{overflow:hidden;background:#fff;border:1px solid #e1e9f0;border-radius:16px;box-shadow:0 12px 30px #10283f12;transition:transform .2s,box-shadow .2s}
    .home-featured-card:hover{transform:translateY(-3px);box-shadow:0 16px 35px #10283f20}
    .home-featured-card>a{display:block;color:inherit;text-decoration:none}
    .home-featured-card img{display:block;width:100%;height:220px;object-fit:cover;background:#dce7ef}
    .home-featured-copy{padding:18px 20px 21px}.home-featured-copy .eyebrow{margin:0 0 8px;color:#52748a;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
    .home-featured-copy h2{margin:0 0 9px;font-size:clamp(20px,2.4vw,27px);line-height:1.18}.home-featured-copy p{margin:0;color:#526577;line-height:1.55}
    .home-featured-copy .home-meta{display:block;margin-top:13px;color:#718293;font-size:12px}
    .home-latest-card{display:flex;flex-direction:column;min-width:0;overflow:hidden;border:1px solid #e1e9f0;border-radius:14px;background:#fff;box-shadow:0 8px 24px #10283f12;transition:transform .2s,box-shadow .2s}
    .home-latest-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px #10283f20}.home-latest-card>a{display:flex;height:100%;flex-direction:column;color:inherit;text-decoration:none}
    .home-latest-card img,.home-latest-placeholder{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#dce7ef}
    .home-latest-placeholder{background:linear-gradient(135deg,#dce7ef,#aec5d3)}.home-latest-card h3{margin:0;padding:14px 16px 17px;font-size:16px;line-height:1.35}
    .island-carousel{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px}
    .island-grid{display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;overscroll-behavior-inline:contain;scrollbar-width:thin;padding:4px 2px 14px}
    .home-island-card{position:relative;display:flex;flex:0 0 clamp(230px,28vw,320px);min-height:230px;overflow:hidden;align-items:flex-end;scroll-snap-align:start;border-radius:16px;background:linear-gradient(145deg,#244c66,#10283f);color:#fff;text-decoration:none;box-shadow:0 10px 24px #10283f20}
    .home-island-card:before{position:absolute;inset:0;content:"";background-image:linear-gradient(0deg,#081b2be8 0%,#081b2b15 75%),var(--island-cover);background-position:center;background-size:cover;transition:transform .35s}
    .home-island-card:hover:before{transform:scale(1.05)}.home-island-card span{position:relative;padding:22px;font-size:22px;font-weight:800}.home-island-card small{display:block;margin-top:5px;font-size:12px;font-weight:500;opacity:.88}
    .island-scroll-button{display:grid;width:42px;height:42px;place-items:center;border:0;border-radius:50%;background:#10283f;color:#fff;font-size:28px;line-height:1;cursor:pointer}.island-scroll-button:hover{background:#244c66}.island-scroll-button:focus-visible,.island-grid:focus-visible{outline:3px solid #3f8fba;outline-offset:3px}
    .home-empty{grid-column:1/-1;padding:20px;border:1px dashed #cbd8e2;border-radius:12px;color:#607386;background:#fff}
    @media(max-width:600px){#dynamic-sections{gap:14px;padding-top:16px}.home-featured-card img{height:190px}.home-island-card{min-height:190px;flex-basis:82vw}.island-carousel{gap:7px}.island-scroll-button{width:34px;height:34px;font-size:23px}}
  `;
  document.head.appendChild(style);

  function renderArticle(article, featured = false) {
    const href = articleUrl(article);
    const image = safeUrl(article.image_url);
    const category = esc(article.category || 'Micronesia');
    const title = esc(article.title || 'Untitled story');
    const excerpt = esc(article.excerpt || 'Read the full story.');
    const date = esc(publishedDate(article));
    if (featured) return `<article class="home-featured-card"><a href="${href}">${image ? `<img src="${image}" alt="" loading="lazy">` : ''}<div class="home-featured-copy"><p class="eyebrow">${category}</p><h2>${title}</h2><p>${excerpt}</p><span class="home-meta">${date}</span></div></a></article>`;
    return `<article class="home-latest-card"><a href="${href}" aria-label="Read ${title}">${image ? `<img src="${image}" alt="" loading="lazy">` : '<span class="home-latest-placeholder" aria-hidden="true"></span>'}<h3>${title}</h3></a></article>`;
  }

  function coverFor(settings, key) {
    const grouped = [settings.stateCovers, settings.stateCoverPhotos, settings.stateCoversByState,
      settings.coverPhotos, settings.coverImages, settings.covers, settings.islandCovers];
    for (const group of grouped) {
      const value = group?.[key] ?? group?.[key.toUpperCase()] ?? group?.[key[0].toUpperCase() + key.slice(1)];
      const url = safeUrl(typeof value === 'string' ? value : value?.url ?? value?.image_url);
      if (url) return url;
    }
    const candidates = [settings[`${key}Cover`], settings[`${key}CoverUrl`], settings[`cover_${key}`],
      settings[`cover-${key}`], settings[`stateCover${key[0].toUpperCase()}${key.slice(1)}`]];
    for (const value of candidates) {
      const url = safeUrl(typeof value === 'string' ? value : value?.url ?? value?.image_url);
      if (url) return url;
    }
    return '';
  }

  function renderIslands(settings, articles) {
    const host = document.getElementById('island-grid');
    if (!host) return;
    host.innerHTML = states.map(state => {
      const story = articles.find(article => String(article.category || '').toLowerCase() === state.key);
      const href = story ? articleUrl(story) : `islands.html#${state.key}`;
      const cover = coverFor(settings, state.key);
      return `<a class="home-island-card" href="${href}"${cover ? ` style="--island-cover:url('${esc(cover)}')"` : ''}><span>${state.name}<small>${story ? `Read: ${esc(story.title)}` : 'Explore stories and updates'}</small></span></a>`;
    }).join('');
  }

  async function init() {
    const featuredHost = document.getElementById('dynamic-sections');
    const latestHost = document.getElementById('latest-grid');
    const cultureHost = document.getElementById('culture-grid');
    const menu = document.getElementById('menu-toggle');
    menu?.addEventListener('click', () => {
      const nav = document.getElementById('site-nav');
      const expanded = menu.getAttribute('aria-expanded') === 'true';
      menu.setAttribute('aria-expanded', String(!expanded));
      menu.setAttribute('aria-label', expanded ? 'Open menu' : 'Close menu');
      nav?.classList.toggle('is-open', !expanded);
    });
    document.querySelectorAll('[data-island-scroll]').forEach(button => button.addEventListener('click', () => {
      const host = document.getElementById('island-grid');
      const direction = Number(button.dataset.islandScroll) || 1;
      host?.scrollBy({ left: direction * Math.max(250, host.clientWidth * 0.8), behavior: 'smooth' });
    }));

    if (!window.supabase?.createClient || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
      if (featuredHost) featuredHost.innerHTML = '<p class="home-empty">Stories are temporarily unavailable.</p>';
      if (latestHost) latestHost.innerHTML = '<p class="home-empty">Stories are temporarily unavailable.</p>';
      return;
    }

    try {
      const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      const [articleResult, settingsResult] = await Promise.all([
        client.from('articles').select('id,title,excerpt,category,author,image_url,featured,status,published_at,created_at').eq('status', 'published').order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }),
        client.from('site_settings').select('settings').eq('id', 'main').maybeSingle()
      ]);
      if (articleResult.error) throw articleResult.error;
      const articles = articleResult.data || [];
      const settings = settingsResult.data?.settings || {};
      const featured = articles.filter(article => article.featured === true);
      if (featuredHost) featuredHost.innerHTML = featured.length
        ? featured.map(article => renderArticle(article, true)).join('')
        : '<p class="home-empty">No featured stories right now. Check back soon.</p>';
      if (latestHost) latestHost.innerHTML = articles.length
        ? articles.slice(0, 6).map(article => renderArticle(article)).join('')
        : '<p class="home-empty">No published stories yet.</p>';
      if (cultureHost) {
        const culture = articles.filter(article => /culture|community|heritage/i.test(article.category || ''));
        cultureHost.innerHTML = culture.length ? culture.slice(0, 3).map(article => renderArticle(article)).join('')
          : '<p class="home-empty">No culture stories published yet.</p>';
      }
      renderIslands(settings, articles);
    } catch (error) {
      console.error('Homepage stories could not be loaded:', error);
      if (featuredHost) featuredHost.innerHTML = '<p class="home-empty">Featured stories could not be loaded. Please try again later.</p>';
      if (latestHost) latestHost.innerHTML = '<p class="home-empty">Latest stories could not be loaded. Please try again later.</p>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

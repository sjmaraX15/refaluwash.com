(() => {
  'use strict';
  const cfg = window.K4N_CONFIG || {};
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safe = value => { try { const url = new URL(String(value || ''), location.href); return ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch (_) { return ''; } };

  const galleryStyles = document.createElement('style');
  galleryStyles.textContent = `.homepage-gallery{padding:28px 0 32px;background:#10283f;color:#fff}.homepage-gallery .shell{width:min(1180px,calc(100% - 48px));margin:0 auto}.gallery-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:0 0 14px}.gallery-heading .eyebrow{margin:0 0 5px;color:#8fc9ff;font-size:10px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.gallery-heading h2{margin:0;font:400 clamp(24px,3vw,34px)/1.1 'DM Serif Display',Georgia,serif}.gallery-count{color:#bfd2e3;font-size:12px;font-weight:700}.gallery-frame{height:clamp(250px,40vw,480px);position:relative;overflow:hidden;border:1px solid #ffffff20;border-radius:16px;background:#183c5b;box-shadow:0 15px 35px #06192b55}.gallery-slide{position:absolute;inset:0;opacity:0;transition:opacity .65s ease;pointer-events:none}.gallery-slide.is-active{opacity:1;pointer-events:auto}.gallery-slide img{width:100%;height:100%;display:block;object-fit:cover}.gallery-slide:after{content:'';position:absolute;inset:45% 0 0;background:linear-gradient(transparent,rgba(8,27,45,.76))}.gallery-caption{position:absolute;z-index:1;left:25px;right:25px;bottom:22px;color:#fff;font-size:14px;font-weight:700;text-shadow:0 2px 8px #0008}.gallery-control{position:absolute;z-index:2;top:50%;width:42px;height:42px;transform:translateY(-50%);border:1px solid #ffffff70;border-radius:50%;background:#10283fcc;color:#fff;font-size:22px;cursor:pointer;display:grid;place-items:center}.gallery-control:hover,.gallery-control:focus-visible{background:#1269c7}.gallery-prev{left:16px}.gallery-next{right:16px}.gallery-bottom{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:12px}.gallery-dots{display:flex;gap:7px;align-items:center}.gallery-dot{width:8px;height:8px;padding:0;border:0;border-radius:99px;background:#6c849b;cursor:pointer}.gallery-dot[aria-current=true]{width:24px;background:#8fc9ff}.gallery-pause{border:0;background:transparent;color:#bfd2e3;font:600 11px 'DM Sans',Arial,sans-serif;cursor:pointer}@media(max-width:600px){.homepage-gallery{padding:23px 0}.homepage-gallery .shell{width:calc(100% - 32px)}.gallery-frame{height:260px}.gallery-caption{left:16px;right:16px;bottom:15px;font-size:12px}.gallery-control{width:36px;height:36px}.gallery-prev{left:10px}.gallery-next{right:10px}}@media(prefers-reduced-motion:reduce){.gallery-slide{transition:none}}.brand-logo-image{max-width:190px;max-height:54px;object-fit:contain}`;
  document.head.appendChild(galleryStyles);

  async function loadSettingsAndBrand(client) {
    try {
      const { data } = await client.from('site_settings').select('settings').eq('id','main').maybeSingle();
      const settings = data?.settings || {};
      if (settings.siteName) document.querySelectorAll('#site-name').forEach(el => el.textContent = settings.siteName);
      if (settings.tagline) document.querySelectorAll('#site-tagline').forEach(el => el.textContent = settings.tagline);
      const brand = document.querySelector('.brand');
      if (brand && settings.logoUrl) {
        const url = safe(settings.logoUrl);
        if (url) { const image = document.createElement('img'); image.className = 'brand-logo-image'; image.src = url; image.alt = settings.siteName || 'Website logo'; brand.insertBefore(image, brand.firstChild); brand.classList.add('has-custom-logo'); }
      }
      if (/^#[0-9a-f]{6}$/i.test(settings.headerColor || '')) document.documentElement.style.setProperty('--site-accent', settings.headerColor);
      const nav = document.querySelector('.nav');
      if (nav) {
        let home = [...nav.querySelectorAll('a')].find(link => /^(home|latest)$/i.test(link.textContent.trim()));
        if (home) { home.textContent = 'Home'; home.href = 'index.html'; }
        else { home = document.createElement('a'); home.href = 'index.html'; home.textContent = 'Home'; nav.prepend(home); }
        const routes = { latest:'latest.html', islands:'islands.html', culture:'culture.html', about:'about.html' };
        [...nav.querySelectorAll('a')].forEach(link => { const key = link.textContent.trim().toLowerCase().split(/\s+/)[0]; if (routes[key]) link.href = routes[key]; if (link.getAttribute('href') === (location.pathname.split('/').pop() || 'index.html')) link.setAttribute('aria-current','page'); });
      }
      return settings;
    } catch (error) { console.error('Section page settings failed:', error); return {}; }
  }

  function renderGallery(main, photos, section) {
    if (!main || !Array.isArray(photos) || !photos.length) return;
    const valid = photos.map(item => { const url = safe(typeof item === 'string' ? item : item?.url); return url ? { url, alt: typeof item === 'string' ? 'Island photo' : (item.alt || 'Island photo') } : null; }).filter(Boolean);
    if (!valid.length) return;
    const gallery = document.createElement('section'); gallery.className = 'homepage-gallery'; gallery.dataset.gallery = section;
    gallery.innerHTML = `<div class="shell"><div class="gallery-heading"><div><p class="eyebrow">${section === 'about' ? 'OUR ISLANDS' : 'A VIEW FROM THE ISLANDS'}</p><h2>${section === 'about' ? 'Island photo gallery' : 'Photo gallery'}</h2></div><span class="gallery-count" aria-live="polite"></span></div><div class="gallery-frame" aria-roledescription="carousel" aria-label="${esc(section)} photo slideshow"><button class="gallery-control gallery-prev" type="button" aria-label="Previous photo">‹</button><button class="gallery-control gallery-next" type="button" aria-label="Next photo">›</button></div><div class="gallery-bottom"><div class="gallery-dots" role="group" aria-label="Choose a photo"></div><button class="gallery-pause" type="button">Pause slideshow</button></div></div>`;
    const hero = main.querySelector('.hero'); main.insertBefore(gallery, hero || main.firstChild);
    const frame = gallery.querySelector('.gallery-frame'), dots = gallery.querySelector('.gallery-dots'), count = gallery.querySelector('.gallery-count'), pause = gallery.querySelector('.gallery-pause');
    let active = 0, timer, paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const slides = valid.map((photo,index) => { const slide = document.createElement('div'); slide.className = `gallery-slide${index===0?' is-active':''}`; slide.setAttribute('role','group'); slide.setAttribute('aria-roledescription','slide'); slide.setAttribute('aria-label',`${index+1} of ${valid.length}`); const img=document.createElement('img');img.src=photo.url;img.alt=photo.alt;img.loading=index===0?'eager':'lazy';const caption=document.createElement('span');caption.className='gallery-caption';caption.textContent=photo.alt;slide.append(img,caption);frame.insertBefore(slide,frame.querySelector('.gallery-prev'));const dot=document.createElement('button');dot.type='button';dot.className='gallery-dot';dot.setAttribute('aria-label',`Show photo ${index+1}`);dot.setAttribute('aria-current',index===0?'true':'false');dot.addEventListener('click',()=>show(index));dots.appendChild(dot);return {slide,dot}; });
    function show(index){active=(index+valid.length)%valid.length;slides.forEach((item,i)=>{item.slide.classList.toggle('is-active',i===active);item.dot.setAttribute('aria-current',i===active?'true':'false')});count.textContent=`${String(active+1).padStart(2,'0')} / ${String(valid.length).padStart(2,'0')}`}
    function start(){clearInterval(timer);if(!paused&&valid.length>1)timer=setInterval(()=>show(active+1),5000)}
    gallery.querySelector('.gallery-prev').addEventListener('click',()=>{show(active-1);start()});gallery.querySelector('.gallery-next').addEventListener('click',()=>{show(active+1);start()});pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'Play slideshow':'Pause slideshow';start()});gallery.addEventListener('mouseenter',()=>clearInterval(timer));gallery.addEventListener('mouseleave',start);gallery.addEventListener('focusin',()=>clearInterval(timer));gallery.addEventListener('focusout',start);
    if(valid.length<2){gallery.querySelector('.gallery-prev').hidden=true;gallery.querySelector('.gallery-next').hidden=true;pause.hidden=true;dots.hidden=true}show(0);start();
  }

  window.loadSectionPage = async function(section, gridId) {
    if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;
    const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const settings = await loadSettingsAndBrand(client);
    renderGallery(document.querySelector('main'), settings.galleryImagesBySection?.[section] || [], section);
    try {
      const { data, error } = await client.from('articles').select('*').eq('status','published').order('published_at',{ascending:false});
      if (error) throw error;
      const articles = data || [];
      let filtered = articles;
      if (section === 'culture') filtered = articles.filter(article => ['Culture','Community','National'].includes(article.category));
      if (section === 'islands') filtered = articles.filter(article => ['Yap','Chuuk','Pohnpei','Kosrae'].includes(article.category));
      const host = document.getElementById(gridId);
      if (host) host.innerHTML = filtered.map(article => `<a class="story" href="article.html?id=${encodeURIComponent(article.id)}"><div class="story-img">${article.image_url ? `<img src="${esc(safe(article.image_url))}" alt="">` : ''}<span class="image-label">${esc(article.category || 'News')}</span></div><div class="story-copy"><span class="meta">${esc(article.category || 'News')} · ${article.published_at ? esc(new Date(article.published_at).toLocaleDateString()) : ''}</span><h3>${esc(article.title)}</h3><p class="excerpt">${esc(article.excerpt || '')}</p><span class="card-read">Read story →</span></div></a>`).join('') || '<div class="empty">No stories have been published in this section yet.</div>';
      if (section === 'islands') {
        const states = [['Yap','yap'],['Chuuk','chuuk'],['Pohnpei','pohnpei'],['Kosrae','kosrae']];
        document.getElementById('island-grid').innerHTML = states.map(([name,key],index) => `<a class="island-card" href="article.html?category=${encodeURIComponent(name)}">${settings.stateCovers?.[key] ? `<img src="${esc(safe(settings.stateCovers[key]))}" alt="${esc(name)}">` : ''}<div><span class="island-index">0${index+1}</span><strong>${esc(name)}</strong><span class="island-link">Explore stories ↗</span></div></a>`).join('');
      }
    } catch (error) {
      const host = document.getElementById(gridId);
      if (host) host.innerHTML = `<div class="empty">Could not load stories: ${esc(error.message)}</div>`;
    }
  };
})();

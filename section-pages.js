(() => {
  'use strict';
  const cfg = window.K4N_CONFIG || {};
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safe = value => { try { const url = new URL(String(value || ''), location.href); return ['https:','http:','data:'].includes(url.protocol) ? url.href : ''; } catch (_) { return ''; } };

  async function loadSettingsAndBrand(client) {
    try {
      const { data } = await client.from('site_settings').select('settings').eq('id','main').maybeSingle();
      const settings = data?.settings || {};
      if (settings.siteName) document.querySelectorAll('#site-name').forEach(el => el.textContent = settings.siteName);
      if (settings.tagline) document.querySelectorAll('#site-tagline').forEach(el => el.textContent = settings.tagline);
    } catch (_) {}
  }

  window.loadSectionPage = async function(section, gridId) {
    if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;
    const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    loadSettingsAndBrand(client);

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
        const { data: settingsRow } = await client.from('site_settings').select('settings').eq('id','main').maybeSingle();
        const settings = settingsRow?.settings || {};
        const states = [['Yap','yap'],['Chuuk','chuuk'],['Pohnpei','pohnpei'],['Kosrae','kosrae']];
        document.getElementById('island-grid').innerHTML = states.map(([name,key],index) => `<a class="island-card" href="article.html?category=${encodeURIComponent(name)}">${settings.stateCovers?.[key] ? `<img src="${esc(safe(settings.stateCovers[key]))}" alt="${esc(name)}">` : ''}<div><span class="island-index">0${index + 1}</span><strong>${esc(name)}</strong><span class="island-link">Explore stories ↗</span></div></a>`).join('');
      }
    } catch (error) {
      const host = document.getElementById(gridId);
      if (host) host.innerHTML = `<div class="empty">Could not load stories: ${esc(error.message)}</div>`;
    }
  };
})();

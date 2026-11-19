(() => {
  "use strict";
  const GALLERIES = [
    { key: "home", label: "Home page" }, { key: "latest", label: "Latest stories page" },
    { key: "islands", label: "The islands page" }, { key: "culture", label: "Culture page" }, { key: "about", label: "About page" }
  ];
  const cfg = window.K4N_CONFIG || {};
  const $ = id => document.getElementById(id);
  let client, settings = {}, user;

  function message(id, text, success = false) { const el = $(id); if (!el) return; el.textContent = text; el.className = success ? 'message ok' : 'message'; }
  function safeUrl(value) { try { const url = new URL(String(value || ''), location.href); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch (_) { return ''; } }
  async function getUser() { const { data, error } = await client.auth.getUser(); if (error) throw error; if (!data.user) throw new Error('Your admin session expired. Sign in again.'); user = data.user; }
  async function persistSettings() { await getUser(); const { error } = await client.from('site_settings').upsert({ id: 'main', settings, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: 'id' }); if (error) throw error; }

  function renderGallery(section) {
    const host = $(`gallery-list-${section.key}`); if (!host) return;
    const images = settings.galleryImagesBySection?.[section.key] || [];
    host.replaceChildren();
    if (!images.length) { const empty = document.createElement('p'); empty.className = 'hint'; empty.textContent = 'No photos uploaded for this page yet.'; host.appendChild(empty); return; }
    images.forEach((item, index) => {
      const url = safeUrl(typeof item === 'string' ? item : item.url); if (!url) return;
      const card = document.createElement('div'); card.className = 'builder-gallery-item';
      const img = document.createElement('img'); img.src = url; img.alt = typeof item === 'string' ? 'Gallery image' : (item.title || item.alt || 'Gallery image');
      const fields = document.createElement('div'); fields.className = 'builder-gallery-fields';
      const title = document.createElement('input'); title.type = 'text'; title.placeholder = 'Photo title'; title.value = typeof item === 'string' ? '' : (item.title || '');
      const description = document.createElement('textarea'); description.rows = 2; description.placeholder = 'Description shown under this photo'; description.value = typeof item === 'string' ? '' : (item.description || '');
      title.addEventListener('change', () => saveCaption(index, title.value, description.value));
      description.addEventListener('change', () => saveCaption(index, title.value, description.value));
      fields.append(title, description);
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn btn-outline'; remove.textContent = 'Remove photo';
      remove.addEventListener('click', async () => { remove.disabled = true; try { settings.galleryImagesBySection[section.key].splice(index, 1); await persistSettings(); renderGallery(section); message(`gallery-message-${section.key}`, 'Photo removed.', true); } catch (error) { message(`gallery-message-${section.key}`, error.message || 'Could not remove photo.'); } finally { remove.disabled = false; } });
      card.append(img, fields, remove); host.appendChild(card);
    });
  }

  async function saveCaption(index, title, description) {
    const sectionKey = document.querySelector('.builder-gallery-item input')?.dataset.section;
  }

  function ensureGalleryControls() {
    const panel = $('view-website-builder')?.querySelector('.panel'), saveButton = $('save-site-settings');
    if (!panel || !saveButton || $('builder-section-galleries')) return;
    const style = document.createElement('style');
    style.textContent = '.builder-gallery-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin:14px 0}.builder-gallery-card{padding:15px;border:1px solid var(--line,#dce7f0);border-radius:12px;background:#fff}.builder-gallery-card h4{margin:0 0 8px}.builder-gallery-card input[type=file]{display:block;width:100%;margin:12px 0}.builder-gallery-list{display:grid;gap:12px;margin:12px 0}.builder-gallery-item{display:grid;grid-template-columns:100px 1fr;gap:9px;align-items:start}.builder-gallery-item img{width:100px;height:80px;object-fit:cover;border-radius:8px}.builder-gallery-fields{display:grid;gap:7px}.builder-gallery-fields input,.builder-gallery-fields textarea{width:100%;border:1px solid #dce7f0;border-radius:8px;padding:8px}.builder-gallery-item>.btn{grid-column:1/-1}.builder-gallery-item .btn{padding:7px;font-size:11px}@media(max-width:500px){.builder-gallery-item{grid-template-columns:76px 1fr}.builder-gallery-item img{width:76px;height:76px}}';
    document.head.appendChild(style);
    const section = document.createElement('section'); section.id = 'builder-section-galleries';
    section.innerHTML = `<hr><h3>Separate photo galleries and captions</h3><p class="hint">Choose photos for each page, then add a title and description. The description appears below the photo in the slideshow. JPG, PNG, or WebP up to 5 MB each.</p><div class="builder-gallery-grid">${GALLERIES.map(item => `<div class="builder-gallery-card"><h4>${item.label}</h4><input type="file" id="gallery-files-${item.key}" accept="image/jpeg,image/png,image/webp" multiple><button type="button" class="btn btn-outline" data-upload-gallery="${item.key}">Upload ${item.label} photos</button><p class="message" id="gallery-message-${item.key}" aria-live="polite"></p><div class="builder-gallery-list" id="gallery-list-${item.key}"></div></div>`).join('')}</div>`;
    saveButton.before(section);
    GALLERIES.forEach(item => {
      const input = $(`gallery-files-${item.key}`);
      input.addEventListener('change', () => message(`gallery-message-${item.key}`, input.files.length ? `${input.files.length} photo(s) selected.` : ''));
      section.querySelector(`[data-upload-gallery="${item.key}"]`).addEventListener('click', () => uploadGallery(item));
    });
  }

  async function uploadFile(file, folder) {
    const extension = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'img';
    const uuid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path = `${folder}/${Date.now()}-${uuid}.${extension}`;
    const { error } = await client.storage.from('article-images').upload(path, file, { upsert: false, contentType: file.type, cacheControl: '3600' });
    if (error) throw error;
    const { data } = client.storage.from('article-images').getPublicUrl(path);
    const url = safeUrl(data?.publicUrl); if (!url) throw new Error('Storage did not return a public image URL.'); return url;
  }

  async function uploadGallery(section) {
    const input = $(`gallery-files-${section.key}`), files = [...(input?.files || [])];
    if (!files.length) return message(`gallery-message-${section.key}`, 'Choose one or more photos first.');
    const invalid = files.find(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) return message(`gallery-message-${section.key}`, `${invalid.name}: use JPG, PNG, or WebP up to 5 MB each.`);
    const button = document.querySelector(`[data-upload-gallery="${section.key}"]`); button.disabled = true;
    message(`gallery-message-${section.key}`, `Uploading ${files.length} photo(s)…`);
    try {
      await getUser(); settings.galleryImagesBySection = settings.galleryImagesBySection || {}; settings.galleryImagesBySection[section.key] = settings.galleryImagesBySection[section.key] || [];
      for (const file of files) settings.galleryImagesBySection[section.key].push({ url: await uploadFile(file, `gallery-${section.key}`), title: '', description: '' });
      await persistSettings(); input.value = ''; renderGallery(section); message(`gallery-message-${section.key}`, `${files.length} photo(s) uploaded. Add captions below each photo.`, true);
    } catch (error) { message(`gallery-message-${section.key}`, error.message || 'Upload failed.'); }
    finally { button.disabled = false; }
  }

  async function loadSettings() {
    try {
      const { data, error } = await client.from('site_settings').select('settings').eq('id', 'main').maybeSingle(); if (error) throw error;
      settings = data?.settings || {}; settings.galleryImagesBySection = settings.galleryImagesBySection || {};
      GALLERIES.forEach(renderGallery);
    } catch (error) { message('site-settings-message', error.message || 'Could not load gallery settings.'); }
  }

  function bind() {
    const cfgReady = window.supabase?.createClient && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY;
    if (!cfgReady) { message('site-settings-message', 'Supabase did not load.'); return; }
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    ensureGalleryControls();
    document.querySelectorAll('[data-view="website-builder"]').forEach(link => link.addEventListener('click', () => setTimeout(loadSettings, 0)));
    if (document.readyState !== 'loading') loadSettings(); else document.addEventListener('DOMContentLoaded', loadSettings, { once: true });
  }

  bind();
})();

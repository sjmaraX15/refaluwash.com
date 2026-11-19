(() => {
  'use strict';

  const cfg = window.K4N_CONFIG || {};
  if (!window.supabase?.createClient || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;

  function safeUrl(value) {
    try {
      const url = new URL(String(value || ''), location.href);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  async function applyBranding() {
    try {
      const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      const { data, error } = await client
        .from('site_settings')
        .select('settings')
        .eq('id', 'main')
        .maybeSingle();
      if (error || !data?.settings) return;

      const settings = data.settings;
      const siteName = String(settings.siteName || 'Refaliuwash');
      const logoUrl = safeUrl(settings.logoUrl);
      const heading = document.querySelector('header .logo');

      if (heading && logoUrl) {
        const image = document.createElement('img');
        image.src = logoUrl;
        image.alt = `${siteName} logo`;
        image.className = 'article-site-logo';
        image.decoding = 'async';
        heading.replaceChildren(image);
        heading.setAttribute('aria-label', siteName);
      } else if (heading) {
        heading.textContent = siteName;
      }

      const backLink = document.querySelector('main > .back');
      if (backLink) backLink.textContent = `← BACK TO ${siteName.toUpperCase()}`;

      const footer = document.querySelector('body > footer');
      if (footer) footer.textContent = `${siteName} • Island news & stories`;

      document.title = `${siteName} | Article`;

      const style = document.createElement('style');
      style.textContent = '.article-site-logo{display:block;width:min(100%,520px);max-height:150px;object-fit:contain;margin:0 auto;background:#07111d;border-radius:8px}header .logo{display:flex;justify-content:center;align-items:center;min-height:84px}';
      document.head.appendChild(style);
    } catch (error) {
      console.error('Article branding could not be loaded:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBranding, { once: true });
  } else {
    applyBranding();
  }
})();

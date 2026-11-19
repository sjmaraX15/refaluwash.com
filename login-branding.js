(() => {
  'use strict';

  function safeUrl(value) {
    try {
      const url = new URL(String(value || ''), location.href);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function removeDuplicateArticleHeading() {
    const heading = document.querySelector('#view-articles .section-head h2');
    if (heading) heading.remove();
  }

  async function applyLoginLogo() {
    const brandMark = document.querySelector('#login-form .brand-mark');
    if (!brandMark) return;

    // Keep the content-library heading as the single source of the section name;
    // the page title in the top bar already identifies the current view.
    removeDuplicateArticleHeading();

    const config = window.K4N_CONFIG || {};
    if (!window.supabase?.createClient || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) return;

    try {
      const client = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      const { data, error } = await client
        .from('site_settings')
        .select('settings')
        .eq('id', 'main')
        .maybeSingle();
      if (error || !data?.settings) return;

      const settings = data.settings;
      const logoUrl = safeUrl(settings.logoUrl);
      if (!logoUrl) return;

      const image = document.createElement('img');
      image.className = 'login-site-logo';
      image.src = logoUrl;
      image.alt = `${String(settings.siteName || 'Website')} logo`;
      image.decoding = 'async';
      image.addEventListener('error', () => {
        image.remove();
        brandMark.hidden = false;
      }, { once: true });
      brandMark.before(image);
      brandMark.hidden = true;

      const style = document.createElement('style');
      style.textContent = '.login-site-logo{display:block;width:auto;max-width:min(100%,260px);height:auto;max-height:100px;object-fit:contain;margin:0 auto 16px}.login-card .brand-mark[hidden]{display:none}';
      document.head.appendChild(style);
    } catch (error) {
      console.error('Login logo could not be loaded:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLoginLogo, { once: true });
  } else {
    applyLoginLogo();
  }
})();

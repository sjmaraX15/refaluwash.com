window.K4N_CONFIG = {
  SUPABASE_URL: "https://tlncfbvdyryhekymlruz.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_GJKeZPPKkLWGJ6T9h85p3Q_voDgrmcC"
};

// Load the matching helper for each page.
(() => {
  const path = window.location.pathname;
  const helpers = path.endsWith('/admin.html')
    ? ['website-builder-uploads.js', 'admin-branding.js', 'admin-category.js']
    : (path.endsWith('/article.html')
      ? ['article-branding.js']
      : (path.endsWith('/index.html') || path.endsWith('/') ? ['homepage-settings.js'] : []));
  helpers.forEach(helper => {
    const script = document.createElement('script');
    script.src = helper;
    script.defer = true;
    document.head.appendChild(script);
  });

  // When a custom logo is set, hide the fallback lettermark so both aren't shown.
  const style = document.createElement('style');
  style.textContent = '.brand.has-custom-logo .brand-mark{display:none!important}';
  document.head.appendChild(style);
})();

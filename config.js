window.K4N_CONFIG = {
  SUPABASE_URL: "https://tlncfbvdyryhekymlruz.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_GJKeZPPKkLWGJ6T9h85p3Q_voDgrmcC"
};

// Load the matching helper for each page.
(() => {
  const path = window.location.pathname;
  const helper = path.endsWith('/admin.html')
    ? 'website-builder-uploads.js'
    : (path.endsWith('/article.html')
      ? 'article-branding.js'
      : (path.endsWith('/index.html') || path.endsWith('/') ? 'homepage-settings.js' : ''));
  if (!helper) return;
  const script = document.createElement('script');
  script.src = helper;
  script.defer = true;
  document.head.appendChild(script);
})();

# K4N Website Builder installation

## Files in this package
- `admin.html` — upgraded newsroom and website builder
- `admin.js` — existing article tools plus website settings editor
- `admin.css` — existing styling plus builder layout
- `index.html` — public homepage that reads the saved settings
- `k4n-site-builder.sql` — creates the settings table and RLS policies

## Install
1. Back up your current GitHub repository before replacing anything.
2. In Supabase Dashboard, open SQL Editor and run `k4n-site-builder.sql`.
3. Replace the existing `admin.html`, `admin.js`, `admin.css`, and `index.html` with the matching files in this package.
4. Keep your existing `config.js` in the same folder. Its URL must be the project API URL, usually `https://YOUR_PROJECT_REF.supabase.co`, not the Supabase dashboard URL.
5. In Supabase Authentication settings, keep public sign-ups disabled. Keep your two existing administrator accounts.
6. Open `admin.html`, sign in, choose Website Builder, edit the fields/sections, then choose Save & publish.
7. Refresh the public homepage to see the published settings.

## Notes
- The builder changes site identity, announcement text, section order/visibility, section headings/body, image URL, contact email and theme colors. The hero and latest-news areas remain connected to your article publishing system.
- The article table and article image storage bucket are not changed.
- Image banner sections currently accept a publicly accessible image URL. Your existing `article-images` bucket can be used by copying a public image URL.
- This first builder version previews changes in the dashboard and publishes them to the homepage. It does not edit arbitrary HTML/CSS or provide a full freeform drag-and-drop canvas.
- The SQL policies allow authenticated users to write settings. This is safe only when public sign-ups are disabled and only the intended two admin accounts exist. If any other authenticated users exist, tighten policies with your two admin email addresses.
- Never put a Supabase service-role key in `config.js`. Use only the anon/public key in browser code.

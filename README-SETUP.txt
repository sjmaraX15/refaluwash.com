K4N NEWSROOM DASHBOARD — INSTALLATION GUIDE
============================================

FILES
-----
index.html          Public K4N homepage (loads published stories)
article.html        Individual article page
admin.html          Private newsroom login and dashboard
admin.css           Dashboard styling
admin.js            Dashboard functions
config.js           Supabase project URL and anon/public key
supabase-setup.sql  Database tables and security policies

IMPORTANT SECURITY NOTES
------------------------
1. Do NOT put a Supabase service_role/secret key in website files.
2. Use only the Supabase Project URL and anon/public key in config.js.
3. Turn OFF public sign-ups in Supabase Authentication settings.
4. Create only your two administrator accounts yourself in Supabase.
5. Never share either administrator password.
6. The SQL policies let signed-in users manage newsroom content. This is safe
   only when public sign-ups are disabled and you create the two accounts.

STEP 1 — CREATE SUPABASE PROJECT
--------------------------------
1. Visit https://supabase.com and create a project.
2. Choose a project name such as K4N Network.
3. Save your database password privately.
4. Open Project Settings > API (or Data API / API Keys, depending on UI).
5. Copy the Project URL.
6. Copy the anon / publishable public key. Do not copy service_role or secret.

STEP 2 — CREATE DATABASE AND IMAGE STORAGE
-------------------------------------------
1. In Supabase, open SQL Editor.
2. Choose New query.
3. Open this package's supabase-setup.sql file.
4. Copy all SQL into the editor and click Run.
5. Confirm it completes successfully.

STEP 3 — CREATE THE TWO ADMIN ACCOUNTS
---------------------------------------
1. In Supabase, open Authentication > Users.
2. Choose Add user / Invite user.
3. Create or invite the first administrator using their real email.
4. Repeat for the second administrator.
5. Have each administrator use the invitation or password-reset flow to set
   their own password.
6. In Authentication > Settings / Sign In, disable new user sign-ups.
   The exact menu label can vary as Supabase updates its dashboard.

Do not add a public registration form to the K4N website.

STEP 4 — CONFIGURE THE WEBSITE
-------------------------------
1. Open config.js in a text editor.
2. Replace PASTE_YOUR_SUPABASE_PROJECT_URL_HERE with the Project URL.
3. Replace PASTE_YOUR_SUPABASE_ANON_PUBLIC_KEY_HERE with the anon/public key.
4. Save config.js.

STEP 5 — UPLOAD TO GITHUB
--------------------------
1. Open your existing GitHub repository:
   https://github.com/sjmaraX15/refaluwash.com
2. Upload/replace these files at the repository ROOT (same level):
   index.html, article.html, admin.html, admin.css, admin.js, config.js
3. Upload supabase-setup.sql and this README too if you want to keep setup
   documentation in the repository.
4. Commit the changes to the main branch.
5. Wait for GitHub Pages to deploy.

STEP 6 — OPEN AND TEST
-----------------------
Public website:
https://sjmarax15.github.io/refaluwash.com/

Admin dashboard:
https://sjmarax15.github.io/refaluwash.com/admin.html

Test:
- Sign in with administrator 1.
- Create a draft and confirm it appears in the article list.
- Publish a test article.
- Open the public homepage and confirm it appears.
- Open the story and confirm the article page works.
- Sign out and confirm the dashboard asks for login.
- Repeat login with administrator 2.

HOW PUBLISHING WORKS
--------------------
- Save as draft: visible only to signed-in administrators.
- Publish now: visible on the public K4N homepage.
- Feature on homepage: displays the story in the top-story area.
- Edit: changes an existing article.
- Delete: permanently removes the article record.

LIMITATIONS / NEXT IMPROVEMENTS
--------------------------------
- This starter uses a browser-based rich text editor (Quill).
- Images are uploaded to a public image bucket so published stories can display.
- Deleting an article does not automatically delete its image file from Storage.
- This starter does not include scheduled publishing, audit logs, or separate
  editor/reporter permission levels.
- Both administrator accounts have the same permissions.
- The public anon key is designed to be exposed in browser code; security comes
  from Row Level Security and keeping sign-ups disabled.

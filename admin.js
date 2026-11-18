
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const cfg = window.K4N_CONFIG || {};
  const loginScreen = $("login-screen");
  const dashboard = $("dashboard");

  const defaultSiteSettings = {
    siteName: "KaMoRaLe 4 Network",
    tagline: "ONE NATION WITH ONE CONNECTION",
    breakingText: "K4N NEWS: Connecting Micronesia, One Story at a Time.",
    headerColor: "#000000",
    backgroundColor: "#f5f5f5",
    textColor: "#111111",
    sections: []
  };

  let currentUser = null;
  let editingId = null;
  let uploadedImageUrl = "";
  let siteSettings = { ...defaultSiteSettings };
  let quill = null;

  const setMessage = (id, message, success = false) => {
    const el = $(id);
    if (!el) return;
    el.textContent = message;
    el.className = success ? "message ok" : "message";
  };

  const escapeHtml = (value = "") =>
    String(value).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    })[c]);

  // Check configuration and required libraries.
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    setMessage("login-message", "Supabase configuration is missing.");
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    setMessage("login-message", "Supabase failed to load. Refresh the page.");
    return;
  }

  const supabase = window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_ANON_KEY
  );

  // Initialize the article editor without blocking login.
  try {
    if (window.Quill && $("article-editor")) {
      quill = new Quill("#article-editor", {
        theme: "snow",
        modules: { toolbar: "#editor-toolbar" },
        placeholder: "Write your story here…"
      });
    }
  } catch (error) {
    console.error("Quill initialization error:", error);
  }

  // NAVIGATION
  function showView(name) {
    if (name === "website") name = "website-builder";

    document.querySelectorAll(".view").forEach(view => {
      view.classList.add("hidden");
    });

    const target = $("view-" + name);
    if (!target) {
      console.error("Missing dashboard view:", name);
      return;
    }

    target.classList.remove("hidden");

    document.querySelectorAll("[data-view]").forEach(link => {
      link.classList.toggle(
        "active",
        link.dataset.view === name
      );
    });

    const headings = {
      overview: "Dashboard overview",
      articles: "Manage articles",
      editor: editingId ? "Edit article" : "Write an article",
      "website-builder": "Website Builder"
    };

    if ($("page-heading")) {
      $("page-heading").textContent = headings[name] || name;
    }

    if (name === "overview" || name === "articles") {
      loadArticles();
    }

    if (name === "website-builder") {
      loadSiteSettings();
    }
  }

  document.querySelectorAll("[data-view]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      showView(link.dataset.view);
    });
  });

  document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
      showView(button.dataset.go);
    });
  });

  // LOGIN
  async function enterApp(user) {
    currentUser = user;

    loginScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");

    $("user-email").textContent = user.email || "Administrator";

    await loadArticles();
  }

  $("login-form").addEventListener("submit", async event => {
    event.preventDefault();

    const email = $("login-email").value.trim();
    const password = $("login-password").value;

    if (!email || !password) {
      setMessage("login-message", "Enter your email and password.");
      return;
    }

    const button = $("login-form").querySelector(
      'button[type="submit"]'
    );

    button.disabled = true;
    setMessage("login-message", "Signing in…");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setMessage("login-message", error.message);
        return;
      }

      if (!data.user) {
        setMessage("login-message", "Login failed. Please try again.");
        return;
      }

      await enterApp(data.user);

    } catch (error) {
      console.error("Login error:", error);
      setMessage("login-message", "Login error: " + error.message);

    } finally {
      button.disabled = false;
    }
  });

  // LOGOUT
  $("logout-btn").onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  // CHECK EXISTING SESSION
  async function checkSession() {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) throw error;

      if (data.session && data.session.user) {
        await enterApp(data.session.user);
      }
    } catch (error) {
      console.error("Session check:", error);
    }
  }

  // ARTICLES
  async function loadArticles() {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = data || [];

      $("stat-total").textContent = rows.length;
      $("stat-published").textContent =
        rows.filter(a => a.status === "published").length;
      $("stat-drafts").textContent =
        rows.filter(a => a.status === "draft").length;

      renderList("recent-list", rows.slice(0, 5));
      renderList("all-list", filterRows(rows));

    } catch (error) {
      console.error("Article loading:", error);

      if ($("recent-list")) {
        $("recent-list").textContent = "Could not load articles: " + error.message;
      }

      if ($("all-list")) {
        $("all-list").textContent = "Could not load articles: " + error.message;
      }
    }
  }

  function filterRows(rows) {
    const q = ($("article-search").value || "").toLowerCase();
    const status = $("status-filter").value;

    return rows.filter(article =>
      (article.title || "").toLowerCase().includes(q) &&
      (status === "all" || article.status === status)
    );
  }

  $("article-search").addEventListener("input", loadArticles);
  $("status-filter").addEventListener("change", loadArticles);

  function renderList(target, rows) {
    const host = $(target);
    if (!host) return;

    if (!rows.length) {
      host.innerHTML =
        '<p class="muted">No articles yet. Create your first K4N story.</p>';
      return;
    }

    host.innerHTML = rows.map(article => `
      <div class="article-row">
        <div>
          <h3>${escapeHtml(article.title)}</h3>
          <div class="article-meta">
            ${escapeHtml(article.category)}
            · ${new Date(article.created_at).toLocaleDateString()}
            · <span class="status ${escapeHtml(article.status)}">
              ${escapeHtml(article.status)}
            </span>
          </div>
        </div>
        <div class="row-actions">
          <button class="small-btn" data-edit="${escapeHtml(article.id)}">Edit</button>
          <button class="small-btn" data-delete="${escapeHtml(article.id)}">Delete</button>
        </div>
      </div>
    `).join("");

    host.querySelectorAll("[data-edit]").forEach(button => {
      button.onclick = () => editArticle(button.dataset.edit);
    });

    host.querySelectorAll("[data-delete]").forEach(button => {
      button.onclick = () => deleteArticle(button.dataset.delete);
    });
  }

  // ARTICLE EDITOR
  function resetEditor() {
    editingId = null;
    uploadedImageUrl = "";

    $("article-form").reset();

    if (quill) quill.setContents([]);

    $("image-preview").textContent = "No image selected";
    $("editor-heading").textContent = "Write a new article";
    $("save-article").textContent = "Save article";

    setMessage("save-message", "");
    setMessage("image-message", "");

    showView("editor");
  }

  $("new-article-top").onclick = resetEditor;
  $("new-article-list").onclick = resetEditor;

  $("cancel-editor").onclick = () => showView("articles");

  async function editArticle(id) {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      editingId = id;
      uploadedImageUrl = data.image_url || "";

      $("article-title").value = data.title || "";
      $("article-excerpt").value = data.excerpt || "";
      $("article-category").value = data.category || "National";
      $("article-author").value = data.author || "";
      $("article-featured").checked = !!data.featured;
      $("article-status").value = data.status || "draft";

      if (quill) {
        quill.root.innerHTML = data.content_html || "";
      }

      $("image-preview").innerHTML = uploadedImageUrl
        ? `<img src="${escapeHtml(uploadedImageUrl)}" alt="Featured image">`
        : "No image selected";

      $("editor-heading").textContent = "Edit article";
      $("save-article").textContent = "Update article";

      showView("editor");

    } catch (error) {
      alert(error.message);
    }
  }

  async function deleteArticle(id) {
    if (!confirm("Delete this article permanently?")) return;

    const { error } = await supabase
      .from("articles")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      await loadArticles();
    }
  }

  // IMAGE UPLOAD
  $("upload-image").onclick = async () => {
    const file = $("article-image-file").files[0];

    if (!file) {
      return setMessage("image-message", "Choose an image first.");
    }

    if (file.size > 5 * 1024 * 1024) {
      return setMessage("image-message", "Image must be 5 MB or smaller.");
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return setMessage("image-message", "Use JPG, PNG or WebP.");
    }

    setMessage("image-message", "Uploading…");

    try {
      const ext = file.name.split(".").pop().toLowerCase();
      const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("article-images")
        .upload(path, file, {
          upsert: false,
          contentType: file.type
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("article-images")
        .getPublicUrl(path);

      uploadedImageUrl = data.publicUrl;

      $("image-preview").innerHTML =
        `<img src="${escapeHtml(uploadedImageUrl)}" alt="Featured image">`;

      setMessage("image-message", "Image uploaded successfully.", true);

    } catch (error) {
      setMessage("image-message", error.message);
    }
  };

  // SAVE ARTICLE
  $("article-form").addEventListener("submit", async event => {
    event.preventDefault();

    const title = $("article-title").value.trim();

    if (!title) {
      return setMessage("save-message", "Please enter a headline.");
    }

    if (!quill || !quill.getText().trim()) {
      return setMessage("save-message", "Please write the article content.");
    }

    const now = new Date().toISOString();

    const payload = {
      title,
      excerpt: $("article-excerpt").value.trim(),
      content_html: quill.root.innerHTML,
      category: $("article-category").value,
      author: $("article-author").value.trim() || "K4N News Desk",
      featured: $("article-featured").checked,
      status: $("article-status").value,
      image_url: uploadedImageUrl,
      updated_at: now
    };

    if (payload.status === "published") {
      payload.published_at = now;
    }

    const button = $("save-article");
    button.disabled = true;
    setMessage("save-message", "Saving…");

    try {
      let result;

      if (editingId) {
        result = await supabase
          .from("articles")
          .update(payload)
          .eq("id", editingId);
      } else {
        result = await supabase
          .from("articles")
          .insert({
            ...payload,
            created_by: currentUser.id
          });
      }

      if (result.error) throw result.error;

      setMessage("save-message", "Saved successfully.", true);

      await loadArticles();

      setTimeout(() => showView("articles"), 700);

    } catch (error) {
      setMessage("save-message", error.message);

    } finally {
      button.disabled = false;
    }
  });

  // WEBSITE BUILDER
  async function loadSiteSettings() {
    setMessage("site-settings-message", "Loading settings…");

    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("settings")
        .eq("id", "main")
        .maybeSingle();

      if (error) throw error;

      siteSettings = {
        ...defaultSiteSettings,
        ...(data?.settings || {})
      };

      $("site-name").value = siteSettings.siteName;
      $("site-tagline").value = siteSettings.tagline;
      $("site-color").value = siteSettings.headerColor;

      setMessage("site-settings-message", "Settings loaded.", true);

    } catch (error) {
      setMessage("site-settings-message", error.message);
    }
  }

  $("save-site-settings").onclick = async () => {
    siteSettings = {
      ...siteSettings,
      siteName: $("site-name").value.trim(),
      tagline: $("site-tagline").value.trim(),
      headerColor: $("site-color").value
    };

    setMessage("site-settings-message", "Saving settings…");

    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({
          id: "main",
          settings: siteSettings
        });

      if (error) throw error;

      setMessage(
        "site-settings-message",
        "Website settings saved successfully!",
        true
      );

    } catch (error) {
      setMessage("site-settings-message", error.message);
    }
  };

  // STARTUP
  checkSession();

  console.log("K4N Admin initialized successfully.");

})();


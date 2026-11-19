(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const STATES = ["yap", "chuuk", "pohnpei", "kosrae"];
  const cfg = window.K4N_CONFIG || {};
  let client;
  let settings = {};
  let user = null;
  let loading = false;

  function message(id, text, success = false) {
    const el = $(id);
    if (!el) return;
    el.textContent = text;
    el.className = success ? "message ok" : "message";
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value || ""), window.location.href);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function preview(id, url, label) {
    const el = $(id);
    if (!el) return;
    const safe = safeUrl(url);
    el.replaceChildren();
    if (!safe) {
      el.textContent = label || "No image selected";
      return;
    }
    const img = document.createElement("img");
    img.src = safe;
    img.alt = label || "Uploaded image preview";
    el.appendChild(img);
  }

  async function getUser() {
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error("Your admin session expired. Sign in again and retry.");
    user = data.user;
    return user;
  }

  async function persistSettings() {
    await getUser();
    const { error } = await client.from("site_settings").upsert({
      id: "main",
      settings,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }, { onConflict: "id" });
    if (error) throw error;
  }

  async function loadSettings() {
    if (loading) return;
    loading = true;
    try {
      const { data, error } = await client.from("site_settings")
        .select("settings")
        .eq("id", "main")
        .maybeSingle();
      if (error) throw error;
      settings = data?.settings || {};
      settings.stateCovers = settings.stateCovers || {};

      if ($("site-name")) $("site-name").value = settings.siteName || "";
      if ($("site-tagline")) $("site-tagline").value = settings.tagline || "";
      if ($("site-color")) $("site-color").value = /^#[0-9a-f]{6}$/i.test(settings.headerColor || "") ? settings.headerColor : "#1269c7";
      preview("site-logo-preview", settings.logoUrl, "Using website title");
      for (const state of STATES) {
        preview(`cover-preview-${state}`, settings.stateCovers[state], "No cover selected");
      }
      message("site-settings-message", "Settings loaded.", true);
    } catch (error) {
      console.error("Website builder settings load failed:", error);
      message("site-settings-message", error.message || "Could not load website settings.");
    } finally {
      loading = false;
    }
  }

  function validate(file, messageId) {
    if (!file) {
      message(messageId, "Choose an image first.");
      return false;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      message(messageId, "Use a JPG, PNG, or WebP image.");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      message(messageId, "Image must be 5 MB or smaller.");
      return false;
    }
    return true;
  }

  async function upload(fileInput, messageId, onUploaded) {
    const file = fileInput?.files?.[0];
    if (!validate(file, messageId)) return;
    const button = messageId === "site-logo-message"
      ? $("upload-site-logo")
      : document.querySelector(`[data-upload-cover="${messageId.replace('cover-message-', '')}"]`);
    if (button) button.disabled = true;
    message(messageId, "Uploading image…");
    try {
      await getUser();
      const extension = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "img";
      const uuid = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const path = `website/${Date.now()}-${uuid}.${extension}`;
      const { error: uploadError } = await client.storage.from("article-images").upload(path, file, {
        upsert: false,
        contentType: file.type,
        cacheControl: "3600"
      });
      if (uploadError) throw uploadError;
      const { data } = client.storage.from("article-images").getPublicUrl(path);
      const url = safeUrl(data?.publicUrl);
      if (!url) throw new Error("The storage service did not return a valid public image URL.");
      await onUploaded(url);
      await persistSettings();
      preview(messageId === "site-logo-message" ? "site-logo-preview" : `cover-preview-${messageId.replace('cover-message-', '')}`, url, "Uploaded image");
      if (fileInput) fileInput.value = "";
      message(messageId, "Image uploaded and saved successfully.", true);
    } catch (error) {
      console.error("Website image upload failed:", error);
      const detail = error.message || "Unknown upload error.";
      message(messageId, `${detail} Check that the Supabase article-images bucket exists and allows authenticated uploads and public reads.`);
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function saveAll(event) {
    event?.preventDefault();
    const button = $("save-site-settings");
    if (button) button.disabled = true;
    message("site-settings-message", "Saving settings…");
    try {
      settings = {
        ...settings,
        siteName: $("site-name")?.value.trim() || "",
        tagline: $("site-tagline")?.value.trim() || "",
        headerColor: $("site-color")?.value || "#1269c7"
      };
      await persistSettings();
      message("site-settings-message", "Website settings saved successfully.", true);
    } catch (error) {
      console.error("Website settings save failed:", error);
      message("site-settings-message", error.message || "Could not save website settings.");
    } finally {
      if (button) button.disabled = false;
    }
  }

  function bind() {
    if (!window.supabase?.createClient || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
      message("site-settings-message", "Supabase did not load. Refresh the page and try again.");
      return;
    }
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

    $("upload-site-logo")?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      upload($("site-logo-file"), "site-logo-message", url => { settings.logoUrl = url; });
    });
    $("remove-site-logo")?.addEventListener("click", async event => {
      event.preventDefault();
      try {
        settings.logoUrl = "";
        await persistSettings();
        preview("site-logo-preview", "", "Using website title");
        message("site-logo-message", "Logo removed. The text heading will be used.", true);
      } catch (error) {
        message("site-logo-message", error.message || "Could not remove the logo.");
      }
    });

    for (const state of STATES) {
      const input = $(`cover-file-${state}`);
      input?.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) return;
        const localUrl = URL.createObjectURL(file);
        preview(`cover-preview-${state}`, localUrl, "Selected image");
      });
      document.querySelector(`[data-upload-cover="${state}"]`)?.addEventListener("click", event => {
        // Cover controls are currently inside a label; cancel label activation so it does not reopen the file picker.
        event.preventDefault();
        event.stopPropagation();
        upload(input, `cover-message-${state}`, url => { settings.stateCovers[state] = url; });
      });
      document.querySelector(`[data-remove-cover="${state}"]`)?.addEventListener("click", async event => {
        event.preventDefault();
        event.stopPropagation();
        try {
          delete settings.stateCovers[state];
          await persistSettings();
          preview(`cover-preview-${state}`, "", "No cover selected");
          message(`cover-message-${state}`, "Cover removed.", true);
        } catch (error) {
          message(`cover-message-${state}`, error.message || "Could not remove the cover.");
        }
      });
    }

    // Replace the older save handler, which did not include updated_by (required by the site's RLS policy).
    const saveButton = $("save-site-settings");
    if (saveButton) {
      saveButton.onclick = null;
      saveButton.addEventListener("click", saveAll);
    }
    document.querySelectorAll('[data-view="website-builder"]').forEach(link => {
      link.addEventListener("click", () => window.setTimeout(loadSettings, 0));
    });
    if (document.readyState !== "loading") {
      loadSettings();
    } else {
      document.addEventListener("DOMContentLoaded", loadSettings, { once: true });
    }
  }

  bind();
})();

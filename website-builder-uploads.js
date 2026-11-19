(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const STATES = ["yap", "chuuk", "pohnpei", "kosrae"];
  const GALLERIES = [
    { key: "home", label: "Home page" },
    { key: "latest", label: "Latest stories page" },
    { key: "islands", label: "The islands page" },
    { key: "culture", label: "Culture page" },
    { key: "about", label: "About page" }
  ];
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
    } catch (_) { return ""; }
  }

  function preview(id, url, label) {
    const el = $(id);
    if (!el) return;
    const safe = safeUrl(url);
    el.replaceChildren();
    if (!safe) { el.textContent = label || "No image selected"; return; }
    const img = document.createElement("img"); img.src = safe; img.alt = label || "Uploaded image preview"; el.appendChild(img);
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
    const { error } = await client.from("site_settings").upsert({ id: "main", settings, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw error;
  }

  function renderGallery(section) {
    const host = $(`gallery-list-${section.key}`);
    if (!host) return;
    const images = settings.galleryImagesBySection?.[section.key] || [];
    host.replaceChildren();
    if (!images.length) { const empty=document.createElement("p");empty.className="hint";empty.textContent="No photos uploaded for this page yet.";host.appendChild(empty);return; }
    images.forEach((item,index) => {
      const url = safeUrl(typeof item === "string" ? item : item.url);
      if (!url) return;
      const card=document.createElement("div");card.className="builder-gallery-item";
      const img=document.createElement("img");img.src=url;img.alt=typeof item==="string"?"Gallery image":(item.alt||"Gallery image");
      const remove=document.createElement("button");remove.type="button";remove.className="btn btn-outline";remove.textContent="Remove photo";
      remove.addEventListener("click",async()=>{remove.disabled=true;try{settings.galleryImagesBySection[section.key].splice(index,1);await persistSettings();renderGallery(section);message(`gallery-message-${section.key}`,"Photo removed from this page.",true);}catch(error){message(`gallery-message-${section.key}`,error.message||"Could not remove photo.");}finally{remove.disabled=false;}});
      card.append(img,remove);host.appendChild(card);
    });
  }

  function ensureGalleryControls() {
    const panel=$("view-website-builder")?.querySelector(".panel");
    const saveButton=$("save-site-settings");
    if(!panel||!saveButton||$("builder-section-galleries"))return;
    const style=document.createElement("style");
    style.textContent=".builder-gallery-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:14px 0}.builder-gallery-card{padding:15px;border:1px solid var(--line,#dce7f0);border-radius:12px;background:#fff}.builder-gallery-card h4{margin:0 0 8px}.builder-gallery-card input[type=file]{display:block;width:100%;margin:12px 0}.builder-gallery-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:9px;margin:10px 0}.builder-gallery-item{display:grid;gap:7px;min-width:0}.builder-gallery-item img{width:100%;height:90px;object-fit:cover;border-radius:8px;background:#e8f2ff}.builder-gallery-item .btn{padding:7px;font-size:11px}";
    document.head.appendChild(style);
    const section=document.createElement("section");section.id="builder-section-galleries";
    section.innerHTML=`<hr><h3>Separate photo galleries by page</h3><p class="hint">Upload photos to each page’s own slideshow. Photos uploaded here stay separate from article images and island cover photos. JPG, PNG, or WebP up to 5 MB each.</p><div class="builder-gallery-grid">${GALLERIES.map(item=>`<div class="builder-gallery-card"><h4>${item.label}</h4><input type="file" id="gallery-files-${item.key}" accept="image/jpeg,image/png,image/webp" multiple aria-label="Choose photos for ${item.label}"><button type="button" class="btn btn-outline" data-upload-gallery="${item.key}">Upload ${item.label} photos</button><p class="message" id="gallery-message-${item.key}" aria-live="polite"></p><div class="builder-gallery-list" id="gallery-list-${item.key}"></div></div>`).join("")}</div>`;
    saveButton.before(section);
    GALLERIES.forEach(item=>{
      const input=$(`gallery-files-${item.key}`);
      input.addEventListener("change",()=>message(`gallery-message-${item.key}`,input.files.length?`${input.files.length} photo(s) selected. Click upload to add them to this page.`:""));
      section.querySelector(`[data-upload-gallery="${item.key}"]`).addEventListener("click",()=>uploadGallery(item));
    });
  }

  async function uploadFile(file, folder="website") {
    const extension=file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g,"")||"img";
    const uuid=window.crypto?.randomUUID?window.crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path=`${folder}/${Date.now()}-${uuid}.${extension}`;
    const {error}=await client.storage.from("article-images").upload(path,file,{upsert:false,contentType:file.type,cacheControl:"3600"});
    if(error)throw error;
    const {data}=client.storage.from("article-images").getPublicUrl(path);
    const url=safeUrl(data?.publicUrl);
    if(!url)throw new Error("Storage did not return a valid public image URL.");
    return url;
  }

  async function uploadGallery(section) {
    const input=$(`gallery-files-${section.key}`), files=[...(input?.files||[])];
    const button=document.querySelector(`[data-upload-gallery="${section.key}"]`);
    if(!files.length)return message(`gallery-message-${section.key}`,"Choose one or more photos first.");
    const invalid=files.find(file=>!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024);
    if(invalid)return message(`gallery-message-${section.key}`,`${invalid.name}: use JPG, PNG, or WebP up to 5 MB each.`);
    button.disabled=true;message(`gallery-message-${section.key}`,`Uploading ${files.length} photo(s)…`);
    try {
      await getUser();
      settings.galleryImagesBySection=settings.galleryImagesBySection||{};
      settings.galleryImagesBySection[section.key]=settings.galleryImagesBySection[section.key]||[];
      const uploaded=[];
      for(const file of files)uploaded.push({url:await uploadFile(file,`gallery-${section.key}`),alt:file.name.replace(/\.[^.]+$/,"")});
      settings.galleryImagesBySection[section.key].push(...uploaded);
      await persistSettings();input.value="";renderGallery(section);
      message(`gallery-message-${section.key}`,`${uploaded.length} photo(s) uploaded and saved for ${section.label}.",true);
    } catch(error) {
      console.error("Section gallery upload failed:",error);
      message(`gallery-message-${section.key}`,`${error.message||"Upload failed."} Check the Supabase article-images bucket and authenticated upload permissions.`);
    } finally {button.disabled=false;}
  }

  async function loadSettings() {
    if(loading)return;loading=true;
    try {
      const {data,error}=await client.from("site_settings").select("settings").eq("id","main").maybeSingle();if(error)throw error;
      settings=data?.settings||{};settings.stateCovers=settings.stateCovers||{};settings.galleryImagesBySection=settings.galleryImagesBySection||{};
      if($("site-name"))$("site-name").value=settings.siteName||"";
      if($("site-tagline"))$("site-tagline").value=settings.tagline||"";
      if($("site-color"))$("site-color").value=/^#[0-9a-f]{6}$/i.test(settings.headerColor||"")?settings.headerColor:"#1269c7";
      preview("site-logo-preview",settings.logoUrl,"Using website title");
      for(const state of STATES)preview(`cover-preview-${state}`,settings.stateCovers[state],"No cover selected");
      GALLERIES.forEach(renderGallery);message("site-settings-message","Settings loaded.",true);
    } catch(error) {console.error("Website builder settings load failed:",error);message("site-settings-message",error.message||"Could not load website settings.");}
    finally {loading=false;}
  }

  function validate(file,messageId) {
    if(!file)return message(messageId,"Choose an image first."),false;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type))return message(messageId,"Use a JPG, PNG, or WebP image."),false;
    if(file.size>5*1024*1024)return message(messageId,"Image must be 5 MB or smaller."),false;
    return true;
  }

  async function upload(fileInput,messageId,onUploaded) {
    const file=fileInput?.files?.[0];if(!validate(file,messageId))return;
    const state=messageId.replace("cover-message-","");
    const button=messageId==="site-logo-message"?$("upload-site-logo"):document.querySelector(`[data-upload-cover="${state}"]`);
    if(button)button.disabled=true;message(messageId,"Uploading image…");
    try {await getUser();const url=await uploadFile(file);await onUploaded(url);await persistSettings();preview(messageId==="site-logo-message"?"site-logo-preview":`cover-preview-${state}`,url,"Uploaded image");fileInput.value="";message(messageId,"Image uploaded and saved successfully.",true);}
    catch(error){console.error("Website image upload failed:",error);message(messageId,`${error.message||"Upload failed."} Check the Supabase article-images bucket and authenticated upload permissions.`);}
    finally {if(button)button.disabled=false;}
  }

  async function saveAll(event) {
    event?.preventDefault();const button=$("save-site-settings");if(button)button.disabled=true;message("site-settings-message","Saving settings…");
    try {settings={...settings,siteName:$("site-name")?.value.trim()||"",tagline:$("site-tagline")?.value.trim()||"",headerColor:$("site-color")?.value||"#1269c7"};await persistSettings();message("site-settings-message","Website settings saved successfully.",true);}
    catch(error){console.error("Website settings save failed:",error);message("site-settings-message",error.message||"Could not save website settings.");}
    finally {if(button)button.disabled=false;}
  }

  function bind() {
    if(!window.supabase?.createClient||!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY){message("site-settings-message","Supabase did not load. Refresh the page and try again.");return;}
    client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);ensureGalleryControls();
    $("upload-site-logo")?.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();upload($("site-logo-file"),"site-logo-message",url=>{settings.logoUrl=url;});});
    $("remove-site-logo")?.addEventListener("click",async event=>{event.preventDefault();try{settings.logoUrl="";await persistSettings();preview("site-logo-preview","","Using website title");message("site-logo-message","Logo removed. The text heading will be used.",true);}catch(error){message("site-logo-message",error.message||"Could not remove the logo.");}});
    for(const state of STATES){const input=$(`cover-file-${state}`);input?.addEventListener("change",()=>{const file=input.files?.[0];if(file)preview(`cover-preview-${state}`,URL.createObjectURL(file),"Selected image");});document.querySelector(`[data-upload-cover="${state}"]`)?.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();upload(input,`cover-message-${state}`,url=>{settings.stateCovers[state]=url;});});document.querySelector(`[data-remove-cover="${state}"]`)?.addEventListener("click",async event=>{event.preventDefault();event.stopPropagation();try{delete settings.stateCovers[state];await persistSettings();preview(`cover-preview-${state}`,"","No cover selected");message(`cover-message-${state}`,"Cover removed.",true);}catch(error){message(`cover-message-${state}`,error.message||"Could not remove the cover.");}});}
    const saveButton=$("save-site-settings");if(saveButton){saveButton.onclick=null;saveButton.addEventListener("click",saveAll);}
    document.querySelectorAll('[data-view="website-builder"]').forEach(link=>link.addEventListener("click",()=>setTimeout(loadSettings,0)));
    if(document.readyState!=="loading")loadSettings();else document.addEventListener("DOMContentLoaded",loadSettings,{once:true});
  }
  bind();
})();

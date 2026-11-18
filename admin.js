(() => {
  const cfg = window.K4N_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const loginScreen = $("login-screen"), dashboard = $("dashboard");
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("PASTE_") || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes("PASTE_")) {
    $("login-message").textContent = "Setup needed: add your Supabase project URL and anon public key in config.js.";
    return;
  }
  const supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  let currentUser = null, editingId = null, uploadedImageUrl = "";
  let siteSettings = defaultSiteSettings();
  const quill = new Quill("#article-editor", { theme:"snow", modules:{ toolbar:"#editor-toolbar" }, placeholder:"Write your story here…" });

  const escapeHtml = (value="") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const setMessage = (id, msg, ok=false) => { $(id).textContent = msg; $(id).className = ok ? "message ok" : "message"; };
  const showView = (name) => {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    $("view-"+name).classList.remove("hidden");
    document.querySelectorAll("[data-view]").forEach(a => a.classList.toggle("active", a.dataset.view === name));
    $("page-heading").textContent = ({overview:"Dashboard overview",articles:"Manage articles",editor:editingId?"Edit article":"Write an article",website:"Website Builder"})[name];
    if(name==="overview" || name==="articles") loadArticles();
    if(name==="website") loadSiteSettings();
  };
  document.querySelectorAll("[data-view]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); showView(a.dataset.view); }));
  document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => showView(b.dataset.go)));
  $("new-article-top").onclick = $("new-article-list").onclick = () => resetEditor();
  $("cancel-editor").onclick = () => showView("articles");

  async function enterApp(user) {
    currentUser = user; loginScreen.classList.add("hidden"); dashboard.classList.remove("hidden");
    $("user-email").textContent = user.email || "Administrator";
    await loadArticles();
  }
  $("login-form").addEventListener("submit", async e => {
    e.preventDefault(); setMessage("login-message","Signing in…");
    const {data,error} = await supabase.auth.signInWithPassword({email:$("login-email").value.trim(),password:$("login-password").value});
    if(error) return setMessage("login-message",error.message);
    await enterApp(data.user);
  });
  $("logout-btn").onclick = async () => { await supabase.auth.signOut(); location.reload(); };

  async function loadArticles() {
    const {data,error} = await supabase.from("articles").select("*").order("created_at",{ascending:false});
    if(error){ $("recent-list").textContent = $("all-list").textContent = "Could not load articles: "+error.message; return; }
    const rows = data || [];
    $("stat-total").textContent = rows.length;
    $("stat-published").textContent = rows.filter(a=>a.status==="published").length;
    $("stat-drafts").textContent = rows.filter(a=>a.status==="draft").length;
    renderList("recent-list",rows.slice(0,5)); renderList("all-list",filterRows(rows));
  }
  function filterRows(rows) {
    const q = ($("article-search").value||"").toLowerCase(), status = $("status-filter").value;
    return rows.filter(a => (a.title||"").toLowerCase().includes(q) && (status==="all" || a.status===status));
  }
  $("article-search").addEventListener("input",loadArticles);
  $("status-filter").addEventListener("change",loadArticles);
  function renderList(target,rows) {
    const host=$(target);
    if(!rows.length){host.innerHTML='<p class="muted">No articles yet. Create your first K4N story.</p>';return;}
    host.innerHTML=rows.map(a=>`<div class="article-row"><div><h3>${escapeHtml(a.title)}</h3><div class="article-meta">${escapeHtml(a.category)} · ${new Date(a.created_at).toLocaleDateString()} · <span class="status ${escapeHtml(a.status)}">${escapeHtml(a.status)}</span></div></div><div class="row-actions"><button class="small-btn" data-edit="${escapeHtml(a.id)}">Edit</button><button class="small-btn" data-delete="${escapeHtml(a.id)}">Delete</button></div></div>`).join("");
    host.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editArticle(b.dataset.edit));
    host.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteArticle(b.dataset.delete));
  }
  function resetEditor() {
    editingId=null; uploadedImageUrl=""; $("article-form").reset(); quill.setContents([]); $("image-preview").textContent="No image selected";
    $("editor-heading").textContent="Write a new article"; $("save-article").textContent="Save article"; setMessage("save-message",""); setMessage("image-message","");
    showView("editor");
  }
  async function editArticle(id) {
    const {data,error}=await supabase.from("articles").select("*").eq("id",id).single();
    if(error){alert(error.message);return;}
    editingId=id; uploadedImageUrl=data.image_url||"";
    $("article-title").value=data.title||""; $("article-excerpt").value=data.excerpt||"";
    $("article-category").value=data.category||"National"; $("article-author").value=data.author||"";
    $("article-featured").checked=!!data.featured; $("article-status").value=data.status||"draft";
    quill.root.innerHTML=data.content_html||"";
    $("image-preview").innerHTML=uploadedImageUrl?`<img src="${escapeHtml(uploadedImageUrl)}" alt="Featured image">`:"No image selected";
    $("editor-heading").textContent="Edit article"; $("save-article").textContent="Update article"; showView("editor");
  }
  async function deleteArticle(id) {
    if(!confirm("Delete this article permanently?"))return;
    const {error}=await supabase.from("articles").delete().eq("id",id);
    if(error)alert(error.message);else loadArticles();
  }
  $("upload-image").onclick=async()=>{
    const file=$("article-image-file").files[0]; if(!file)return setMessage("image-message","Choose an image first.");
    if(file.size>5*1024*1024)return setMessage("image-message","Image must be 5 MB or smaller.");
    if(!["image/jpeg","image/png","image/webp"].includes(file.type))return setMessage("image-message","Use JPG, PNG or WebP.");
    setMessage("image-message","Uploading…");
    const ext=file.name.split(".").pop().toLowerCase(), path=`${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const {error}=await supabase.storage.from("article-images").upload(path,file,{upsert:false,contentType:file.type});
    if(error)return setMessage("image-message",error.message);
    const {data}=supabase.storage.from("article-images").getPublicUrl(path);
    uploadedImageUrl=data.publicUrl; $("image-preview").innerHTML=`<img src="${escapeHtml(uploadedImageUrl)}" alt="Featured image">`;
    setMessage("image-message","Image uploaded successfully.",true);
  };
  $("article-form").addEventListener("submit",async e=>{
    e.preventDefault(); const title=$("article-title").value.trim();
    if(!title)return setMessage("save-message","Please enter a headline.");
    const content=quill.root.innerHTML;
    if(!quill.getText().trim())return setMessage("save-message","Please write the article content.");
    const payload={title,excerpt:$("article-excerpt").value.trim(),content_html:content,category:$("article-category").value,author:$("article-author").value.trim()||"K4N News Desk",featured:$("article-featured").checked,status:$("article-status").value,image_url:uploadedImageUrl,updated_at:new Date().toISOString()};
    if(payload.status==="published"&&!payload.published_at)payload.published_at=new Date().toISOString();
    setMessage("save-message","Saving…"); $("save-article").disabled=true;
    const result=editingId?await supabase.from("articles").update(payload).eq("id",editingId):await supabase.from("articles").insert({...payload,created_by:currentUser.id});
    $("save-article").disabled=false;
    if(result.error)return setMessage("save-message",result.error.message);
    setMessage("save-message","Saved successfully.",true); await loadArticles(); setTimeout(()=>showView("articles"),700);
  });

  // WEBSITE BUILDER ----------------------------------------------------------
  function defaultSiteSettings() {
    return {
      siteName:"KaMoRaLe 4 Network",
      tagline:"ONE NATION WITH ONE CONNECTION",
      breakingText:"K4N NEWS: Connecting Micronesia, One Story at a Time.",
      headerColor:"#000000",
      backgroundColor:"#f5f5f5",
      textColor:"#111111",
      sections:[
        {id:"hero",type:"text",title:"Top Story",heading:"Welcome to KaMoRaLe 4 Network",body:"Your connection to news, stories, events and developments across Micronesia and the Pacific.",enabled:true},
        {id:"latest",type:"latest",title:"Latest News",heading:"Latest News",body:"",enabled:true},
        {id:"states",type:"states",title:"Explore the Four States",heading:"Explore the Four States",body:"",enabled:true},
        {id:"national",type:"text",title:"National & Pacific News",heading:"National & Pacific News",body:"Important developments from the FSM, the Pacific region and around the world.",enabled:true},
        {id:"about",type:"text",title:"About K4N",heading:"About K4N",body:"KaMoRaLe 4 Network (K4N) is an independent media platform dedicated to connecting communities through news, information, culture and stories from Micronesia and beyond.\\n\\nOne Nation with One Connection.",enabled:true},
        {id:"contact",type:"contact",title:"Contact Us",heading:"Contact Us",body:"Have a story, announcement or community update? Contact the K4N editorial team.",email:"",enabled:true}
      ]
    };
  }
  function normalizeSettings(raw) {
    const base=defaultSiteSettings();
    if(!raw || typeof raw!=="object") return base;
    return {...base,...raw,sections:Array.isArray(raw.sections)&&raw.sections.length?raw.sections:base.sections};
  }
  async function loadSiteSettings() {
    setMessage("site-message","Loading saved website settings…");
    const {data,error}=await supabase.from("site_settings").select("settings").eq("id","main").maybeSingle();
    if(error){setMessage("site-message","Could not load settings: "+error.message+" — run the supplied SQL setup first.");siteSettings=defaultSiteSettings();fillBuilder();return;}
    siteSettings=normalizeSettings(data?.settings);
    fillBuilder();
    setMessage("site-message",data?"Saved website settings loaded.":"Default settings loaded. Publish once to create your settings row.",true);
  }
  function fillBuilder() {
    $("site-name").value=siteSettings.siteName||"";
    $("site-tagline").value=siteSettings.tagline||"";
    $("site-breaking").value=siteSettings.breakingText||"";
    $("site-header-color").value=siteSettings.headerColor||"#000000";
    $("site-background").value=siteSettings.backgroundColor||"#f5f5f5";
    $("site-text-color").value=siteSettings.textColor||"#111111";
    renderBuilderSections(); renderSitePreview();
  }
  function readBuilderFields() {
    siteSettings.siteName=$("site-name").value.trim();
    siteSettings.tagline=$("site-tagline").value.trim();
    siteSettings.breakingText=$("site-breaking").value.trim();
    siteSettings.headerColor=$("site-header-color").value;
    siteSettings.backgroundColor=$("site-background").value;
    siteSettings.textColor=$("site-text-color").value;
  }
  function renderBuilderSections() {
    const host=$("builder-sections");
    host.innerHTML="";
    siteSettings.sections.forEach((section,index)=>{
      const item=document.createElement("article");
      item.className="builder-section"; item.draggable=true; item.dataset.index=index;
      item.innerHTML=`
        <div class="builder-section-top">
          <span class="drag-handle" title="Drag to reorder">⠿</span>
          <strong>${escapeHtml(section.title||section.heading||section.type)}</strong>
          <label class="toggle-label"><input type="checkbox" data-field="enabled" ${section.enabled!==false?"checked":""}> Visible</label>
          <button type="button" class="small-btn danger" data-remove>Remove</button>
        </div>
        <div class="builder-section-fields">
          <label>Section label<input data-field="title" maxlength="100" value="${escapeHtml(section.title||"")}"></label>
          <label>Heading<input data-field="heading" maxlength="140" value="${escapeHtml(section.heading||"")}"></label>
          <label>Text / description<textarea data-field="body" rows="3" maxlength="1200">${escapeHtml(section.body||"")}</textarea></label>
          ${section.type==="image"?`<label>Image URL<input data-field="imageUrl" type="url" placeholder="https://…" value="${escapeHtml(section.imageUrl||"")}"></label>`:""}
          ${section.type==="contact"?`<label>Contact email<input data-field="email" type="email" value="${escapeHtml(section.email||"")}"></label>`:""}
          <span class="section-type">${escapeHtml(section.type.toUpperCase())}</span>
        </div>`;
      item.querySelectorAll("[data-field]").forEach(field=>{
        const update=()=>{const key=field.dataset.field;section[key]=field.type==="checkbox"?field.checked:field.value;renderSitePreview();};
        field.addEventListener("input",update);field.addEventListener("change",update);
      });
      item.querySelector("[data-remove]").onclick=()=>{siteSettings.sections.splice(index,1);renderBuilderSections();renderSitePreview();};
      item.addEventListener("dragstart",e=>{item.classList.add("dragging");e.dataTransfer.setData("text/plain",String(index));});
      item.addEventListener("dragend",()=>item.classList.remove("dragging"));
      item.addEventListener("dragover",e=>e.preventDefault());
      item.addEventListener("drop",e=>{
        e.preventDefault();const from=Number(e.dataTransfer.getData("text/plain"));const to=index;
        if(!Number.isInteger(from)||from===to||!siteSettings.sections[from])return;
        const moved=siteSettings.sections.splice(from,1)[0];siteSettings.sections.splice(to,0,moved);
        renderBuilderSections();renderSitePreview();
      });
      host.appendChild(item);
    });
  }
  function renderSitePreview() {
    readBuilderFields();
    const host=$("site-preview");
    const sections=siteSettings.sections.filter(s=>s.enabled!==false).map(s=>{
      const title=escapeHtml(s.heading||s.title||"");
      const body=escapeHtml(s.body||"").replace(/\n/g,"<br>");
      if(s.type==="latest")return `<section class="pv-section"><h3>${title||"Latest News"}</h3><div class="pv-placeholder">Published articles will appear here.</div></section>`;
      if(s.type==="states")return `<section class="pv-section"><h3>${title||"Four FSM States"}</h3><div class="pv-states"><b>YAP</b><b>CHUUK</b><b>POHNPEI</b><b>KOSRAE</b></div></section>`;
      if(s.type==="image")return `<section class="pv-section"><h3>${title}</h3>${s.imageUrl?`<img class="pv-image" src="${escapeHtml(s.imageUrl)}" alt="">`:""}<p>${body}</p></section>`;
      if(s.type==="contact")return `<section class="pv-section"><h3>${title||"Contact Us"}</h3><p>${body}</p><small>${escapeHtml(s.email||"Email address not set")}</small></section>`;
      return `<section class="pv-section"><h3>${title}</h3><p>${body}</p></section>`;
    }).join("");
    host.innerHTML=`<div class="pv-header" style="background:${escapeHtml(siteSettings.headerColor)}"><strong>${escapeHtml(siteSettings.siteName)}</strong><small>${escapeHtml(siteSettings.tagline)}</small></div><div class="pv-breaking">${escapeHtml(siteSettings.breakingText)}</div><div class="pv-content" style="background:${escapeHtml(siteSettings.backgroundColor)};color:${escapeHtml(siteSettings.textColor)}">${sections||'<p>No visible sections. Add or enable a section.</p>'}</div><div class="pv-footer">© ${new Date().getFullYear()} ${escapeHtml(siteSettings.siteName)}</div>`;
  }
  ["site-name","site-tagline","site-breaking","site-header-color","site-background","site-text-color"].forEach(id=>{
    $(id).addEventListener("input",renderSitePreview);$(id).addEventListener("change",renderSitePreview);
  });
  $("add-section").onclick=()=>{
    const type=$("new-section-type").value;
    const defaults={
      text:{title:"New section",heading:"Your heading",body:"Add your information here."},
      announcement:{title:"Announcement",heading:"Community Announcement",body:"Share an announcement with the K4N community."},
      image:{title:"Image banner",heading:"Image Feature",body:"",imageUrl:""},
      latest:{title:"Latest News",heading:"Latest News",body:""},
      states:{title:"Explore the Four States",heading:"Explore the Four States",body:""},
      contact:{title:"Contact Us",heading:"Contact Us",body:"Send K4N your news and community updates.",email:""}
    };
    siteSettings.sections.push({id:"section-"+Date.now(),type,...defaults[type],enabled:true});
    renderBuilderSections();renderSitePreview();
  };
  $("reload-site").onclick=()=>loadSiteSettings();
  $("publish-site").onclick=async()=>{
    readBuilderFields();
    if(!siteSettings.siteName)return setMessage("site-message","Please enter a website name.");
    $("publish-site").disabled=true;setMessage("site-message","Publishing website settings…");
    const payload={id:"main",settings:siteSettings,updated_at:new Date().toISOString(),updated_by:currentUser?.id||null};
    const {error}=await supabase.from("site_settings").upsert(payload,{onConflict:"id"});
    $("publish-site").disabled=false;
    if(error)return setMessage("site-message","Publish failed: "+error.message);
    setMessage("site-message","Website settings published. Refresh your public website to see the changes.",true);
  };

  supabase.auth.getSession().then(async({data})=>{if(data.session)await enterApp(data.session.user);});
    // K4N WEBSITE BUILDER
  async function loadSiteSettings() {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      setMessage("site-settings-message", error.message);
      return;
    }

    if (data) {
      $("site-name").value = data.site_name || "KaMoRaLe 4 Network";
      $("site-tagline").value = data.site_tagline || "One Nation with One Connection";
      $("site-color").value = data.site_color || "#000000";
    }
  }

  $("save-site-settings").onclick = async () => {
    const payload = {
      id: 1,
      site_name: $("site-name").value.trim(),
      site_tagline: $("site-tagline").value.trim(),
      site_color: $("site-color").value,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("site_settings")
      .upsert(payload);

    if (error) {
      setMessage("site-settings-message", error.message);
    } else {
      setMessage("site-settings-message", "Website settings saved successfully!", true);
    }
  };

  const originalShowView = showView;
  showView = (name) => {();
    } else {
      originalShowView(name);
    }
  };
})();

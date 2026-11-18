(() => {
  const cfg = window.K4N_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const loginScreen = $("login-screen"), dashboard = $("dashboard");
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("PASTE_") || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes("PASTE_")) {
    $("login-message").textContent = "Setup needed: add your Supabase URL and anon public key in config.js.";
    return;
  }
  const supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  let currentUser = null, editingId = null, uploadedImageUrl = "";
  const quill = new Quill("#article-editor", { theme:"snow", modules:{ toolbar:"#editor-toolbar" }, placeholder:"Write your story here…" });

  const escapeHtml = (value="") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const setMessage = (id, msg, ok=false) => { $(id).textContent = msg; $(id).className = ok ? "message ok" : "message"; };
  const showView = (name) => {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    $("view-"+name).classList.remove("hidden");
    document.querySelectorAll("[data-view]").forEach(a => a.classList.toggle("active", a.dataset.view === name));
    $("page-heading").textContent = ({overview:"Dashboard overview",articles:"Manage articles",editor:editingId?"Edit article":"Write an article"})[name];
    if(name==="overview" || name==="articles") loadArticles();
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
    return rows.filter(a => a.title.toLowerCase().includes(q) && (status==="all" || a.status===status));
  }
  $("article-search").addEventListener("input",loadArticles);
  $("status-filter").addEventListener("change",loadArticles);
  function renderList(target,rows) {
    const host=$(target);
    if(!rows.length){host.innerHTML='<p class="muted">No articles yet. Create your first K4N story.</p>';return;}
    host.innerHTML=rows.map(a=>`<div class="article-row"><div><h3>${escapeHtml(a.title)}</h3><div class="article-meta">${escapeHtml(a.category)} · ${new Date(a.created_at).toLocaleDateString()} · <span class="status ${a.status}">${a.status}</span></div></div><div class="row-actions"><button class="small-btn" data-edit="${a.id}">Edit</button><button class="small-btn" data-delete="${a.id}">Delete</button></div></div>`).join("");
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
  supabase.auth.getSession().then(async({data})=>{if(data.session)await enterApp(data.session.user);});
})();

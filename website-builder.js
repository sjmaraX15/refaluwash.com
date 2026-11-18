(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const STATES = ["Yap", "Chuuk", "Pohnpei", "Kosrae"];
  const DEFAULT_SECTIONS = [
    { id: "hero", type: "hero", title: "Top Story", heading: "Welcome to KaMoRaLe 4 Network", body: "Your connection to news, stories, events and developments across Micronesia and the Pacific.", enabled: true },
    { id: "latest", type: "latest", title: "Latest News", heading: "Latest News", enabled: true },
    { id: "states", type: "states", title: "Explore the Four States", heading: "Explore the Four States", enabled: true },
    { id: "national", type: "national", title: "National & Pacific News", heading: "National & Pacific News", body: "Important developments from the FSM, the Pacific region and around the world.", enabled: true },
    { id: "about", type: "text", title: "About K4N", heading: "About K4N", body: "KaMoRaLe 4 Network (K4N) is an independent media platform dedicated to connecting communities through news, information, culture and stories from Micronesia and beyond.\n\nOne Nation with One Connection.", enabled: true },
    { id: "contact", type: "contact", title: "Contact Us", heading: "Contact Us", body: "Have a story, announcement or community update? Contact the K4N editorial team.", email: "", enabled: true }
  ];
  let sb, settings, busy = false;
  const escape = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const msg = (id, text, ok=false) => { const el=$(id); if(el){el.textContent=text;el.className=ok?"message ok":"message";} };
  function defaults(){return {siteName:"KaMoRaLe 4 Network",tagline:"ONE NATION WITH ONE CONNECTION",breakingText:"K4N NEWS: Connecting Micronesia, One Story at a Time.",headerColor:"#000000",backgroundColor:"#f5f5f5",textColor:"#111111",logoUrl:"",stateCovers:{},navLabels:{},sections:DEFAULT_SECTIONS.map(x=>({...x}))};}
  function ensurePanel(){
    const view=$("view-website-builder"), panel=view&&view.querySelector(".panel"); if(!panel||$("builder-sections"))return;
    const extra=document.createElement("div"); extra.id="builder-extra";
    extra.innerHTML=`
      <hr><h3>Header and colors</h3>
      <label>Breaking news text<input id="builder-breaking" type="text" maxlength="180"></label>
      <label>Page background color<input id="builder-bg" type="color"></label>
      <label>Page text color<input id="builder-text" type="color"></label>
      <label>Header logo (optional)<div id="builder-logo-preview" class="image-preview">Using title text</div><input id="builder-logo-file" type="file" accept="image/png,image/jpeg,image/webp"></label>
      <button class="btn btn-outline" type="button" id="builder-upload-logo">Upload logo</button><button class="btn btn-outline" type="button" id="builder-remove-logo">Use text title</button><p id="builder-logo-msg" class="message" aria-live="polite"></p>
      <hr><h3>Section layouts and content</h3><p class="hint">Use Move up/down to set the homepage order, uncheck Show to hide a section. Add your own text section with the button below.</p>
      <div id="builder-sections"></div>
      <button class="btn btn-outline" type="button" id="builder-add-section">＋ Add custom text section</button>
      <hr><h3>State cover photos</h3><p class="hint">These cover photos are separate from article images. Upload controls are available only in the signed-in admin dashboard; selected covers are displayed on the public homepage.</p>
      <div id="builder-covers" class="state-cover-admin"></div>
      <p class="hint">National articles are automatically displayed in the National &amp; Pacific section when published with the National category.</p>`;
    panel.appendChild(extra);
    $("site-name").closest("label").firstChild.textContent="Website name / title heading";
  }
  function showImage(id,url,alt){const el=$(id);if(!el)return;el.innerHTML=url?`<img src="${escape(url)}" alt="${escape(alt)}">`:"No image selected";}
  function renderEditor(){
    const host=$("builder-sections"); if(!host)return;
    host.innerHTML=settings.sections.map((s,i)=>`<article class="panel builder-section" data-index="${i}" style="margin:12px 0;padding:16px"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><strong>${escape(s.title||s.id||"Section")}</strong><label class="check-row"><input type="checkbox" data-enabled="${i}" ${s.enabled!==false?"checked":""}> Show</label><button class="btn btn-outline" type="button" data-up="${i}" ${i===0?"disabled":""}>↑ Move up</button><button class="btn btn-outline" type="button" data-down="${i}" ${i===settings.sections.length-1?"disabled":""}>↓ Move down</button>${s.custom?`<button class="btn btn-outline" type="button" data-remove="${i}">Remove section</button>`:""}</div><label>Section heading<input data-field="heading" data-index="${i}" maxlength="100" value="${escape(s.heading||s.title||"")}"></label>${s.type==="hero"||s.type==="text"||s.type==="contact"||s.type==="national"?`<label>Section text<textarea data-field="body" data-index="${i}" rows="3" maxlength="1200">${escape(s.body||"")}</textarea></label>`:""}${s.type==="contact"?`<label>Contact email<input data-field="email" data-index="${i}" type="email" value="${escape(s.email||"")}"></label>`:""}${s.custom?`<label>Section name<input data-field="title" data-index="${i}" maxlength="80" value="${escape(s.title||"")}"></label>`:""}</article>`).join("");
    host.querySelectorAll("[data-enabled]").forEach(el=>el.onchange=()=>{settings.sections[+el.dataset.enabled].enabled=el.checked;});
    host.querySelectorAll("[data-field]").forEach(el=>el.oninput=()=>{settings.sections[+el.dataset.index][el.dataset.field]=el.value;if(el.dataset.field==="title")renderEditor();});
    host.querySelectorAll("[data-up]").forEach(el=>el.onclick=()=>moveSection(+el.dataset.up,-1));
    host.querySelectorAll("[data-down]").forEach(el=>el.onclick=()=>moveSection(+el.dataset.down,1));
    host.querySelectorAll("[data-remove]").forEach(el=>el.onclick=()=>{settings.sections.splice(+el.dataset.remove,1);renderEditor();});
  }
  function moveSection(i,delta){const j=i+delta;if(j<0||j>=settings.sections.length)return;[settings.sections[i],settings.sections[j]]=[settings.sections[j],settings.sections[i]];renderEditor();}
  function renderCovers(){const host=$("builder-covers");if(!host)return;host.innerHTML=STATES.map(state=>{const key=state.toLowerCase();const url=settings.stateCovers?.[key]||"";return `<div class="panel" style="margin:10px 0;padding:14px"><h4>${state} cover photo</h4><div id="cover-preview-${key}" class="image-preview">${url?`<img src="${escape(url)}" alt="${state} cover">`:"No cover selected"}</div><input id="cover-file-${key}" type="file" accept="image/png,image/jpeg,image/webp"><button class="btn btn-outline full" type="button" data-cover="${key}">Upload ${state} cover</button><button class="btn btn-outline full" type="button" data-clear-cover="${key}">Remove ${state} cover</button><p id="cover-msg-${key}" class="message" aria-live="polite"></p></div>`;}).join("");host.querySelectorAll("[data-cover]").forEach(b=>b.onclick=()=>uploadImage($("cover-file-"+b.dataset.cover),"cover-msg-"+b.dataset.cover,url=>{settings.stateCovers[b.dataset.cover]=url;renderCovers();}));host.querySelectorAll("[data-clear-cover]").forEach(b=>b.onclick=()=>{delete settings.stateCovers[b.dataset.clearCover];renderCovers();});}
  async function uploadImage(input,messageId,onDone){const file=input?.files?.[0];if(!file)return msg(messageId,"Choose an image first.");if(file.size>5*1024*1024)return msg(messageId,"Image must be 5 MB or smaller.");if(!["image/jpeg","image/png","image/webp"].includes(file.type))return msg(messageId,"Use JPG, PNG or WebP.");msg(messageId,"Uploading…");try{const ext=file.type==="image/jpeg"?"jpg":file.type.split("/")[1];const path=`site-assets/${Date.now()}-${crypto.randomUUID()}.${ext}`;const {error}=await sb.storage.from("article-images").upload(path,file,{upsert:false,contentType:file.type});if(error)throw error;const {data}=sb.storage.from("article-images").getPublicUrl(path);onDone(data.publicUrl);msg(messageId,"Upload complete. Save website settings to publish.",true);}catch(e){msg(messageId,e.message||"Upload failed.");}}
  function bind(){
    $("builder-upload-logo").onclick=()=>uploadImage($("builder-logo-file"),"builder-logo-msg",url=>{settings.logoUrl=url;showImage("builder-logo-preview",url,"Header logo");});
    $("builder-remove-logo").onclick=()=>{settings.logoUrl="";showImage("builder-logo-preview","","Header logo");};
    $("builder-add-section").onclick=()=>{settings.sections.push({id:"custom-"+crypto.randomUUID().slice(0,8),type:"text",title:"New section",heading:"New section",body:"Add your text here.",enabled:true,custom:true});renderEditor();};
    $("save-site-settings").onclick=save;
  }
  async function load(){if(busy)return;busy=true;ensurePanel();const c=window.K4N_CONFIG||{};if(!window.supabase||!c.SUPABASE_URL||!c.SUPABASE_ANON_KEY){busy=false;return;}sb=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY);try{const {data,error}=await sb.from("site_settings").select("settings").eq("id","main").maybeSingle();if(error)throw error;settings={...defaults(),...(data?.settings||{})};if(!Array.isArray(settings.sections)||!settings.sections.length)settings.sections=defaults().sections;if(!settings.stateCovers)settings.stateCovers={};$("site-name").value=settings.siteName||"";$("site-tagline").value=settings.tagline||"";$("site-color").value=settings.headerColor||"#000000";$("builder-breaking").value=settings.breakingText||"";$("builder-bg").value=settings.backgroundColor||"#f5f5f5";$("builder-text").value=settings.textColor||"#111111";showImage("builder-logo-preview",settings.logoUrl,"Header logo");renderEditor();renderCovers();bind();msg("site-settings-message","Settings loaded.",true);}catch(e){msg("site-settings-message",e.message||"Could not load site settings.");}finally{busy=false;}}
  async function save(){if(!settings)return;settings={...settings,siteName:$("site-name").value.trim(),tagline:$("site-tagline").value.trim(),headerColor:$("site-color").value,breakingText:$("builder-breaking").value.trim(),backgroundColor:$("builder-bg").value,textColor:$("builder-text").value};msg("site-settings-message","Saving settings…");try{const {data:{user}}=await sb.auth.getUser();if(!user)throw new Error("Please sign in again to save website settings.");const {error}=await sb.from("site_settings").upsert({id:"main",settings,updated_by:user.id},{onConflict:"id"});if(error)throw error;msg("site-settings-message","Website settings saved and published.",true);}catch(e){msg("site-settings-message",e.message||"Could not save settings.");}}
  document.querySelectorAll('[data-view="website-builder"]').forEach(link=>link.addEventListener("click",()=>setTimeout(load,150)));
  document.addEventListener("DOMContentLoaded",ensurePanel);
})();

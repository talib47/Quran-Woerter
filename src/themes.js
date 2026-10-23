/* ================= Themen (Gliederung wie im Heft „80 % der Koranwörter“) ================= */
let curThemeId=null;
function renderThemes(){
  const cur=curTheme();
  $("#app").innerHTML=`<ul class="slist">${THEMES.map((t,i)=>{
    const known=t.c.filter(ci=>isKnown(CARDS[ci].id)).length, q=t.c.length?known/t.c.length:0;
    return `<li><button class="srow trow" data-t="${t.id}"><span class="no">${t.id==="suren"?"·":i+1}</span>
      <span class="nm">${mix(t.title)}<small>${mix(t.sub)}</small></span>
      <span class="pct">${t===cur&&themeLeft(t)?`<span class="now">dran</span>`:""}</span>
      <span></span><span class="mini"><i style="width:${Math.round(q*100)}%"></i></span><span class="pct">${known}/${t.c.length}</span></button></li>`; }).join("")}</ul>
    <p class="muted small">Neue Karten kommen aus dem Thema, das gerade dran ist. Ist es fertig, geht es mit dem nächsten weiter.</p>`;
  document.querySelectorAll(".trow").forEach(b=>b.onclick=()=>{ curThemeId=b.dataset.t; go("theme"); });
}
function renderTheme(){
  const t=THEMES.find(x=>x.id===curThemeId); if(!t){ go("themes"); return; }
  const isCur=curTheme()===t&&themeLeft(t)>0;
  const rows=t.c.map(ci=>{ const c=CARDS[ci], k=isKnown(c.id);
    return `<li><span class="ar">${esc(c.ar)}</span><span class="pm"><span class="dot${k?" on":""}"></span>${mix(c.de)}</span></li>`; }).join("");
  $("#app").innerHTML=`<h1 style="margin-bottom:2px">${mix(t.title)}</h1><p class="muted small" style="margin:0 0 12px">${mix(t.sub)}</p>
    ${themeLeft(t)?(isCur?`<p class="small" style="color:var(--accent);margin:0 0 12px">Gerade dran · ${themeLeft(t)} neue Karten übrig</p>`
      :`<button class="btn wide" id="setT" style="margin-bottom:12px">Als Nächstes lernen</button>`):`<p class="small muted" style="margin:0 0 12px">Alle Karten dieses Themas sind schon im Wiederholungsplan.</p>`}
    <div class="reader"><ul class="parts tlist">${rows}</ul></div>`;
  const b=$("#setT"); if(b) b.onclick=()=>{ state.th={id:t.id,t:Date.now()}; save(); toast("Neue Karten kommen jetzt aus diesem Thema"); renderTheme(); };
}

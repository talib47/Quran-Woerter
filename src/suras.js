/* ================= Suren lesen ================= */
const SURA_WORDS={};
for(const vk in DATA.verses){ const s=+vk.split(":")[0]; (SURA_WORDS[s]=SURA_WORDS[s]||[]).push(...DATA.verses[vk].w); }
const wordKnown=wi=>WORDS[wi].c.every(ci=>isKnown(CARDS[ci].id));
function suraCoverage(n){ const ws=SURA_WORDS[n]||[]; return ws.length?ws.filter(wordKnown).length/ws.length:0; }
let curSura=null, openVerses={};
function renderSuras(){
  const rows=DATA.suras.map(s=>{ const c=suraCoverage(s.n);
    return `<li><button class="srow" data-n="${s.n}"><span class="no">${s.n}</span>
      <span class="nm">${esc(s.name)}<small>${esc(s.de)} · ${s.v} Verse</small></span>
      <span class="pct"><span class="ar arn">${esc(s.ar)}</span><br>${pct0(c)}</span>
      <span class="mini"><i style="width:${Math.round(c*100)}%"></i></span></button></li>`; }).join("");
  $("#app").innerHTML=`<ul class="slist">${rows}</ul>
    <p class="muted small">Der Prozentwert zeigt, wie viele Wörter der Sure du schon vollständig kennst.</p>
    <div class="credits">Koranwörter und Formanalyse: <a href="https://corpus.quran.com">Quranic Arabic Corpus</a> (Universität Leeds, GNU GPL), korrigierte Fassung von <a href="https://github.com/mustafa0x/quran-morphology">quran-morphology</a>.
      Übersetzung: A. S. F. Bubenheim und N. Elyas (<a href="https://quranenc.com">quranenc.com</a>).
      Rezitation: Mahmoud Khalil Al-Husary (<a href="https://everyayah.com">everyayah.com</a>), Wörter einzeln: quran.com.</div>`;
  document.querySelectorAll(".srow").forEach(b=>b.onclick=()=>{ curSura=+b.dataset.n; openVerses={}; go("sura"); });
}
function renderSura(){
  const s=DATA.suras.find(x=>x.n===curSura); if(!s){ go("suras"); return; }
  let html=`<div class="shead"><h1>${esc(s.name)}</h1><span class="muted small">${pct0(suraCoverage(s.n))} bekannt</span><span class="ar" style="margin-left:auto;font-size:1.6rem;line-height:1">${esc(s.ar)}</span></div>
    <p class="muted small" style="margin:0 0 12px">Wort antippen: Bedeutung · Versnummer: Übersetzung</p><div class="reader">`;
  for(let a=1;a<=s.v;a++){
    const vk=s.n+":"+a, v=DATA.verses[vk];
    const words=v.w.map(wi=>`<span class="w${wordKnown(wi)?"":" new"}" data-w="${wi}">${esc(WORDS[wi].t)}</span>`).join(" ");
    html+=`<div class="verse"><p class="ar vline">${words} <span class="vno" data-v="${vk}">${arNum(a)}</span></p>
      ${openVerses[vk]?`<div class="vtr"><p>${esc(v.tr)}</p><button class="btn ghost sm" data-pv="${vk}">▶ Vers</button></div>`:""}</div>`;
  }
  $("#app").innerHTML=html+"</div>";
  document.querySelectorAll(".w").forEach(el=>el.onclick=()=>openWord(+el.dataset.w,el));
  document.querySelectorAll(".vno").forEach(el=>el.onclick=()=>{ const k=el.dataset.v; openVerses[k]=!openVerses[k]; renderSura(); });
  document.querySelectorAll("[data-pv]").forEach(el=>el.onclick=()=>playVerse(el.dataset.pv));
}
/* Wortblatt: Bedeutung an dieser Stelle, Formangabe, Bestandteile mit ihren Karten */
function openWord(wi,el){
  closeSheet();
  if(el) el.classList.add("sel");
  const w=WORDS[wi];
  const parts=w.c.map(ci=>{ const c=CARDS[ci], k=isKnown(c.id);
    return `<li><span class="ar">${esc(c.ar)}</span><span class="pm"><span class="dot${k?" on":""}"></span>${mix(c.de)}
      <small>${[c.k,c.r?"Wurzel "+c.r:"",`${c.f.toLocaleString("de-DE")}× im Koran`,k?"gelernt":isSeen(c.id)?"in Wiederholung":"noch nicht gelernt"].filter(Boolean).map(mix).join(" · ")}</small></span></li>`; }).join("");
  const shade=document.createElement("div"); shade.className="shade"; shade.id="shade";
  const sh=document.createElement("div"); sh.className="sheet"; sh.id="sheet"; sh.setAttribute("role","dialog");
  sh.innerHTML=`<div class="in"><div class="sgrip"></div>
    <div class="shw"><button class="btn ghost sm" id="pWs" aria-label="Wort anhören">▶</button><span class="ar">${esc(w.t)}</span></div>
    <div class="gloss">${esc(w.g)}</div>
    ${w.d?`<div class="form">${esc(w.d)}</div>`:""}
    <ul class="parts">${parts}</ul>
    <p class="ref" style="margin:10px 0 0">${w.l.split(":").slice(0,2).join(":")} · Wort ${w.l.split(":")[2]}</p></div>`;
  document.body.appendChild(shade); document.body.appendChild(sh);
  shade.onclick=closeSheet;
  $("#pWs").onclick=()=>playWord(w.l);
}
function closeSheet(){
  const a=$("#sheet"), b=$("#shade"); if(a) a.remove(); if(b) b.remove();
  document.querySelectorAll(".w.sel").forEach(x=>x.classList.remove("sel"));
}
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeSheet(); });

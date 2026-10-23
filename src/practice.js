/* ================= Karten ================= */
const CARDS=DATA.cards, WORDS=DATA.words;
const CARD_IX={}; CARDS.forEach((c,i)=>CARD_IX[c.id]=i);
const cst=id=>state.cards[id];
const isKnown=id=>{ const c=state.cards[id]; return !!c&&c.g>=2; };
const isSeen=id=>!!state.cards[id];
function dueCards(){
  const today=dayIdx();
  return CARDS.filter(c=>{ const s=cst(c.id); return s&&s.due<=today; })
    .sort((a,b)=>cst(a.id).due-cst(b.id).due||CARD_IX[a.id]-CARD_IX[b.id]);
}
const freshCards=()=>CARDS.filter(c=>!isSeen(c.id));
const knownCount=()=>CARDS.filter(c=>isKnown(c.id)).length;
function quranCoverage(){
  let n=0;
  for(const g of DATA.cov){ let ok=true; for(let i=1;i<g.length;i++){ if(!isKnown(CARDS[g[i]].id)){ ok=false; break; } } if(ok) n+=g[0]; }
  return n/DATA.total;
}
function nextDueInfo(){
  const today=dayIdx(); let min=Infinity, n=0;
  for(const c of CARDS){ const s=cst(c.id); if(s&&s.due>today){ if(s.due<min){ min=s.due; n=1; } else if(s.due===min) n++; } }
  return min===Infinity?null:{days:min-today, n};
}

/* ================= Runde =================
   Eine Runde: bis zu 20 fällige Karten, dazu neue – umso mehr, je weniger fällig ist.
   So richtet sich das Tempo von selbst danach, wie viel du übst. „Nochmal“ holt die Karte in dieser Runde wieder. */
let round=null;
function buildRound(){
  const due=dueCards().slice(0,20);
  const nNew=due.length===0?8:due.length<8?5:due.length<15?3:0;
  const fresh=freshCards().slice(0,nNew);
  if(!due.length&&!fresh.length) return null;
  const q=due.map(c=>c.id), step=fresh.length?Math.max(1,Math.floor(q.length/fresh.length)):1;
  fresh.forEach((c,i)=>q.splice(Math.min(q.length,i*(step+1)+1),0,c.id));
  return {q, i:0, flip:false, done:0, fresh:fresh.length, again:{}};
}
function startRound(){
  round=buildRound();
  if(!round){ render(); return; }
  go("round");
}
function flipCard(){
  if(!round||round.flip) return;
  round.flip=true; renderRound();
}
/* Zwei Bewertungen: gewusst (FSRS „Gut“) oder nicht gewusst („Nochmal“). Neue Karte „Kenne ich“ = „Einfach“, ohne Aufdecken. */
function grade(g){
  if(!round) return;
  const id=round.q[round.i], today=dayIdx();
  state.cards[id]=schedule(state.cards[id],g,today,true);
  const dk=dayKey(); state.days[dk]=(state.days[dk]||0)+1;
  save();
  if(g===1){ round.again[id]=(round.again[id]||0)+1; round.q.splice(Math.min(round.q.length,round.i+4),0,id); }
  round.done++; round.i++; round.flip=false; round.ex=false;
  if(round.i>=round.q.length){ view="done"; render(); }
  else { renderRound(); window.scrollTo(0,0); }
}

/* ================= Ansichten ================= */
function renderHome(){
  const due=dueCards().length, fresh=freshCards().length, today=state.days[dayKey()]||0;
  let hero;
  if(due||fresh){
    hero=`<div class="block"><div class="nums"><div><b>${due}</b><span>fällig</span></div><div><b>${fresh}</b><span>neu</span></div></div>
      <button class="btn wide" id="go">${today?"Weiter üben":"Üben"}</button></div>`;
  } else {
    const nx=nextDueInfo();
    hero=`<div class="block empty"><b>Alles erledigt.</b><p class="muted small" style="margin:6px 0 0">${nx?`Nächste Wiederholung ${nx.days===1?"morgen":"in "+nx.days+" Tagen"} (${nx.n} ${nx.n===1?"Karte":"Karten"}).`:""} Weitere Suren kommen als Nächstes dazu.</p></div>`;
  }
  $("#app").innerHTML=`${hero}
    ${today?`<p class="line">Heute: <b>${today}</b> ${today===1?"Karte":"Karten"}</p>`:""}
    <p class="line">Gelernt: <b>${knownCount()}</b> von ${CARDS.length} Karten</p>
    <p class="line">Koran: Du kennst <b>${pct(quranCoverage())}</b> aller Wörter</p>
    ${syncBox()}
    <p class="muted" style="font-size:.75rem;margin-top:18px">Stand __STAND__</p>`;
  const g=$("#go"); if(g) g.onclick=startRound;
  bindSync();
}
function verseHTML(vk,hiWord){
  return DATA.verses[vk].w.map(wi=>`<span${wi===hiWord?' class="hl"':""}>${esc(WORDS[wi].t)}</span>`).join(" ");
}
const SND_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>`;
const VERSE_SVG=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 11h16M4 16h10"/></svg>`;
function renderRound(){
  const id=round.q[round.i], c=CARDS[CARD_IX[id]], s=cst(id);
  const total=round.q.length, isNew=!s;
  const head=`<div class="prog"><div class="bar"><i style="width:${Math.round(round.i/total*100)}%"></i></div><span class="n">${round.i+1} / ${total}</span>
    <button class="icon" id="endR" aria-label="Runde beenden"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`;
  const affix=c.k==="Vorsilbe"||c.k==="Endung";
  const tag=affix?`<div class="kind">${c.k}</div>`:isNew?`<div class="kind" style="color:var(--accent)">neu</div>`:"";
  if(!round.flip){
    $("#app").innerHTML=`${head}<div class="card front" id="card"><p class="ar word">${esc(c.ar)}</p>${tag}</div>
      <div class="acts">${isNew?`<button class="btn ghost" id="known">Kenne ich</button>`:""}<button class="btn" id="flip">Aufdecken</button></div>`;
    $("#flip").onclick=flipCard;
    const k=$("#known"); if(k) k.onclick=()=>grade(4);
  } else {
    const w=WORDS[c.ex], vk=w.l.split(":").slice(0,2).join(":"), v=DATA.verses[vk];
    const meta=[c.r?`Wurzel <span class="ai">${esc(c.r)}</span>`:"", c.pr?`Gegenwart <span class="ai">${esc(c.pr)}</span>`:"", c.st?`Stamm ${c.st}`:""].filter(Boolean).join(" · ");
    $("#app").innerHTML=`${head}<div class="card back" id="card">
      <button class="icon cic r" id="pW" aria-label="Wort anhören">${SND_SVG}</button>
      <button class="icon cic l${round.ex?" on":""}" id="exT" aria-label="Vers zeigen">${VERSE_SVG}</button>
      <p class="ar word">${esc(c.ar)}</p>${affix?`<div class="kind">${c.k}</div>`:""}
      <div class="mean">${mix(c.de)}</div>
      ${meta?`<div class="meta">${meta}</div>`:""}
      ${c.no?`<div class="meta">${mix(c.no)}</div>`:""}
      ${round.ex?`<div class="ex"><p class="ar vtext">${verseHTML(vk,c.ex)}</p>
        <div class="ref">${vk} · ${esc(w.g)} <button class="link" id="pV">▶ Vers</button></div>
        ${v.tr?`<p class="tr">${esc(v.tr)}</p>`:""}</div>`:""}
      </div>
      <div class="acts"><button class="btn no" id="g1">Nicht gewusst</button><button class="btn" id="g3">Gewusst</button></div>`;
    $("#pW").onclick=e=>{ e.stopPropagation(); playWord(w.l); };
    const pv=$("#pV"); if(pv) pv.onclick=()=>playVerse(vk);
    $("#exT").onclick=e=>{ e.stopPropagation(); round.ex=!round.ex; renderRound(); };
    $("#g1").onclick=()=>grade(1); $("#g3").onclick=()=>grade(3);
  }
  bindSwipe($("#card"));
  $("#endR").onclick=()=>{ round=null; AUD.pause(); go("home"); };
}
/* Wischen: vorne in jede Richtung = aufdecken, hinten rechts = gewusst, links = nicht gewusst. Tippen dreht die Karte hin und her. */
function bindSwipe(el){
  let x0=null, y0=0, dx=0;
  el.addEventListener("touchstart",e=>{ x0=e.touches[0].clientX; y0=e.touches[0].clientY; dx=0; el.style.transition="none"; },{passive:true});
  el.addEventListener("touchmove",e=>{ if(x0===null) return; dx=e.touches[0].clientX-x0; const dy=e.touches[0].clientY-y0;
    if(Math.abs(dx)>Math.abs(dy)){ el.style.transform=`translateX(${dx*0.6}px) rotate(${dx/40}deg)`; el.dataset.sw=dx>40?"r":dx<-40?"l":""; } },{passive:true});
  el.addEventListener("touchend",()=>{ if(x0===null) return; x0=null; el.style.transition=""; el.style.transform=""; delete el.dataset.sw;
    if(Math.abs(dx)<70) return;
    if(!round.flip) flipCard(); else grade(dx>0?3:1); });
  el.addEventListener("click",e=>{ if(Math.abs(dx)>=10||e.target.closest("button")) return; round.flip=!round.flip; renderRound(); });
}
function renderDone(){
  const r=round||{done:0,fresh:0}, more=buildRound();
  $("#app").innerHTML=`<div class="block empty"><b style="font-size:1.2rem">Runde geschafft</b>
    <p class="muted" style="margin:6px 0 16px">${r.done} ${r.done===1?"Abfrage":"Abfragen"}${r.fresh?`, davon ${r.fresh} neue ${r.fresh===1?"Karte":"Karten"}`:""}.</p>
    ${more?`<button class="btn wide" id="more">Noch eine Runde</button><div style="height:10px"></div>`:""}
    <button class="btn ghost wide" id="fin">Fertig</button></div>
    <p class="line">Koran: Du kennst <b>${pct(quranCoverage())}</b> aller Wörter</p>`;
  const m=$("#more"); if(m) m.onclick=startRound;
  $("#fin").onclick=()=>{ round=null; go("home"); };
}
document.addEventListener("keydown",e=>{
  if(view!=="round"||!round||e.metaKey||e.ctrlKey||e.altKey) return;
  if(!round.flip&&(e.key===" "||e.key==="Enter")){ e.preventDefault(); flipCard(); }
  else if(round.flip&&(e.key==="ArrowRight"||e.key===" "||e.key==="2")){ e.preventDefault(); grade(3); }
  else if(round.flip&&(e.key==="ArrowLeft"||e.key==="1")){ e.preventDefault(); grade(1); }
});

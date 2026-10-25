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
/* Neue Karten kommen aus dem gewählten Thema; ist es durch, aus dem nächsten Thema in Heftreihenfolge */
const THEMES=DATA.themes;
const themeLeft=t=>t.c.filter(ci=>!isSeen(CARDS[ci].id)).length;
function curTheme(){
  const id=state.th&&state.th.id; let t=THEMES.find(x=>x.id===id);
  if(!t||!themeLeft(t)) t=THEMES.find(x=>themeLeft(x))||THEMES[0];
  return t;
}
function freshCards(){
  const t=curTheme(), pick=x=>x.c.map(ci=>CARDS[ci]).filter(c=>!isSeen(c.id));
  return pick(t).concat(...THEMES.filter(x=>x!==t).map(pick));
}
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
  return {q, i:0, flip:false, done:0, fresh:fresh.length, again:{}, hist:[]};
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
  const id=round.q[round.i], today=dayIdx(), dk=dayKey();
  (round.hist=round.hist||[]).push({i:round.i, id, card:state.cards[id]?JSON.parse(JSON.stringify(state.cards[id])):undefined, dk, day:state.days[dk], qlen:round.q.length, q:round.q.slice(), again:Object.assign({},round.again), done:round.done});
  state.cards[id]=schedule(state.cards[id],g,today,true);
  state.days[dk]=(state.days[dk]||0)+1;
  save();
  if(g===1){ round.again[id]=(round.again[id]||0)+1; round.q.splice(Math.min(round.q.length,round.i+4),0,id); }
  round.done++; round.i++; round.flip=false; round.ex=false; round.enter=true;
  if(round.i>=round.q.length){ view="done"; render(); }
  else { renderRound(); window.scrollTo(0,0); }
}

/* Eine Karte zurück: letzte Bewertung rückgängig machen, die Karte erscheint aufgedeckt zum Neubewerten */
function undoCard(){
  const h=round&&round.hist&&round.hist.pop(); if(!h) return;
  if(h.card===undefined) delete state.cards[h.id]; else state.cards[h.id]=h.card;
  if(h.day===undefined) delete state.days[h.dk]; else state.days[h.dk]=h.day;
  round.q=h.q; round.again=h.again; round.done=h.done; round.i=h.i; round.flip=true; round.ex=false; round.enter=true;
  save(); renderRound(); window.scrollTo(0,0);
}
/* ================= Ansichten ================= */
function renderHome(){
  const due=dueCards().length, fresh=freshCards().length, today=state.days[dayKey()]||0;
  let hero;
  if(due||fresh){
    hero=`<div class="block"><div class="nums"><div><b>${due}</b><span>fällig</span></div><div><b>${fresh}</b><span>neu</span></div></div>
      ${fresh?`<p class="muted small" style="margin:-6px 0 14px">Neue Karten aus: <b style="color:var(--ink)">${mix(curTheme().title)}</b></p>`:""}
      <button class="btn wide" id="go">${today?"Weiter üben":"Üben"}</button></div>`;
  } else {
    const nx=nextDueInfo();
    hero=`<div class="block empty"><b>Alles erledigt.</b><p class="muted small" style="margin:6px 0 0">${nx?`Nächste Wiederholung ${nx.days===1?"morgen":"in "+nx.days+" Tagen"} (${nx.n} ${nx.n===1?"Karte":"Karten"}).`:""} Weitere Themen kommen als Nächstes dazu.</p></div>`;
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
    ${(round.hist||[]).length?`<button class="icon undo" id="undoR" aria-label="Eine Karte zurück"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg></button>`:""}
    <button class="icon" id="endR" aria-label="Runde beenden"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`;
  const affix=c.k==="Vorsilbe"||c.k==="Endung";
  for(let k=round.i;k<Math.min(round.q.length,round.i+3);k++) prefetchWord(WORDS[CARDS[CARD_IX[round.q[k]]].ex].l);
  if(round.flip&&round.ex){ const l=WORDS[c.ex].l; prefetchVerse(l.split(":").slice(0,2).join(":")); }
  const tag=affix?`<div class="kind">${c.k}</div>`:isNew?`<div class="kind" style="color:var(--accent)">neu</div>`:"";
  if(!round.flip){
    $("#app").innerHTML=`${head}<div class="card front${round.enter?" enter":""}" id="card"><i class="tint" aria-hidden="true"></i><p class="ar word">${esc(c.ar)}</p>${tag}</div>
      <div class="acts">${isNew?`<button class="btn ghost" id="known">Kenne ich</button>`:""}<button class="btn" id="flip">Aufdecken</button></div>`;
    $("#flip").onclick=flipCard;
    const k=$("#known"); if(k) k.onclick=()=>grade(4);
  } else {
    const w=WORDS[c.ex], vk=w.l.split(":").slice(0,2).join(":"), v=DATA.verses[vk];
    const meta=[c.r?`Wurzel <span class="ai">${esc(c.r)}</span>`:"", c.pr?`Gegenwart <span class="ai">${esc(c.pr)}</span>`:"", c.st?`Stamm ${c.st}`:""].filter(Boolean).join(" · ");
    $("#app").innerHTML=`${head}<div class="card back${round.enter?" enter":""}" id="card"><i class="tint" aria-hidden="true"></i>
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
  round.enter=false;
  bindSwipe($("#card"));
  const u=$("#undoR"); if(u) u.onclick=undoCard;
  $("#endR").onclick=()=>{ round=null; AUD.pause(); go("home"); };
}
/* Wischen: vorne in jede Richtung = aufdecken, hinten rechts = gewusst, links = nicht gewusst. Tippen dreht die Karte hin und her.
   Pro Bild nur transform und opacity ändern (läuft auf dem Grafikchip), der farbige Rand blendet mit der Wischstrecke ein. */
function bindSwipe(el){
  const tint=el.querySelector(".tint"); let x0=null, y0=0, dx=0, moved=false, raf=0, w=360, dir=0;
  const paint=()=>{ raf=0; el.style.transform=`translate3d(${dx}px,0,0) rotate(${dx/45}deg)`;
    if(round.flip){ const d=dx>0?1:-1; if(d!==dir){ dir=d; tint.className="tint "+(d>0?"ok":"no"); } tint.style.opacity=Math.min(1,Math.abs(dx)/(w*.35)); } };
  el.addEventListener("touchstart",e=>{ x0=e.touches[0].clientX; y0=e.touches[0].clientY; dx=0; moved=false; w=el.offsetWidth||360; },{passive:true});
  el.addEventListener("touchmove",e=>{ if(x0===null) return; const d=e.touches[0].clientX-x0, dy=e.touches[0].clientY-y0;
    if(!moved){ if(Math.abs(d)>6&&Math.abs(d)>Math.abs(dy)){ moved=true; x0+=d>0?6:-6; el.style.transition="none"; tint.style.transition="none"; } else return; }
    e.preventDefault(); dx=e.touches[0].clientX-x0; if(!raf) raf=requestAnimationFrame(paint); },{passive:false});
  el.addEventListener("touchend",()=>{ if(x0===null) return; x0=null; if(!moved) return; if(raf){ cancelAnimationFrame(raf); raf=0; }
    const lim=Math.min(90,w*.22);
    if(Math.abs(dx)>lim&&round.flip){ const out=(dx>0?1:-1)*(window.innerWidth+100), g=dx>0?3:1;
      el.style.transition="transform .3s cubic-bezier(.2,.7,.3,1), opacity .3s ease-out"; el.style.transform=`translate3d(${out}px,0,0) rotate(${dx>0?12:-12}deg)`; el.style.opacity="0";
      setTimeout(()=>grade(g),220); return; }
    el.style.transition="transform .35s cubic-bezier(.3,1.4,.5,1)"; tint.style.transition="opacity .25s"; el.style.transform=""; tint.style.opacity="0";
    if(Math.abs(dx)>lim&&!round.flip) setTimeout(flipCard,120); });
  el.addEventListener("click",e=>{ if(moved||e.target.closest("button")) return; round.flip=!round.flip; renderRound(); });
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

"use strict";
/* ================= Speicher (eigene Schlüssel, damit nichts mit anderen Apps unter talib47.github.io kollidiert) ================= */
const KEY="qw-lernapp-v1";
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } }
function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
let state;
try{ state=JSON.parse(lsGet(KEY)||"null"); }catch(e){ state=null; }
function norm(){
  if(!state||typeof state!=="object") state={};
  state.v=1;
  if(!state.cards||typeof state.cards!=="object") state.cards={};
  if(!state.days||typeof state.days!=="object") state.days={};
  if(!state.cov||typeof state.cov!=="object") state.cov={};
}
norm();
function save(){ state.updated=Date.now(); lsSet(KEY,JSON.stringify(state)); schedulePush(); }

/* ================= Helfer ================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const AR_RE=/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿][؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿ \/]*[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]|[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
/* Text mit eingestreutem Arabisch: arabische Stellen in der Koran-Schrift */
const mix=s=>esc(s).replace(AR_RE,m=>`<span class="ai" dir="rtl">${m}</span>&lrm;`);
const p3=n=>String(n).padStart(3,"0");
const arNum=n=>String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]);
const pct=x=>(Math.round(x*1000)/10).toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1})+" %";
const pct0=x=>Math.round(x*100)+" %";
function toast(t){ const d=document.createElement("div"); d.className="toast"; d.textContent=t; document.body.appendChild(d); setTimeout(()=>d.remove(),2200); }
/* Lerntag: wechselt um 3 Uhr nachts, damit spätes Üben noch zum selben Tag zählt */
function dayIdx(ms){ const d=new Date(ms||Date.now()); return Math.floor((d.getTime()-d.getTimezoneOffset()*60000-3*36e5)/864e5); }
function dayKey(){ const d=new Date(Date.now()-3*36e5); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }

/* ================= Ton ================= */
const AUD=new Audio(); AUD.preload="auto";
/* Vorladen: Die Aufnahmen werden schon geholt, wenn eine Karte oder ein Wort erscheint, und liegen dann als
   Datei im Speicher. Ein Tipp auf ▶ spielt sofort ab statt erst zu laden. */
const AUDIO_READY={}, AUDIO_PENDING={};
function prefetchAudio(url){
  if(AUDIO_READY[url]||AUDIO_PENDING[url]) return;
  AUDIO_PENDING[url]=fetch(url).then(r=>r.ok?r.blob():Promise.reject(r.status))
    .then(b=>{ AUDIO_READY[url]=URL.createObjectURL(b); })
    .catch(()=>{ const a=new Audio(); a.preload="auto"; a.src=url; try{ a.load(); }catch(e){} });
}
function playUrls(urls,quiet){
  let i=0;
  const next=()=>{ if(i>=urls.length){ if(!quiet) toast("Ton gerade nicht verfügbar"); return; }
    const u=urls[i++]; AUD.src=AUDIO_READY[u]||u; const p=AUD.play(); if(p&&p.catch) p.catch(()=>{}); };
  AUD.onerror=next; next();
}
function wordUrls(loc){ const [s,a,w]=loc.split(":").map(Number);
  return [`https://audio.qurancdn.com/wbw/${p3(s)}_${p3(a)}_${p3(w)}.mp3`,`https://cdn.islamic.app/quran/audio-word/${s}/${a}/${w}.mp3`]; }
function verseUrls(key){ const [s,a]=key.split(":").map(Number);
  return [`https://everyayah.com/data/Husary_128kbps/${p3(s)}${p3(a)}.mp3`,`https://everyayah.com/data/Alafasy_128kbps/${p3(s)}${p3(a)}.mp3`]; }
const prefetchWord=loc=>prefetchAudio(wordUrls(loc)[0]);
const prefetchVerse=key=>prefetchAudio(verseUrls(key)[0]);
const playWord=(loc,quiet)=>playUrls(wordUrls(loc),quiet);
const playVerse=key=>playUrls(verseUrls(key));
/* ================= Geräte-Abgleich über GitHub (Datei fortschritt.json im Zweig "fortschritt") =================
   Anders als in den Uni-Apps wird pro Karte zusammengeführt: Es gilt jeweils die zuletzt bewertete Fassung einer Karte.
   So geht nichts verloren, auch wenn zwei Geräte zwischendurch ohne Abgleich geübt haben. */
const GH={repo:"https://api.github.com/repos/talib47/Quran-Woerter", file:"fortschritt.json", branch:"fortschritt", tokenKey:"qw-gh-token"};
GH.api=GH.repo+"/contents/"+GH.file;
let ghToken=null, remoteSha=null, syncStatus="aus", lastSync=null, pushTimer=null, pushing=false, pushAgain=false;
function initToken(){
  const m=location.hash.match(/[#&]t=([A-Za-z0-9_]+)/);
  if(m){ lsSet(GH.tokenKey,m[1]); try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){} }
  ghToken=lsGet(GH.tokenKey);
}
const ghHeaders=()=>({"Authorization":"Bearer "+ghToken,"Accept":"application/vnd.github+json"});
const b64enc=str=>btoa(unescape(encodeURIComponent(str)));
const b64dec=str=>decodeURIComponent(escape(atob(str.replace(/\n/g,""))));
function mergeStates(a,b){
  const out={v:1, cards:{}, days:{}, updated:Math.max(a.updated||0,b.updated||0)};
  const ac=a.cards||{}, bc=b.cards||{};
  for(const id of new Set([...Object.keys(ac),...Object.keys(bc)])){
    const x=ac[id], y=bc[id];
    out.cards[id]=!x?y:!y?x:((y.t||0)>(x.t||0)?y:x);
  }
  const ad=a.days||{}, bd=b.days||{};
  for(const d of new Set([...Object.keys(ad),...Object.keys(bd)])) out.days[d]=Math.max(ad[d]||0,bd[d]||0);
  out.cov={}; const av=a.cov||{}, bv=b.cov||{};
  for(const d of new Set([...Object.keys(av),...Object.keys(bv)])) out.cov[d]=Math.max(av[d]||0,bv[d]||0);
  if(a.th||b.th) out.th=!a.th?b.th:!b.th?a.th:((b.th.t||0)>(a.th.t||0)?b.th:a.th);
  return out;
}
async function ensureBranch(){
  const r=await fetch(GH.repo+"/git/ref/heads/"+GH.branch,{headers:ghHeaders(),cache:"no-store"});
  if(r.ok) return true;
  const base=await fetch(GH.repo,{headers:ghHeaders(),cache:"no-store"}); if(!base.ok) return false;
  const def=(await base.json()).default_branch||"main";
  const h=await fetch(GH.repo+"/git/ref/heads/"+def,{headers:ghHeaders(),cache:"no-store"}); if(!h.ok) return false;
  const sha=(await h.json()).object.sha;
  const c=await fetch(GH.repo+"/git/refs",{method:"POST",headers:ghHeaders(),body:JSON.stringify({ref:"refs/heads/"+GH.branch,sha})});
  return c.ok;
}
async function pull(){
  if(!ghToken) return null;
  const r=await fetch(GH.api+"?ref="+GH.branch+"&_="+Date.now(),{headers:ghHeaders(),cache:"no-store"});
  if(r.status===404){ remoteSha=null; return {}; }
  if(r.status===401||r.status===403){ syncStatus="schluessel"; return null; }
  if(!r.ok) throw new Error(r.status);
  const d=await r.json(); remoteSha=d.sha;
  return JSON.parse(b64dec(d.content));
}
async function push(){
  if(!ghToken) return;
  if(pushing){ pushAgain=true; return; }
  pushing=true;
  try{
    for(let attempt=0;attempt<4;attempt++){
      const body={message:"Lernstand",branch:GH.branch,content:b64enc(JSON.stringify(state))};
      if(remoteSha) body.sha=remoteSha;
      const r=await fetch(GH.api,{method:"PUT",headers:ghHeaders(),body:JSON.stringify(body)});
      if(r.ok){ const d=await r.json(); remoteSha=d.content.sha; syncStatus="ok"; lastSync=new Date(); break; }
      if(r.status===401||r.status===403){ syncStatus="schluessel"; break; }
      if(r.status===404){ if(!(await ensureBranch())){ syncStatus="fehler"; break; } continue; }
      if(r.status===409||r.status===422){ const rem=await pull(); if(rem){ state=mergeStates(state,rem); norm(); lsSet(KEY,JSON.stringify(state)); } continue; }
      syncStatus="fehler"; break;
    }
  }catch(e){ syncStatus="fehler"; }
  pushing=false;
  if(pushAgain){ pushAgain=false; push(); }
}
function schedulePush(){ if(!ghToken) return; clearTimeout(pushTimer); pushTimer=setTimeout(()=>{ pushTimer=null; push(); },1500); }
function flushPush(){ if(pushTimer){ clearTimeout(pushTimer); pushTimer=null; push(); } }
/* Holt den Stand der anderen Geräte und führt ihn mit dem eigenen zusammen. true = hier hat sich etwas geändert */
async function syncFromRemote(){
  if(!ghToken) return false;
  try{
    const remote=await pull();
    if(remote===null) return false;
    const before=JSON.stringify(state.cards), merged=mergeStates(state,remote);
    const changedHere=JSON.stringify(merged.cards)!==before;
    const remoteBehind=JSON.stringify(merged.cards)!==JSON.stringify(remote.cards||{})||JSON.stringify(merged.days)!==JSON.stringify(remote.days||{})||JSON.stringify(merged.cov)!==JSON.stringify(remote.cov||{})||JSON.stringify(merged.th||null)!==JSON.stringify(remote.th||null);
    state=merged; norm(); lsSet(KEY,JSON.stringify(state));
    if(remoteBehind) await push(); else { syncStatus="ok"; lastSync=new Date(); }
    return changedHere;
  }catch(e){ syncStatus="fehler"; }
  return false;
}
async function autoPull(){
  if(!ghToken||document.visibilityState!=="visible"||view==="round"||pushTimer||pushing) return;
  if(await syncFromRemote()) render();
}
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden") flushPush(); else autoPull(); });
window.addEventListener("pagehide",flushPush);
window.addEventListener("focus",autoPull);
setInterval(autoPull,60000);
let syncOpen=false;
function syncBox(){
  if(!ghToken){
    if(!syncOpen) return `<div class="sync">Nur auf diesem Gerät gespeichert. <button class="link" id="syOpen">Geräte verbinden</button></div>`;
    return `<div class="sync"><div>Öffne einmal deinen Verbindungslink (Adresse der App mit <code>#t=</code>Schlüssel) oder füge den Schlüssel hier ein:</div>
      <textarea id="tkIn" placeholder="github_pat_…"></textarea>
      <button class="btn sm" id="tkGo">Verbinden</button> <button class="link" id="syClose">Abbrechen</button></div>`;
  }
  const msg={ok:`Mit deinen Geräten abgeglichen${lastSync?", zuletzt um "+lastSync.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}):""}.`,
    fehler:"Abgleich gerade nicht möglich. Dein Stand bleibt hier gespeichert und wird später abgeglichen.",
    schluessel:"Der Schlüssel hat keinen Zugriff auf das Repository Quran-Woerter.",
    aus:"Wird abgeglichen …"}[syncStatus];
  return `<div class="sync"${syncStatus==="ok"||syncStatus==="aus"?"":` style="color:var(--bad)"`}>${msg} <button class="link" id="syNow">Jetzt abgleichen</button> · <button class="link" id="syOff">trennen</button></div>`;
}
function bindSync(){
  const o=$("#syOpen"); if(o) o.onclick=()=>{ syncOpen=true; render(); };
  const c=$("#syClose"); if(c) c.onclick=()=>{ syncOpen=false; render(); };
  const g=$("#tkGo");
  if(g) g.onclick=async()=>{
    const t=$("#tkIn").value.trim();
    if(!/^(github_pat_|ghp_)\w+$/.test(t)){ toast("Das sieht nicht nach einem GitHub-Schlüssel aus."); return; }
    lsSet(GH.tokenKey,t); ghToken=t; syncOpen=false; toast("Verbinde …");
    await syncFromRemote(); toast(syncStatus==="ok"?"Gerät verbunden":"Verbinden hat nicht geklappt"); render();
  };
  const n=$("#syNow"); if(n) n.onclick=async()=>{ flushPush(); await syncFromRemote(); toast(syncStatus==="ok"?"Abgeglichen":"Abgleich hat nicht geklappt"); render(); };
  const f=$("#syOff"); if(f) f.onclick=()=>{ if(!f.dataset.armed){ f.dataset.armed="1"; f.textContent="wirklich trennen?"; return; } lsDel(GH.tokenKey); ghToken=null; syncStatus="aus"; render(); };
}

/* ================= Navigation und Start ================= */
let view="home";
const TITLES={home:"Üben", round:"Üben", done:"Üben", themes:"Themen", theme:"Themen", suras:"Suren", sura:"Suren"};
function go(v){ closeSheet(); view=v; render(); window.scrollTo(0,0); }
function render(){
  $("#ttl").textContent=TITLES[view];
  $("#back").hidden=view!=="sura"&&view!=="theme";
  $("#tabs").classList.toggle("hide",view==="round");
  document.querySelectorAll("#tabs button").forEach(b=>b.classList.toggle("on",b.dataset.v===({sura:"suras",theme:"themes",round:"home",done:"home"}[view]||view)));
  ({home:renderHome, round:renderRound, done:renderDone, themes:renderThemes, theme:renderTheme, suras:renderSuras, sura:renderSura})[view]();
}
document.querySelectorAll("#tabs button").forEach(b=>b.onclick=()=>{ if(view==="round") round=null; go(b.dataset.v); });
$("#back").onclick=()=>go(view==="theme"?"themes":"suras");
initToken();
render();
if(ghToken) syncFromRemote().then(changed=>{ if(view!=="round") render(); });

/* ================= Selbst aktualisieren =================
   GitHub Pages liefert die Seite bis zu 10 Minuten aus dem Zwischenspeicher, und die Home-Bildschirm-App
   hält sie noch länger. Deshalb fragt die App beim Öffnen und beim Zurückkehren die aktuelle Fassung ab
   (am Zwischenspeicher vorbei) und lädt sich neu, wenn es eine neuere gibt. */
const BUILD="__BUILD__";
async function checkUpdate(){
  if(view==="round") return;
  try{
    const r=await fetch(location.pathname+"?check="+Date.now(),{cache:"no-store"}); if(!r.ok) return;
    const m=(await r.text()).match(/const BUILD="(\d+)"/);
    if(m&&m[1]>BUILD&&sessionStorage.getItem("qw-reload")!==m[1]){
      sessionStorage.setItem("qw-reload",m[1]); flushPush();
      location.replace(location.pathname+"?v="+m[1]);
    }
  }catch(e){}
}
checkUpdate();
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible") checkUpdate(); });

/* Offline-Modus: App-Dateien im Gerät zwischenspeichern (sw.js). Der Lernstand liegt sowieso im Gerät. */
if("serviceWorker" in navigator){ window.addEventListener("load", ()=>navigator.serviceWorker.register("sw.js").catch(()=>{})); }

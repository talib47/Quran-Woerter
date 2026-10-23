/* ================= Navigation und Start ================= */
let view="home";
const TITLES={home:"Üben", round:"Üben", done:"Üben", suras:"Suren", sura:""};
function go(v){ closeSheet(); view=v; render(); window.scrollTo(0,0); }
function render(){
  $("#ttl").textContent=view==="sura"?"Suren":TITLES[view];
  $("#back").hidden=view!=="sura";
  $("#tabs").classList.toggle("hide",view==="round");
  document.querySelectorAll("#tabs button").forEach(b=>b.classList.toggle("on",b.dataset.v===(view==="sura"?"suras":view==="round"||view==="done"?"home":view)));
  ({home:renderHome, round:renderRound, done:renderDone, suras:renderSuras, sura:renderSura})[view]();
}
document.querySelectorAll("#tabs button").forEach(b=>b.onclick=()=>{ if(view==="round") round=null; go(b.dataset.v); });
$("#back").onclick=()=>go("suras");
renderSnd();
initToken();
render();
if(ghToken) syncFromRemote().then(changed=>{ if(view!=="round") render(); });

/* ================= Wiederholungsplan: FSRS-5 (wie in Anki) =================
   Jede Karte hat eine Stabilität s (Tage, nach denen sie noch zu 90 % gewusst wird) und eine Schwierigkeit d (1–10).
   Bewertung g: 1 Nochmal, 2 Schwer, 3 Gut, 4 Einfach. Gespeichert je Karte:
   {s, d, last: Lerntag der letzten Abfrage, due: fälliger Lerntag, reps, lapses, g: letzte Bewertung, t: Zeitstempel} */
const FSRS_W=[0.40255,1.18385,3.173,15.69105,7.1949,0.5345,1.4604,0.0046,1.54575,0.1192,1.01925,1.9395,0.11,0.29605,2.2698,0.2315,2.9898,0.51655,0.6621];
const FSRS_DECAY=-0.5, FSRS_FACTOR=19/81, FSRS_RETENTION=0.9, FSRS_MAX=3650;
const fClampD=d=>Math.min(10,Math.max(1,d));
const fInitS=g=>Math.max(0.1,FSRS_W[g-1]);
const fInitD=g=>fClampD(FSRS_W[4]-Math.exp(FSRS_W[5]*(g-1))+1);
const fR=(t,s)=>Math.pow(1+FSRS_FACTOR*t/s,FSRS_DECAY);
const fIvl=s=>s/FSRS_FACTOR*(Math.pow(FSRS_RETENTION,1/FSRS_DECAY)-1);
function fNextD(d,g){ const d1=d-FSRS_W[6]*(g-3)*(10-d)/9; return fClampD(FSRS_W[7]*fInitD(4)+(1-FSRS_W[7])*d1); }
function fRecallS(d,s,r,g){
  const hard=g===2?FSRS_W[15]:1, easy=g===4?FSRS_W[16]:1;
  return s*(1+Math.exp(FSRS_W[8])*(11-d)*Math.pow(s,-FSRS_W[9])*(Math.exp((1-r)*FSRS_W[10])-1)*hard*easy);
}
function fForgetS(d,s,r){
  const sf=FSRS_W[11]*Math.pow(d,-FSRS_W[12])*(Math.pow(s+1,FSRS_W[13])-1)*Math.exp((1-r)*FSRS_W[14]);
  return Math.min(sf,s);
}
const fShortS=(s,g)=>s*Math.exp(FSRS_W[17]*(g-3+FSRS_W[18]));
/* Neuer Zustand nach Bewertung g am Lerntag today (fuzz=false für die Vorschau auf den Knöpfen) */
function schedule(c,g,today,fuzz){
  let s,d;
  if(!c||!c.reps){ s=fInitS(g); d=fInitD(g); }
  else{
    const t=today-c.last;
    if(t<=0){ s=fShortS(c.s,g); d=fNextD(c.d,g); }
    else{
      const r=fR(t,c.s);
      s=g===1?fForgetS(c.d,c.s,r):fRecallS(c.d,c.s,r,g);
      d=fNextD(c.d,g);
    }
  }
  s=Math.max(0.1,s);
  let days=0;
  if(g>1){
    days=Math.min(FSRS_MAX,Math.max(1,Math.round(fIvl(s))));
    if(fuzz&&days>=4){ const f=Math.max(1,Math.round(days*0.05)); days+=Math.round((Math.random()*2-1)*f); }
  }
  return {s, d, last:today, due:today+days, reps:(c&&c.reps||0)+1,
    lapses:(c&&c.lapses||0)+(g===1&&c&&c.reps&&c.g>1?1:0), g, t:Date.now()};
}
function ivlLabel(days){
  if(days<=0) return "gleich";
  if(days===1) return "1 Tag";
  if(days<31) return days+" Tage";
  if(days<365){ const m=Math.round(days/30.4); return m===1?"1 Monat":m+" Monate"; }
  const y=Math.round(days/36.5)/10; return String(y).replace(".",",")+" Jahre";
}

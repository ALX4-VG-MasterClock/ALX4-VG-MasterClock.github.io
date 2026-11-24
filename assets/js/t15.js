
/* ===== v5++ — chaîne vivante, avalanche, traversée, récit ===== */
const q2=id=>document.getElementById(id);
const esc2=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
async function sha256b(txt){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(txt));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
// --- A. Chaîne vivante ---
const cv={liste:[]};
function cvRendu(){
  const z=q2('cv-chaine');if(!z)return;
  if(!cv.liste.length){z.innerHTML='<p class="petite">Aucun maillon pour l\u2019instant — le premier dépendra de GENÈSE.</p>';q2('demo-etat').textContent='';return}
  z.innerHTML=cv.liste.map((e,i)=>(i?'<div class="lien-maillon">↓</div>':'')
    +'<div class="noeud"><div class="tete"><b>Maillon n° '+(i+1)+'</b><span class="petite">'+esc2(e.horo)+'</span></div>'
    +'<div>'+esc2(e.texte)+'</div>'
    +'<div class="depend">'+(i?'calculé à partir du maillon n° '+i+' — sceau précédent '+e.prev.slice(0,16)+'…':'premier maillon — sceau précédent : GENÈSE')+'</div>'
    +'<div class="mono" style="margin-top:.35rem">'+e.sceau+'</div></div>').join('');
  q2('demo-etat').innerHTML='<span class="match">'+cv.liste.length+' maillon(s)</span> — chacun dépend du précédent : touchez au premier, et tous les suivants cesseraient de se recalculer.';
}
const btnCv=q2('cv-ajouter');
if(btnCv)btnCv.addEventListener('click',async()=>{
  const inp=q2('cv-texte'),tx=inp.value.trim();if(!tx)return;inp.value='';
  const prev=cv.liste.length?cv.liste[cv.liste.length-1].sceau:'GENÈSE';
  const horo=new Date().toISOString();
  const sceau=await sha256b(prev+tx+horo);
  cv.liste.push({texte:tx,horo,sceau,prev});cvRendu();
  const noeuds=q2('cv-chaine').querySelectorAll('.noeud');const der=noeuds[noeuds.length-1];if(der)der.scrollIntoView({behavior:'smooth',block:'nearest'});
});
const btnCvR=q2('cv-reinit');if(btnCvR)btnCvR.addEventListener('click',()=>{cv.liste=[];cvRendu()});
// --- B. Effet avalanche ---
const AV_PREV='GENÈSE',AV_HORO='2026-11-01T00:00:00.000Z';
const avTexte=q2('av-texte');
if(avTexte){
  const avRefP=q2('av-reference'),avCalcP=q2('av-calc'),avVerdict=q2('av-verdict');
  let avRef='';
  async function avMaj(){
    const calc=await sha256b(AV_PREV+avTexte.value+AV_HORO);
    if(!avRef){avRef=calc;avRefP.textContent=avRef}
    let diff=0;const rendu=calc.split('').map((c,i)=>{if(c!==avRef[i]){diff++;return '<span class="diff">'+c+'</span>'}return c}).join('');
    avCalcP.innerHTML=rendu;
    avVerdict.innerHTML=(calc===avRef)
      ?'<span class="match">MATCH — le texte est intact, le sceau tient.</span>'
      :'<span class="ecart">ÉCART — le sceau ne correspond plus.</span> <span class="petite">'+diff+' des 64 caractères de l\u2019empreinte ont changé pour cette seule retouche.</span>';
  }
  avTexte.addEventListener('input',avMaj);avMaj();
}
// --- C. Traversée du registre ---
const btnTrav=q2('btn-traversee'),chronoZ=q2('registre-historique');
let travIdx=0;
function travEntrees(){return [...document.querySelectorAll('#registre-historique .entree')]}
function travAffiche(){
  const es=travEntrees();if(!es.length)return;
  travIdx=Math.max(0,Math.min(travIdx,es.length-1));
  es.forEach((e,i)=>e.classList.toggle('courante',i===travIdx));
  const id=es[travIdx].id.replace('sceau-','');
  q2('trav-compteur').textContent='Dépôt n° '+id+' — '+(travIdx+1)+' / '+es.length;
  q2('trav-prev').disabled=travIdx===0;q2('trav-suiv').disabled=travIdx===es.length-1;
  es[travIdx].scrollIntoView({behavior:'smooth',block:'center'});
}
if(btnTrav)btnTrav.addEventListener('click',()=>{
  let essais=0;const iv=setInterval(()=>{
    essais++;
    if(travEntrees().length){clearInterval(iv);
      chronoZ.classList.add('mode-traversee');
      const c=q2('trav-controles');c.style.display='inline-flex';btnTrav.style.display='none';
      travIdx=0;travAffiche();
    }else if(essais>30)clearInterval(iv);
  },250);
});
const bTP=q2('trav-prev'),bTS=q2('trav-suiv'),bTQ=q2('trav-quitter');
if(bTP)bTP.addEventListener('click',()=>{travIdx--;travAffiche()});
if(bTS)bTS.addEventListener('click',()=>{travIdx++;travAffiche()});
if(bTQ)bTQ.addEventListener('click',()=>{
  chronoZ.classList.remove('mode-traversee');
  travEntrees().forEach(e=>e.classList.remove('courante'));
  q2('trav-controles').style.display='none';btnTrav.style.display='';
});
// --- E. Chronologie : tableau / récit ---
const bTab=q2('vue-btn-tableau'),bRec=q2('vue-btn-recit'),recit=q2('chrono-recit');
function vueChrono(recitMode){
  const tab=document.querySelector('#chronologie table');
  if(tab)tab.style.display=recitMode?'none':'';
  if(recit)recit.style.display=recitMode?'block':'none';
  if(bTab)bTab.classList.toggle('actif',!recitMode);
  if(bRec)bRec.classList.toggle('actif',recitMode);
}
if(bTab)bTab.addEventListener('click',()=>vueChrono(false));
if(bRec)bRec.addEventListener('click',()=>vueChrono(true));

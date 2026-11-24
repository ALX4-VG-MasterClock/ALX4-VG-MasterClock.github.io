
/* ===== v9 — Cerveau coquillage : la chaîne qui se recalcule sous les yeux =====
   Trois maillons de démonstration, recette publique du site (sceau précédent + texte
   + horodatage). Le calcul est réel (Web Crypto, dans le navigateur) ; quand la chaîne
   est construite, elle est RECALCULÉE une seconde fois et le verdict tombe.
   Mouvement = permission : prefers-reduced-motion -> état final immédiat, sans attente. */
(function(){
  'use strict';
  var zone=document.getElementById('cc-chaine'), etat=document.getElementById('cc-etat'), btn=document.getElementById('cc-rejouer');
  if(!zone) return;
  var MAILLONS=[
    {texte:'Conversation n° 1 — une question est posée à l\u2019intelligence artificielle.',horo:'2026-11-01T10:00:00.000Z'},
    {texte:'Conversation n° 2 — la réponse devient une couche de plus, versée au dossier.',horo:'2026-11-01T10:05:00.000Z'},
    {texte:'Conversation n° 3 — l\u2019état présent porte la somme des deux précédentes.',horo:'2026-11-01T10:10:00.000Z'}
  ];
  function reduit(){return window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches}
  function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  async function sha(txt){var b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(txt));return [...new Uint8Array(b)].map(function(x){return x.toString(16).padStart(2,'0')}).join('')}
  function pause(ms){return reduit()?Promise.resolve():new Promise(function(r){setTimeout(r,ms)})}
  var enCours=false;
  async function construire(){
    if(enCours) return; enCours=true;
    zone.innerHTML=''; var prev='GENÈSE'; var sceaux=[];
    for(var i=0;i<MAILLONS.length;i++){
      var m=MAILLONS[i];
      var div=document.createElement('div');
      div.className='cc-maillon';
      div.innerHTML=(i?'<div class="cc-lien">↓ calculé à partir du maillon n° '+i+'</div>':'')
        +'<div class="tete" style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap"><b>Couche n° '+(i+1)+' — conversation</b><span class="petite">'+esc(m.horo)+'</span></div>'
        +'<div>'+esc(m.texte)+'</div>'
        +'<div class="petite">'+(i?'sceau précédent : '+esc(prev.slice(0,24))+'…':'premier maillon — sceau précédent : GENÈSE')+'</div>'
        +'<div class="mono cc-sceau" style="margin-top:.35rem">calcul en cours…</div>'
        +'<div class="petite cc-verdict"></div>';
      zone.appendChild(div);
      requestAnimationFrame(function(){div.classList.add('visible')});
      etat.textContent='Construction : couche n° '+(i+1)+' — calcul de son sceau…';
      var sceau=await sha(prev+m.texte+m.horo);
      sceaux.push(sceau);
      await pause(650);
      div.querySelector('.cc-sceau').textContent=sceau;
      div.classList.add('verrouille');
      div.querySelector('.cc-verdict').innerHTML='<span class="match">✓ verrouillé — dépend du précédent</span>';
      prev=sceau;
      await pause(350);
    }
    etat.textContent='Revérification intégrale de la chaîne de démonstration…';
    await pause(500);
    var p2='GENÈSE', ok=true;
    for(var j=0;j<MAILLONS.length;j++){var c=await sha(p2+MAILLONS[j].texte+MAILLONS[j].horo); if(c!==sceaux[j]){ok=false;break} p2=c}
    etat.innerHTML=ok
      ?'<span class="match">Verdict : MATCH</span> — 3 couches recalculées une seconde fois, chaque sceau dépend du précédent. Touchez à la première conversation, et toutes les suivantes cesseraient de se recalculer : c\u2019est la mécanique entière du cerveau coquillage, à hauteur de main.'
      :'Verdict : ÉCART — la revérification ne reproduit pas la chaîne (à signaler).';
    enCours=false;
  }
  if(btn) btn.addEventListener('click',construire);
  var lance=false;
  if('IntersectionObserver' in window){
    var obs=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting&&!lance){lance=true;construire();obs.disconnect()}})},{threshold:.25});
    obs.observe(zone);
  } else { construire(); }
})();

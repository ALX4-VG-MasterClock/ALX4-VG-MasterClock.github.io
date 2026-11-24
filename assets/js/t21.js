
/* ===== v12 — Atelier panneau 3 (analyse de la chaîne) + chronologie dorée =====
   Panneau 3 : lit le registre local du visiteur (même clé que l'outil Sceller,
   registre-vg-v2) ; si le registre est vide, une chaîne de démonstration de cinq
   maillons est calculée en direct, étiquetée comme telle. La détérioration est
   simulée sur une copie : un caractère ajouté au texte du maillon choisi, puis
   toute la suite est recalculée avec la recette publique du site
   (sceau précédent + texte + horodatage ISO complet). Le registre n'est jamais
   modifié. */
(function(){
  'use strict';
  var q=function(id){return document.getElementById(id)};
  if(!q('at-analyse'))return;
  function escH(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  async function shaH(t){var b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return [...new Uint8Array(b)].map(function(x){return x.toString(16).padStart(2,'0')}).join('')}
  var DEMO=[
    {texte:'La somme des précédents.',horodatage:'2026-11-01T12:00:00.000Z'},
    {texte:'Un sceau par pensée stabilisée.',horodatage:'2026-11-01T12:05:00.000Z'},
    {texte:'Chaque couche porte la précédente.',horodatage:'2026-11-01T12:10:00.000Z'},
    {texte:'La revérification ne demande la permission à personne.',horodatage:'2026-11-01T12:15:00.000Z'},
    {texte:'Rien ne se réécrit : tout s\u2019additionne.',horodatage:'2026-11-01T12:20:00.000Z'}
  ];
  var casse=-1, jeton=0;
  function lireRegistre(){try{return JSON.parse(localStorage.getItem('registre-vg-v2'))||[]}catch(e){return[]}}
  async function chaineDemo(){var prev='GEN\u00c8SE',out=[];for(var i=0;i<DEMO.length;i++){var s=await shaH(prev+DEMO[i].texte+DEMO[i].horodatage);out.push({texte:DEMO[i].texte,horodatage:DEMO[i].horodatage,sceau:s});prev=s}return out}
  async function rendre(){
    var monJeton=++jeton;
    var r=lireRegistre(), demo=false;
    if(!r.length){r=await chaineDemo();demo=true}
    if(monJeton!==jeton)return;
    if(casse>=r.length)casse=-1;
    q('at-source').innerHTML=demo
      ? 'Chaîne de&nbsp;<b>démonstration</b> — votre registre du panneau 1 est vide pour l\u2019instant. Scellez vos propres maillons, puis actualisez : l\u2019analyse suivra votre chaîne.'
      : 'Votre chaîne, telle que scellée au panneau 1 : <b>'+r.length+' maillon'+(r.length>1?'s':'')+'</b>. La détérioration ci-dessous est simulée sur une copie — votre registre n\u2019est jamais touché.';
    q('at-origine').innerHTML=r.map(function(e,i){return '<span class="at-bloc ok" title="sceau : '+escH(e.sceau)+'">maillon '+(i+1)+' \u2713</span>'}).join('');
    var badge=q('at-verdict-badge'), msg=q('at-message');
    if(casse<0){
      q('at-modifiee').innerHTML=r.map(function(e,i){return '<button type="button" class="at-bloc ok" data-at="'+i+'" title="Détériorer ce maillon">maillon '+(i+1)+' \u2713</button>'}).join('');
      badge.textContent='MATCH \u2713'; badge.className='at-match';
      msg.innerHTML='<div class="at-appel vert"><b>Chaîne intacte.</b> Chaque sceau se recalcule à partir du précédent, du texte et de l\u2019horodatage. Cliquez un maillon de la rangée modifiée pour le détériorer et voir la rupture tomber exactement là.</div>';
      q('at-emp-orig').textContent='—'; q('at-emp-mod').textContent='—';
    }else{
      var prev='GEN\u00c8SE', recalc=[];
      for(var i=0;i<r.length;i++){
        var t=r[i].texte+(i===casse?' \u27f5 un caractère ajouté':'');
        var s=await shaH(prev+t+r[i].horodatage); recalc.push(s); prev=s;
      }
      if(monJeton!==jeton)return;
      q('at-modifiee').innerHTML=r.map(function(e,i){
        var cls=i<casse?'ok':(i===casse?'casse':'suite');
        var sym=i<casse?'\u2713':(i===casse?'\u2717':'!');
        return '<button type="button" class="at-bloc '+cls+'" data-at="'+i+'" title="sceau consigné : '+escH(e.sceau)+'">maillon '+(i+1)+' '+sym+'</button>';
      }).join('');
      badge.textContent='RUPTURE'; badge.className='at-match rupture';
      msg.innerHTML='<div class="at-appel rouge"><b>Rupture détectée au maillon '+(casse+1)+' — le lien est rompu ici.</b> Un seul caractère ajouté à son texte : son sceau recalculé ne correspond plus au sceau consigné, et chaque maillon suivant hérite de l\u2019écart, car chacun dépend du précédent. C\u2019est l\u2019effet avalanche — le même que démontre, texte par texte, l\u2019onglet Vérifier.</div>';
      q('at-emp-orig').textContent=r[casse].sceau;
      q('at-emp-mod').textContent=recalc[casse];
    }
    q('at-modifiee').querySelectorAll('button[data-at]').forEach(function(b){
      b.addEventListener('click',function(){casse=+b.getAttribute('data-at');rendre()});
    });
  }
  q('at-actualiser').addEventListener('click',function(){rendre()});
  q('at-reparer').addEventListener('click',function(){casse=-1;rendre()});
  var bs=q('btn-sceller'); if(bs)bs.addEventListener('click',function(){setTimeout(rendre,500)});
  var bc=q('at-copier');
  if(bc)bc.addEventListener('click',function(){
    var r=lireRegistre(), etat=q('at-copie-etat');
    if(!r.length){etat.textContent='Aucun sceau à copier pour l\u2019instant — scellez un mot au panneau 1.';return}
    var s=r[r.length-1].sceau;
    function fait(){etat.textContent='Copié \u2713 — le sceau n\u00b0 '+r.length+' est dans votre presse-papiers.'}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s).then(fait,function(){etat.textContent='Copie refusée par le navigateur — le sceau est au panneau 2, en bloc.'})}
    else{etat.textContent='Copie automatique indisponible ici — le sceau est au panneau 2, en bloc.'}
  });
  rendre();
  /* --- Chronologie dorée : les cartes alimentent le détail --- */
  var det=q('hist-detail');
  if(det){
    document.querySelectorAll('.hist-carte').forEach(function(c){
      c.addEventListener('click',function(){
        document.querySelectorAll('.hist-carte').forEach(function(x){x.classList.remove('actif')});
        c.classList.add('actif');
        det.innerHTML='<p class="etiquette">'+c.querySelector('.hist-date').textContent+'</p><h3>'+escH(c.getAttribute('data-titre'))+'</h3><p>'+escH(c.getAttribute('data-detail'))+'</p>';
        det.scrollIntoView({behavior:'smooth',block:'nearest'});
      });
    });
  }
})();

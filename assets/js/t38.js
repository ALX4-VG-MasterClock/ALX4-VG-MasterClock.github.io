
/* ===== v34 — État de la chaîne en direct : les compteurs relisent assets/etat-chaine.json ===== */
(function(){
  'use strict';
  function fmt(n){return Number(n).toLocaleString('fr-CA');}
  fetch('assets/etat-chaine.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('etat-chaine illisible');return r.json();}).then(function(e){
    document.querySelectorAll('[data-chaine="maillons"]').forEach(function(el){el.textContent=fmt(e.maillons);});
    var hero=document.querySelector('.compteur .nombre[data-chaine="maillons"]');
    if(hero){hero.setAttribute('data-cible',String(e.maillons));
      setTimeout(function(){if(hero.textContent!==fmt(e.maillons))hero.textContent=fmt(e.maillons);},2600);}
    document.querySelectorAll('[data-chaine="dernier"]').forEach(function(el){el.textContent='#'+e.dernier_maillon;});
    document.querySelectorAll('[data-chaine="digest"]').forEach(function(el){el.textContent=e.digest_cumule;});
    document.querySelectorAll('[data-chaine="maj"]').forEach(function(el){
      var d=new Date(e.mis_a_jour);
      if(!isNaN(d))el.textContent=d.toLocaleString('fr-CA',{timeZone:'America/Toronto',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
    });
  }).catch(function(){/* Repli : les valeurs cuites à la construction, vérifiées, demeurent affichées. */});
})();


/* ===== v44 — Les compteurs en surface première : le pouls de l'accueil =====
   Toutes les cinq secondes, tant que l'accueil est le panneau affiché et
   que l'onglet est visible, la page relit le fichier d'état public
   (assets/etat-chaine.json) et rafraîchit les affichages de la chaîne —
   le même geste que le chargement initial (v34), répété au rythme du
   pouls. Aucune donnée du visiteur n'est lue ni envoyée : la requête ne
   sort pas du site. Si la lecture échoue, les valeurs affichées demeurent
   celles du dernier état lu, et le battement le dit (« non relu »). */
(function(){
  'use strict';
  var ligne=document.getElementById('compteurs-battement');
  if(!ligne)return;
  function fmt(n){return Number(n).toLocaleString('fr-CA');}
  function heure(){return new Date().toLocaleTimeString('fr-CA',{timeZone:'America/Toronto',hour12:false});}
  function battement(){
    var acc=document.getElementById('p-accueil');
    if(!acc||!acc.classList.contains('actif')||document.hidden)return;
    fetch('assets/etat-chaine.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('etat-chaine illisible');return r.json();}).then(function(e){
      document.querySelectorAll('[data-chaine="maillons"]').forEach(function(el){el.textContent=fmt(e.maillons);});
      document.querySelectorAll('[data-chaine="dernier"]').forEach(function(el){el.textContent='#'+e.dernier_maillon;});
      document.querySelectorAll('[data-chaine="digest"]').forEach(function(el){el.textContent=e.digest_cumule;});
      ligne.textContent=heure()+' · '+fmt(e.maillons);
    }).catch(function(){ligne.textContent=heure()+' · non relu';});
  }
  setTimeout(battement,1200);
  setInterval(battement,5000);
})();

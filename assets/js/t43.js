
/* ===== v38 — « L’interconnexion » : les compteurs de l’accueil deviennent des nœuds
   qui s’ouvrent (une seule couche à la fois, refermable, tout se replie au départ
   de l’accueil), et le parcours « Comprendre en 30 secondes » relaie le verdict
   du cerveau quand l'auto-épreuve de la page l'a calculé. Aucun appel réseau. ===== */
/* === INTERCONNEXION-FONCTIONS-PURES — début === */
function icProchainOuvert(ouvert, clique){ return ouvert === clique ? null : clique; }
function icVerdictResume(texte){
  if(!texte) return null;
  if(texte.indexOf('ÉCART') >= 0) return 'ÉCART';
  if(texte.indexOf('MATCH') >= 0) return 'MATCH';
  return null;
}
/* === INTERCONNEXION-FONCTIONS-PURES — fin === */
(function(){
  'use strict';
  var ouvert = null;
  var tuiles = Array.prototype.slice.call(document.querySelectorAll('.noeud-tuile'));
  function couche(id){ return document.getElementById('couche-' + id); }
  function icAppliquer(){
    tuiles.forEach(function(t){
      var id = t.getAttribute('data-noeud'), c = couche(id), actif = (ouvert === id);
      if(c) c.hidden = !actif;
      t.setAttribute('aria-expanded', actif ? 'true' : 'false');
      var o = t.querySelector('.ouvre');
      if(o) o.textContent = actif ? 'Refermer ↑' : 'Ce que c’est ↓';
    });
  }
  function icReplierTout(){ ouvert = null; icAppliquer(); }
  tuiles.forEach(function(t){
    t.addEventListener('click', function(){
      ouvert = icProchainOuvert(ouvert, t.getAttribute('data-noeud'));
      icAppliquer();
      if(ouvert){ var c = couche(ouvert); if(c) c.scrollIntoView({behavior:'smooth', block:'nearest'}); }
    });
  });
  var geste = document.getElementById('parcours-geste-btn');
  if(geste) geste.addEventListener('click', function(){
    if(typeof preuveEnUnGeste === 'function') preuveEnUnGeste();
  });
  /* Miroir du verdict : tant que l’accueil est le panneau actif, un battement
     par seconde cherche le verdict global que l'auto-épreuve du cerveau écrit
     dans le panneau Mémoire ; trouvé, il est relayé ici et le miroir s'arrête.
     Au départ de l’accueil : miroir arrêté, couches repliées. */
  var miroirIv = null, miroirEssais = 0;
  function icMiroir(){
    miroirEssais++;
    var v = document.getElementById('cerveau-verdict');
    var r = icVerdictResume(v ? v.textContent : '');
    var cible = document.getElementById('parcours-verdict');
    if(r && cible){
      cible.textContent = 'Le verdict du cerveau, calculé par l’auto-épreuve de cette page : ' + r + ' — le détail, chambre par chambre, se lit au panneau Mémoire.';
      icArreterMiroir();
    } else if(miroirEssais > 90){ icArreterMiroir(); }
  }
  function icDemarrerMiroir(){ if(!miroirIv){ miroirEssais = 0; miroirIv = setInterval(icMiroir, 1000); icMiroir(); } }
  function icArreterMiroir(){ if(miroirIv){ clearInterval(miroirIv); miroirIv = null; } }
  var accueil = document.getElementById('p-verifier');
  if(accueil && window.MutationObserver){
    new MutationObserver(function(){
      if(accueil.classList.contains('actif')){ icDemarrerMiroir(); }
      else { icArreterMiroir(); icReplierTout(); }
    }).observe(accueil, {attributes: true, attributeFilter: ['class']});
    if(accueil.classList.contains('actif')) icDemarrerMiroir();
  }
})();

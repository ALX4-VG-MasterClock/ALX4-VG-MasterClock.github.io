
/* ===== v25 — Le pouls du cerveau : constantes vitales relues en direct ===== */
(function(){
  var $=function(id){return document.getElementById(id)};
  var etat=$('pouls-etat');
  if(!etat)return;
  function tronque(s){return (typeof s==='string'&&s.length>16)?s.slice(0,16)+'…':s;}
  /* Peinture d'abord : la lecture en direct du pouls part après la peinture,
     à l'ouverture du panneau Mémoire (registre des initialisations différées). */
  function demarrerPouls(){
  Promise.all([
    fetch('assets/coffre.json').then(function(r){if(!r.ok)throw new Error('coffre illisible');return r.json();}),
    fetch('assets/historique.json').then(function(r){if(!r.ok)throw new Error('historique illisible');return r.json();})
  ]).then(function(res){
    var coffre=res[0],hist=res[1],liens=0;
    coffre.entrees.forEach(function(e){liens+=(e.connexions||[]).length;});
    $('pouls-digest').textContent=tronque(coffre.digest_maitre);
    $('pouls-pieces').textContent=coffre.entrees.length;
    $('pouls-connexions').textContent=liens;
    if(hist.entrees&&hist.entrees.length){
      var dernier=hist.entrees[hist.entrees.length-1];
      $('pouls-jour').textContent=dernier.date;
      $('pouls-jour-digest').textContent=tronque(dernier.digest_apres);
    }
    etat.textContent='Valeurs relues en direct depuis assets/coffre.json et assets/historique.json, à l’instant, dans votre navigateur.';
  }).catch(function(){
    etat.textContent='La lecture en direct des fichiers n’a pas abouti depuis votre navigateur ; relevé statique ci-dessus — valeurs du coffre v1 embarqué dans cette version, vérifiées à la construction.';
  });
  }
  if(window.definirInitPanneau)definirInitPanneau('memoire',demarrerPouls);else demarrerPouls();
})();

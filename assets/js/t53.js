
// v60 — demo « la derniere decision commande » (locale, rien n'est conserve)
(function(){
  var liste = document.getElementById('demo-liste');
  var bOui = document.getElementById('demo-oui');
  var bNon = document.getElementById('demo-non');
  var bReset = document.getElementById('demo-reset');
  if(!liste || !bOui || !bNon) return;
  var n = 0;
  function ajouter(choix){
    n++;
    if(n === 1) liste.innerHTML = '';
    var anciennes = liste.querySelectorAll('.decision-entree');
    anciennes.forEach(function(e){
      e.classList.remove('en-vigueur');
      var p = e.querySelector('.pastille');
      if(p){ p.textContent = 'non exécutoire'; p.classList.add('non-exec'); p.classList.remove('oui'); }
    });
    var d = document.createElement('div');
    d.className = 'decision-entree en-vigueur';
    var gauche = document.createElement('span');
    gauche.textContent = 'Décision nº ' + n + ' — ' + choix;
    var past = document.createElement('span');
    past.className = 'pastille oui';
    past.textContent = 'EN VIGUEUR';
    d.appendChild(gauche); d.appendChild(past);
    liste.appendChild(d);
  }
  bOui.addEventListener('click', function(){ ajouter('OUI'); });
  bNon.addEventListener('click', function(){ ajouter('NON'); });
  if(bReset) bReset.addEventListener('click', function(){
    n = 0;
    liste.innerHTML = '<p class="petite">Aucune décision pour le moment — la somme est à zéro.</p>';
  });
})();

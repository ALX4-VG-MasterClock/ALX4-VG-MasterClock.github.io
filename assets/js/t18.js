
/* ===== v8 — Journal des mises à jour : le site suit nos échanges =====
   Les entrées vivent dans assets/journal-mises-a-jour.json, tenu à jour par
   SoPHIa jour après jour, sans toucher au code. La section affiche d'abord le
   relevé statique intégré à cette page (l'entrée la plus récente, vérifiée à
   la construction) ; si la lecture du fichier échoue, ce relevé demeure et la
   section le dit — même règle que partout sur ce site. */
(function(){
  'use strict';
  var zone=document.getElementById('journal-liste');
  var etat=document.getElementById('journal-etat');
  var voyant=document.getElementById('journal-voyant');
  if(!zone)return;
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
  function dateLettres(iso){
    var p=String(iso||'').split('-');
    if(p.length!==3)return esc(iso);
    var d=new Date(+p[0],+p[1]-1,+p[2]);
    var s=d.toLocaleDateString('fr-CA',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    return esc(s.charAt(0).toUpperCase()+s.slice(1)).replace(/ 1 /, ' 1<sup>er</sup> ');
  }
  function rendu(entrees){
    return entrees.map(function(e){
      var pts=(e.points||[]).map(function(pt){
        var liens=(pt.liens||[]).map(function(l){
          return ' <a href="'+esc(l.url)+'" target="_blank" rel="noopener">'+esc(l.libelle)+'</a>';
        }).join(' ·');
        return '<li>'+esc(pt.texte)+liens+'</li>';
      }).join('');
      var sceau=esc(e.sceau_du_jour||'');
      if(!sceau||sceau==='—')sceau='se scelle à 23 h 59';
      var sceauHtml=/^[0-9a-f]{64}$/.test(sceau)
        ? 'Sceau du jour : <span class="mono">'+sceau+'</span>'
        : 'Sceau du jour : <b>'+sceau+'</b> — l\u2019empreinte de l\u2019état quotidien est calculée chaque soir à la clôture ; celle de ce jour paraîtra ici une fois la clôture passée.';
      return '<article class="journal-entree"><p class="journal-date">'+dateLettres(e.date)+'</p><h3>'+esc(e.titre)+'</h3><ul class="journal-points">'+pts+'</ul><p class="petite journal-sceau">'+sceauHtml+'</p></article>';
    }).join('');
  }
  fetch('assets/journal-mises-a-jour.json',{cache:'no-store'})
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
    .then(function(j){
      var entrees=(j&&j.entrees)||[];
      if(!entrees.length)throw new Error('journal vide');
      entrees=entrees.slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date))});
      zone.innerHTML=rendu(entrees);
      if(voyant)voyant.className='voyant ok';
      if(etat)etat.textContent='Journal lu à l\u2019instant depuis son fichier de données (assets/journal-mises-a-jour.json) — '+entrees.length+' entrée'+(entrees.length>1?'s':'')+', de la plus récente à la plus ancienne.';
    })
    .catch(function(){
      if(etat)etat.textContent='La lecture du fichier du journal n\u2019a pas abouti depuis votre navigateur ; le relevé statique intégré à cette page — l\u2019entrée la plus récente, vérifiée à la construction — demeure ci-dessous.';
    });
})();

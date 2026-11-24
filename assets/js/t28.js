
// ---------- v23 : Partager, bascule EN, coffre synaptique ----------
(function(){
  var partage=document.getElementById('btn-partager'),etatP=document.getElementById('partage-etat');
  if(partage){partage.addEventListener('click',function(){
    var data={title:document.title,text:'Le site-mémoire de SoPHIa — preuve d\'antériorité V-G',url:location.href.split('#')[0]};
    if(navigator.share){navigator.share(data).catch(function(){});}
    else if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(data.url).then(function(){etatP.textContent='Lien copié.';},function(){etatP.textContent='Copie refusée par le navigateur.';});}
    else{etatP.textContent='Copiez l\'adresse de la page pour la partager.';}
  });}
  var NAV_EN={accueil:'Home',temps:'Time',meteo:'Weather',methode:'Method',articles:'Articles',acces:'My information',ancrage:'Anchoring',sceller:'Seal',verifier:'Verify',application:'App',registre:'Registry',preuves:'Evidence',capsules:'Capsules',parcours:'Journey',chercheur:'Researcher',droits:'Rights',recherche:'Search',instance:'Sovereign Instance',memoire:'Memory'};
  var boutonL=document.getElementById('btn-langue'),anglais=false;
  if(boutonL){boutonL.addEventListener('click',function(){
    anglais=!anglais;
    document.querySelectorAll('#onglets button').forEach(function(b){
      var cle=b.dataset.panneau;if(!cle)return;
      if(anglais){if(!b.dataset.fr)b.dataset.fr=b.textContent;if(NAV_EN[cle])b.textContent=NAV_EN[cle];}
      else if(b.dataset.fr){b.textContent=b.dataset.fr;}
    });
    document.querySelectorAll('[data-en]').forEach(function(el){
      if(el.closest&&el.closest('#onglets'))return;
      if(anglais){if(!el.dataset.frTxt)el.dataset.frTxt=el.textContent;el.textContent=el.dataset.en;}
      else if(el.dataset.frTxt){el.textContent=el.dataset.frTxt;}
    });
    boutonL.textContent=anglais?'FR':'EN · menus';
  });}
  function sha256hex(txt){
    return crypto.subtle.digest('SHA-256',new TextEncoder().encode(txt)).then(function(buf){
      return Array.from(new Uint8Array(buf)).map(function(x){return x.toString(16).padStart(2,'0');}).join('');
    });
  }
  var boutonC=document.getElementById('coffre-reverifier'),etatC=document.getElementById('coffre-etat');
  if(boutonC){boutonC.addEventListener('click',function(){
    etatC.textContent='Recalcul en cours…';
    fetch('assets/coffre.json').then(function(r){return r.json();}).then(function(coffre){
      var d=sha256hex(coffre.genese);
      coffre.entrees.forEach(function(e){d=d.then(function(dig){return sha256hex(dig+e.sha256);});});
      return d.then(function(final){return {final:final,maitre:coffre.digest_maitre,n:coffre.entrees.length};});
    }).then(function(res){
      etatC.textContent=(res.final===res.maitre)?('MATCH — la chaîne du coffre est intacte : '+res.n+' entrées recalculées dans votre navigateur, digest maître retrouvé.'):('ÉCART — le digest recalculé ne correspond pas au digest maître publié.');
    }).catch(function(){etatC.textContent='Le coffre tenu à jour n\'a pas pu être lu ici ; le relevé statique ci-dessous reste la référence vérifiée à la construction.';});
  });}
})();

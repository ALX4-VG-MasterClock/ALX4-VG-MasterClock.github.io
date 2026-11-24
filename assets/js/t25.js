
// ---------- v19 — Onglet Application : installation (PWA) et travailleur de service ----------
(function(){
  var etat=document.getElementById('app-etat');
  var ligneBtn=document.getElementById('app-bouton-ligne');
  var btn=document.getElementById('app-installer');
  var ios=document.getElementById('app-etapes-ios');
  var and=document.getElementById('app-etapes-android');
  function installee(){
    return (window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;
  }
  var estIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  var inviteDifferee=null;
  window.addEventListener('beforeinstallprompt',function(e){
    e.preventDefault();
    inviteDifferee=e;
    if(installee())return;
    if(etat)etat.textContent='Votre navigateur peut installer ce site comme une application :';
    if(ligneBtn)ligneBtn.hidden=false;
    if(ios)ios.hidden=true;
    if(and)and.hidden=true;
  });
  if(btn)btn.addEventListener('click',function(){
    if(!inviteDifferee)return;
    inviteDifferee.prompt();
    inviteDifferee.userChoice.then(function(choix){
      if(choix&&choix.outcome==='accepted'){
        if(etat)etat.textContent='Installation acceptée — l’icône de SoPHIa paraît sur votre écran d’accueil.';
        if(ligneBtn)ligneBtn.hidden=true;
      }else{
        if(etat)etat.textContent='Installation reportée — le bouton reste disponible ici, et la marche manuelle est ci-dessous.';
        if(and)and.hidden=false;
      }
      inviteDifferee=null;
    });
  });
  window.addEventListener('appinstalled',function(){
    if(etat)etat.textContent='Vous utilisez la version application. Elle ouvre désormais depuis votre écran d’accueil.';
    if(ligneBtn)ligneBtn.hidden=true;
    if(ios)ios.hidden=true;
    if(and)and.hidden=true;
  });
  if(installee()){
    if(etat)etat.textContent='Vous utilisez déjà la version application.';
    if(ligneBtn)ligneBtn.hidden=true;
  }else if(estIOS){
    if(etat)etat.textContent='Sur cet appareil, l’installation se fait par le geste Partager de Safari :';
    if(ios)ios.hidden=false;
  }else{
    if(etat)etat.textContent='Si votre navigateur propose l’installation, son bouton paraît ici même ; sinon, la marche manuelle :';
    if(and)and.hidden=false;
  }
  // Enregistrement du travailleur de service : contexte sécurisé seulement,
  // échec silencieux et sans conséquence si le navigateur refuse — le site
  // reste entier, simplement sans le hors ligne.
  if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
    window.addEventListener('load',function(){
      navigator.serviceWorker.register('sw.js').catch(function(){});
    });
  }
})();

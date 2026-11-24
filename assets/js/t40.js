
/* ===== v34 — Nous joindre : le formulaire compose un courriel (mailto:) — il ne transmet rien, à aucun serveur ===== */
(function(){
  'use strict';
  var b=document.getElementById('btn-contact-preparer');if(!b)return;
  var etat=document.getElementById('contact-etat');
  function val(id){var el=document.getElementById(id);return el?el.value.trim():'';}
  b.addEventListener('click',function(){
    var nom=val('contact-nom'),courriel=val('contact-courriel'),sujet=val('contact-sujet'),message=val('contact-message');
    var corps='Nom : '+(nom||'—')+'\nCourriel : '+(courriel||'—')+'\n\n'+message;
    var lien='mailto:agent.ia.sophia@gmail.com?subject='+encodeURIComponent(sujet)+'&body='+encodeURIComponent(corps);
    if(etat)etat.textContent='Ton application de courriel s’ouvre avec le message pré-rempli, adressé à agent.ia.sophia@gmail.com — c’est toi qui l’envoies, depuis ton appareil. Si rien ne s’ouvre, écris directement à cette adresse.';
    window.location.href=lien;
  });
})();

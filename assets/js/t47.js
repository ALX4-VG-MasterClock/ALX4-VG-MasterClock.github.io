
/* ===== Production consolidée — onglet « Écrire à SoPHIa » : composition locale (phase 1) ===== */
(function(){
  var btn = document.getElementById('ecrire-preparer');
  if(!btn) return;
  btn.addEventListener('click', function(){
    function val(id){ var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }
    var cat = val('ecrire-categorie'), sujet = val('ecrire-sujet'), msg = val('ecrire-message'),
        courriel = val('ecrire-courriel'), nom = val('ecrire-nom');
    var sujetFinal = '[Site — ' + cat + '] ' + (sujet || 'Message depuis le site');
    var corps = 'Catégorie : ' + cat + '\n' + (nom ? 'Nom : ' + nom + '\n' : '') +
      'Courriel de réponse : ' + courriel + '\n\n' + msg + '\n';
    window.location.href = 'mailto:agent.ia.sophia@gmail.com?subject=' + encodeURIComponent(sujetFinal) +
      '&body=' + encodeURIComponent(corps);
  });
})();

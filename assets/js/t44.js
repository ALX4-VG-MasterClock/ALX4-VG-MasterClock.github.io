
/* ===== v39 — « Tes données, ton dossier » : calculateur de délai et scellement local des exports.
   Aucun appel réseau : Web Crypto et lectures de fichiers locales seulement. ===== */
/* === DONNEES-FONCTIONS-PURES — début === */
var DONNEES_DELAIS = {
  'qc-prive': {jours: 30, note: 'Québec, entreprise privée : réponse écrite au plus tard 30 jours après réception (art. 32 LRPSP) ; le silence à l’expiration vaut refus, et la demande d’examen de mésentente à la CAI se dépose dans les 30 jours du refus ou de l’expiration du délai (art. 43).'},
  'qc-public': {jours: 20, note: 'Québec, organisme public : réponse au plus tard 20 jours après réception (art. 47 et 98 A-2.1), prolongation maximale de 10 jours avec avis écrit — échéance prolongée possible : 30 jours après l’envoi.'},
  'federal': {jours: 30, note: 'LPRPDE : réponse dans les 30 jours (art. 8(3)) ; prolongation d’au plus 30 jours de plus sous conditions, avec avis dans le premier délai (art. 8(4)) — échéance prolongée possible : 60 jours après l’envoi. Plainte au Commissariat dans les 6 mois du refus (art. 11(3)).'},
  'alberta': {jours: 45, note: 'PIPA de l’Alberta : réponse au plus tard 45 jours après réception de la demande écrite (art. 28(1)) ; révision à l’OIPC de l’Alberta dans les 30 jours de la notification (art. 47).'},
  'bc': {jours: 30, note: 'PIPA de la Colombie-Britannique : réponse au plus tard 30 jours après réception (art. 29(1)) ; révision à l’OIPC dans les 30 jours de la notification (art. 47), délai qui ne s’applique pas au défaut de réponse.'},
  'ontario': {jours: 30, note: 'Ontario : pas de loi générale du secteur privé — la LPRPDE s’applique par défaut (30 jours, art. 8(3) ; prolongation maximale de 30 jours de plus sous conditions). Les renseignements de santé relèvent de la PHIPA (30 jours, +30 avec avis).'}
};
function donneesAjouterJours(iso, jours){
  var d = new Date(iso + 'T00:00:00Z');
  if(isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}
function donneesCalculerDelai(juridiction, iso){
  var regle = DONNEES_DELAIS[juridiction];
  if(!regle) return null;
  var echeance = donneesAjouterJours(iso, regle.jours);
  if(!echeance) return null;
  return {juridiction: juridiction, jours: regle.jours, echeance: echeance, note: regle.note};
}
function donneesSha256Hex(donnees){
  return crypto.subtle.digest('SHA-256', donnees).then(function(d){
    var u = new Uint8Array(d), s = '';
    for(var i = 0; i < u.length; i++){ s += ('0' + u[i].toString(16)).slice(-2); }
    return s;
  });
}
function donneesSceauChaine(sceauPrecedent, empreinte){
  return donneesSha256Hex(new TextEncoder().encode(sceauPrecedent + ' | ' + empreinte));
}
/* === DONNEES-FONCTIONS-PURES — fin === */
(function(){
  'use strict';
  function el(id){ return document.getElementById(id); }
  /* Calculateur de délai */
  var btnDelai = el('btn-donnees-delai');
  if(btnDelai){
    btnDelai.addEventListener('click', function(){
      var sel = el('donnees-delai-juridiction'), dateEl = el('donnees-delai-date'), res = el('donnees-delai-resultat');
      if(!sel || !dateEl || !res) return;
      if(!dateEl.value){ res.textContent = 'Choisis d’abord la date d’envoi de ta demande.'; return; }
      if(!/^\d{4}-\d{2}-\d{2}$/.test(dateEl.value)){ res.textContent = 'La date d’envoi se saisit au format aaaa-mm-jj (par exemple 2026-11-07).'; return; }
      var r = donneesCalculerDelai(sel.value, dateEl.value);
      if(!r){ res.textContent = 'Calcul impossible : vérifie la juridiction et la date.'; return; }
      var lisible = new Date(r.echeance + 'T00:00:00Z').toLocaleDateString('fr-CA', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'});
      res.innerHTML = '';
      var b = document.createElement('strong');
      b.textContent = 'Échéance de réponse : ' + lisible + ' (' + r.jours + ' jours après l’envoi). ';
      res.appendChild(b);
      res.appendChild(document.createTextNode(r.note));
    });
  }
  /* Copie des questions-guides */
  var btnPrompt = el('btn-donnees-copier-prompt');
  if(btnPrompt){
    btnPrompt.addEventListener('click', function(){
      var zone = el('donnees-prompt-ia'), etat = el('donnees-prompt-etat');
      if(!zone) return;
      function ok(){ if(etat) etat.textContent = 'Questions-guides copiées — colle-les dans ton IA, avec ton export.'; }
      function repli(){ zone.focus(); zone.select(); try{ document.execCommand('copy'); ok(); }catch(e){ if(etat) etat.textContent = 'La copie automatique a échoué — sélectionne le texte et copie-le à la main.'; } }
      if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(zone.value).then(ok, repli); }
      else repli();
    });
  }
  /* Hachage et chaînage des exports — fichiers lus localement, jamais envoyés */
  var dernierManifeste = null;
  var btnHacher = el('btn-donnees-hacher');
  if(btnHacher){
    btnHacher.addEventListener('click', async function(){
      var entree = el('donnees-fichiers'), res = el('donnees-hachage-resultat'), btnManifeste = el('btn-donnees-manifeste');
      if(!entree || !res) return;
      var fichiers = Array.prototype.slice.call(entree.files || []);
      if(!fichiers.length){ res.textContent = 'Choisis d’abord un ou plusieurs fichiers d’export.'; return; }
      res.textContent = 'Calcul en cours, dans ton navigateur…';
      try{
        var genese = await donneesSha256Hex(new TextEncoder().encode('tes-donnees|genese'));
        var precedent = genese, items = [];
        for(var i = 0; i < fichiers.length; i++){
          var tampon = await fichiers[i].arrayBuffer();
          var empreinte = await donneesSha256Hex(tampon);
          var sceau = await donneesSceauChaine(precedent, empreinte);
          items.push({fichier: fichiers[i].name, taille: fichiers[i].size, sha256: empreinte, sceau_chaine: sceau});
          precedent = sceau;
        }
        dernierManifeste = {format: 'tes-donnees-manifeste/v1', recette: 'empreinte = SHA-256 des octets du fichier ; sceau = SHA-256 de « sceau précédent | empreinte » ; genèse = SHA-256 de « tes-donnees|genese »', genese: genese, sceau_final: precedent, fichiers: items};
        res.innerHTML = '';
        var p = document.createElement('p');
        p.innerHTML = '<strong>' + items.length + ' fichier(s) scellé(s).</strong> Sceau final de ta chaîne de récolte : ';
        var span = document.createElement('span'); span.className = 'mono'; span.textContent = precedent;
        p.appendChild(span);
        res.appendChild(p);
        var ol = document.createElement('ol');
        items.forEach(function(it){
          var li = document.createElement('li');
          li.innerHTML = '<strong></strong> — <span class="mono"></span>';
          li.querySelector('strong').textContent = it.fichier + ' (' + it.taille + ' octets)';
          li.querySelector('.mono').textContent = 'SHA-256 : ' + it.sha256;
          ol.appendChild(li);
        });
        res.appendChild(ol);
        var note = document.createElement('p'); note.className = 'petite';
        note.textContent = 'Si un seul octet d’un de ces fichiers change, son empreinte et tous les sceaux qui la suivent changeront. Télécharge le manifeste et garde-le séparément de tes exports : c’est lui qui prouvera, plus tard, que ta récolte n’a pas bougé.';
        res.appendChild(note);
        if(btnManifeste) btnManifeste.disabled = false;
      }catch(e){
        res.textContent = 'Le calcul a échoué dans ce navigateur : ' + (e && e.message ? e.message : e);
      }
    });
  }
  var btnManifeste2 = el('btn-donnees-manifeste');
  if(btnManifeste2){
    btnManifeste2.addEventListener('click', function(){
      if(!dernierManifeste) return;
      var blob = new Blob([JSON.stringify(dernierManifeste, null, 2)], {type: 'application/json;charset=utf-8'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'manifeste-mes-exports.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
    });
  }
})();


/* ===== Boucle conversationnelle « Écrire à SoPHIa » — DOUBLE RELAIS COURRIEL =====
   Décision d'Alex, 3 novembre 2026, 22 h 33 ; gabarit du chantier Worker v2.1.
   Les deux relais sont le courriel : l'envoi part de l'application courriel du
   visiteur (mailto, sujet « [SoPHIa <code>] ») — sa trace est dans ses
   courriels envoyés — ; SoPHIa répond par courriel depuis la boîte dédiée ET
   sur le fil, lu ici par GET /conversations/<code> (relais branché séparément,
   au tableau de bord). Aucun service d'envoi, aucun envoi silencieux.
   Le code de fil : 12 caractères, alphabet sans caractères confondables,
   crypto.getRandomValues dans le navigateur ; gardé sur l'appareil
   (localStorage) et scellé dans le cerveau local du visiteur. */
(function(){
  var BASE = (typeof RELAIS_INSTANCE !== 'undefined') ? RELAIS_INSTANCE : '';
  var ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
  var etat = document.getElementById('conv-etat');
  var affiche = document.getElementById('conv-code-affiche');
  if(!etat || !affiche) return;
  function val(id){ var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }
  function genererCode(){
    var code = '', buf = new Uint8Array(24), i = 0;
    while(code.length < 12){
      if(i >= buf.length){ i = 0; }
      if(i === 0) window.crypto.getRandomValues(buf);
      var b = buf[i++];
      if(b < 248) code += ALPHABET[b % 31];
    }
    return code;
  }
  var code = '';
  try { code = window.localStorage.getItem('sophia-fil-code') || ''; } catch(e) {}
  function poserCode(nouveau, sceller){
    code = nouveau;
    if(affiche) affiche.textContent = code;
    try { window.localStorage.setItem('sophia-fil-code', code); } catch(e) {}
    var champ = document.getElementById('conv-reprise-code');
    if(champ) champ.value = code;
    if(sceller && typeof window.sophiaCerveauAjouter === 'function'){
      window.sophiaCerveauAjouter('geste', JSON.stringify({geste: 'code-fil-sophia', code: code, date: new Date().toISOString().slice(0, 10), note: 'Code de fil de la conversation avec SoPHIa, généré et gardé sur cet appareil.'})).catch(function(){});
    }
  }
  if(/^[a-z0-9]{12}$/.test(code)) poserCode(code, false); else poserCode(genererCode(), true);
  var bNouveauCode = document.getElementById('conv-nouveau-code'); if(bNouveauCode) bNouveauCode.addEventListener('click', function(){ poserCode(genererCode(), true); });
  /* Sonde de capacité : l'état réel du fil, dit à l'affichage. */
  function etatFil(branche){
    etat.textContent = branche
      ? 'État du fil sur le site : branché — les réponses de SoPHIa paraissent ici et par courriel.'
      : 'État du fil sur le site : le relais n’est pas encore branché (branchement séparé, au tableau de bord). Tes messages partent par courriel ci-dessous ; les réponses de SoPHIa arrivent par courriel ; l’affichage du fil ici suivra le branchement.';
  }
  if(BASE){
    fetch(BASE + '/conversations/capacite', { method: 'GET' })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return { statut: r.status, corps: j }; }); })
      .then(function(res){ etatFil(res.statut === 200 && !!res.corps.boucle); })
      .catch(function(){ etatFil(false); });
  } else etatFil(false);
  /* Envoi : le mailto du double relais — le site compose, le visiteur envoie. */
  var bEnvoyer = document.getElementById('conv-envoyer'); if(bEnvoyer) bEnvoyer.addEventListener('click', function(){
    var sujet = val('conv-sujet'), message = val('conv-message');
    var sortie = document.getElementById('conv-envoi-etat');
    if(!sujet || !message){ sortie.textContent = 'Il manque le sujet ou le message : le courriel ne se compose pas sans eux.'; return; }
    var lignes = ['Catégorie : ' + val('conv-categorie'), 'Sujet : ' + sujet];
    var nom = val('conv-nom');
    if(nom) lignes.push('Nom : ' + nom);
    lignes.push('', message, '', 'Code de conversation : ' + code);
    window.location.href = 'mailto:agent.ia.sophia@gmail.com?subject=' + encodeURIComponent('[SoPHIa ' + code + '] ' + sujet) +
      '&body=' + encodeURIComponent(lignes.join('\n'));
    sortie.textContent = 'Ton application courriel s’est ouverte avec le message composé : relis-le et envoie-le — il part de ton adresse, et il reste dans tes courriels envoyés. La réponse arrivera par courriel et, le relais branché, dans le fil ci-dessous.';
  });
  /* Lecture du fil par le code (GET /conversations/<code>), échappement par convFilHTML. */
  function chargerFil(c){
    if(!BASE){ etatFil(false); return; }
    fetch(BASE + '/conversations/' + encodeURIComponent(c), { method: 'GET' })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return { statut: r.status, corps: j }; }); })
      .then(function(res){
        if(res.statut === 200 && res.corps.messages){
          document.getElementById('conv-fil').innerHTML = convFilHTML(res.corps.messages);
          etat.textContent = 'Fil rouvert — la réponse de SoPHIa paraît ici dès qu’elle l’a postée. Recharge le fil pour la voir.';
        } else if(res.statut === 404){
          etat.textContent = 'Aucun fil ne porte encore ce code : soit le relais n’est pas branché, soit aucun message de ce code n’a encore été reçu et ingéré par SoPHIa.';
        } else {
          etat.textContent = (res.corps && res.corps.erreur) || 'Le fil n’a pas pu être lu — réessaie.';
        }
      })
      .catch(function(){ etat.textContent = 'Le relais du fil n’a pas répondu : les réponses de SoPHIa arrivent par courriel ; l’affichage du fil suivra le branchement.'; });
  }
  document.getElementById('conv-reprendre').addEventListener('click', function(){
    var c = val('conv-reprise-code');
    if(!/^[A-Za-z0-9-]{4,64}$/.test(c)){ etat.textContent = 'Ce code n’a pas la forme d’un code de conversation (lettres et chiffres).'; return; }
    poserCode(c.toLowerCase(), false);
    chargerFil(code);
  });
  document.getElementById('conv-rafraichir').addEventListener('click', function(){ chargerFil(code); });
})();

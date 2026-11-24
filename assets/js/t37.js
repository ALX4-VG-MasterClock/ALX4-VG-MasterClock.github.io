
// ---------- v33 — Mémoire verrouillée : déverrouillage local du paquet chiffré ----------
// La zone lit assets/coffre-prive.json (même origine). Absent (404) : la zone
// garde son état « en attente », sans erreur visible. Présent : les entrées
// publiques (titre, résumé, empreinte du clair) s'affichent, et la phrase
// saisie — jamais conservée, jamais envoyée — dérive la clé par PBKDF2
// (paramètres du paquet) et déchiffre chaque entrée en AES-256-GCM (IV par
// entrée, entrees[].iv_b64), revérifiée par l'empreinte SHA-256 de son
// clair : MATCH → texte affiché ; ÉCART ou ÉCHEC → texte retenu, verdict dit.
const ZPDeverrouillage = (() => {
  const TE = new TextEncoder();
  const TD = new TextDecoder();
  function depuisB64(s){
    const bin = atob(s);
    const b = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  }
  async function sha256Hex(texte){
    const d = await globalThis.crypto.subtle.digest('SHA-256', TE.encode(texte));
    return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  async function deriverCle(phrase, sel, iterations){
    const base = await globalThis.crypto.subtle.importKey('raw', TE.encode(phrase), 'PBKDF2', false, ['deriveKey']);
    return globalThis.crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations: iterations },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  }
  async function deverrouillerPaquet(paquet, phrase){
    if (typeof phrase !== 'string' || phrase.length === 0)
      throw new Error('La phrase secrète est vide : déverrouillage refusé.');
    if (!paquet || typeof paquet !== 'object')
      throw new Error('Paquet illisible : ce n’est pas un objet JSON.');
    if (paquet.format !== 'memoire-verrouillee/v1')
      throw new Error('Format inattendu : ce fichier n’est pas un paquet memoire-verrouillee/v1.');
    if (!paquet.kdf || paquet.kdf.algo !== 'PBKDF2' || paquet.kdf.hash !== 'SHA-256' ||
        typeof paquet.kdf.iterations !== 'number' || paquet.kdf.iterations < 1 ||
        paquet.kdf.iterations > 10000000 || typeof paquet.kdf.sel_b64 !== 'string')
      throw new Error('Paramètres de dérivation (kdf) absents ou inattendus dans le paquet.');
    if (!paquet.chiffre || paquet.chiffre.algo !== 'AES-256-GCM')
      throw new Error('Algorithme de chiffrement absent ou inattendu dans le paquet (AES-256-GCM attendu).');
    if (!Array.isArray(paquet.entrees) || paquet.entrees.length === 0)
      throw new Error('Le paquet ne contient aucune entrée.');
    const cle = await deriverCle(phrase, depuisB64(paquet.kdf.sel_b64), paquet.kdf.iterations);
    const resultats = [];
    for (const e of paquet.entrees){
      const base = {
        id: e && typeof e.id === 'string' ? e.id : '(sans identifiant)',
        titre_public: e && typeof e.titre_public === 'string' ? e.titre_public : '',
        verdict: 'ECHEC',
        texte: null
      };
      try {
        if (!e || typeof e.iv_b64 !== 'string' || typeof e.texte_chiffre_b64 !== 'string')
          throw new Error('entrée incomplète (iv ou texte chiffré manquant)');
        const clairBrut = await globalThis.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: depuisB64(e.iv_b64) }, cle, depuisB64(e.texte_chiffre_b64));
        const texte = TD.decode(clairBrut);
        const emp = await sha256Hex(texte);
        if (e.empreinte_clair_sha256 && emp === e.empreinte_clair_sha256){
          base.verdict = 'MATCH';
          base.texte = texte;
        } else {
          base.verdict = 'ECART';
        }
      } catch (err) {
        base.verdict = 'ECHEC';
      }
      resultats.push(base);
    }
    return { cree_le: typeof paquet.cree_le === 'string' ? paquet.cree_le : '', resultats: resultats };
  }
  return { sha256Hex: sha256Hex, depuisB64: depuisB64, deverrouillerPaquet: deverrouillerPaquet };
})();
if (typeof module !== 'undefined' && module.exports) { module.exports = ZPDeverrouillage; }
globalThis.ZPDeverrouillage = ZPDeverrouillage;

/* Câblage de la zone — navigateur seulement. */
if (typeof document !== 'undefined'){
  (async function(){
    var champ = document.getElementById('zone-privee-phrase');
    var btn = document.getElementById('zone-privee-deverrouiller');
    var zoneEntrees = document.getElementById('zone-privee-entrees');
    var verdict = document.getElementById('zone-privee-verdict');
    var zoneClairs = document.getElementById('zone-privee-clairs');
    if (!champ || !btn || !zoneEntrees || !verdict || !zoneClairs) return;
    var paquet = null;
    try {
      var reponse = await fetch('assets/coffre-prive.json', { cache: 'no-store' });
      if (reponse.ok){
        var lu = await reponse.json();
        if (lu && Array.isArray(lu.entrees) && lu.entrees.length) paquet = lu;
      }
    } catch (e) { /* paquet illisible : le verdict ci-dessous le dit — jamais un vide silencieux */ }
    if (!paquet) {
      verdict.textContent = 'Verdict : paquet illisible ou introuvable — le fichier assets/coffre-prive.json n’a pas pu être lu depuis ce navigateur (réseau, cache ou copie locale). L’état configuré affiché ci-dessus est le relevé statique, vérifié à la construction contre les octets servis ; aucun contenu n’est affiché, et rien n’est simulé.';
      return;
    }
    zoneEntrees.innerHTML = '';
    paquet.entrees.forEach(function(e){
      var d = document.createElement('div');
      d.className = 'coffre-entree';
      var h = document.createElement('h4');
      h.textContent = e.titre_public || e.id || '';
      d.appendChild(h);
      if (e.resume_public){
        var r = document.createElement('p');
        r.textContent = e.resume_public;
        d.appendChild(r);
      }
      var emp = document.createElement('p');
      emp.className = 'empreinte';
      emp.textContent = 'Empreinte du clair (SHA-256) : ' + (e.empreinte_clair_sha256 || '');
      d.appendChild(emp);
      zoneEntrees.appendChild(d);
    });
    champ.disabled = false;
    champ.placeholder = 'Phrase secrète — elle ne quitte pas cet onglet';
    btn.hidden = false;
    btn.addEventListener('click', async function(){
      var phrase = champ.value;
      champ.value = '';
      zoneClairs.innerHTML = '';
      if (!phrase){ verdict.textContent = 'Phrase vide : déverrouillage refusé.'; return; }
      verdict.textContent = 'Dérivation de la clé et déchiffrement en cours…';
      try {
        var res = await ZPDeverrouillage.deverrouillerPaquet(paquet, phrase);
        var nbMatch = 0;
        res.resultats.forEach(function(r){
          var d = document.createElement('div');
          d.className = 'coffre-entree';
          var h = document.createElement('h4');
          h.textContent = (r.titre_public || r.id) + ' — ' + r.verdict;
          d.appendChild(h);
          if (r.verdict === 'MATCH'){
            nbMatch++;
            var pre = document.createElement('div');
            pre.className = 'clair-texte';
            pre.textContent = r.texte;
            d.appendChild(pre);
          } else if (r.verdict === 'ECART'){
            var p1 = document.createElement('p');
            p1.className = 'petite';
            p1.textContent = 'Le déchiffrement a réussi, mais l’empreinte recalculée du clair ne correspond pas à l’empreinte inscrite au paquet : le texte est retenu, il ne peut pas être tenu pour bon.';
            d.appendChild(p1);
          } else {
            var p2 = document.createElement('p');
            p2.className = 'petite';
            p2.textContent = 'Déchiffrement impossible pour cette entrée : phrase incorrecte, ou entrée altérée. Aucun texte n’est affiché.';
            d.appendChild(p2);
          }
          zoneClairs.appendChild(d);
        });
        if (nbMatch === res.resultats.length)
          verdict.textContent = 'Déverrouillage complet : ' + nbMatch + ' entrée(s), toutes MATCH — empreintes des clairs revérifiées.';
        else if (nbMatch === 0)
          verdict.textContent = 'Échec du déverrouillage : aucun contenu affiché (phrase incorrecte ou paquet altéré).';
        else
          verdict.textContent = 'Déverrouillage partiel : ' + nbMatch + '/' + res.resultats.length + ' entrée(s) MATCH ; les autres sont retenues, verdicts ci-dessus.';
      } catch (err) {
        verdict.textContent = 'Échec du déverrouillage : aucun contenu affiché.';
      }
    });
  })();
}

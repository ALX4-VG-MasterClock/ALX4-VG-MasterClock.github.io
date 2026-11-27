/* Refonte A — mécanisme de rafraîchissement (ancien bloc s50), adapté :
   le sceau comparé est celui du noyau ou, sur une page de chambre, celui
   du manifeste porté en méta. Le reste du mécanisme est inchangé. */

/* MECANISME-RAFRAICHISSEMENT-SOMMES — directive d'Alex, 3 novembre 2026, 22 h 20.
   Le cache est une somme précédente : la page affichée (servie du cache,
   aussitôt, hors ligne compris) se compare en arrière-plan à la version
   fraîche du site, par le sceau canonique affiché ; si le sceau a bougé,
   rechargement automatique UNE fois. Garde anti-boucle : marqueur de
   session portant le sceau visé ; cache têtu = état honnête affiché, on
   s'arrête. Le mécanisme ne lit que le fichier index.html du site
   lui-même ; il ne touche jamais à la mémoire locale de l'utilisateur. */
(function () {
  var CLE = 'sophia-rafraichissement-v1';
  function sceauAffiche() {
    var el = document.getElementById('sceau-version-affiche');
    if (el) return { v: (el.textContent || '').trim(), source: 'noyau' };
    /* Refonte A — sur une page de chambre, le sceau affiché de la page est
       celui du manifeste auquel elle pend (méta de l'en-tête). */
    var m = document.querySelector('meta[name="manifeste-sceau"]');
    return m ? { v: (m.getAttribute('content') || '').trim(), source: 'manifeste' } : { v: '', source: '' };
  }
  function sceauDuTexte(texte, source) {
    /* Correctif ronde 2 (26 novembre 2026) : comparer des sceaux de même
       nature. Avant ce correctif, une page de chambre comparait son sceau
       du manifeste (méta) au sceau canonique du noyau lu dans index.html —
       deux valeurs différentes par construction : chaque page de chambre
       annonçait donc à tort « une version plus récente existe… mais le
       cache refuse encore ». Désormais, la source qui a donné le sceau
       local (noyau ou manifeste) est celle qu'on relit dans le texte frais. */
    var m2 = /name=\"manifeste-sceau\" content=\"([0-9a-f]{64})\"/.exec(texte || '');
    if (source === 'manifeste') return m2 ? m2[1] : '';
    var mm = /id=\"sceau-version-affiche\"[^>]*>([0-9a-f]{64})</.exec(texte || '');
    if (mm) return mm[1];
    return m2 ? m2[1] : '';
  }
  function lireMarqueur() {
    try { var v = sessionStorage.getItem(CLE); return v ? JSON.parse(v) : null; }
    catch (e) { return null; }
  }
  function ecrireMarqueur(m) {
    try { sessionStorage.setItem(CLE, JSON.stringify(m)); return true; }
    catch (e) { return false; }
  }
  function effacerMarqueur() { try { sessionStorage.removeItem(CLE); } catch (e) {} }
  function court(s) { return s ? s.slice(0, 16) + '…' : '—'; }
  function montrerLigne(fr, en) {
    var l = document.getElementById('ligne-rafraichissement');
    if (!l) return;
    l.textContent = fr;
    l.setAttribute('data-en', en);
    l.hidden = false;
  }
  function dateHeure() {
    try { return new Date().toLocaleString('fr-CA', { dateStyle: 'long', timeStyle: 'short' }); }
    catch (e) { return new Date().toISOString(); }
  }
  function demarrer() {
    var lu = sceauAffiche();
    var affiche = lu.v;
    if (!affiche) return;
    var m = lireMarqueur();
    if (m && m.vers) {
      effacerMarqueur();
      if (affiche === m.vers) {
        montrerLigne(
          'Affiché depuis l’état précédent — somme ' + court(m.depuis) + ' ; état recalculé : somme ' + court(affiche) + ' ; page rechargée sur la version à jour, le ' + dateHeure() + '.',
          'Shown from the previous state — sum ' + court(m.depuis) + '; recalculated state: sum ' + court(affiche) + '; page reloaded to the current version, on ' + dateHeure() + '.');
      } else {
        montrerLigne(
          'État affiché : somme ' + court(affiche) + ' ; une version plus récente existe (somme ' + court(m.vers) + '), mais le cache de cet appareil la refuse encore — aucun autre rechargement automatique n’aura lieu ; le lien « Recharger la version fraîche du site », dans la Mémoire verrouillée, force le passage.',
          'Displayed state: sum ' + court(affiche) + '; a newer version exists (sum ' + court(m.vers) + '), but this device’s cache still refuses it — no further automatic reload will occur; the “Reload the fresh version of the site” link, in the Locked Memory, forces the passage.');
      }
      return;
    }
    if (typeof fetch !== 'function') return;
    fetch('index.html', { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (texte) {
      var reseau = sceauDuTexte(texte, lu.source);
      if (reseau && reseau !== affiche) {
        if (ecrireMarqueur({ depuis: affiche, vers: reseau })) { location.reload(); }
      }
    }).catch(function () { /* réseau absent : l'état en cache reste affiché, rien ne bloque */ });
  }
  /* Correctif « peinture d'abord » : la comparaison démarre APRÈS la
     première peinture — événement load, puis temps mort — pour ne plus
     concurrencer la première interaction. La sémantique est inchangée :
     demarrer() est la même fonction, avec la même garde anti-boucle et la
     même ligne de transparence. */
  function partirApresPeinture() {
    if (window.requestIdleCallback) { window.requestIdleCallback(function () { demarrer(); }, { timeout: 3000 }); }
    else { setTimeout(demarrer, 60); }
  }
  if (document.readyState === 'complete') { partirApresPeinture(); }
  else { window.addEventListener('load', partirApresPeinture); }
})();

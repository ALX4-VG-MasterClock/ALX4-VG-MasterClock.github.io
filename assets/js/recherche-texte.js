/* Refonte A — recherche plein texte (ancien bloc s54), adaptée au
   multi-pages : index préparé (assets/recherche-index.json), un résultat
   mène à la page puis à l'endroit. Le reste du compagnon est inchangé. */

/* ===== v63 corrigé — Recherche plein texte des panneaux =====
   Compagnon de la recherche locale (v9) : même champ, même bouton.
   L'index est bâti paresseusement depuis le DOM de la page (le texte
   complet des sections des panneaux), chez le visiteur, sans réseau.
   Un résultat mène au panneau puis à la section, dans le panneau. */
(function () {
  'use strict';
  var q = document.getElementById('rech-q'), btn = document.getElementById('rech-btn');
  var wrap = document.getElementById('rech-texte-wrap'), etat = document.getElementById('rech-texte-etat'), zone = document.getElementById('rech-texte-resultats');
  if (!q || !btn || !wrap || !zone) return;
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  var INDEX = null;
  function nomsPanneaux() {
    var map = {};
    document.querySelectorAll('#onglets [data-panneau]').forEach(function (b) { map[b.getAttribute('data-panneau')] = (b.dataset.fr || b.textContent || '').replace(/\s+/g, ' ').trim(); });
    return map;
  }
  var PAGE_COURANTE = (location.pathname.split('/').pop() || 'index.html');
  function construire() {
    /* Refonte A — l'index plein texte est devenu multi-pages : il est
       préparé à la construction du site (assets/recherche-index.json),
       chargé paresseusement au premier usage, sans autre réseau. */
    if (construire.promesse) return construire.promesse;
    construire.promesse = fetch('assets/recherche-index.json').then(function (r) { return r.json(); }).then(function (liste) {
      return liste.map(function (e) { e.norm = norm(e.texte); return e; });
    }).catch(function () { return []; });
    return construire.promesse;
  }
  function chercherTexte() {
    var brut = q.value || ''; var nq = norm(brut).trim();
    if (!nq) { wrap.hidden = true; return; }
    if (!INDEX) { construire().then(function (idx) { INDEX = idx; chercherTexte(); }); etat.textContent = 'Chargement de l’index du site…'; wrap.hidden = false; return; }
    var mots = nq.split(/\s+/).filter(Boolean);
    var motsBruts = brut.toLowerCase().split(/\s+/).filter(Boolean);
    var res = [];
    INDEX.forEach(function (e) {
      var score = 0, ok = true;
      if (e.norm.indexOf(nq) > -1) score += 50;
      mots.forEach(function (m) { var c = e.norm.split(m).length - 1; if (c === 0) ok = false; score += c; });
      if (ok) res.push({ e: e, score: score });
    });
    res.sort(function (a, b) { return b.score - a.score; });
    res = res.slice(0, 15);
    wrap.hidden = false;
    if (!res.length) { etat.textContent = 'Aucun passage du texte des panneaux ne contient « ' + brut + ' ».'; zone.innerHTML = ''; return; }
    etat.textContent = res.length + ' passage' + (res.length > 1 ? 's' : '') + ' dans le texte des panneaux pour « ' + brut + ' » :';
    zone.innerHTML = res.map(function (r) {
      var e = r.e;
      var bas = e.texte.toLowerCase(); var pos = -1;
      motsBruts.forEach(function (m) { var p = bas.indexOf(m); if (p > -1 && (pos === -1 || p < pos)) pos = p; });
      if (pos === -1) pos = 0;
      var deb = Math.max(0, pos - 70), fin = Math.min(e.texte.length, pos + 110);
      var ext = (deb > 0 ? '…' : '') + e.texte.slice(deb, fin) + (fin < e.texte.length ? '…' : '');
      return '<button class="rech-resultat" data-p="' + esc(e.panneau) + '" data-page="' + esc(e.page || '') + '" data-a="' + esc(e.ancre) + '"><span class="r-titre">' + esc(e.titre) + ' — ' + esc(e.panneauNom) + '</span><br><span class="r-extrait">' + esc(ext) + '</span></button>';
    }).join('');
    zone.querySelectorAll('.rech-resultat').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-p'), a = b.getAttribute('data-a'), pg = b.getAttribute('data-page');
        /* Refonte A — un résultat mène à la page de la chambre, puis à l'endroit. */
        if (pg && pg !== PAGE_COURANTE) { location.href = pg + '#' + a; return; }
        if (window.ouvrirPanneau) ouvrirPanneau(p);
        setTimeout(function () {
          var c = document.getElementById(a);
          if (c) { c.scrollIntoView({ behavior: 'smooth' }); try { history.replaceState(history.state, '', '#' + a); } catch (e) { } }
        }, 160);
      });
    });
  }
  btn.addEventListener('click', function () { setTimeout(chercherTexte, 0); });
  q.addEventListener('keydown', function (e) { if (e.key === 'Enter') setTimeout(chercherTexte, 0); });
})();

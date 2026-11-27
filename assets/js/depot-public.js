/* ===== Dépôt public des empreintes — registre et vérificateur Merkle =====
   Version 64 du site (25 novembre 2026). Tout s'exécute dans le navigateur
   du visiteur : la page relit le journal public publié par le site
   (assets/journal-depots.json), recalcule la chaîne des sceaux, l'arbre
   de Merkle du registre et le chemin de la feuille cherchée. Rien n'est
   envoyé nulle part ; le site ne sait pas quel code le visiteur vérifie.

   Recette (celle publiée dans le journal lui-même, champ « merkle ») :
   · sceau d'une entrée = SHA-256(sceau précédent ‖ empreinte ‖ date) ;
   · digest d'une feuille = SHA-256 du JSON canonique de l'entrée
     {date, empreinte, etiquette, seq} (clés triées, séparateurs compacts,
     UTF-8 ; etiquette = chaîne vide quand l'entrée n'en porte pas) ;
   · nœud interne = SHA-256(hex de gauche + hex de droite) ; niveau
     impair : le dernier digest est dupliqué ;
   · registre vide : la racine est le SHA-256 de la chaîne vide.       */
(function () {
  'use strict';

  var RACINE_VIDE = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  function sha256Hex(texte) {
    var buf = new TextEncoder().encode(texte);
    return crypto.subtle.digest('SHA-256', buf).then(function (h) {
      var octets = new Uint8Array(h), hex = '';
      for (var i = 0; i < octets.length; i++) {
        hex += ('0' + octets[i].toString(16)).slice(-2);
      }
      return hex;
    });
  }

  function normaliserSaisie(s) {
    return String(s || '').replace(/\s+/g, '').toLowerCase();
  }

  function estEmpreinte(s) {
    return /^[0-9a-f]{64}$/.test(s);
  }

  /* JSON canonique de la feuille : clés triées (date, empreinte,
     etiquette, seq), séparateurs compacts — la forme exacte publiée. */
  function jsonFeuille(entree) {
    return '{"date":' + JSON.stringify(entree.date) +
      ',"empreinte":' + JSON.stringify(entree.empreinte) +
      ',"etiquette":' + JSON.stringify(entree.etiquette || '') +
      ',"seq":' + String(entree.seq) + '}';
  }

  function digestFeuille(entree) {
    return sha256Hex(jsonFeuille(entree));
  }

  function niveauSuivant(niveau) {
    var suiv = [], promesses = [];
    for (var i = 0; i < niveau.length; i += 2) {
      var g = niveau[i];
      var d = (i + 1 < niveau.length) ? niveau[i + 1] : niveau[i];
      promesses.push(sha256Hex(g + d));
    }
    return Promise.all(promesses).then(function (r) { return r; });
  }

  function construireNiveaux(feuilles) {
    var niveaux = [feuilles.slice()];
    function pas() {
      var niv = niveaux[niveaux.length - 1];
      if (niv.length <= 1) return Promise.resolve(niveaux);
      return niveauSuivant(niv).then(function (suiv) {
        niveaux.push(suiv);
        return pas();
      });
    }
    return pas();
  }

  function racineMerkle(feuilles) {
    if (!feuilles.length) return Promise.resolve(RACINE_VIDE);
    return construireNiveaux(feuilles).then(function (niveaux) {
      return niveaux[niveaux.length - 1][0];
    });
  }

  /* Chemin de la feuille idx : voisins de bas en haut, chacun avec son
     côté ; niveau impair : la feuille orpheline est sa propre voisine
     de droite (duplication, la recette publiée). */
  function cheminMerkle(feuilles, idx) {
    return construireNiveaux(feuilles).then(function (niveaux) {
      var chemin = [], i = idx;
      for (var n = 0; n < niveaux.length - 1; n++) {
        var niv = niveaux[n];
        if (i % 2 === 0) {
          chemin.push({ cote: 'droite', digest: (i + 1 < niv.length) ? niv[i + 1] : niv[i] });
        } else {
          chemin.push({ cote: 'gauche', digest: niv[i - 1] });
        }
        i = Math.floor(i / 2);
      }
      return chemin;
    });
  }

  function appliquerChemin(digest, chemin) {
    var courant = Promise.resolve(digest);
    chemin.forEach(function (pas) {
      courant = courant.then(function (c) {
        return sha256Hex(pas.cote === 'gauche' ? pas.digest + c : c + pas.digest);
      });
    });
    return courant;
  }

  function racineChainee(journal) {
    var entrees = journal.entrees || [];
    return entrees.length ? entrees[entrees.length - 1].sceau
      : journal.genese.racine_cerveau_au_lancement;
  }

  /* Recalcul complet de la chaîne des sceaux ; retourne la seq du
     premier bris, ou null si la chaîne tient. */
  function verifierChaine(journal) {
    var entrees = journal.entrees || [];
    var prec = journal.genese.racine_cerveau_au_lancement;
    var chaine = Promise.resolve(null);
    entrees.forEach(function (e) {
      chaine = chaine.then(function (bris) {
        if (bris !== null) return bris;
        if (e.sceau_prec !== prec) return e.seq;
        return sha256Hex(e.sceau_prec + e.empreinte + e.date).then(function (calc) {
          if (calc !== e.sceau) return e.seq;
          prec = e.sceau;
          return null;
        });
      });
    });
    return chaine;
  }

  /* Le verdict du dépôt public, en trois états distincts :
     MATCH — le code est au registre et son chemin refait la racine
             publiée (chaîne des sceaux revérifiée au passage) ;
     ÉCART — le code est au registre, mais un recalcul ne concorde pas :
             la pièce publiée ne tient pas, et le verdict le dit ;
     ABSENT — le code n'est pas au registre (à l'état publié relu ici).
     FORMAT — la saisie n'est pas un SHA-256 (64 hexadécimaux). */
  function verifierDepot(journal, saisieBrute) {
    var saisie = normaliserSaisie(saisieBrute);
    if (!estEmpreinte(saisie)) return Promise.resolve({ verdict: 'FORMAT', saisie: saisie });
    var entrees = journal.entrees || [];
    var idx = -1;
    for (var i = 0; i < entrees.length; i++) {
      if (entrees[i].empreinte === saisie) { idx = i; break; }
    }
    var racinePub = (journal.merkle && journal.merkle.racine) || null;
    if (idx < 0) {
      return Promise.resolve({ verdict: 'ABSENT', saisie: saisie, compte: entrees.length, racine: racinePub });
    }
    var entree = entrees[idx];
    return Promise.all(entrees.map(digestFeuille)).then(function (feuilles) {
      return Promise.all([
        racineMerkle(feuilles),
        cheminMerkle(feuilles, idx),
        verifierChaine(journal)
      ]).then(function (res) {
        var racineCalc = res[0], cheminCalc = res[1], brisChaine = res[2];
        return appliquerChemin(feuilles[idx], cheminCalc).then(function (racineParChemin) {
          var cheminPub = (journal.merkle && journal.merkle.chemins) ? journal.merkle.chemins[String(entree.seq)] : null;
          var cheminOk = true;
          if (cheminPub) {
            cheminOk = JSON.stringify(cheminPub) === JSON.stringify(cheminCalc);
          }
          var controles = {
            sceauChaine: brisChaine === null,
            racineRecalculee: racinePub !== null && racineCalc === racinePub,
            cheminVersRacine: racineParChemin === racineCalc,
            cheminPublie: cheminOk
          };
          var ok = controles.sceauChaine && controles.racineRecalculee && controles.cheminVersRacine && controles.cheminPublie;
          return {
            verdict: ok ? 'MATCH' : 'ECART',
            saisie: saisie,
            entree: entree,
            feuille: feuilles[idx],
            chemin: cheminCalc,
            racinePubliee: racinePub,
            racineRecalculee: racineCalc,
            controles: controles,
            brisChaine: brisChaine
          };
        });
      });
    });
  }

  var api = {
    RACINE_VIDE: RACINE_VIDE,
    sha256Hex: sha256Hex,
    normaliserSaisie: normaliserSaisie,
    estEmpreinte: estEmpreinte,
    jsonFeuille: jsonFeuille,
    digestFeuille: digestFeuille,
    construireNiveaux: construireNiveaux,
    racineMerkle: racineMerkle,
    cheminMerkle: cheminMerkle,
    appliquerChemin: appliquerChemin,
    racineChainee: racineChainee,
    verifierChaine: verifierChaine,
    verifierDepot: verifierDepot
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof document === 'undefined') return;

  /* ---------------- partie page (navigateur seulement) ---------------- */

  function texte(n) { return document.createTextNode(n); }

  function chargerJournal() {
    return fetch('assets/journal-depots.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); });
  }

  function rendreRegistre(journal) {
    var zone = document.getElementById('depot-registre-liste');
    var etat = document.getElementById('depot-registre-etat');
    if (!zone) return;
    var entrees = journal.entrees || [];
    while (zone.firstChild) zone.removeChild(zone.firstChild);
    if (!entrees.length) {
      var p = document.createElement('p');
      p.appendChild(texte('Le registre est vide à l’état publié relu à l’instant : aucun dépôt n’a encore été reçu. La première feuille paraîtra ici, datée, avec son empreinte et son sceau.'));
      zone.appendChild(p);
    } else {
      var ul = document.createElement('ul');
      ul.className = 'depot-feuilles';
      entrees.forEach(function (e) {
        var li = document.createElement('li');
        var ligne = 'Feuille nº ' + e.seq + ' — ' + e.date + ' — ';
        li.appendChild(texte(ligne));
        var mono = document.createElement('span');
        mono.className = 'mono';
        mono.appendChild(texte(e.empreinte));
        li.appendChild(mono);
        if (e.etiquette) li.appendChild(texte(' — « ' + e.etiquette + ' »'));
        ul.appendChild(li);
      });
      zone.appendChild(ul);
    }
    if (etat) {
      Promise.all([verifierChaine(journal), Promise.all(entrees.map(digestFeuille))])
        .then(function (res) {
          var bris = res[0];
          return racineMerkle(res[1]).then(function (racineCalc) {
            var racinePub = journal.merkle && journal.merkle.racine;
            var morceaux = [];
            morceaux.push('Revérification faite ici, à l’instant : chaîne des sceaux ' +
              (bris === null ? 'MATCH' : 'ÉCART à l’entrée nº ' + bris));
            morceaux.push('racine de Merkle recalculée ' +
              (racineCalc === racinePub ? 'MATCH avec la racine publiée' : 'ÉCART avec la racine publiée'));
            morceaux.push(entrees.length + (entrees.length > 1 ? ' feuilles' : ' feuille') + ' au registre');
            etat.textContent = morceaux.join(' · ') + '.';
          });
        })
        .catch(function () { etat.textContent = 'La revérification du registre n’a pas pu se faire dans ce navigateur.'; });
    }
  }

  function rendreVerdict(res) {
    var zone = document.getElementById('depot-verif-resultat');
    if (!zone) return;
    zone.className = 'depot-verdict depot-verdict-' + res.verdict.toLowerCase();
    while (zone.firstChild) zone.removeChild(zone.firstChild);
    var titre = document.createElement('p');
    var fort = document.createElement('strong');
    if (res.verdict === 'MATCH') {
      fort.appendChild(texte('MATCH — ce code est au registre, et son chemin refait la racine publiée.'));
      titre.appendChild(fort);
      zone.appendChild(titre);
      var e = res.entree;
      var det = document.createElement('p');
      det.className = 'petite';
      det.appendChild(texte('Feuille nº ' + e.seq + ' · inscrite le ' + e.date +
        (e.etiquette ? ' · étiquette : « ' + e.etiquette + ' »' : '') +
        ' · sceau de l’entrée : '));
      var m1 = document.createElement('span'); m1.className = 'mono'; m1.appendChild(texte(e.sceau)); det.appendChild(m1);
      det.appendChild(texte(' · chemin de Merkle : ' + res.chemin.length + ' pas · racine publiée : '));
      var m2 = document.createElement('span'); m2.className = 'mono'; m2.appendChild(texte(res.racinePubliee)); det.appendChild(m2);
      zone.appendChild(det);
    } else if (res.verdict === 'ECART') {
      fort.appendChild(texte('ÉCART — ce code est au registre, mais la pièce publiée ne revérifie pas.'));
      titre.appendChild(fort);
      zone.appendChild(titre);
      var manquants = [];
      if (!res.controles.sceauChaine) manquants.push('la chaîne des sceaux casse à l’entrée nº ' + res.brisChaine);
      if (!res.controles.racineRecalculee) manquants.push('la racine recalculée depuis les feuilles ne concorde pas avec la racine publiée');
      if (!res.controles.cheminVersRacine) manquants.push('le chemin de la feuille ne refait pas la racine');
      if (!res.controles.cheminPublie) manquants.push('le chemin publié ne concorde pas avec le chemin recalculé');
      var det2 = document.createElement('p');
      det2.className = 'petite';
      det2.appendChild(texte('Ce qui ne tient pas : ' + manquants.join(' ; ') + '. Le verdict reste ÉCART tant que la pièce publiée n’est pas corrigée — c’est exactement ce que ce contrôle existe pour montrer.'));
      zone.appendChild(det2);
    } else if (res.verdict === 'ABSENT') {
      fort.appendChild(texte('ABSENT — ce code n’est pas au registre.'));
      titre.appendChild(fort);
      zone.appendChild(titre);
      var det3 = document.createElement('p');
      det3.className = 'petite';
      det3.appendChild(texte('À l’état publié relu à l’instant (' + res.compte + (res.compte > 1 ? ' feuilles' : ' feuille') +
        ' au registre), aucune feuille ne porte ce SHA-256. Un dépôt envoyé mais pas encore publié par lot n’y figure pas : c’est l’entrée au registre qui date, pas l’envoi.'));
      zone.appendChild(det3);
    } else {
      fort.appendChild(texte('La saisie n’est pas un SHA-256 : il faut 64 caractères hexadécimaux (0-9, a-f).'));
      titre.appendChild(fort);
      zone.appendChild(titre);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('depot-registre-liste')) {
      chargerJournal().then(rendreRegistre).catch(function () {
        var etat = document.getElementById('depot-registre-etat');
        if (etat) etat.textContent = 'Le journal public n’a pas pu être relu depuis cette page ; le fichier reste téléchargeable ci-dessus.';
      });
    }
    var bouton = document.getElementById('depot-verif-bouton');
    if (bouton) {
      bouton.addEventListener('click', function () {
        var saisie = document.getElementById('depot-verif-saisie').value;
        var zone = document.getElementById('depot-verif-resultat');
        if (zone) { zone.className = 'depot-verdict'; zone.textContent = 'Recalcul en cours…'; }
        chargerJournal()
          .then(function (journal) { return verifierDepot(journal, saisie); })
          .then(rendreVerdict)
          .catch(function () {
            if (zone) { zone.className = 'depot-verdict depot-verdict-ecart'; zone.textContent = 'Le journal public n’a pas pu être relu : aucun verdict ne peut être rendu sans la pièce.'; }
          });
      });
    }
  });
})();

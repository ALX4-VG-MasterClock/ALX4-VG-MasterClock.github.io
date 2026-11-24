
/* ===== v40 — « L'évolution » : le panneau que le site calcule seul, à chaque chargement,
   depuis ses propres fichiers (manifeste du cerveau, journal, arbre de Merkle, état de la
   chaîne, coffre, Historique quotidien). Aucun nouvel appel réseau : les mêmes adresses
   d'actifs que les autres panneaux relisent déjà. ===== */
/* === EVOLUTION-FONCTIONS-PURES — début === */
var EVO_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function evoSha256Hex(txt){
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)).then(function(d){
    var u = new Uint8Array(d), s = '';
    for(var i = 0; i < u.length; i++){ s += ('0' + u[i].toString(16)).slice(-2); }
    return s;
  });
}
function evoRacineMerkle(digests){
  return Promise.all(digests.map(function(d){ return evoSha256Hex(d); })).then(function(niv){
    function niveau(n){
      if(n.length === 1) return Promise.resolve(n[0]);
      var paires = [];
      for(var i = 0; i < n.length; i += 2){
        var g = n[i], d = (i + 1 < n.length) ? n[i + 1] : n[i];
        paires.push(evoSha256Hex(g + d));
      }
      return Promise.all(paires).then(niveau);
    }
    return niveau(niv);
  });
}
function evoVerdictContinuite(avant, apres){
  if(!avant || !apres) return 'non mesuré';
  return avant === apres ? 'inchangé' : 'changé';
}
function evoBilanContinuite(lignes){
  var m = 0, i = 0, c = 0;
  lignes.forEach(function(l){
    var v = evoVerdictContinuite(l.avant, l.apres);
    if(v === 'inchangé'){ m++; i++; } else if(v === 'changé'){ m++; c++; }
  });
  return {mesurees: m, inchangees: i, changees: c, nonMesurees: lignes.length - m};
}
function evoNumeroVersion(v){
  var m = /^v(\d+)$/.exec(v || '');
  return m ? parseInt(m[1], 10) : null;
}
function evoHorodatageLisible(h){
  if(!/^\d{14}$/.test(h || '')) return null;
  return parseInt(h.slice(6, 8), 10) + ' ' + EVO_MOIS[parseInt(h.slice(4, 6), 10) - 1] + ' ' + h.slice(0, 4)
    + ', ' + h.slice(8, 10) + ' h ' + h.slice(10, 12) + ' min ' + h.slice(12, 14) + ' s (UTC)';
}
function evoDateIsoLisible(iso){
  var p = (iso || '').split('-');
  if(p.length !== 3) return iso;
  return parseInt(p[2], 10) + ' ' + EVO_MOIS[parseInt(p[1], 10) - 1] + ' ' + p[0];
}
function evoJoursEntre(a, b){
  var da = new Date(a + 'T00:00:00Z'), db = new Date(b + 'T00:00:00Z');
  if(isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}
function evoDateToronto(d){
  try {
    return new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit'}).format(d);
  } catch(e) {
    return d.toISOString().slice(0, 10);
  }
}
function evoPropositions(m){
  var props = [];
  var captee = m.capturesVersions.indexOf(m.versionSite) >= 0;
  props.push({regle: 1, declenchee: !captee, texte: captee
    ? 'La version courante (' + m.versionSite + ') a sa capture à la chambre Archives — rien à proposer.'
    : 'Capturer la version courante (' + m.versionSite + ') à la Wayback Machine — la racine et les actifs du cerveau — puis inscrire la capture à la chambre Archives.'});
  props.push({regle: 2, declenchee: m.inchangeesDepuisV35.length > 0, texte: m.inchangeesDepuisV35.length > 0
    ? 'Nommer les chambres inchangées depuis la version 35 : ' + m.inchangeesDepuisV35.join(', ') + ' — leur stabilité fait partie de l’état, et ce panneau la nomme.'
    : 'Aucune chambre inchangée depuis la version 35 parmi les mesurables — rien à nommer.'});
  props.push({regle: 3, declenchee: (m.retardReference !== null && m.retardReference > 0), texte: (m.retardReference !== null && m.retardReference > 0)
    ? 'Sceller un nouveau sceau de génération au prochain jalon : la référence figée dans assets/merkle.json accuse ' + m.retardReference + ' maillons de retard sur l’état courant.'
    : 'La référence figée est à jour avec l’état courant — rien à refermer.'});
  props.push({regle: 4, declenchee: m.nonMesurees > 0, texte: m.nonMesurees > 0
    ? 'Conserver les six digests de chambres à chaque version, dans le manifeste : ' + m.nonMesurees + ' chambre(s) restent non mesurables faute d’état passé conservé dans les actifs.'
    : 'La continuité des six chambres est mesurable — rien à ajouter.'});
  props.push({regle: 5, declenchee: (m.historiqueRetard !== null && m.historiqueRetard > 1), texte: (m.historiqueRetard !== null && m.historiqueRetard > 1)
    ? 'Clore les jours en retard de l’Historique quotidien au rituel de 00 h 01 : ' + m.historiqueRetard + ' jours depuis la dernière clôture portée par l’actif.'
    : 'L’Historique quotidien est à sa cadence (clôture chaque nuit à 00 h 01) — rien à signaler.'});
  props.push({regle: 6, declenchee: !!m.ancrageHistoriqueEnAttente, texte: m.ancrageHistoriqueEnAttente
    ? 'Revérifier l’attestation OpenTimestamps de l’Historique quotidien (jour du 2 novembre 2026) et consigner la confirmation Bitcoin quand elle revient.'
    : 'Aucun ancrage en attente selon les actifs — rien à suivre.'});
  return props;
}
function evoMesurer(lire){
  return Promise.all([
    lire('assets/etat-chaine.json'), lire('assets/cerveau.json'), lire('assets/journal-mises-a-jour.json'),
    lire('assets/merkle.json'), lire('assets/coffre.json'), lire('assets/historique.json')
  ]).then(function(res){
    var etat = res[0], cerveau = res[1], journal = res[2], merkle = res[3], coffre = res[4], historique = res[5];
    var ch = {};
    (cerveau.chambres || []).forEach(function(c){ ch[c.id] = c; });
    var gen = merkle.generation || {};
    var mSrc = /digest maître ([0-9a-f]{64})/.exec(merkle.source || '');
    var coffreV35 = mSrc ? mSrc[1] : null;
    var hist = (historique.entrees && historique.entrees[0]) || null;
    var lignes = [
      {id: 'chaine', nom: 'La Chaîne', avant: gen.digest_cumule_chaine || null, apres: etat.digest_cumule || null,
       note: 'la référence était au maillon #' + gen.maillon_reference + ', l’état courant au maillon #' + etat.dernier_maillon},
      {id: 'coffre', nom: 'Le Coffre synaptique', avant: coffreV35, apres: coffre.digest_maitre || null,
       note: (merkle.nombre_feuilles || '?') + ' entrées à la v35, ' + ((coffre.entrees || []).length) + ' entrées à ce chargement'},
      {id: 'arbre', nom: 'L’Arbre de Merkle', avant: merkle.racine || null, apres: (ch.arbre || {}).digest || null,
       note: 'la racine de l’arbre du coffre, aux deux états'},
      {id: 'verrouillee', nom: 'La Mémoire verrouillée', avant: null, apres: (ch.verrouillee || {}).digest || null,
       note: 'premier dépôt le 3 novembre 2026 ; aucun état passé porté par les actifs'},
      {id: 'versions', nom: 'Les Versions', avant: null, apres: (ch.versions || {}).digest || null,
       note: 'le journal change à chaque version, par construction — dit comme règle, pas comme mesure'},
      {id: 'archives', nom: 'Les Archives', avant: null, apres: (ch.archives || {}).digest || null,
       note: 'la liste des captures grandit par ajouts ; son état à la v35 n’est pas porté par les actifs'}
    ];
    return evoRacineMerkle((cerveau.chambres || []).map(function(c){ return c.digest; })).then(function(racineRecalculee){
      var bilan = evoBilanContinuite(lignes);
      var captures = ((ch.archives || {}).captures || []).map(function(c){ return {version: c.version, instantane: c.instantane}; });
      var capV = captures.map(function(c){ return c.version; });
      var registre = null;
      var ancrageEnAttente = false;
      (journal.entrees || []).forEach(function(e){
        (e.points || []).forEach(function(p){
          var t = (p && p.texte) || '';
          if(registre === null){
            var mm = /porté à (\d[\d ]*) pièces/.exec(t);
            if(mm) registre = parseInt(mm[1].replace(/[\s ]/g, ''), 10);
          }
          if(/confirmation Bitcoin en attente/.test(t)) ancrageEnAttente = true;
        });
      });
      var retard = (typeof etat.dernier_maillon === 'number' && typeof gen.maillon_reference === 'number')
        ? etat.dernier_maillon - gen.maillon_reference : null;
      var aujourdhui = evoDateToronto(new Date());
      var retardHist = hist ? evoJoursEntre(hist.date, aujourdhui) : null;
      var croissance = {};
      (journal.entrees || []).forEach(function(e){ croissance[e.date] = (croissance[e.date] || 0) + 1; });
      var inchangees = lignes.filter(function(l){ return evoVerdictContinuite(l.avant, l.apres) === 'inchangé'; })
        .map(function(l){ return l.nom; });
      var ecarts = [
        {code: 'v35', resolu: capV.indexOf('v35') >= 0,
         titre: 'La version 35, jamais capturée — trou permanent',
         texte: 'La version 35 — « L’arbre et l’archive », 3 novembre 2026 — figure au journal des mises à jour, mais aucune capture de sa racine ne figure à la chambre Archives. L’état n’est plus servi : sa capture ne peut plus être prise. Le trou est nommé plutôt que maquillé. (Sources : assets/journal-mises-a-jour.json ; chambre Archives de assets/cerveau.json.)'},
        {code: 'v10', resolu: capV.indexOf('v10') >= 0,
         titre: 'La version 10 corrigée, toujours sans capture',
         texte: 'La version 10 corrigée (1er novembre 2026) : la section « Archive des états » du panneau Mémoire la dit « pas encore capturée », et la reprise de sa capture a été annulée au registre des archives tenu par SoPHIa. À ce chargement, la chambre Archives ne porte toujours aucune capture de la v10. (Sources : la section « Archive des états » de cette page ; chambre Archives de assets/cerveau.json, revérifiée à ce chargement.)'},
        {code: 'reference', resolu: retard === 0,
         titre: 'La référence de chaîne figée, en retard',
         texte: 'La référence figée dans assets/merkle.json (champ « generation », sceau de génération de la version 35) est le maillon #' + gen.maillon_reference
           + ' ; l’état courant, relu dans assets/etat-chaine.json à ce chargement, est le maillon #' + etat.dernier_maillon
           + ' : la référence accuse ' + retard + ' maillons de retard. C’est l’état qui avait été servi dans la capture de l’actif, alors que la chaîne était déjà plus loin. (Sources : assets/merkle.json ; assets/etat-chaine.json.)'},
        {code: 'courante', resolu: capV.indexOf(cerveau.version_site) >= 0,
         titre: 'La version courante, pas encore capturée',
         texte: 'La version courante (' + cerveau.version_site + ') n’a pas encore sa capture à la chambre Archives : elle suit la publication, selon le budget de captures du registre. Ce n’est pas un trou — c’est l’ordre normal des gestes — et la ligne se refermera d’elle-même quand la capture entrera au manifeste. (Source : chambre Archives de assets/cerveau.json, à ce chargement.)'}
      ];
      var propositions = evoPropositions({
        versionSite: cerveau.version_site, capturesVersions: capV, retardReference: retard,
        inchangeesDepuisV35: inchangees, nonMesurees: bilan.nonMesurees,
        historiqueRetard: retardHist, ancrageHistoriqueEnAttente: ancrageEnAttente
      });
      return {
        etat: etat, cerveau: cerveau, journal: journal, merkle: merkle, coffre: coffre,
        racineDeclaree: cerveau.racine_cerveau, racineRecalculee: racineRecalculee,
        racineMatch: racineRecalculee === cerveau.racine_cerveau,
        lignes: lignes, bilan: bilan, captures: captures, registre: registre,
        referenceFigee: {maillon: gen.maillon_reference, digest: gen.digest_cumule_chaine, retard: retard},
        historiqueJour: hist ? {date: hist.date, digest: hist.digest_apres,
          coffreDigest: (hist.coffre_synaptique || {}).digest_maitre, coffreEntrees: (hist.coffre_synaptique || {}).entrees} : null,
        coffreV35: coffreV35, coffreV35Entrees: merkle.nombre_feuilles || null,
        ancrageHistoriqueEnAttente: ancrageEnAttente, retardHistorique: retardHist, aujourdhui: aujourdhui,
        croissance: croissance, ecarts: ecarts, propositions: propositions
      };
    });
  });
}
/* === EVOLUTION-FONCTIONS-PURES — fin === */
(function(){
  'use strict';
  function el(id){ return document.getElementById(id); }
  var panneau = el('p-evolution');
  if(!panneau) return;
  var calcule = false, enCours = false;
  function lire(u){
    return fetch(u, {cache: 'no-store'}).then(function(r){
      if(!r.ok) throw new Error(u + ' — ' + r.status);
      return r.json();
    });
  }
  function cellule(tr, texte, cls){
    var td = document.createElement('td');
    if(cls) td.className = cls;
    td.textContent = texte;
    tr.appendChild(td);
    return td;
  }
  function tronque(h){ return h ? h.slice(0, 16) + '…' : '—'; }
  function rendre(m){
    var nbEcarts = m.ecarts.filter(function(e){ return !e.resolu; }).length;
    var nbProps = m.propositions.filter(function(p){ return p.declenchee; }).length;
    var res = el('evo-resume');
    if(res) res.textContent = 'À ce chargement : ' + m.etat.maillons + ' maillons scellés dans la chaîne, '
      + m.journal.entrees.length + ' entrées au journal des versions, ' + m.captures.length
      + ' états capturés dehors à la Wayback Machine, racine du cerveau ' + (m.racineMatch ? 'MATCH au recalcul' : 'ÉCART au recalcul')
      + ', ' + nbEcarts + ' écart(s) nommé(s) et ' + nbProps + ' prochain(s) pas proposé(s) par les règles du panneau.';
    var sceauPage = '';
    var sp = document.getElementById('sceau-version-affiche');
    if(sp) sceauPage = sp.textContent.trim();
    var dernCap = m.captures.length ? m.captures[m.captures.length - 1] : null;
    var lignesEtat = [
      ['Maillons de la chaîne', m.etat.maillons + ' — dernier maillon : #' + m.etat.dernier_maillon, 'assets/etat-chaine.json'],
      ['Digest cumulé de la chaîne', m.etat.digest_cumule, 'assets/etat-chaine.json'],
      ['Sceau du dernier maillon', m.etat.sceau_dernier, 'assets/etat-chaine.json'],
      ['Pièces du Registre propre', m.registre !== null ? m.registre + ' pièces' : 'non mesuré ici', 'assets/journal-mises-a-jour.json — entrée du 1er novembre 2026'],
      ['Versions au journal', m.journal.entrees.length + ' entrées — version du manifeste : ' + m.cerveau.version_site, 'assets/journal-mises-a-jour.json ; assets/cerveau.json'],
      ['Racine du cerveau, recalculée ici', m.racineRecalculee + ' — ' + (m.racineMatch ? 'MATCH avec la racine déclarée du manifeste' : 'ÉCART avec la racine déclarée du manifeste'), 'assets/cerveau.json — les six digests de chambres, arbre recalculé à ce chargement'],
      ['Racine de l’arbre du coffre', m.merkle.racine, 'assets/merkle.json'],
      ['Sceau canonique de cette page', sceauPage || 'non lu ici', 'le bloc « Trois foyers, un sceau » du panneau Évolution, dans cette page même'],
      ['Captures à la chambre Archives', m.captures.length + ' captures' + (dernCap ? ' — dernière : ' + dernCap.version + ', ' + (evoHorodatageLisible(dernCap.instantane) || dernCap.instantane) : ''), 'assets/cerveau.json — chambre Archives']
    ];
    var corps = el('evo-etat-corps');
    if(corps){
      corps.innerHTML = '';
      lignesEtat.forEach(function(L){
        var tr = document.createElement('tr');
        cellule(tr, L[0]);
        cellule(tr, L[1], 'mono');
        cellule(tr, L[2]);
        corps.appendChild(tr);
      });
    }
    var note = el('evo-etat-note');
    if(note) note.textContent = 'État de la chaîne mis à jour au ' + m.etat.mis_a_jour + ' selon son fichier ; la chaîne continue de croître chez l’agente — au prochain rafraîchissement publié, ces nombres auront avancé, et ce panneau les relira.';
    var corpsC = el('evo-continuite-corps');
    if(corpsC){
      corpsC.innerHTML = '';
      m.lignes.forEach(function(l){
        var tr = document.createElement('tr');
        cellule(tr, l.nom);
        cellule(tr, l.avant ? tronque(l.avant) : 'non porté par les actifs', 'mono');
        cellule(tr, l.apres ? tronque(l.apres) : '—', 'mono');
        var v = evoVerdictContinuite(l.avant, l.apres);
        cellule(tr, (v === 'non mesuré' ? 'non mesuré ici' : v) + (l.note ? ' — ' + l.note : ''));
        corpsC.appendChild(tr);
      });
    }
    var part = el('evo-continuite-part');
    if(part){
      var nomsInch = m.lignes.filter(function(l){ return evoVerdictContinuite(l.avant, l.apres) === 'inchangé'; }).map(function(l){ return l.nom; });
      part.textContent = 'Continuité mesurée entre la version 35 et l’état courant : ' + m.bilan.inchangees + ' chambre(s) inchangée(s) sur '
        + m.bilan.mesurees + ' mesurables (' + nomsInch.join(', ') + '). La Chaîne change par construction : elle croît — c’est sa fonction, pas une rupture. '
        + m.bilan.nonMesurees + ' chambre(s) non mesurée(s), faute d’état passé conservé dans les actifs : le panneau le dit plutôt que d’inventer.';
    }
    var avant = el('evo-continuite-avant');
    if(avant){
      if(m.historiqueJour && m.coffreV35){
        avant.textContent = 'Le Coffre synaptique : changé — ' + m.historiqueJour.coffreEntrees + ' entrées à la clôture du '
          + evoDateIsoLisible(m.historiqueJour.date) + ' (digest ' + tronque(m.historiqueJour.coffreDigest) + '), ' + m.coffreV35Entrees
          + ' entrées à la version 35 (digest ' + tronque(m.coffreV35) + '). Pour les autres chambres, les actifs ne portent pas l’état du 2 novembre : non mesuré ici.';
      } else {
        avant.textContent = 'Non mesuré ici : les actifs ne portent pas les deux états à comparer.';
      }
    }
    var ulE = el('evo-ecarts');
    if(ulE){
      ulE.innerHTML = '';
      m.ecarts.forEach(function(e){
        var li = document.createElement('li');
        var b = document.createElement('strong');
        b.textContent = e.titre + (e.resolu ? ' — résorbé à ce chargement' : ' — toujours présent à ce chargement') + '. ';
        li.appendChild(b);
        li.appendChild(document.createTextNode(e.texte));
        ulE.appendChild(li);
      });
    }
    var corpsA = el('evo-ancrage-corps');
    if(corpsA){
      corpsA.innerHTML = '';
      var premCap = m.captures.length ? m.captures[0] : null;
      var capCourante = m.captures.some(function(c){ return c.version === m.cerveau.version_site; });
      var lignesA = [
        ['La racine du site, à la Wayback Machine', 'ancré', m.captures.length + ' captures vérifiées à la chambre Archives'
          + (premCap && dernCap ? ' — de la ' + premCap.version + ' (' + (evoHorodatageLisible(premCap.instantane) || premCap.instantane) + ') à la '
            + dernCap.version + ' (' + (evoHorodatageLisible(dernCap.instantane) || dernCap.instantane) + '), horodatages de l’Internet Archive.' : '.')],
        ['La version courante (' + m.cerveau.version_site + '), à la Wayback Machine', capCourante ? 'ancré' : 'aucun',
          capCourante ? 'Sa capture figure à la chambre Archives.' : 'Aucune capture de cette version dans la liste à ce chargement ; la capture suit la publication, selon le budget de captures du registre.'],
        ['L’Historique quotidien, chez OpenTimestamps (vers la chaîne Bitcoin)', m.ancrageHistoriqueEnAttente ? 'en attente' : 'ancré',
          m.historiqueJour ? ('Le digest du jour du ' + evoDateIsoLisible(m.historiqueJour.date) + ' (' + tronque(m.historiqueJour.digest)
            + ') a été soumis le jour même ; selon le journal des mises à jour, la confirmation Bitcoin est '
            + (m.ancrageHistoriqueEnAttente ? 'en attente.' : 'revenue.')) : 'Non mesuré ici.']
      ];
      lignesA.forEach(function(L){
        var tr = document.createElement('tr');
        cellule(tr, L[0]);
        var tdE = cellule(tr, L[1]);
        tdE.style.fontWeight = 'bold';
        cellule(tr, L[2]);
        corpsA.appendChild(tr);
      });
    }
    var ulP = el('evo-propositions');
    if(ulP){
      ulP.innerHTML = '';
      m.propositions.forEach(function(p){
        var li = document.createElement('li');
        var b = document.createElement('strong');
        b.textContent = 'Règle ' + p.regle + ' — ' + (p.declenchee ? 'déclenchée' : 'non déclenchée à ce chargement') + '. ';
        li.appendChild(b);
        li.appendChild(document.createTextNode(p.texte));
        ulP.appendChild(li);
      });
    }
    var crois = el('evo-croissance');
    if(crois){
      var dates = Object.keys(m.croissance).sort().reverse();
      crois.textContent = 'La croissance, comptée depuis le journal : ' + dates.map(function(d){
        return 'le ' + evoDateIsoLisible(d) + ' : ' + m.croissance[d] + ' entrée(s)';
      }).join(' ; ') + ' — ' + m.journal.entrees.length + ' entrées en tout.';
    }
    var frise = el('evo-frise');
    if(frise){
      frise.innerHTML = '';
      var titresVus = {};
      m.journal.entrees.slice().reverse().forEach(function(e){
        if(titresVus[e.titre]){ titresVus[e.titre].fusionnees += 1; titresVus[e.titre].pointsTotal += (e.points || []).length; return; }
        var fiche = {fusionnees: 0, pointsTotal: (e.points || []).length};
        titresVus[e.titre] = fiche;
        var li = document.createElement('li');
        var pd = document.createElement('p');
        pd.className = 'petite evo-frise-date';
        pd.textContent = evoDateIsoLisible(e.date);
        li.appendChild(pd);
        var h = document.createElement('h4');
        h.textContent = e.titre;
        li.appendChild(h);
        var pts = e.points || [];
        if(pts.length && pts[0].texte){
          var pp = document.createElement('p');
          pp.textContent = pts[0].texte;
          li.appendChild(pp);
        }
        var pn = document.createElement('p');
        pn.className = 'petite';
        pn.textContent = fiche.pointsTotal + ' point(s) au journal pour ce titre' + (fiche.fusionnees ? ' — ' + (fiche.fusionnees + 1) + ' entrées du journal portent ce titre : la frise les fusionne en une seule (déduplication de la version 55)' : '') + ' — le texte complet se lit au Journal des mises à jour de ce panneau, ci-dessous.';
        li.appendChild(pn);
        frise.appendChild(li);
      });
    }
  }
  function lancer(force){
    if(enCours || (calcule && !force)) return;
    enCours = true;
    evoMesurer(lire).then(function(m){
      rendre(m);
      calcule = true;
      enCours = false;
    }).catch(function(e){
      enCours = false;
      var r = el('evo-resume');
      if(r) r.textContent = 'Le calcul a échoué à ce chargement : un des fichiers du site n’a pas pu être relu (' + e.message + '). L’échec est dit, pas maquillé — rouvrez le panneau ou rechargez la page pour réessayer.';
    });
  }
  var btn = el('evo-recalculer');
  if(btn) btn.addEventListener('click', function(){ lancer(true); });
  function ouvert(){ return panneau.classList.contains('actif'); }
  if(ouvert()) lancer(false);
  if(typeof MutationObserver !== 'undefined'){
    new MutationObserver(function(){ if(ouvert()) lancer(false); }).observe(panneau, {attributes: true, attributeFilter: ['class']});
  }
})();

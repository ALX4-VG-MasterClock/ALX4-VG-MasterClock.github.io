
/* ===== Le cerveau coquillage de l'utilisateur — v41 =====
   Méthode et format : propriété intellectuelle d'Alexandre Vautour Gagnon,
   concepteur indépendant de systèmes et développeur — ORCID 0009-0006-9124-4407 — © 2026, tous droits réservés.
   Aucune donnée du visiteur ne quitte son appareil : cette mémoire vit dans le
   stockage local de ce navigateur, en appendice seulement, scellée par la somme
   des précédents. Recette publique : sceau = SHA-256(sceau précédent + contenu
   canonique) ; digest = SHA-256(digest précédent + sceau) ; genèse = 64 zéros. */
/* === CERVEAU-UTILISATEUR-FONCTIONS-PURES — début === */
var CU_GENESE = '0000000000000000000000000000000000000000000000000000000000000000';
var CU_PROPRIETE = {
  methode: 'Cerveau coquillage numérique — mémoire cumulative scellée par la somme des précédents (SHA-256 chaînés)',
  propriete_intellectuelle: "Alexandre Vautour Gagnon, concepteur indépendant de systèmes et développeur — ORCID 0009-0006-9124-4407 — © 2026, tous droits réservés",
  orcid: '0009-0006-9124-4407',
  site: 'AUDIT UNISSON — Preuve d’Antériorité V-G | SoPHIa'
};
var CU_GESTES = {
  vpn: {categorie: 'masquage', type: 'réseau — VPN ou relais privé', libelle: 'Geste consigné : couche réseau — masquage de l’adresse lue (VPN ou relais privé), posé par l’utilisateur sur son appareil.'},
  temoins: {categorie: 'protection', type: 'navigateur — témoins tiers et suivi bloqués', libelle: 'Geste consigné : couche navigateur — blocage des témoins de tiers et du suivi, posé par l’utilisateur.'},
  autorisations: {categorie: 'protection', type: 'appareil — autorisations révisées', libelle: 'Geste consigné : couche appareil — révision des autorisations des applications, posée par l’utilisateur.'},
  sessions: {categorie: 'protection', type: 'comptes — sessions révisées', libelle: 'Geste consigné : sessions et comptes — révision des sessions ouvertes, posée par l’utilisateur.'},
  regime: {categorie: 'geste', type: 'comparaison des deux régimes consultée', libelle: 'Geste consigné : comparaison des deux régimes (avec récolte / sans récolte) consultée au reçu de visite.'},
  'releve-miroir': {categorie: 'geste', type: 'relevé du miroir scellé', libelle: 'Geste consigné : relevé du miroir — l’empreinte des signaux qu’une simple visite révèle, calculée et scellée par l’utilisateur sur son appareil.'}
};
async function cuSha256Hex(texte) {
  var tampon = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte));
  var octets = new Uint8Array(tampon), hex = '';
  for (var i = 0; i < octets.length; i++) hex += octets[i].toString(16).padStart(2, '0');
  return hex;
}
function cuCanonique(seq, ts, type, contenu) {
  return JSON.stringify({seq: seq, ts: ts, type: type, contenu: contenu});
}
async function cuScellerEntree(prevSceau, prevDigest, seq, ts, type, contenu) {
  var sceau = await cuSha256Hex(prevSceau + cuCanonique(seq, ts, type, contenu));
  var digest = await cuSha256Hex(prevDigest + sceau);
  return {seq: seq, ts: ts, type: type, contenu: contenu, sceau: sceau, digest: digest};
}
async function cuRecalculer(entrees) {
  var prevSceau = CU_GENESE, prevDigest = CU_GENESE;
  for (var i = 0; i < entrees.length; i++) {
    var e = entrees[i];
    if (e.seq !== i) return {ok: false, maillon_rompu: i, raison: 'séquence discontinue', somme_dernier_sain: prevDigest, nombre_sain: i};
    var sceau = await cuSha256Hex(prevSceau + cuCanonique(e.seq, e.ts, e.type, e.contenu));
    if (sceau !== e.sceau) return {ok: false, maillon_rompu: e.seq, raison: 'sceau recalculé différent du sceau consigné', somme_dernier_sain: prevDigest, nombre_sain: i};
    var digest = await cuSha256Hex(prevDigest + sceau);
    if (digest !== e.digest) return {ok: false, maillon_rompu: e.seq, raison: 'digest cumulé différent', somme_dernier_sain: prevDigest, nombre_sain: i};
    prevSceau = sceau; prevDigest = digest;
  }
  return {ok: true, somme: prevDigest, nombre: entrees.length};
}
function cuRetirerDoublonsExacts(entrees) {
  /* v53 — retire les copies exactes et consécutives d'une entrée (les six
     champs égaux à l'entrée précédente conservée). Un doublon exact porte
     le même digest que son original : la somme de pointe ne bouge pas. */
  var propres = [], retires = 0;
  for (var i = 0; i < entrees.length; i++) {
    var e = entrees[i], p = propres.length ? propres[propres.length - 1] : null;
    if (p && e.seq === p.seq && e.ts === p.ts && e.type === p.type && e.contenu === p.contenu && e.sceau === p.sceau && e.digest === p.digest) { retires++; continue; }
    propres.push(e);
  }
  return {entrees: propres, retires: retires};
}
function cuBlocChoix(entrees) {
  /* Bloc MINIMAL (borne d'Alex, 3 nov. 2026) : la catégorie, le type, la date.
     Jamais le détail d'une entrée, jamais le contenu d'une démarche. */
  var elements = [];
  for (var i = 0; i < entrees.length; i++) {
    var e = entrees[i];
    if (e.type !== 'geste') continue;
    var g = null;
    try { g = JSON.parse(e.contenu); } catch (err) { g = null; }
    var meta = (g && CU_GESTES[g.geste]) ? CU_GESTES[g.geste] : {categorie: 'geste', type: 'geste consigné'};
    elements.push({categorie: meta.categorie, type: meta.type, date: String(e.ts).slice(0, 10)});
  }
  return {
    source: 'Choix de l’utilisateur, dérivés de sa propre chaîne (entrées « geste »), régénérés à chaque export — bloc minimal : catégories seulement, aucun détail sensible.',
    etat: elements.length ? 'choix consignés' : 'aucun choix encore',
    elements: elements
  };
}
function cuConstruireExport(entrees, genereLe, avecChoix) {
  var somme = entrees.length ? entrees[entrees.length - 1].digest : CU_GENESE;
  return {
    format: 'cerveau-utilisateur/v1',
    genere_le: genereLe,
    propriete: CU_PROPRIETE,
    choix: (avecChoix === false)
      ? {forme: 'somme seule', detail: 'Bloc « choix » retiré à la demande du visiteur, à cet export. Les choix restent dans les entrées chaînées elles-mêmes.'}
      : cuBlocChoix(entrees),
    somme_exportable: somme,
    nombre_entrees: entrees.length,
    recette: 'sceau = SHA-256(sceau précédent + contenu canonique JSON {seq, ts, type, contenu}) ; digest = SHA-256(digest précédent + sceau) ; genèse = 64 zéros ; la somme exportable est le digest du dernier maillon et tient toute la chaîne.',
    entrees: entrees
  };
}
function cuCertificat(entrees, genereLe) {
  var nombreGestes = 0;
  for (var i = 0; i < entrees.length; i++) if (entrees[i].type === 'geste') nombreGestes++;
  return {
    format: 'certificat-cerveau-utilisateur/v1',
    genere_le: genereLe,
    propriete: CU_PROPRIETE,
    choix: {forme: 'réduit, sans contenu', nombre_gestes_consignes: nombreGestes, detail: 'Le certificat compte les gestes sans jamais les détailler : le détail des choix vit dans l’export complet du cerveau, que seul l’utilisateur détient.'},
    nombre_entrees: entrees.length,
    dernier_maillon: entrees.length ? {seq: entrees[entrees.length - 1].seq, date: entrees[entrees.length - 1].ts} : null,
    somme: entrees.length ? entrees[entrees.length - 1].digest : CU_GENESE,
    attestation: 'Ce certificat atteste l’existence et l’intégrité recalculable d’une mémoire cumulative au moment de sa génération — la somme, sa date, aucun contenu. Il ne tranche pas la vérité de ce que la mémoire contient.'
  };
}
async function cuTesterBris(entrees) {
  if (!entrees.length) return {fait: false, raison: 'chaîne vide — rien à briser, même en copie'};
  var copie = JSON.parse(JSON.stringify(entrees));
  var idx = Math.floor(copie.length / 2);
  copie[idx].contenu = copie[idx].contenu + ' [altération de démonstration — copie seulement]';
  var v = await cuRecalculer(copie);
  return {fait: true, copie_seulement: true, maillon_altere: copie[idx].seq, verdict: v};
}
async function cuSha512Hex(texte) {
  var tampon = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(texte));
  var octets = new Uint8Array(tampon), hex = '';
  for (var i = 0; i < octets.length; i++) hex += octets[i].toString(16).padStart(2, '0');
  return hex;
}
async function cuPreparerJalon(entrees) {
  /* La grammaire des deux empreintes : le SHA-256 unit la chaîne, maillon par
     maillon ; le SHA-512 scelle les grandes étapes — ici, l'état de pointe. */
  var pointe = entrees[entrees.length - 1];
  var empreinte = await cuSha512Hex(pointe.digest + '|' + pointe.sceau);
  return JSON.stringify({etape: 'jalon', au_maillon: pointe.seq, somme: pointe.digest, empreinte_sha512: empreinte});
}
async function cuVerifierJalon(entrees, jalon) {
  for (var i = 0; i < entrees.length; i++) {
    if (entrees[i].seq === jalon.au_maillon) {
      if (entrees[i].digest !== jalon.somme) return false;
      var empreinte = await cuSha512Hex(entrees[i].digest + '|' + entrees[i].sceau);
      return empreinte === jalon.empreinte_sha512;
    }
  }
  return false;
}
function cuEcheance(dateEnvoi, delaiJours) {
  var d = new Date(dateEnvoi + 'T00:00:00');
  d.setDate(d.getDate() + delaiJours);
  var p = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function cuConstruireICS(demarche, genereLe, nombreGestes) {
  function ech(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  var dtstamp = genereLe.replace(/[-:]/g, '').replace(/\.\d+/, '');
  var lignes = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AUDIT UNISSON//Cerveau de l’utilisateur//FR',
    'BEGIN:VEVENT',
    'UID:echeance-' + demarche.id + '@cerveau-utilisateur',
    'DTSTAMP:' + dtstamp,
    'DTSTART;VALUE=DATE:' + demarche.echeance.replace(/-/g, ''),
    'SUMMARY:' + ech('Échéance de réponse — ' + demarche.detenteur + ' (' + demarche.type + ')'),
    'DESCRIPTION:' + ech('Échéance consignée dans le cerveau coquillage de l’utilisateur, sur son appareil. Démarche envoyée le ' + demarche.date_envoi + ' ; délai attendu : ' + demarche.delai_jours + ' jours. Si le délai passe sans réponse : la relance écrite, puis la plainte — voir la Bibliothèque des modèles du site AUDIT UNISSON. Choix consignés dans le cerveau à la génération de ce fichier : ' + nombreGestes + ' geste(s) (détail dans l’export du cerveau, jamais dans ce fichier). Méthode et format : propriété intellectuelle d’Alexandre Vautour Gagnon, ORCID 0009-0006-9124-4407 — © 2026, tous droits réservés.'),
    'END:VEVENT', 'END:VCALENDAR'
  ];
  return lignes.join('\r\n');
}
/* === CERVEAU-UTILISATEUR-FONCTIONS-PURES — fin === */
/* === EXPLICATION-FONCTIONS-PURES — début === */
function exComposerLettre(p) {
  var regimes = {
    prive: {ref: "l'article 12.1 de la Loi sur la protection des renseignements personnels dans le secteur privé (P-39.1)",
            rens: 'renseignements personnels', membre: "un membre du personnel de l'entreprise en mesure de réviser la décision"},
    public: {ref: "l'article 65.2 de la Loi sur l'accès aux documents des organismes publics et sur la protection des renseignements personnels (A-2.1)",
             rens: 'renseignements personnels', membre: "un membre du personnel de l'organisme public en mesure de réviser la décision"},
    sante: {ref: "l'article 65 de la Loi sur les renseignements de santé et de services sociaux (R-22.1)",
            rens: 'renseignements', membre: "un membre du personnel de l'organisme ou à un professionnel qui y exerce sa profession en mesure de réviser la décision"}
  };
  var r = regimes[p.regime] || regimes.prive;
  var lignes = [];
  lignes.push(p.nom || '[ton nom]');
  lignes.push('Le ' + (p.dateLettre || '[date]'));
  lignes.push('');
  lignes.push('À : ' + (p.organisation || "[l'organisation qui a rendu la décision]"));
  lignes.push('');
  lignes.push("Objet : Demande d'explication d'une décision fondée exclusivement sur un traitement automatisé — " + r.ref);
  lignes.push('');
  lignes.push('Madame, Monsieur,');
  lignes.push('');
  var descDecision = (p.description || '[la décision]').replace(/\s+$/, ''); if (!/[.!?…]$/.test(descDecision)) descDecision += '.'; /* v59 — audit tour 6, P2-15 : le gabarit n'ajoute le point que si le texte n'en porte pas déjà un. */
  lignes.push('Vous m’avez informé' + (p.dateDecision ? ' ' + p.dateDecision : '') + ' de la décision suivante : ' + descDecision + " À ma connaissance, cette décision a été rendue exclusivement sur la base d'un traitement automatisé de " + r.rens + ' me concernant.');
  lignes.push('');
  lignes.push('Conformément à ' + r.ref + ', je vous demande de m’informer :');
  lignes.push('1° des ' + r.rens + ' utilisés pour rendre la décision ;');
  lignes.push('2° des raisons, ainsi que des principaux facteurs et paramètres, ayant mené à la décision ;');
  lignes.push('3° de mon droit de faire rectifier les ' + r.rens + ' utilisés pour rendre la décision.');
  if (p.observations) {
    lignes.push('');
    lignes.push("Je demande également qu'il me soit donné l'occasion de présenter mes observations à " + r.membre + '.');
  }
  lignes.push('');
  lignes.push('Je vous remercie de votre attention et je demeure disponible pour toute précision utile à l’identification de mon dossier.');
  lignes.push('');
  lignes.push(p.nom || '[ton nom]');
  lignes.push('');
  lignes.push('— Demande produite avec le générateur du site « Aller chercher » (modèle d’aide à la rédaction ; information générale, pas un avis juridique).');
  return lignes.join('\n');
}
/* === EXPLICATION-FONCTIONS-PURES — fin === */
/* === FOR-FONCTIONS-PURES — début === */
function forComposerLettre(p) {
  var clauses = {
    fr: {
      'for': 'le tribunal étranger prévu par vos conditions d’utilisation',
      arbitrage: 'la clause d’arbitrage de vos conditions d’utilisation',
      autre: 'le motif écrit que vous m’avez transmis'
    },
    en: {
      'for': 'the foreign court designated in your terms of use',
      arbitrage: 'the arbitration clause in your terms of use',
      autre: 'the written ground you sent me'
    }
  };
  var lois = {
    fr: {
      qc: 'la Loi sur la protection des renseignements personnels dans le secteur privé (P-39.1), en ses articles 27 et 30',
      fed: 'la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE)',
      deux: 'la Loi sur la protection des renseignements personnels dans le secteur privé (P-39.1), en ses articles 27 et 30, et la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE)'
    },
    en: {
      qc: 'the Act respecting the protection of personal information in the private sector (P-39.1), sections 27 and 30',
      fed: 'the Personal Information Protection and Electronic Documents Act (PIPEDA)',
      deux: 'the Act respecting the protection of personal information in the private sector (P-39.1), sections 27 and 30, and the Personal Information Protection and Electronic Documents Act (PIPEDA)'
    }
  };
  var delais = {
    fr: {
      qc: 'au plus tard dans les 30 jours de sa réception ; à défaut de réponse dans ce délai, le silence vaut refus',
      fed: 'dans le délai qu’elle prévoit — 30 jours, prolongeable une fois de 30 jours dans les cas qu’elle énonce',
      deux: 'dans le délai que prévoit la loi applicable — au Québec, au plus tard dans les 30 jours de sa réception, le silence valant refus à défaut de réponse'
    },
    en: {
      qc: 'no later than 30 days after you receive it; failing a response within that time, silence counts as a refusal',
      fed: 'within the time it provides — 30 days, extendable once by 30 days in the cases it sets out',
      deux: 'within the time provided by the applicable statute — in Quebec, no later than 30 days after receipt, silence counting as a refusal if no response is given'
    }
  };
  var regulateurs = {
    fr: {
      qc: 'la Commission d’accès à l’information du Québec',
      fed: 'le Commissariat à la protection de la vie privée du Canada',
      deux: 'la Commission d’accès à l’information du Québec et le Commissariat à la protection de la vie privée du Canada'
    },
    en: {
      qc: 'the Commission d’accès à l’information du Québec',
      fed: 'the Office of the Privacy Commissioner of Canada',
      deux: 'the Commission d’accès à l’information du Québec and the Office of the Privacy Commissioner of Canada'
    }
  };
  var L = (p.langue === 'en') ? 'en' : 'fr';
  var clause = (clauses[L][p.clause] || clauses[L]['for']);
  var loi = (lois[L][p.regime] || lois[L].qc);
  var delai = (delais[L][p.regime] || delais[L].qc);
  var regulateur = (regulateurs[L][p.regime] || regulateurs[L].qc);
  var lignes = [];
  if (L === 'fr') {
    lignes.push(p.nom || '[ton nom]');
    lignes.push('Le ' + (p.dateLettre || '[date]'));
    lignes.push('');
    lignes.push('À : ' + (p.plateforme || '[la plateforme]'));
    lignes.push('');
    lignes.push('Objet : Votre refus fondé sur ' + clause + ' — demande d’accès à mes renseignements personnels');
    lignes.push('');
    lignes.push('Madame, Monsieur,');
    lignes.push('');
    lignes.push('Le ' + (p.dateDemande || '[date de ma demande]') + ', je vous ai demandé, par écrit, l’accès aux renseignements personnels que vous détenez à mon sujet. Le ' + (p.dateRefus || '[date du refus]') + ', vous avez refusé de traiter cette demande en invoquant ' + clause + '.');
    lignes.push('');
    lignes.push('Ma demande ne se fonde pas sur vos conditions d’utilisation : elle se fonde sur la loi qui s’applique ici — ' + loi + '. Ces textes ne subordonnent le droit d’accès ni à l’état de mon compte, ni au tribunal que vos conditions désignent : ils visent les renseignements que vous détenez, où que votre contrat prétende les disputer.');
    lignes.push('');
    lignes.push('Je vous demande donc de traiter ma demande au fond et d’y répondre ' + delai + '. À défaut, je porterai le dossier devant ' + regulateur + ', qui examine les refus d’ici.');
    lignes.push('');
    lignes.push('Votre refus et son motif sont consignés, datés, dans ma mémoire personnelle scellée ; ils feront partie du dossier transmis au régulateur.');
    lignes.push('');
    lignes.push(p.nom || '[ton nom]');
    lignes.push('');
    lignes.push('— Lettre composée localement, dans le navigateur, sur le site AUDIT UNISSON — Preuve d’Antériorité V-G | SoPHIa. Méthode et format : propriété intellectuelle d’Alexandre Vautour Gagnon, concepteur indépendant de systèmes et développeur, ORCID 0009-0006-9124-4407 — © 2026, tous droits réservés.');
  } else {
    lignes.push(p.nom || '[your name]');
    lignes.push(p.dateLettre || '[date]');
    lignes.push('');
    lignes.push('To: ' + (p.plateforme || '[the platform]'));
    lignes.push('');
    lignes.push('Re: Your refusal based on ' + clause + ' — request for access to my personal information');
    lignes.push('');
    lignes.push('Dear Sir or Madam,');
    lignes.push('');
    lignes.push('On ' + (p.dateDemande || '[date of my request]') + ', I asked you, in writing, for access to the personal information you hold about me. On ' + (p.dateRefus || '[date of the refusal]') + ', you refused to deal with that request by invoking ' + clause + '.');
    lignes.push('');
    lignes.push('My request does not rest on your terms of use: it rests on the law that applies here — ' + loi + '. Those statutes do not make the right of access depend on the state of my account, or on the court your terms designate: they target the information you hold, wherever your contract claims it should be disputed.');
    lignes.push('');
    lignes.push('I therefore ask you to deal with my request on its merits and to answer it ' + delai + '. Failing that, I will bring the matter before ' + regulateur + ', which examines refusals from here.');
    lignes.push('');
    lignes.push('Your refusal and its ground are recorded, dated, in my own sealed memory; they will form part of the file sent to the regulator.');
    lignes.push('');
    lignes.push(p.nom || '[your name]');
    lignes.push('');
    lignes.push('— Letter composed locally, in the browser, on the AUDIT UNISSON — Proof of Anteriority V-G | SoPHIa site. Method and format: intellectual property of Alexandre Vautour Gagnon, independent engineer, systems designer and developer, ORCID 0009-0006-9124-4407 — © 2026, all rights reserved.');
  }
  return lignes.join('\n');
}
/* === FOR-FONCTIONS-PURES — fin === */
/* === DEC-FONCTIONS-PURES — début === */
/* §A — l'atome-décision : appariement décision → preuve → verdict.
   Fonctions pures, éprouvées sous node au harnais de la tranche. */
function decParserContenu(contenu) {
  if (contenu && typeof contenu === 'object') return contenu;
  try { var c = JSON.parse(String(contenu)); return (c && typeof c === 'object') ? c : null; }
  catch (e) { return null; }
}
function decVerdictCalcule(decision, preuves, aujourdhui) {
  /* decision : objet parsé (peut porter echeance ou date_demande) ;
     preuves : [{type_preuve:'conforme'|'contraire', date}] liées à la décision ;
     aujourdhui : 'YYYY-MM-DD'. Retour : 'respectee' | 'contredite' | 'sans-reponse' | 'en-attente'. */
  var ps = (preuves || []).slice().sort(function (a, b) { return String(a.date || '') < String(b.date || '') ? -1 : 1; });
  if (ps.length) {
    var derniere = ps[ps.length - 1];
    if (derniere.type_preuve === 'conforme') return 'respectee';
    if (derniere.type_preuve === 'contraire') return 'contredite';
  }
  var ech = decision && (decision.echeance || null);
  if (ech && aujourdhui > ech) return 'sans-reponse';
  return 'en-attente';
}
function decLectureHumaine(type, contenu) {
  var c = decParserContenu(contenu);
  if (!c) return '';
  if (type === 'decision') {
    var s = 'Décision consignée : ' + (c.decision || 'sans objet nommé');
    if (c.par) s += ' — de : ' + c.par;
    if (c.effet_attendu) s += '. Effet attendu : ' + c.effet_attendu;
    if (c.echeance) s += '. Échéance : ' + c.echeance;
    return s + '.';
  }
  if (type === 'preuve') {
    return 'Preuve consignée pour la décision nº ' + (c.decision_seq != null ? c.decision_seq : '?') +
      ' : ' + (c.type_preuve === 'conforme' ? 'la réponse va dans le sens de la décision' : 'la réponse contredit la décision') +
      (c.note ? ' — ' + c.note : '') + '.';
  }
  if (type === 'verdict') {
    var v = {respectee: 'respectée', contredite: 'contredite', 'sans-reponse': 'sans réponse à l’échéance'}[c.verdict] || c.verdict || '';
    return 'Verdict scellé : décision ' + v + (c.decision_seq != null ? ' (décision nº ' + c.decision_seq + ')' : '') +
      (c.motif ? ' — ' + c.motif : '') + '.';
  }
  return '';
}
/* === DEC-FONCTIONS-PURES — fin === */

/* === FEN-FONCTIONS-PURES — début === */
/* §L 29 — minuteur de fenêtre : calcul de limite et rappel .ics (règle 7). */
function fenLimite(dateDepartISO, jours) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateDepartISO) || !(jours > 0)) return null;
  var d = new Date(dateDepartISO + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}
function fenICS(objet, dateLimiteISO, description, genereLeISO) {
  if (!dateLimiteISO) return '';
  var compact = dateLimiteISO.replace(/-/g, '');
  var genre = String(genereLeISO || '').replace(/[-:]/g, '').replace(/\..*$/, 'Z');
  function ech(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SoPHIa — site d’Alexandre Vautour Gagnon//Minuteur de fenêtre//FR',
    'BEGIN:VEVENT', 'UID:fenetre-' + compact + '-' + Math.abs(String(objet).split('').reduce(function (a, ch) { return ((a << 5) - a + ch.charCodeAt(0)) | 0; }, 0)) + '@sophia.local',
    'DTSTAMP:' + genre, 'DTSTART;VALUE=DATE:' + compact,
    'SUMMARY:' + ech('Fenêtre qui se ferme : ' + objet),
    'DESCRIPTION:' + ech(description || ''),
    'BEGIN:VALARM', 'TRIGGER:-P2D', 'ACTION:DISPLAY', 'DESCRIPTION:' + ech('La fenêtre se ferme dans deux jours : ' + objet), 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
/* === FEN-FONCTIONS-PURES — fin === */

/* === DET-FONCTIONS-PURES — début === */
/* §L 32 — détecteur d'export partiel : analyse locale, heuristique nommée.
   Une catégorie est « repérée » si l'un de ses mots-clés paraît dans les clés
   du fichier (JSON) ou dans le texte brut. L'absence d'une clé ne prouve pas
   l'absence de la donnée : le résultat le dit, et finit en un droit. */
function detClesJSON(valeur, acc) {
  if (valeur && typeof valeur === 'object') {
    Object.keys(valeur).forEach(function (k) {
      acc.push(String(k).toLowerCase());
      detClesJSON(valeur[k], acc);
    });
  }
  return acc;
}
function detAnalyser(texte, categories) {
  var format = 'texte', cles = null;
  try { var v = JSON.parse(texte); cles = detClesJSON(v, []); format = 'json'; } catch (e) {}
  var foin = cles ? cles.join('\n') : String(texte).toLowerCase();
  var presentes = [], absentes = [];
  (categories || []).forEach(function (cat) {
    var trouve = (cat.mots || []).some(function (m) { return foin.indexOf(String(m).toLowerCase()) !== -1; });
    (trouve ? presentes : absentes).push(cat.nom);
  });
  return {format: format, presentes: presentes, absentes: absentes};
}
function detComposerLettreCompletion(p) {
  var lignes;
  if (p.langue === 'en') {
    lignes = [
      'Subject: Request to complete a partial data export — ' + p.plateforme,
      '',
      'Hello,',
      '',
      'On ' + p.dateDemande + ', I requested access to my personal information and an export of my data from ' + p.plateforme + '. The file I received does not cover all of the categories your own privacy policy declares that you collect.',
      '',
      'Categories declared in your policy that I could not find in the export received:',
      p.absentes.map(function (a) { return '– ' + a; }).join('\n'),
      '',
      'I am asking you to complete the export with those categories, or to tell me in writing, category by category, why each one is not included. A download tool that omits declared categories does not discharge the right of access: the written request stands independently of the tool.',
      '',
      'Name: ' + (p.nom || '[your name]'),
      'Date: ' + p.dateLettre
    ];
  } else {
    lignes = [
      'Objet : Demande de complétion d’un export de données partiel — ' + p.plateforme,
      '',
      'Bonjour,',
      '',
      'Le ' + p.dateDemande + ', j’ai demandé l’accès à mes renseignements personnels et un export de mes données auprès de ' + p.plateforme + '. Le fichier reçu ne couvre pas toutes les catégories que votre propre politique de confidentialité déclare recueillir.',
      '',
      'Catégories déclarées dans votre politique, introuvables dans l’export reçu :',
      p.absentes.map(function (a) { return '– ' + a; }).join('\n'),
      '',
      'Je vous demande de compléter l’export avec ces catégories, ou de m’indiquer par écrit, catégorie par catégorie, pourquoi chacune n’y figure pas. Un outil de téléchargement qui omet des catégories déclarées n’éteint pas le droit d’accès : la demande écrite tient indépendamment de l’outil.',
      '',
      'Nom : ' + (p.nom || '[ton nom]'),
      'Date : ' + p.dateLettre
    ];
  }
  return lignes.join('\n');
}
/* === DET-FONCTIONS-PURES — fin === */
/* === MIR-FONCTIONS-PURES — début === */
/* Idée 44 — miroir des exports : structure lisible d'un fichier machine. */
function mirResumerValeur(valeur, profondeur, lignes, budget) {
  if (budget.n <= 0) return;
  var pad = '';
  for (var i = 0; i < profondeur; i++) pad += '  ';
  if (valeur === null) { lignes.push(pad + 'null'); budget.n--; return; }
  if (Array.isArray(valeur)) {
    lignes.push(pad + '[tableau — ' + valeur.length + ' élément(s)]'); budget.n--;
    if (valeur.length && profondeur < 3) mirResumerValeur(valeur[0], profondeur + 1, lignes, budget);
    return;
  }
  if (typeof valeur === 'object') {
    var cles = Object.keys(valeur);
    lignes.push(pad + '{objet — ' + cles.length + ' clé(s)}'); budget.n--;
    if (profondeur >= 3) return;
    cles.slice(0, 60).forEach(function (k) {
      var v = valeur[k];
      var nature = Array.isArray(v) ? 'tableau(' + v.length + ')' : (v === null ? 'null' : typeof v === 'object' ? 'objet' : typeof v);
      lignes.push(pad + '  · ' + k + ' : ' + nature); budget.n--;
      if (v && typeof v === 'object' && budget.n > 0) mirResumerValeur(v, profondeur + 2, lignes, budget);
    });
    return;
  }
  lignes.push(pad + String(valeur).slice(0, 80)); budget.n--;
}
function mirAnalyser(texte) {
  try {
    var v = JSON.parse(texte);
    var lignes = [];
    mirResumerValeur(v, 0, lignes, {n: 220});
    return {format: 'json', lignes: lignes};
  } catch (e) {}
  var lignesT = String(texte).split(/\r?\n/);
  var premiere = lignesT[0] || '';
  var sep = premiere.indexOf(';') !== -1 ? ';' : ',';
  if (premiere.split(sep).length >= 2 && lignesT.length >= 2) {
    return {format: 'csv', lignes: ['[texte structuré — ' + lignesT.length + ' ligne(s), ' + premiere.split(sep).length + ' colonne(s) à la première ligne]', 'Colonnes : ' + premiere.split(sep).map(function (c) { return c.trim(); }).join(' · ')]};
  }
  return {format: 'texte', lignes: ['[texte — ' + lignesT.length + ' ligne(s), ' + String(texte).length + ' caractère(s)]']};
}
/* === MIR-FONCTIONS-PURES — fin === */

/* === SIL-FONCTIONS-PURES — début === */
/* Idée 45 — le silence consigné : l'annexe de plainte d'une démarche sans réponse. */
function silJoursEntre(debutISO, finISO) {
  var a = new Date(debutISO + 'T12:00:00Z'), b = new Date(finISO + 'T12:00:00Z');
  return Math.max(0, Math.round((b - a) / 86400000));
}
function silComposerAnnexe(d, preuve, aujourdhui, langue) {
  var jours = silJoursEntre(d.echeance, aujourdhui);
  if (langue === 'en') {
    return ['COMPLAINT ANNEX — REQUEST LEFT WITHOUT A REPLY (DEEMED REFUSAL)',
      '',
      'Holder / service: ' + d.detenteur,
      'Request: ' + d.type,
      'Date sent: ' + d.date_envoi,
      'Response deadline: ' + d.echeance,
      'Days past the deadline at the date of this annex: ' + jours,
      d.ref ? 'Request reference: ' + d.ref : null,
      'Proof of sending: ' + (preuve || '[not stated]'),
      '',
      'Statement: the request above was sent on the date stated and its proof of sending is identified above. No reply was received by the deadline, nor at the date of this annex. Under the applicable Act, silence at the deadline is a deemed refusal; this annex is the piece that establishes the request, its sending and the silence, for the complaint it accompanies.',
      '',
      'Annex composed locally, on the user’s device, from their own sealed tracking file — ' + aujourdhui + '.'].filter(function (x) { return x !== null; }).join('\n');
  }
  return ['ANNEXE DE PLAINTE — DEMANDE RESTÉE SANS RÉPONSE (REFUS RÉPUTÉ)',
    '',
    'Détenteur / service : ' + d.detenteur,
    'Demande : ' + d.type,
    'Date d’envoi : ' + d.date_envoi,
    'Échéance de réponse : ' + d.echeance,
    'Jours de dépassement à la date de la présente annexe : ' + jours,
    d.ref ? 'Référence de la demande : ' + d.ref : null,
    'Preuve d’envoi : ' + (preuve || '[non précisée]'),
    '',
    'Déclaration : la demande ci-dessus a été envoyée à la date énoncée et sa preuve d’envoi est identifiée ci-dessus. Aucune réponse n’a été reçue à l’échéance, ni à la date de la présente annexe. Selon la loi applicable, le silence à l’échéance vaut refus réputé ; la présente annexe est la pièce qui établit la demande, son envoi et le silence, pour la plainte qu’elle accompagne.',
    '',
    'Annexe composée localement, sur l’appareil de l’utilisateur, depuis son propre dossier de suivi scellé — ' + aujourdhui + '.'].filter(function (x) { return x !== null; }).join('\n');
}
/* === SIL-FONCTIONS-PURES — fin === */

/* === EFF-FONCTIONS-PURES — début === */
/* Idée 49 — effaceur de métadonnées : lecture EXIF et nettoyage JPEG/PNG,
   sans ré-encodage des pixels, sans aucune dépendance. */
function effParserTIFF(v, base) {
  var little = v.getUint16(base, false) === 0x4949;
  function u16(o) { return v.getUint16(o, little); }
  function u32(o) { return v.getUint32(o, little); }
  var TAILLES = {1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8};
  var sorties = [];
  function ascii(off, n) { var s = ''; for (var i = 0; i < n; i++) { var c = v.getUint8(off + i); if (c === 0) break; s += String.fromCharCode(c); } return s; }
  function rat(off) { var d = u32(off + 4); return d ? u32(off) / d : 0; }
  function lireIFD(off) {
    var entrees = [];
    if (off <= 0 || off + 2 > v.byteLength) return entrees;
    var n = u16(base + off);
    for (var i = 0; i < n; i++) {
      var e = base + off + 2 + i * 12;
      if (e + 12 > v.byteLength) break;
      var type = u16(e + 2), count = u32(e + 4);
      var taille = (TAILLES[type] || 1) * count;
      var dataOff = taille <= 4 ? e + 8 : base + u32(e + 8);
      entrees.push({tag: u16(e), type: type, count: count, dataOff: dataOff, valOff: e + 8});
    }
    return entrees;
  }
  var NOMS = {0x010F: 'Marque de l’appareil', 0x0110: 'Modèle de l’appareil', 0x0131: 'Logiciel', 0x0132: 'Date et heure (fichier)', 0x013B: 'Artiste', 0x010E: 'Description de l’image', 0x0112: 'Orientation'};
  var ifd0 = lireIFD(u32(base + 4));
  var gpsOff = null, exifOff = null;
  ifd0.forEach(function (t) {
    if (NOMS[t.tag] && t.type === 2) sorties.push({nom: NOMS[t.tag], valeur: ascii(t.dataOff, t.count)});
    if (t.tag === 0x8825) gpsOff = u32(t.valOff);
    if (t.tag === 0x8769) exifOff = u32(t.valOff);
  });
  if (exifOff) lireIFD(exifOff).forEach(function (t) {
    if (t.tag === 0x9003 && t.type === 2) sorties.push({nom: 'Date et heure de la prise', valeur: ascii(t.dataOff, t.count)});
    if (t.tag === 0x9286) sorties.push({nom: 'Commentaire utilisateur', valeur: '(présent)'});
  });
  if (gpsOff) {
    var g = {};
    lireIFD(gpsOff).forEach(function (t) { g[t.tag] = t; });
    if (g[2] && g[4]) {
      function dms(t) { return rat(t.dataOff) + rat(t.dataOff + 8) / 60 + rat(t.dataOff + 16) / 3600; }
      var lat = dms(g[2]) * (g[1] && ascii(g[1].dataOff, g[1].count) === 'S' ? -1 : 1);
      var lon = dms(g[4]) * (g[3] && ascii(g[3].dataOff, g[3].count) === 'W' ? -1 : 1);
      sorties.push({nom: 'Position GPS', valeur: lat.toFixed(5) + ', ' + lon.toFixed(5) + ' — le lieu de la prise, dans le fichier'});
    } else sorties.push({nom: 'Données GPS', valeur: '(présentes, incomplètes)'});
  }
  return sorties;
}
function effLireJPEG(buf) {
  var v = new DataView(buf);
  if (buf.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return null;
  var tags = [], off = 2;
  while (off + 4 <= buf.byteLength) {
    var marqueur = v.getUint16(off);
    if (marqueur === 0xFFDA) break;
    if ((marqueur & 0xFF00) !== 0xFF00) break;
    var len = v.getUint16(off + 2);
    if (marqueur === 0xFFE1) {
      var tete = '';
      for (var i = 0; i < 6 && off + 4 + i < buf.byteLength; i++) tete += String.fromCharCode(v.getUint8(off + 4 + i));
      if (tete.indexOf('Exif') === 0) tags = tags.concat(effParserTIFF(v, off + 10));
      else tags.push({nom: 'Segment XMP (APP1)', valeur: '(présent — retiré dans la copie nettoyée)'});
    }
    if (marqueur === 0xFFFE) tags.push({nom: 'Commentaire JPEG (COM)', valeur: '(présent — retiré dans la copie nettoyée)'});
    off += 2 + len;
  }
  return tags;
}
function effNettoyerJPEG(buf) {
  var v = new DataView(buf);
  if (buf.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return null;
  var morceaux = [new Uint8Array(buf.slice(0, 2))], off = 2, retires = 0;
  while (off + 4 <= buf.byteLength) {
    var marqueur = v.getUint16(off);
    if (marqueur === 0xFFDA) { morceaux.push(new Uint8Array(buf.slice(off))); break; }
    if ((marqueur & 0xFF00) !== 0xFF00) { morceaux.push(new Uint8Array(buf.slice(off))); break; }
    var len = v.getUint16(off + 2);
    if (marqueur === 0xFFE1 || marqueur === 0xFFFE) retires++;
    else morceaux.push(new Uint8Array(buf.slice(off, off + 2 + len)));
    off += 2 + len;
  }
  var total = morceaux.reduce(function (a, m) { return a + m.length; }, 0);
  var out = new Uint8Array(total), pos = 0;
  morceaux.forEach(function (m) { out.set(m, pos); pos += m.length; });
  return {donnees: out, retires: retires};
}
function effLirePNG(buf) {
  var v = new DataView(buf);
  var sig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (var i = 0; i < 8; i++) if (v.getUint8(i) !== sig[i]) return null;
  var tags = [], off = 8;
  while (off + 12 <= buf.byteLength) {
    var len = v.getUint32(off);
    var type = '';
    for (var j = 0; j < 4; j++) type += String.fromCharCode(v.getUint8(off + 4 + j));
    if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
      var cle = '';
      for (var k = 0; k < len; k++) { var c = v.getUint8(off + 8 + k); if (c === 0) break; cle += String.fromCharCode(c); }
      tags.push({nom: 'Texte PNG (' + type + ')', valeur: 'clé : ' + cle});
    }
    if (type === 'eXIf') tags.push({nom: 'Profil EXIF (eXIf)', valeur: '(présent — retiré dans la copie nettoyée)'});
    if (type === 'tIME') tags.push({nom: 'Horodatage PNG (tIME)', valeur: '(présent — retiré dans la copie nettoyée)'});
    off += 12 + len;
    if (type === 'IEND') break;
  }
  return tags;
}
function effNettoyerPNG(buf) {
  var v = new DataView(buf);
  var sig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (var i = 0; i < 8; i++) if (v.getUint8(i) !== sig[i]) return null;
  var RETIRES = {eXIf: 1, tEXt: 1, iTXt: 1, zTXt: 1, tIME: 1};
  var morceaux = [new Uint8Array(buf.slice(0, 8))], off = 8, retires = 0;
  while (off + 12 <= buf.byteLength) {
    var len = v.getUint32(off);
    var type = '';
    for (var j = 0; j < 4; j++) type += String.fromCharCode(v.getUint8(off + 4 + j));
    if (RETIRES[type]) retires++;
    else morceaux.push(new Uint8Array(buf.slice(off, off + 12 + len)));
    off += 12 + len;
    if (type === 'IEND') break;
  }
  var total = morceaux.reduce(function (a, m) { return a + m.length; }, 0);
  var out = new Uint8Array(total), pos = 0;
  morceaux.forEach(function (m) { out.set(m, pos); pos += m.length; });
  return {donnees: out, retires: retires};
}
/* === EFF-FONCTIONS-PURES — fin === */




(function () {
  if (typeof document === 'undefined') return;
  var CLE = 'cerveau-utilisateur-v1';
  var etat = null, efface = false, dernierRecu = null;
  function $(id) { return document.getElementById(id); }
  function lire() {
    try { var brut = localStorage.getItem(CLE); return brut ? JSON.parse(brut) : null; } catch (e) { return null; }
  }
  function ecrire() {
    try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) {}
  }
  function maintenant() { return new Date().toISOString(); }
  async function ajouter(type, contenu) {
    var entrees = etat.entrees;
    var tsCandidat = maintenant();
    var derniere = entrees.length ? entrees[entrees.length - 1] : null;
    /* Garde anti-doublon (v53) : le même événement déclenché deux fois dans
       la même milliseconde (même ts, même type, même contenu que la dernière
       entrée) ne s'inscrit qu'une fois — on retourne la dernière entrée. */
    if (derniere && derniere.ts === tsCandidat && derniere.type === type && derniere.contenu === contenu) return derniere;
    var prevS = derniere ? derniere.sceau : CU_GENESE;
    var prevD = derniere ? derniere.digest : CU_GENESE;
    var e = await cuScellerEntree(prevS, prevD, entrees.length, tsCandidat, type, contenu);
    entrees.push(e); ecrire();
    /* Jalon SHA-512 automatique à chaque dizaine d'entrées : la grande étape
       se scelle dans la foulée, sur l'état qu'elle suit. */
    if (type !== 'jalon' && entrees.length % 10 === 0) {
      await ajouter('jalon', await cuPreparerJalon(entrees));
    }
    return e;
  }
  async function init() {
    etat = lire();
    /* v53 — réparation des doublons exacts, au chargement : si la chaîne
       stockée porte des copies identiques et consécutives d'un maillon, on
       les retire — mais seulement si la chaîne réparée, recalculée, est
       INTÈGRE et sa somme identique à celle d'avant réparation. Sinon, on
       ne touche à rien : le verdict le dira. */
    if (etat && Array.isArray(etat.entrees) && etat.entrees.length) {
      var dedupInit = cuRetirerDoublonsExacts(etat.entrees);
      if (dedupInit.retires > 0) {
        var sommeAvantInit = etat.entrees[etat.entrees.length - 1].digest;
        var vInit = await cuRecalculer(dedupInit.entrees);
        if (vInit.ok && vInit.somme === sommeAvantInit) {
          etat.entrees = dedupInit.entrees;
          etat.reparation = {doublons_retires: dedupInit.retires, le: maintenant(), somme_apres: vInit.somme, origine: 'chargement'};
          ecrire();
        }
      }
    }
    if (!etat && !efface) {
      etat = {format: 'cerveau-utilisateur/v1', cree_le: maintenant(), entrees: [], derniere_somme_exportee: null};
      ecrire();
      await ajouter('genese', "Genèse de ce cerveau — initialisée à la visite du " + etat.cree_le.slice(0, 10) + ", sur cet appareil, à la demande de son utilisateur. La méthode : propriété intellectuelle d'Alexandre Vautour Gagnon (ORCID 0009-0006-9124-4407). Aucun choix consigné encore : le bloc « choix » des artefacts le dira, jamais en silence.");
    }
    await rendre();
  }
  function telecharger(nom, contenuTexte, typeMime) {
    var blob = new Blob([contenuTexte], {type: typeMime || 'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nom;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }
  async function rendre() {
    if (!$('cv-etat')) return;
    if (efface) { $('cv-etat').textContent = 'Ton cerveau est effacé sur cet appareil.'; $('cv-verdict').textContent = ''; if ($('cv-reparation')) $('cv-reparation').innerHTML = ''; $('cv-somme').textContent = '—'; if ($('cv-liste')) $('cv-liste').innerHTML = ''; if ($('suivi-liste')) $('suivi-liste').innerHTML = ''; return; }
    var entrees = etat.entrees;
    var v = await cuRecalculer(entrees);
    $('cv-etat').textContent = entrees.length + ' entrée(s) dans ta chaîne, créée le ' + String(etat.cree_le).slice(0, 10) + ' sur cet appareil.';
    if (v.ok) {
      $('cv-verdict').innerHTML = '<span class="verdict-ok">Verdict du recalcul : chaîne INTÈGRE — chaque sceau et chaque digest recalculés correspondent.</span>';
    } else {
      var iR = v.maillon_rompu, eR = entrees[iR], eP = iR > 0 ? entrees[iR - 1] : null;
      var estDoublon = !!(eR && eP && eR.seq === eP.seq && eR.ts === eP.ts && eR.type === eP.type && eR.contenu === eP.contenu && eR.sceau === eP.sceau && eR.digest === eP.digest);
      $('cv-verdict').innerHTML = estDoublon
        ? '<span class="verdict-ecart">Verdict du recalcul : la chaîne porte un ou des doublons exacts (le maillon ' + iR + ' répète le précédent) — ce n’est pas une altération : aucun sceau n’est faux, et la somme du dernier maillon sain borne ce qui reste attesté. La réparation automatique n’a pas pu être appliquée à cette chaîne ; l’export, lui, reste recalculable.</span>'
        : '<span class="verdict-ecart">Verdict du recalcul : chaîne ROMPUE au maillon ' + v.maillon_rompu + ' (' + v.raison + '). La somme du dernier maillon sain borne ce qui reste attesté.</span>';
    }
    var repEl = $('cv-reparation');
    if (repEl) {
      if (etat.reparation && etat.reparation.doublons_retires > 0) {
        repEl.innerHTML = '<span class="verdict-ok">Chaîne réparée : ' + etat.reparation.doublons_retires + ' doublon(s) exact(s) retiré(s) le ' + String(etat.reparation.le).slice(0, 10) + ' — ta somme n’a pas bougé : <span class="mono">' + String(etat.reparation.somme_apres).slice(0, 16) + '…</span></span>';
      } else repEl.innerHTML = '';
    }
    $('cv-somme').textContent = entrees.length ? entrees[entrees.length - 1].digest : CU_GENESE;
    rendreGestes(); rendreListe(); rendreSuivi(); rendreDecisionsV43();
  }
  function rendreGestes() {
    document.querySelectorAll('[data-geste-etat]').forEach(function (span) {
      var k = span.getAttribute('data-geste-etat'), trouve = null;
      etat.entrees.forEach(function (e) {
        if (e.type !== 'geste') return;
        try { var g = JSON.parse(e.contenu); if (g.geste === k) trouve = e; } catch (err) {}
      });
      span.textContent = trouve ? 'Consigné le ' + String(trouve.ts).slice(0, 10) + ' (maillon ' + trouve.seq + ').' : 'Pas encore consigné.';
    });
  }
  function rendreListe() {
    var zone = $('cv-liste'); if (!zone) return;
    if (!etat.entrees.length) { zone.innerHTML = '<p class="petite">Aucune entrée pour le moment.</p>'; return; }
    zone.innerHTML = etat.entrees.map(function (e) {
      var apercu = e.contenu.length > 140 ? e.contenu.slice(0, 140) + '…' : e.contenu;
      var humaine = '';
      try { humaine = decLectureHumaine(e.type, e.contenu); } catch (err) {}
      return '<div class="cv-entree"><strong>Maillon ' + e.seq + '</strong> · ' + e.type + ' · ' + String(e.ts).slice(0, 10) + '<br>' +
        (humaine ? '<span class="lecture-humaine">' + humaine.replace(/</g, '&lt;') + '</span><br>' : '') +
        apercu.replace(/</g, '&lt;') + '<br><span class="mono">sceau ' + e.sceau.slice(0, 16) + '… · digest ' + e.digest.slice(0, 16) + '…</span></div>';
    }).join('');
  }
  function demarches() {
    var parId = {};
    etat.entrees.forEach(function (e) {
      var c = null; try { c = JSON.parse(e.contenu); } catch (err) {}
      if (!c) return;
      if (e.type === 'demarche') parId[c.id] = {d: c, reponse: null};
      if (e.type === 'demarche-reponse' && parId[c.demarche_id]) parId[c.demarche_id].reponse = c;
    });
    return Object.keys(parId).map(function (k) { return parId[k]; });
  }
  function rendreSuivi() {
    var zone = $('suivi-liste'); if (!zone) return;
    var ds = demarches();
    if (!ds.length) { zone.innerHTML = '<p class="petite">Aucune démarche consignée pour le moment.</p>'; return; }
    var auj = new Date().toISOString().slice(0, 10);
    zone.innerHTML = ds.map(function (item) {
      var d = item.d, lignes = '';
      var passee = !item.reponse && d.echeance < auj;
      lignes += '<div class="cv-entree"><strong>' + d.detenteur.replace(/</g, '&lt;') + '</strong> — ' + d.type +
        '<br>Envoyée le ' + d.date_envoi + ' · échéance : ' + d.echeance + (d.ref ? ' · référence : ' + d.ref.replace(/</g, '&lt;') : '');
      if (item.reponse) lignes += '<br><span class="verdict-ok">Réponse consignée le ' + item.reponse.date + '.</span>';
      else if (passee) lignes += '<br><span class="verdict-ecart">Le délai est passé sans réponse consignée.</span> Geste suivant : la relance écrite, puis la plainte — les modèles sont à la Bibliothèque des modèles, les recours au panneau Mes renseignements.';
      else lignes += '<br>En attente de réponse, dans le délai.';
      lignes += '<br><button type="button" class="secondaire" data-ics="' + d.id + '">Télécharger le rappel d’échéance (.ics)</button>';
      if (!item.reponse) lignes += ' <button type="button" class="secondaire" data-reponse="' + d.id + '">Consigner la réponse reçue</button>';
      if (passee) lignes += ' <button type="button" class="secondaire" data-refus="' + d.id + '">Consigner ce silence comme un non</button>';
      return lignes + '</div>';
    }).join('');
    zone.querySelectorAll('[data-ics]').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = null; demarches().forEach(function (it) { if (it.d.id === b.getAttribute('data-ics')) d = it.d; });
        if (!d) return;
        var nb = 0; etat.entrees.forEach(function (e) { if (e.type === 'geste') nb++; });
        telecharger('echeance-' + d.id + '.ics', cuConstruireICS(d, maintenant(), nb), 'text/calendar');
      });
    });
    zone.querySelectorAll('[data-reponse]').forEach(function (b) {
      b.addEventListener('click', async function () {
        await ajouter('demarche-reponse', JSON.stringify({demarche_id: b.getAttribute('data-reponse'), date: new Date().toISOString().slice(0, 10), note: 'Réponse consignée par l’utilisateur depuis son dossier de suivi.'}));
        await rendre();
      });
    });
    zone.querySelectorAll('[data-refus]').forEach(function (b) {
      b.addEventListener('click', async function () {
        /* Le registre des non : un silence au-delà du délai est un fait, il se consigne. */
        await ajouter('refus', JSON.stringify({demarche_id: b.getAttribute('data-refus'), motif: 'silence du détenteur au-delà du délai de réponse', date: new Date().toISOString().slice(0, 10)}));
        await rendre();
      });
    });
  }
  /* --- Le reçu de visite --- */
  function lignesRecu() {
    var lignes = [];
    function aj(nom, valeur) { lignes.push({nom: nom, valeur: String(valeur)}); }
    aj('Langue du navigateur', navigator.language || 'non exposée');
    aj('Langues préférées', (navigator.languages || []).join(', ') || 'non exposées');
    aj('Fuseau horaire', (Intl.DateTimeFormat().resolvedOptions().timeZone || 'non exposé'));
    aj('Heure locale lue', new Date().toLocaleString('fr-CA'));
    aj('Écran (largeur × hauteur)', screen.width + ' × ' + screen.height);
    aj('Fenêtre (largeur × hauteur)', window.innerWidth + ' × ' + window.innerHeight);
    aj('Profondeur de couleur', screen.colorDepth + ' bits');
    aj('Points de contact tactiles', navigator.maxTouchPoints);
    aj('Plateforme déclarée', navigator.platform || 'non exposée');
    aj('Navigateur déclaré (user agent)', navigator.userAgent);
    aj('Signal Global Privacy Control (GPC)', typeof navigator.globalPrivacyControl === 'boolean' ? String(navigator.globalPrivacyControl) : 'non exposé par ce navigateur');
    aj('Signal Do Not Track (DNT)', navigator.doNotTrack === null || typeof navigator.doNotTrack === 'undefined' ? 'non exposé' : navigator.doNotTrack);
    aj('Témoins autorisés par le réglage du navigateur', navigator.cookieEnabled ? 'oui' : 'non');
    aj('Mémoire de l’appareil déclarée (arrondie, si exposée)', typeof navigator.deviceMemory === 'number' ? '≈ ' + navigator.deviceMemory + ' Go' : 'non exposée');
    aj('Cœurs de processeur déclarés (si exposés)', typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : 'non exposé');
    aj('En ligne en ce moment', navigator.onLine ? 'oui' : 'non');
    var theme = null;
    try { theme = localStorage.getItem('sophia-theme'); } catch (e) {}
    aj('Ce que CE site stocke sur cet appareil', theme ? "la préférence de thème « " + theme + " » (posée par le site si tu changes le thème)" : "rien en ce moment — la préférence de thème n'apparaît que si tu changes le thème");
    return lignes;
  }
  async function genererRecu() {
    var lignes = lignesRecu();
    var corps = $('recu-table-vue').querySelector('tbody');
    corps.innerHTML = lignes.map(function (l) {
      return '<tr><th>' + l.nom.replace(/</g, '&lt;') + '</th><td>' + l.valeur.replace(/</g, '&lt;') + '</td></tr>';
    }).join('');
    var canon = lignes.map(function (l) { return l.nom + ' = ' + l.valeur; }).join('\n');
    var empreinte = await cuSha256Hex(canon);
    dernierRecu = {genere_le: maintenant(), lignes: lignes, empreinte: empreinte, trace_appel: null};
    $('recu-empreinte').textContent = empreinte;
    $('recu-zone').hidden = false;
  }
  function brancher() {
    if ($('recu-generer')) $('recu-generer').addEventListener('click', genererRecu);
    if ($('recu-demo-mettre')) $('recu-demo-mettre').addEventListener('click', async function () {
      var zone = $('recu-trace'); var debut = performance.now();
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=45.24915&longitude=-73.7989&current=temperature_2m&forecast_days=1';
      zone.textContent = 'Appel en cours…';
      try {
        var r = await fetch(url);
        var duree = Math.round(performance.now() - debut);
        var trace = {service: 'api.open-meteo.com', url: url, envoye: 'la requête elle-même — des coordonnées publiques (l’ancrage de Sainte-Martine du site), aucune donnée de ta visite', statut: r.status, duree_ms: duree};
        if (dernierRecu) dernierRecu.trace_appel = trace;
        zone.innerHTML = 'Trace réelle de l’appel :<br>· service appelé : api.open-meteo.com<br>· ce qui est parti : la requête elle-même — des coordonnées publiques, aucune donnée de ta visite<br>· statut reçu : ' + r.status + '<br>· durée : ' + duree + ' ms<br>Cet appel est celui que le site fait déjà pour son ancrage météo — il est montré ici en entier, comme exemple vivant.';
      } catch (e) {
        if (dernierRecu) dernierRecu.trace_appel = {service: 'api.open-meteo.com', url: url, statut: 'échec réseau', erreur: String(e)};
        zone.textContent = 'L’appel météo a échoué de ce bord (réseau ou service injoignable) : le reçu le dit tel quel — jamais de trace simulée présentée comme réelle.';
      }
    });
    if ($('recu-regime-consigner')) $('recu-regime-consigner').addEventListener('click', async function () {
      await ajouter('geste', JSON.stringify({geste: 'regime'}));
      this.textContent = 'Consigné dans ton cerveau (maillon ajouté).';
      await rendre();
    });
    if ($('recu-consigner')) $('recu-consigner').addEventListener('click', async function () {
      if (!dernierRecu) return;
      await ajouter('recu', JSON.stringify(dernierRecu));
      this.textContent = 'Reçu consigné dans ton cerveau (maillon ajouté).';
      await rendre();
    });
    if ($('recu-telecharger')) $('recu-telecharger').addEventListener('click', function () {
      if (!dernierRecu) return;
      var doc = {
        format: 'recu-de-visite/v1', genere_le: dernierRecu.genere_le,
        propriete: CU_PROPRIETE, choix: cuBlocChoix(etat.entrees),
        empreinte: dernierRecu.empreinte,
        blocs: {
          vu_par_la_page: dernierRecu.lignes,
          recu_par_tout_serveur: 'Ton adresse IP et la requête elle-même (page demandée, heure, navigateur déclaré). Une adresse IP situe grossièrement : le fournisseur d’accès et l’agglomération, pas une adresse civique. Un VPN déplace cette position lue.',
          retenu_par_ce_site: 'Rien : aucun témoin de suivi, aucun identifiant, aucune journalisation des visites du bord du site. Stockage local, nommé : sophia-theme (thème), sophia-fil-code (code du fil), cerveau-utilisateur-v1 (ton cerveau local, si tu l’as créé) — sur ton appareil.',
          appels_sortants: dernierRecu.trace_appel || 'Aucun appel de démonstration n’a été fait pendant la génération de ce reçu — le bloc le dit, plutôt que d’inventer une trace.'
        }
      };
      telecharger('recu-de-visite.json', JSON.stringify(doc, null, 2));
    });
    document.querySelectorAll('[data-consigner-geste]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var k = b.getAttribute('data-consigner-geste');
        var fait = $('geste-' + k + '-fait');
        if (fait && !fait.checked) { alert('Coche d’abord « je l’ai fait » : on ne consigne que les gestes réellement posés.'); return; }
        await ajouter('geste', JSON.stringify({geste: k}));
        await rendre();
      });
    });
    if ($('cv-recalculer')) $('cv-recalculer').addEventListener('click', async function () {
      var v = await cuRecalculer(etat.entrees);
      var somme = etat.entrees.length ? etat.entrees[etat.entrees.length - 1].digest : CU_GENESE;
      var rep = 'Recalcul à l’instant : ' + (v.ok ? 'chaîne INTÈGRE' : 'chaîne ROMPUE au maillon ' + v.maillon_rompu) + ' — somme de pointe ' + somme.slice(0, 16) + '…';
      if (etat.derniere_somme_exportee) rep += ' Dernière somme exportée de cet appareil : ' + etat.derniere_somme_exportee.slice(0, 16) + '…' + (etat.derniere_somme_exportee === somme ? ' — identique : rien n’a bougé depuis cet export.' : ' — différente : la chaîne a grandi depuis cet export, ce qui est sa croissance normale si les ajouts sont les tiens.');
      $('cv-recalcul-detail').textContent = rep;
      await rendre();
    });
    function exporterDoc(avecChoix) {
      var doc = cuConstruireExport(etat.entrees, maintenant(), avecChoix);
      etat.derniere_somme_exportee = doc.somme_exportable; ecrire();
      telecharger(avecChoix ? 'cerveau-utilisateur-export.json' : 'cerveau-utilisateur-export-somme-seule.json', JSON.stringify(doc, null, 2));
    }
    async function testerBrisDans(zone) {
      var r = await cuTesterBris(etat.entrees);
      if (!r.fait) { zone.textContent = r.raison + '.'; return; }
      zone.innerHTML = 'Test du bris, sur une copie seulement — ta vraie chaîne n’a pas été touchée.<br>Maillon altéré dans la copie : ' + r.maillon_altere + '.<br>Verdict du recalcul de la copie : <span class="verdict-ecart">chaîne ROMPUE au maillon ' + r.verdict.maillon_rompu + '</span> (' + r.verdict.raison + ').<br>Somme du dernier maillon sain de la copie : <span class="mono">' + r.verdict.somme_dernier_sain + '</span> — c’est elle qui borne ce qui resterait attesté.';
    }
    if ($('cv-exporter')) $('cv-exporter').addEventListener('click', function () { exporterDoc(true); });
    if ($('cv-exporter-somme')) $('cv-exporter-somme').addEventListener('click', function () { exporterDoc(false); });
    if ($('cv-import-fichier')) $('cv-import-fichier').addEventListener('change', async function () {
      var f = this.files && this.files[0]; if (!f) return;
      var zone = $('cv-import-verdict');
      try {
        var doc = JSON.parse(await f.text());
        if (doc.format !== 'cerveau-utilisateur/v1' || !Array.isArray(doc.entrees)) { zone.textContent = 'Ce fichier n’est pas un export « cerveau-utilisateur/v1 » : reprise refusée.'; return; }
        var v = await cuRecalculer(doc.entrees);
        var reparationImport = 0;
        if (!v.ok) {
          /* v53 — si le seul écart est des doublons exacts, la réparation est
             proposée ici plutôt que le refus sec : on ne l'applique que si la
             chaîne sans les copies recalculée est INTÈGRE et sa somme égale
             à la somme déclarée par l'export. */
          var dedupImp = cuRetirerDoublonsExacts(doc.entrees);
          var vImp = dedupImp.retires > 0 ? await cuRecalculer(dedupImp.entrees) : null;
          if (vImp && vImp.ok && doc.somme_exportable === vImp.somme) {
            doc.entrees = dedupImp.entrees; v = vImp; reparationImport = dedupImp.retires;
          } else {
            zone.innerHTML = '<span class="verdict-ecart">Reprise refusée : la chaîne importée est ROMPUE au maillon ' + v.maillon_rompu + ' (' + v.raison + ').' + (dedupImp.retires > 0 ? ' Elle contient ' + dedupImp.retires + ' doublon(s) exact(s), mais la chaîne sans eux ne vérifie pas non plus : la réparation ne peut pas être appliquée.' : '') + ' La somme du dernier maillon sain — ' + v.somme_dernier_sain + ' — borne ce qui reste attesté dans ce fichier.</span>'; return;
          }
        }
        if (doc.somme_exportable !== v.somme) { zone.textContent = 'Reprise refusée : la somme déclarée par l’export ne correspond pas à la somme recalculée.'; return; }
        etat = {format: 'cerveau-utilisateur/v1', cree_le: doc.genere_le || maintenant(), entrees: doc.entrees, derniere_somme_exportee: doc.somme_exportable};
        if (reparationImport > 0) etat.reparation = {doublons_retires: reparationImport, le: maintenant(), somme_apres: v.somme, origine: 'import'};
        ecrire();
        zone.innerHTML = '<span class="verdict-ok">Reprise faite : la somme décide — chaîne importée INTÈGRE, ' + v.nombre + ' entrée(s), somme ' + v.somme.slice(0, 16) + '… adoptée sur cet appareil.' + (reparationImport > 0 ? ' L’export contenait ' + reparationImport + ' doublon(s) exact(s) : retirés à la reprise — ta somme n’a pas bougé, c’est la somme déclarée par l’export, recalculée.' : '') + '</span>';
        await rendre();
      } catch (e) { zone.textContent = 'Lecture impossible de ce fichier : reprise refusée.'; }
    });
    if ($('cv-cert-telecharger')) $('cv-cert-telecharger').addEventListener('click', function () {
      telecharger('certificat-cerveau-utilisateur.json', JSON.stringify(cuCertificat(etat.entrees, maintenant()), null, 2));
    });
    if ($('cv-verificateur')) $('cv-verificateur').addEventListener('click', function () {
      var source = '';
      document.querySelectorAll('script').forEach(function (s) {
        var t = s.textContent || '';
        var md = t.indexOf('CERVEAU-UTILISATEUR-FONCTIONS-PURES — début');
        var mf = t.indexOf('CERVEAU-UTILISATEUR-FONCTIONS-PURES — fin');
        if (md >= 0 && mf > md) {
          var a = t.indexOf('*/', md) + 2;
          var b2 = t.lastIndexOf('/*', mf);
          if (a > 1 && b2 > a) source = t.slice(a, b2);
        }
      });
      var htmlVerif = '<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n' +
        '<!-- Vérificateur autonome du cerveau de l’utilisateur — AUDIT UNISSON. Méthode et format : propriété intellectuelle d’Alexandre Vautour Gagnon, concepteur indépendant de systèmes et développeur, ORCID 0009-0006-9124-4407 — © 2026, tous droits réservés. Ce fichier recalcule la somme d’un export « cerveau-utilisateur/v1 », même sans le site. Aucune donnée ne quitte l’appareil : tout se calcule dans cette page. -->\n' +
        '<title>Vérificateur autonome — cerveau de l’utilisateur</title>\n</head>\n<body>\n' +
        '<h1>Vérificateur autonome — la somme décide</h1>\n' +
        '<p>Donne-lui un export « cerveau-utilisateur/v1 » : il recalcule chaque sceau et chaque digest, et dit si la chaîne est intacte. Rien n’est transmis : ce fichier travaille seul, hors ligne.</p>\n' +
        '<p><input type="file" id="f" accept=".json,application/json"></p>\n<pre id="sortie">En attente d’un export…</pre>\n' +
        '<scr' + 'ipt>\n' + source + '\n' +
        'document.getElementById("f").addEventListener("change", async function () {\n' +
        '  var sortie = document.getElementById("sortie");\n' +
        '  try {\n' +
        '    var doc = JSON.parse(await this.files[0].text());\n' +
        '    if (doc.format !== "cerveau-utilisateur/v1") { sortie.textContent = "Format non reconnu : ce n’est pas un export cerveau-utilisateur/v1."; return; }\n' +
        '    var v = await cuRecalculer(doc.entrees);\n' +
        '    var lignes = [];\n' +
        '    lignes.push("Provenance — méthode : " + (doc.propriete ? doc.propriete.propriete_intellectuelle : "absente"));\n' +
        '    lignes.push("Choix de l’utilisateur : " + (doc.choix ? (doc.choix.etat || doc.choix.forme || "présent") : "absent"));\n' +
        '    lignes.push(v.ok ? "Verdict : chaîne INTÈGRE — " + v.nombre + " entrée(s), somme recalculée " + v.somme : "Verdict : chaîne ROMPUE au maillon " + v.maillon_rompu + " (" + v.raison + ") — somme du dernier maillon sain : " + v.somme_dernier_sain);\n' +
        '    if (!v.ok) { var dd = cuRetirerDoublonsExacts(doc.entrees); if (dd.retires > 0) { var vv = await cuRecalculer(dd.entrees); lignes.push(vv.ok && vv.somme === doc.somme_exportable ? "Doublons exacts : " + dd.retires + " copie(s) retirée(s) — la chaîne sans eux vérifie INTÈGRE et la somme correspond : un doublon n’est pas une rupture." : "Doublons exacts présents (" + dd.retires + "), mais la chaîne sans eux ne vérifie pas."); } }\n' +
        '    lignes.push("Somme déclarée par l’export : " + doc.somme_exportable);\n' +
        '    lignes.push(v.ok && doc.somme_exportable === v.somme ? "La somme déclarée correspond à la somme recalculée." : "ÉCART entre la somme déclarée et la somme recalculée.");\n' +
        '    sortie.textContent = lignes.join("\\n");\n' +
        '  } catch (e) { sortie.textContent = "Lecture impossible : " + e; }\n' +
        '});\n' +
        '<\/script>\n</body>\n</html>';
      telecharger('verificateur-cerveau-utilisateur.html', htmlVerif, 'text/html');
    });
    if ($('cv-bris')) $('cv-bris').addEventListener('click', function () { testerBrisDans($('cv-bris-resultat')); });
    if ($('cv-effacer')) $('cv-effacer').addEventListener('click', async function () {
      if (!confirm('Effacer définitivement ton cerveau sur cet appareil ? La chaîne locale sera perdue (un export gardé ailleurs reste recalculable).')) return;
      if (!confirm('Confirme une seconde fois : effacement immédiat et sans retour.')) return;
      try { localStorage.removeItem(CLE); } catch (e) {}
      efface = true; etat = {format: 'cerveau-utilisateur/v1', cree_le: maintenant(), entrees: [], derniere_somme_exportee: null};
      await rendre();
    });
    if ($('su-consigner')) $('su-consigner').addEventListener('click', async function () {
      var det = $('su-detenteur').value.trim();
      if (!det) { $('su-retour').textContent = 'Nomme d’abord le détenteur ou le service.'; return; }
      var suDate = $('su-date').value.trim();
      if (suDate && !/^\d{4}-\d{2}-\d{2}$/.test(suDate)) { $('su-retour').textContent = 'La date d’envoi se saisit au format aaaa-mm-jj (par exemple 2026-11-07).'; return; }
      var d = {
        id: 'd' + Date.now().toString(36),
        detenteur: det, type: $('su-type').value,
        date_envoi: suDate || new Date().toISOString().slice(0, 10),
        ref: $('su-ref').value.trim(),
        delai_jours: Math.max(1, parseInt($('su-delai').value, 10) || 30)
      };
      d.echeance = cuEcheance(d.date_envoi, d.delai_jours);
      await ajouter('demarche', JSON.stringify(d));
      await ajouter('echeance', JSON.stringify({demarche_id: d.id, echeance: d.echeance, texte: 'Échéance de réponse de la démarche « ' + d.type + ' » auprès de ' + d.detenteur + ', calculée à la consignation : envoi le ' + d.date_envoi + ', délai ' + d.delai_jours + ' jours, échéance le ' + d.echeance + '.'}));
      $('su-retour').textContent = 'Démarche et échéance consignées (deux maillons ajoutés). Le rappel .ics se télécharge depuis la liste ci-dessous.';
      await rendre();
    });
    /* --- Voir mon cerveau : lecture délibérée, recalcul déroulé ---
       Garde d'ouverture : AUCUN contenu du magasin n'est rendu dans cette
       section avant le clic sur « Ouvrir mon cerveau ». Les fonctions de
       rendu vm-* ne sont appelées que depuis ce geste et les actions qui
       le suivent — jamais à l'initialisation. */
    function libelleEntree(e) {
      var c = null; try { c = JSON.parse(e.contenu); } catch (err) {}
      function sur(s) { return String(s).replace(/</g, '&lt;'); }
      if (e.type === 'genese') return 'Genèse de ce cerveau, initialisée à la visite.';
      if (e.type === 'recu' && c) return 'Reçu de visite du ' + String(c.genere_le || e.ts).slice(0, 10) + ' — empreinte ' + String(c.empreinte || '').slice(0, 16) + '…';
      if (e.type === 'geste' && c && CU_GESTES[c.geste]) return CU_GESTES[c.geste].libelle;
      if (e.type === 'demarche' && c) return 'Démarche « ' + sur(c.type) + ' » auprès de ' + sur(c.detenteur) + ' — envoyée le ' + c.date_envoi + ', échéance le ' + c.echeance + '.';
      if (e.type === 'echeance' && c) return 'Échéance scellée : ' + c.echeance + ' (démarche ' + c.demarche_id + ').';
      if (e.type === 'demarche-reponse' && c) return 'Réponse consignée le ' + c.date + ' (démarche ' + c.demarche_id + ').';
      if (e.type === 'refus' && c) return 'Registre des non — ' + sur(c.motif) + (c.date ? ', le ' + c.date : '') + '.';
      if (e.type === 'jalon' && c) return 'Jalon SHA-512 — grande étape scellée sur l’état au maillon ' + c.au_maillon + ' (empreinte 512 : ' + String(c.empreinte_sha512 || '').slice(0, 24) + '…).';
      return sur(e.contenu.length > 160 ? e.contenu.slice(0, 160) + '…' : e.contenu);
    }
    async function ouvrirVue() {
      var zone = $('vm-zone'); if (!zone) return;
      zone.hidden = false;
      var entrees = etat.entrees;
      $('vm-etat').textContent = entrees.length
        ? 'Magasin lu à l’instant, dans ce navigateur : ' + entrees.length + ' entrée(s), chaîne créée le ' + String(etat.cree_le).slice(0, 10) + '. Aucun appel sortant n’a été fait pour cette lecture.'
        : 'Le magasin est vide pour le moment : aucune entrée. La genèse se posera au premier geste (un reçu consigné, un geste de sécurisation) — la section le dira alors, sans rien inventer.';
      $('vm-somme').textContent = entrees.length ? entrees[entrees.length - 1].digest : CU_GENESE;
      var racineSite = '2dc6066b21e796a0a401f66282ad91b5c1bb676d2d026e9771af5187f57220bd';
      var spanRacine = document.querySelector('.cerveau-racine-affichee');
      if (spanRacine && spanRacine.textContent.trim()) racineSite = spanRacine.textContent.trim();
      $('vm-symetrie').innerHTML = '<p class="petite" style="margin:.4rem 0 0"><strong>La symétrie des deux sommes.</strong> La racine du cerveau du site : <span class="mono">' + racineSite + '</span> — ta somme : <span class="mono">' + (entrees.length ? entrees[entrees.length - 1].digest : CU_GENESE) + '</span>. Même recette des deux bords : des SHA-256 chaînés, chaque état étant la somme des précédents. La sienne est publique ; la tienne ne vit que chez toi.</p>';
      $('vm-entrees').innerHTML = entrees.length ? entrees.map(function (e) {
        return '<div class="cv-entree"><strong>Maillon ' + e.seq + '</strong> · ' + e.type + ' · ' + String(e.ts).slice(0, 10) + '<br>' + libelleEntree(e) + '<br><span class="mono">sceau ' + e.sceau + '</span></div>';
      }).join('') : '<p class="petite">Aucune entrée à montrer : le magasin est vide.</p>';
      var bloc = cuBlocChoix(entrees);
      $('vm-choix').innerHTML = bloc.elements.length
        ? bloc.elements.map(function (el) { return '<div class="cv-entree">' + el.date + ' — ' + el.categorie + ' : ' + el.type + '</div>'; }).join('')
        : '<p class="petite">Aucun choix encore — le bloc le dit, il n’est jamais absent en silence.</p>';
      $('vm-recalcul').innerHTML = ''; $('vm-verdict').textContent = '';
    }
    if ($('vm-ouvrir')) $('vm-ouvrir').addEventListener('click', ouvrirVue);
    if ($('vm-recalculer')) $('vm-recalculer').addEventListener('click', async function () {
      var zone = $('vm-recalcul'); var entrees = etat.entrees;
      zone.innerHTML = ''; $('vm-verdict').textContent = '';
      var prevS = CU_GENESE, prevD = CU_GENESE, rompu = -1, raison = '';
      for (var i = 0; i < entrees.length; i++) {
        var e = entrees[i];
        var sceau = await cuSha256Hex(prevS + cuCanonique(e.seq, e.ts, e.type, e.contenu));
        var ligne = document.createElement('div');
        if (sceau !== e.sceau) { rompu = e.seq; raison = 'sceau recalculé différent'; ligne.textContent = 'Maillon ' + e.seq + ' — ÉCART : le sceau recalculé ne correspond pas au sceau consigné.'; zone.appendChild(ligne); break; }
        var digest = await cuSha256Hex(prevD + sceau);
        if (digest !== e.digest) { rompu = e.seq; raison = 'digest cumulé différent'; ligne.textContent = 'Maillon ' + e.seq + ' — ÉCART : le digest cumulé ne correspond pas.'; zone.appendChild(ligne); break; }
        var plus = '';
        if (e.type === 'jalon') {
          var c = null; try { c = JSON.parse(e.contenu); } catch (err) {}
          if (c) plus = (await cuVerifierJalon(entrees.slice(0, i + 1), c)) ? ' — jalon SHA-512 revérifié : conforme.' : ' — jalon SHA-512 : empreinte NON conforme.';
        }
        ligne.textContent = 'Maillon ' + e.seq + ' (' + e.type + ') — sceau recalculé : conforme · digest courant : ' + digest.slice(0, 16) + '…' + plus;
        zone.appendChild(ligne);
        prevS = sceau; prevD = digest;
        await new Promise(function (r) { setTimeout(r, 45); });
      }
      $('vm-verdict').innerHTML = rompu < 0
        ? '<span class="verdict-ok">Verdict du recalcul déroulé : chaîne INTÈGRE — ' + entrees.length + ' maillon(s) revérifiés un à un, somme finale ' + prevD.slice(0, 16) + '…</span>'
        : '<span class="verdict-ecart">Verdict du recalcul déroulé : chaîne ROMPUE au maillon ' + rompu + ' (' + raison + '). La somme du dernier maillon sain — ' + prevD + ' — borne ce qui reste attesté.</span>';
    });
    if ($('vm-exporter')) $('vm-exporter').addEventListener('click', function () { exporterDoc(true); });
    if ($('vm-exporter-somme')) $('vm-exporter-somme').addEventListener('click', function () { exporterDoc(false); });
    if ($('vm-cert-telecharger')) $('vm-cert-telecharger').addEventListener('click', function () {
      telecharger('certificat-cerveau-utilisateur.json', JSON.stringify(cuCertificat(etat.entrees, maintenant()), null, 2));
    });
    if ($('vm-jalon')) $('vm-jalon').addEventListener('click', async function () {
      if (!etat.entrees.length) { alert('Aucune entrée à sceller en jalon pour le moment.'); return; }
      await ajouter('jalon', await cuPreparerJalon(etat.entrees));
      await rendre(); await ouvrirVue();
    });
    if ($('vm-bris')) $('vm-bris').addEventListener('click', function () { testerBrisDans($('vm-bris-resultat')); });
    if ($('vm-note-ajouter')) $('vm-note-ajouter').addEventListener('click', async function () {
      var texte = $('vm-note-texte').value.trim();
      if (!texte) { $('vm-note-retour').textContent = 'Écris d’abord ce qui s’est passé.'; return; }
      var type = $('vm-note-type').value;
      if (type === 'refus') await ajouter('refus', JSON.stringify({motif: texte, date: new Date().toISOString().slice(0, 10), source: 'entrée manuelle de l’utilisateur'}));
      else await ajouter('note', texte);
      $('vm-note-texte').value = '';
      $('vm-note-retour').textContent = 'Entrée scellée dans ton cerveau.';
      await rendre(); await ouvrirVue();
    });
    document.querySelectorAll('[data-ouverture-menu]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (typeof ouvrirPanneau === 'function') ouvrirPanneau('ouverture');
        ouvertureAfficher(b.getAttribute('data-ouverture-menu'));
      });
    });
    /* Le défilement animé — présentation seulement, jamais un verrou.
       Si l'appareil demande le mouvement réduit, ou si l'observateur
       d'intersection manque, RIEN n'est masqué ni différé : le contenu
       est là, statique et complet. Sinon seulement, les cartes et les
       blocs se révèlent au défilement (transform/opacity uniquement). */
    try {
      var mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!mouvementReduit && 'IntersectionObserver' in window) {
        document.documentElement.classList.add('anim-ok');
        var io = new IntersectionObserver(function (entreesObs) {
          entreesObs.forEach(function (en) {
            if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
          });
        }, {threshold: 0, rootMargin: '0px 0px 12% 0px'});
        document.querySelectorAll('.panneau .carte, .panneau section.bloc').forEach(function (el, i) {
          el.classList.add('reveler');
          el.style.transitionDelay = '0ms';
          io.observe(el);
        });
      }
    } catch (e) {}
  }
  function ouvertureAfficher(menu) {
    document.querySelectorAll('.ouverture-menu').forEach(function (s) {
      s.hidden = s.getAttribute('data-menu-section') !== menu;
    });
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
  
  /* === Tranche v42 « Aller chercher » : gestes de clôture, scellement des exports, générateur d'explication === */
  var derniereDemarcheExplication = null;
  async function hacherFichierV42(fichier) {
    var tampon = await fichier.arrayBuffer();
    var empreinte = await crypto.subtle.digest('SHA-256', tampon);
    var octets = new Uint8Array(empreinte), hex = '';
    for (var i = 0; i < octets.length; i++) hex += octets[i].toString(16).padStart(2, '0');
    return hex;
  }
  function brancherV42() {
    document.querySelectorAll('[data-sceller-geste]').forEach(function (b) {
      b.addEventListener('click', async function () {
        await ajouter('geste', JSON.stringify({geste: b.getAttribute('data-sceller-geste'), panneau: 'v42-aller-chercher'}));
        var zone = b.parentElement ? b.parentElement.querySelector('[data-retour-geste]') : null;
        if (zone) zone.textContent = 'Consigné dans ton cerveau (maillon ajouté).';
        await rendre();
      });
    });
    document.querySelectorAll('.ac-sceller').forEach(function (b) {
      b.addEventListener('click', async function () {
        var boite = b.closest('.ac-export'); if (!boite) return;
        var entree = boite.querySelector('.ac-fichier'), res = boite.querySelector('.ac-retour');
        var fichier = entree && entree.files && entree.files[0];
        if (!fichier) { if (res) res.textContent = 'Choisis d’abord le fichier d’export téléchargé.'; return; }
        if (res) res.textContent = 'Calcul de l’empreinte, dans ton navigateur…';
        try {
          var hex = await hacherFichierV42(fichier);
          var e = await ajouter('export', JSON.stringify({plateforme: b.getAttribute('data-plateforme'), fichier: fichier.name, taille: fichier.size, empreinte: hex}));
          if (res) res.textContent = 'Entrée « export » scellée dans ton cerveau (maillon ' + (e.seq + 1) + ') — empreinte : ' + hex.slice(0, 16) + '… Le fichier n’a pas quitté ton appareil.';
          await rendre();
        } catch (err) {
          if (res) res.textContent = 'Le calcul a échoué de ce bord (' + String(err) + ') : rien n’a été consigné.';
        }
      });
    });
    function lireFormulaireExplication() {
      return {
        regime: $('ex-regime') ? $('ex-regime').value : 'prive',
        nom: $('ex-nom') ? $('ex-nom').value.trim() : '',
        organisation: $('ex-organisation') ? $('ex-organisation').value.trim() : '',
        dateDecision: $('ex-date-decision') ? $('ex-date-decision').value.trim() : '',
        description: $('ex-description') ? $('ex-description').value.trim() : '',
        observations: $('ex-observations') ? $('ex-observations').checked : false,
        dateLettre: new Date().toLocaleDateString('fr-CA', {year: 'numeric', month: 'long', day: 'numeric'})
      };
    }
    if ($('ex-generer')) $('ex-generer').addEventListener('click', function () {
      var p = lireFormulaireExplication();
      $('ex-lettre').value = exComposerLettre(p);
      $('ex-etat').textContent = 'Demande produite — rien n’a quitté cet onglet. Envoie-la, puis consigne-la ci-dessous.';
    });
    if ($('ex-copier')) $('ex-copier').addEventListener('click', async function () {
      var t = $('ex-lettre').value;
      if (!t) { $('ex-etat').textContent = 'Produis d’abord la demande.'; return; }
      try { await navigator.clipboard.writeText(t); $('ex-etat').textContent = 'Demande copiée.'; }
      catch (e) { $('ex-lettre').select(); $('ex-etat').textContent = 'Copie automatique refusée par le navigateur : le texte est sélectionné, copie-le manuellement.'; }
    });
    if ($('ex-telecharger')) $('ex-telecharger').addEventListener('click', function () {
      var t = $('ex-lettre').value;
      if (!t) { $('ex-etat').textContent = 'Produis d’abord la demande.'; return; }
      telecharger('demande-explication-decision-automatisee.txt', t, 'text/plain');
    });
    if ($('ex-imprimer')) $('ex-imprimer').addEventListener('click', function () {
      var t = $('ex-lettre').value;
      if (!t) { $('ex-etat').textContent = 'Produis d’abord la demande.'; return; }
      var cadre = document.createElement('iframe');
      cadre.style.position = 'fixed'; cadre.style.right = '0'; cadre.style.bottom = '0';
      cadre.style.width = '0'; cadre.style.height = '0'; cadre.style.border = '0';
      document.body.appendChild(cadre);
      var doc = cadre.contentWindow.document;
      doc.open();
      doc.write('<html><head><title>Demande d’explication</title></head><body><pre style="font-family: Georgia, serif; font-size: 12pt; white-space: pre-wrap;">' +
        t.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre></body></html>');
      doc.close();
      setTimeout(function () { cadre.contentWindow.focus(); cadre.contentWindow.print(); setTimeout(function () { cadre.remove(); }, 600); }, 250);
    });
    if ($('ex-consigner')) $('ex-consigner').addEventListener('click', async function () {
      var p = lireFormulaireExplication();
      var auj = new Date().toISOString().slice(0, 10);
      var d = {
        id: 'ex' + Date.now().toString(36),
        detenteur: p.organisation || 'Organisation à nommer',
        type: "Demande d'explication d'une décision automatisée",
        date_envoi: auj, ref: '', delai_jours: 30
      };
      d.echeance = cuEcheance(d.date_envoi, d.delai_jours);
      derniereDemarcheExplication = d;
      await ajouter('demarche', JSON.stringify(d));
      await ajouter('echeance', JSON.stringify({demarche_id: d.id, echeance: d.echeance, texte: "Échéance de suivi de la demande d'explication auprès de " + d.detenteur + " : envoi le " + d.date_envoi + ', délai de suivi 30 jours (délai de réponse d’une demande d’accès, art. 32 LRPSP).'}));
      $('ex-retour').textContent = 'Demande consignée dans ton cerveau, échéance de suivi au ' + d.echeance + '. Le rappel .ics peut être téléchargé ci-contre.';
      await rendre();
    });
    if ($('ex-ics')) $('ex-ics').addEventListener('click', function () {
      if (!derniereDemarcheExplication) { $('ex-retour').textContent = 'Consigne d’abord la demande : le rappel porte son échéance.'; return; }
      var nb = 0; etat.entrees.forEach(function (e) { if (e.type === 'geste') nb++; });
      telecharger('echeance-' + derniereDemarcheExplication.id + '.ics', cuConstruireICS(derniereDemarcheExplication, maintenant(), nb), 'text/calendar');
    });
  }

    /* === Feuille « Le for est ailleurs, tes recours sont ici » (tranche v43) : générateur de la lettre de réponse et consignation du refus comme décision === */
  /* ===== Tranche v43 — §A décisions, protocole, minuteur, détecteur ===== */
  function decisionsV43() {
    var ds = [], preuves = {}, verdicts = {};
    (etat ? etat.entrees : []).forEach(function (e) {
      var c = decParserContenu(e.contenu);
      if (!c) return;
      if (e.type === 'decision') ds.push({seq: e.seq, c: c});
      if (e.type === 'preuve' && c.decision_seq != null) (preuves[c.decision_seq] = preuves[c.decision_seq] || []).push(c);
      if (e.type === 'verdict' && c.decision_seq != null) (verdicts[c.decision_seq] = verdicts[c.decision_seq] || []).push(c);
    });
    return {decisions: ds, preuves: preuves, verdicts: verdicts};
  }
  function rendreDecisionsV43() {
    var zone = $('dec-liste'); if (!zone || !etat) return;
    var data = decisionsV43();
    var sel = $('dec-preuve-sel');
    if (sel) {
      var actuel = sel.value;
      sel.innerHTML = data.decisions.map(function (d) {
        return '<option value="' + d.seq + '">Décision nº ' + d.seq + ' — ' + String(d.c.decision || '').replace(/</g, '&lt;').slice(0, 60) + '</option>';
      }).join('');
      if (actuel) sel.value = actuel;
    }
    if (!data.decisions.length) {
      zone.innerHTML = '<p class="petite">Aucune décision consignée pour le moment. La première peut naître ci-dessus — ou d’un refus consigné à la feuille « Le for est ailleurs ».</p>';
      return;
    }
    var auj = new Date().toISOString().slice(0, 10);
    var lib = {respectee: 'respectée', contredite: 'contredite', 'sans-reponse': 'sans réponse à l’échéance', 'en-attente': 'en attente de la réponse'};
    zone.innerHTML = data.decisions.map(function (d) {
      var vs = data.verdicts[d.seq] || [];
      var calc = decVerdictCalcule(d.c, data.preuves[d.seq] || [], auj);
      var scelle = vs.length ? vs[vs.length - 1].verdict : null;
      var ligne = '<div class="cv-entree"><strong>Décision nº ' + d.seq + '</strong> — ' + decLectureHumaine('decision', d.c).replace(/</g, '&lt;') + '<br>';
      if (scelle) ligne += '<span class="verdict-ok">Verdict scellé : ' + (lib[scelle] || scelle) + '.</span>';
      else {
        ligne += 'État calculé : ' + (lib[calc] || calc) + '.';
        if (calc !== 'en-attente') ligne += ' <button type="button" class="secondaire" data-verdict="' + d.seq + '" data-etat="' + calc + '">Sceller ce verdict</button>';
        else ligne += ' Consigne la réponse (une preuve) quand elle arrive, ci-dessous.';
      }
      return ligne + '</div>';
    }).join('');
    zone.querySelectorAll('[data-verdict]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var seq = Number(b.getAttribute('data-verdict')), etatV = b.getAttribute('data-etat');
        await ajouter('verdict', JSON.stringify({decision_seq: seq, verdict: etatV, motif: 'verdict calculé par appariement décision → preuves consignées → échéance, scellé par l’utilisateur', date: new Date().toISOString().slice(0, 10)}));
        await rendre();
      });
    });
  }
  function brancherV43() {
    /* Crochet public du cerveau local : la conversation (onglet Écrire)
       y scelle le code de fil du visiteur, sur son appareil seulement. */
    window.sophiaCerveauAjouter = ajouter;
    if ($('dec-ajouter')) $('dec-ajouter').addEventListener('click', async function () {
      var texte = $('dec-texte').value.trim();
      if (!texte) { $('dec-etat').textContent = 'Nommer la décision : une phrase, un objet.'; return; }
      var decEch = $('dec-echeance').value.trim();
      if (decEch && !/^\d{4}-\d{2}-\d{2}$/.test(decEch)) { $('dec-etat').textContent = 'L’échéance se saisit au format aaaa-mm-jj (par exemple 2026-11-07).'; return; }
      var e = await ajouter('decision', JSON.stringify({
        decision: texte,
        par: $('dec-par').value.trim() || null,
        echeance: decEch || null,
        effet_attendu: $('dec-effet').value.trim() || null,
        consigne_le: new Date().toISOString().slice(0, 10)
      }));
      $('dec-etat').textContent = 'Décision consignée (maillon ' + e.seq + '). Sa réponse, quand elle viendra, s’y appariera.';
      await rendre();
    });
    if ($('dec-preuve-ajouter')) $('dec-preuve-ajouter').addEventListener('click', async function () {
      var sel = $('dec-preuve-sel');
      if (!sel || !sel.value) { $('dec-etat').textContent = 'Aucune décision à apparier pour le moment.'; return; }
      await ajouter('preuve', JSON.stringify({
        decision_seq: Number(sel.value),
        type_preuve: $('dec-preuve-type').value,
        note: $('dec-preuve-note').value.trim() || null,
        date: new Date().toISOString().slice(0, 10)
      }));
      $('dec-etat').textContent = 'Preuve consignée et appariée. L’état de la décision est recalculé ci-dessus.';
      await rendre();
    });
    /* Protocole de la première heure : chaque étape se scelle comme un geste. */
    document.querySelectorAll('[data-protocole]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var cle = b.getAttribute('data-protocole');
        await ajouter('geste', JSON.stringify({geste: cle, date: new Date().toISOString().slice(0, 10), note: 'Étape du protocole de la première heure, consignée par l’utilisateur.'}));
        await rendre();
      });
    });
    /* Minuteur de fenêtre (§L 29). */
    var fenSel = $('fen-plateforme'), fenEtat = $('fen-etat'), fenLimiteZone = $('fen-limite');
    function fenLire() {
      if (!fenSel) return null;
      var o = fenSel.options[fenSel.selectedIndex];
      return {lib: o.text, jours: o.getAttribute('data-jours') ? Number(o.getAttribute('data-jours')) : null, source: o.getAttribute('data-source') || ''};
    }
    /* v58 — le rappel .ics suit l'échéance AFFICHÉE : fenAfficher active le
       bouton dès qu'une date limite est calculée et affichée, et le
       désactive dès qu'elle cesse de l'être (avant la v58, seul le
       scellement l'activait — l'aide promettait l'activation dès
       l'affichage ; audit tour 5, P1). */
    function fenAfficher() {
      var f = fenLire(); if (!f || !fenLimiteZone) return;
      var depart = $('fen-date').value;
      var bIcs = $('fen-ics');
      function fenIcsReset() { if (bIcs) { bIcs.disabled = true; bIcs.removeAttribute('data-limite'); bIcs.removeAttribute('data-objet'); } }
      if (!f.jours) {
        fenLimiteZone.innerHTML = '<strong>Silence écrit comme silence :</strong> ' + f.source;
        fenIcsReset();
        return;
      }
      if (!depart) { fenLimiteZone.textContent = 'Choisis la date de départ (la mesure, la notification, l’envoi) : la date limite se calcule ici.'; fenIcsReset(); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(depart)) { fenLimiteZone.textContent = 'La date de départ se saisit au format aaaa-mm-jj (par exemple 2026-11-07) : la date limite se calcule dès que le format est respecté.'; fenIcsReset(); return; }
      var lim = fenLimite(depart, f.jours);
      fenLimiteZone.innerHTML = 'Fenêtre : <strong>' + f.lib + '</strong><br>Date limite calculée : <strong>' + lim + '</strong> (départ ' + depart + ' + ' + f.jours + ' jours).<br><span class="petite">' + f.source + '</span>';
      if (bIcs) { bIcs.disabled = false; bIcs.setAttribute('data-limite', lim); bIcs.setAttribute('data-objet', f.lib); }
    }
    if (fenSel) { fenSel.addEventListener('change', fenAfficher); $('fen-date').addEventListener('change', fenAfficher); $('fen-date').addEventListener('input', fenAfficher); fenAfficher(); }
    if ($('fen-sceller')) $('fen-sceller').addEventListener('click', async function () {
      var f = fenLire(); var depart = $('fen-date').value;
      if (!f || !f.jours || !depart) { if (fenEtat) fenEtat.textContent = 'Rien à sceller : choisis une fenêtre chiffrée et sa date de départ (un silence ne se scelle pas comme une échéance — il se lit).'; return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(depart)) { if (fenEtat) fenEtat.textContent = 'Rien à sceller : la date de départ se saisit au format aaaa-mm-jj (par exemple 2026-11-07).'; return; }
      var lim = fenLimite(depart, f.jours);
      var e = await ajouter('echeance', JSON.stringify({objet: f.lib, date_depart: depart, date_limite: lim, source: f.source, consigne_le: new Date().toISOString().slice(0, 10)}));
      if (fenEtat) fenEtat.textContent = 'Échéance scellée dans ton cerveau (maillon ' + e.seq + ') : ' + f.lib + ' — limite ' + lim + '.';
      var b = $('fen-ics'); if (b) { b.disabled = false; b.setAttribute('data-limite', lim); b.setAttribute('data-objet', f.lib); }
      await rendre();
    });
    if ($('fen-ics')) $('fen-ics').addEventListener('click', function () {
      var lim = this.getAttribute('data-limite'), objet = this.getAttribute('data-objet');
      if (!lim) return;
      telecharger('fenetre-' + lim + '.ics', fenICS(objet, lim, 'Fenêtre consignée depuis le minuteur du site — la date limite est calculée depuis la date de départ et le délai de la source nommée.', maintenant()), 'text/calendar');
    });
    /* Détecteur d'export partiel (§L 32) — catégories déclarées aux politiques lues au registre. */
    var DET_CATS = {
      tiktok: [
        {nom: 'contenu téléversé et contenu pré-chargé (même non sauvegardé)', mots: ['content', 'video', 'upload', 'contenu']},
        {nom: 'presse-papiers', mots: ['clipboard', 'presse-papiers']},
        {nom: 'motifs et rythmes de frappe', mots: ['keystroke', 'typing', 'frappe']},
        {nom: 'données inférées (intérêts, genre, tranche d’âge)', mots: ['infer', 'interest', 'infér']},
        {nom: 'traits du visage et du corps (images et audio analysés)', mots: ['face', 'facial', 'visage', 'biometr']},
        {nom: 'identifiants publicitaires', mots: ['advertising id', 'idfa', 'gaid', 'identifiant publicitaire']},
        {nom: 'contacts', mots: ['contact']},
        {nom: 'achats', mots: ['purchase', 'achat', 'transaction']}
      ],
      snapchat: [
        {nom: 'compte et profil', mots: ['account', 'profile', 'profil', 'username']},
        {nom: 'Chats (messages)', mots: ['chat', 'message']},
        {nom: 'Memories', mots: ['memor']},
        {nom: 'localisation', mots: ['location', 'localisation', 'gps']},
        {nom: 'Family Centre (amis, partages de localisation)', mots: ['family', 'friend', 'ami']},
        {nom: 'conversations avec My AI', mots: ['my ai', 'myai']},
        {nom: 'regroupement de visages dans Memories', mots: ['face', 'visage', 'face group']},
        {nom: 'informations d’appareil', mots: ['device', 'appareil']}
      ],
      discord: [
        {nom: 'compte', mots: ['account', 'user', 'compte']},
        {nom: 'messages et contenu', mots: ['message', 'content', 'contenu']},
        {nom: 'serveurs et salons', mots: ['guild', 'channel', 'serveur', 'salon']},
        {nom: 'données d’usage et d’appareil', mots: ['device', 'usage', 'appareil', 'activity']},
        {nom: 'achats (Nitro, boutique)', mots: ['purchase', 'nitro', 'billing', 'achat']},
        {nom: 'voix et vidéo', mots: ['voice', 'video', 'voix']}
      ],
      meta: [
        {nom: 'profil', mots: ['profile', 'profil']},
        {nom: 'publications et contenu', mots: ['post', 'publication', 'content', 'contenu']},
        {nom: 'messages', mots: ['message', 'messenger']},
        {nom: 'photos et vidéos', mots: ['photo', 'video', 'vidéo', 'media']},
        {nom: 'interactions publicitaires', mots: ['ad', 'pub', 'advertis']},
        {nom: 'données de commerçants (conversions hors ligne)', mots: ['offline', 'conversion', 'merchant', 'commerçant']},
        {nom: 'appareil', mots: ['device', 'appareil']},
        {nom: 'localisation', mots: ['location', 'localisation']}
      ],
      x: [
        {nom: 'profil', mots: ['profile', 'profil']},
        {nom: 'publications', mots: ['tweet', 'post', 'publication']},
        {nom: 'messages privés (contenu et métadonnées)', mots: ['direct message', 'dm', 'message']},
        {nom: 'appareil', mots: ['device', 'appareil']},
        {nom: 'localisation', mots: ['location', 'localisation']},
        {nom: 'identité déduite', mots: ['infer', 'identity', 'déduit']},
        {nom: 'journaux d’activité (même sans compte)', mots: ['log', 'journal']},
        {nom: 'interactions publicitaires', mots: ['ad', 'pub', 'advertis']}
      ]
    };
    if ($('det-analyser')) $('det-analyser').addEventListener('click', function () {
      var fic = $('det-fichier').files && $('det-fichier').files[0];
      var zone = $('det-resultat');
      if (!fic) { zone.innerHTML = '<p class="petite">Choisis d’abord le fichier de ton export (JSON ou texte) — il est lu ici, il ne quitte pas ton appareil.</p>'; return; }
      var plat = $('det-plateforme').value;
      var lecteur = new FileReader();
      lecteur.onload = async function () {
        var r = detAnalyser(String(lecteur.result), DET_CATS[plat] || []);
        var html = '<p>Format lu : <strong>' + r.format + '</strong>. Catégories déclarées à la politique, repérées dans le fichier : <strong>' + r.presentes.length + '</strong> ; non repérées : <strong>' + r.absentes.length + '</strong>.</p>';
        if (r.presentes.length) html += '<p class="petite">Repérées : ' + r.presentes.map(function (s) { return s.replace(/</g, '&lt;'); }).join(' · ') + '</p>';
        if (r.absentes.length) html += '<p><strong>Non repérées :</strong> ' + r.absentes.map(function (s) { return s.replace(/</g, '&lt;'); }).join(' · ') + '</p>';
        html += '<p class="petite">Détection par noms de clés et de mots, heuristique : l’absence d’une clé ne prouve pas l’absence de la donnée — elle fonde la question écrite ci-dessous. C’est la demande de complétion qui transforme le doute en réponse.</p>';
        zone.innerHTML = html;
        var p = {
          plateforme: $('det-plateforme').options[$('det-plateforme').selectedIndex].text,
          dateDemande: $('det-date-demande').value.trim() || '[la date de ta demande]',
          absentes: r.absentes,
          nom: $('det-nom').value.trim(),
          langue: $('det-langue').value,
          dateLettre: new Date().toLocaleDateString($('det-langue').value === 'en' ? 'en-CA' : 'fr-CA', {year: 'numeric', month: 'long', day: 'numeric'})
        };
        $('det-lettre').value = r.absentes.length ? detComposerLettreCompletion(p) : '';
        await ajouter('geste', JSON.stringify({geste: 'analyse-export-' + plat, date: new Date().toISOString().slice(0, 10), note: 'Export analysé localement par le détecteur d’export partiel : ' + r.presentes.length + ' catégories repérées, ' + r.absentes.length + ' non repérées. Le fichier n’a pas quitté l’appareil.'}));
        await rendre();
      };
      lecteur.readAsText(fic);
    });
    if ($('det-copier')) $('det-copier').addEventListener('click', async function () {
      var t = $('det-lettre').value;
      if (!t) { $('det-etat').textContent = 'Analyse d’abord un export : la lettre se compose des catégories non repérées.'; return; }
      try { await navigator.clipboard.writeText(t); $('det-etat').textContent = 'Lettre copiée.'; }
      catch (e) { $('det-lettre').select(); $('det-etat').textContent = 'Copie automatique refusée : le texte est sélectionné, copie-le manuellement.'; }
    });
  }

  function brancherFor() {
    function lireFor() {
      var sel = $('for-plateforme');
      var lib = '';
      if (sel) {
        lib = sel.options[sel.selectedIndex].text;
        if (sel.value === 'autre') lib = '[la plateforme]';
      }
      var dateFr = new Date().toLocaleDateString('fr-CA', {year: 'numeric', month: 'long', day: 'numeric'});
      var langue = $('for-langue') ? $('for-langue').value : 'fr';
      return {
        plateforme: lib,
        clause: $('for-clause') ? $('for-clause').value : 'for',
        nom: $('for-nom') ? $('for-nom').value.trim() : '',
        dateDemande: $('for-date-demande') ? $('for-date-demande').value.trim() : '',
        dateRefus: $('for-date-refus') ? $('for-date-refus').value.trim() : '',
        regime: $('for-regime') ? $('for-regime').value : 'qc',
        langue: langue,
        dateLettre: (langue === 'en')
          ? new Date().toLocaleDateString('en-CA', {year: 'numeric', month: 'long', day: 'numeric'})
          : dateFr
      };
    }
    if ($('for-generer')) $('for-generer').addEventListener('click', function () {
      var p = lireFor();
      $('for-lettre-texte').value = forComposerLettre(p);
      $('for-etat').textContent = 'Lettre composée — rien n’a quitté cet onglet. Envoie-la, puis consigne le refus ci-dessous.';
    });
    if ($('for-copier')) $('for-copier').addEventListener('click', async function () {
      var t = $('for-lettre-texte').value;
      if (!t) { $('for-etat').textContent = 'Compose d’abord la lettre.'; return; }
      try { await navigator.clipboard.writeText(t); $('for-etat').textContent = 'Lettre copiée.'; }
      catch (e) { $('for-lettre-texte').select(); $('for-etat').textContent = 'Copie automatique refusée par le navigateur : le texte est sélectionné, copie-le manuellement.'; }
    });
    if ($('for-telecharger')) $('for-telecharger').addEventListener('click', function () {
      var t = $('for-lettre-texte').value;
      if (!t) { $('for-etat').textContent = 'Compose d’abord la lettre.'; return; }
      telecharger('reponse-for-etranger-demande-acces.txt', t, 'text/plain');
    });
    if ($('for-consigner')) $('for-consigner').addEventListener('click', async function () {
      var p = lireFor();
      var e = await ajouter('decision', JSON.stringify({
        decision: 'refus d’accès opposé par la plateforme, à traiter selon la loi d’ici',
        par: p.plateforme,
        clause_invoquee: p.clause,
        date_demande: p.dateDemande || null,
        date_refus: p.dateRefus || null,
        regime: p.regime,
        effet_attendu: 'que la demande d’accès soit traitée au fond, dans le délai de la loi applicable ici ; à défaut, plainte au régulateur d’ici',
        consigne_le: new Date().toISOString().slice(0, 10)
      }));
      var zone = $('for-consigne-retour');
      if (zone) zone.textContent = 'Refus consigné comme décision dans ton cerveau (maillon ' + e.seq + '). La réponse de la plateforme, quand elle viendra, s’y appariera.';
      await rendre();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { brancher(); brancherV42(); brancherFor(); brancherV43(); init(); });
  else { brancher(); brancherV42(); brancherFor(); brancherV43(); init(); }
})();

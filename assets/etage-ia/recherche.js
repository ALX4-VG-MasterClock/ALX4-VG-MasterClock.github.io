// recherche.js — Recherche hybride dans la mémoire du site, côté navigateur.
// Port fidèle de ../espace-vectoriel/recherche-hybride.mjs (même normalisation
// française, même BM25, même fusion min-max, même escompte passe-partout),
// avec les adaptations d'intégration, toutes documentées ici :
//
//  1. AGRÉGATION = MAX (score du passage = son meilleur segment fusionné
//     escompté). Arbitrage mesuré le 25 novembre 2026
//     (espace-vectoriel/evalue-agregation.mjs) : sur la requête canonique
//     d'accès, le max classe le passage 38 au rang 2 — il entre donc dans
//     les sources montrées au modèle — contre le rang 11 pour la moyenne
//     des 3 meilleurs ; le max rend aussi le rang 2 au passage 186 sur
//     « la mémoire cumulative ». Coût assumé et dit : sur la requête du
//     refus, le passage 38 recule de 22e (moy3) à 26e (max), et le top 5
//     y est un peu moins bon. Le biais « loterie » du max est contenu par
//     la déduplication et l'escompte logarithmique, déjà dans la fusion.
//  2. VECTEURS INT8 : les vecteurs de segments du bundle sont quantifiés
//     (échelle par vecteur) ; ils sont déquantifiés puis RENORMALISÉS ici.
//     Fidélité mesurée : cosinus moyen 0,99997 contre le fp32, classements
//     identiques sur les 4 requêtes d'épreuve.
//  3. REPLI LEXICAL SEUL : si aucun vecteur de requête n'est fourni
//     (qVec = null — moteur d'embeddings indisponible), la « fusion » est
//     le score lexical normalisé seul, avec le même escompte et la même
//     agrégation. Le mode effectif est retourné dans le résultat : la page
//     l'affiche, rien n'est simulé.
//  4. PONTS DE VOCABULAIRE (branchés le 25 novembre 2026, après mesure à
//     la batterie de clôture) : les mots du visiteur ne rejoignent pas
//     toujours les mots des passages (« refus » ne contient ni « recours »
//     ni « CAI »). Les équivalences de la banque de questions prévues sont
//     donc des connexions établies dans le code : expandRequete() ajoute
//     à la requête les termes-ponts quand un déclencheur est présent.
//     La page l'applique AVANT de vectoriser (le vecteur porte les ponts),
//     et rechercher() l'applique aussi (le lexical les porte même si
//     l'appelant ne l'a pas fait) — l'opération est idempotente : un pont
//     dont tous les termes sont déjà présents n'est pas rajouté.
//     Effets mesurés avant branchement (batterie sur la base des 84,
//     passe 2) : refus rang 11 → 1 ; silence rang 11 → 2. Les ponts non
//     mesurés de la banque (plateforme → organisation ; pourquoi →
//     raison) ne sont PAS branchés : pas de prétention sans mesure.
//  5. TITRES INDEXÉS AU LEXICAL (ajouté le 25 novembre 2026, après la
//     mesure de dilution post-fusion — voir le rapport
//     rapport-dilution-20261125.md du chantier) : le lexical de chaque
//     segment inclut le titre de chacun de ses passages propriétaires
//     (une fois par passage). Défaut mécanique corrigé : les réponses
//     préparées portent leur question dans leur titre (« ChatGPT
//     garde-t-il mes conversations ? », « Pourquoi ce site existe »)
//     et ce titre n'était pas cherché — leurs segments, courts,
//     perdaient le BM25 contre les pages du site, dont le corps répète
//     les mots des questions (dilution mesurée : P2-Q5 au rang 25,
//     P9-Q1 au rang 24 sur l'ensemble fusionné, alors que les mêmes
//     cibles tenaient le vectoriel — vecN 0,74 et 0,90, au-dessus des
//     gagnants). Mesure du levier, batterie des 21 questions sur
//     l'ensemble fusionné : 16/21 → 20/21 PASS ; P2-Q5 rang 25 → 2 ;
//     P9-Q1 rang 24 → 1 ; aucune régression. Le vectoriel n'est pas
//     touché : les vecteurs du bundle restent ceux des segments de
//     texte (indexer les titres des deux côtés exigerait de
//     reconstruire le bundle — geste séparé, à remesurer le cas
//     échéant).
//
// Aucune dépendance, aucun DOM, aucun réseau : ce module ne fait que des
// calculs sur les données du bundle (recherche-donnees.json).

// ---------- Normalisation française (identique à recherche-hybride.mjs) ----------
export function replieAccents(texte) {
  return texte.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
export function radical(jeton) {
  let t = jeton;
  for (let i = 0; i < 4; i++) {
    if (t.length > 3 && (t.endsWith('e') || t.endsWith('s'))) t = t.slice(0, -1);
    else break;
  }
  return t;
}
export function jetons(texte) {
  const bruts = replieAccents(texte).match(/[a-z0-9]+/g) || [];
  return bruts.filter((t) => t.length >= 2).map(radical);
}

// ---------- Préparation des données du bundle ----------
function decoderVecteur(base64, echelle) {
  const bin = atob(base64);
  const v = new Float32Array(bin.length);
  let norme = 0;
  for (let i = 0; i < bin.length; i++) {
    const signe = (bin.charCodeAt(i) << 24) >> 24; // octet → int8 signé
    v[i] = signe * echelle;
    norme += v[i] * v[i];
  }
  norme = Math.sqrt(norme) || 1;
  for (let i = 0; i < bin.length; i++) v[i] /= norme;
  return v;
}

function construitLexical(uniques, titresParId = new Map(), k1 = 1.2, b = 0.75) {
  const N = uniques.length;
  const docs = uniques.map((u) => {
    // Adaptation 5 (voir l'en-tête) : le titre de chaque passage
    // propriétaire est indexé avec le texte du segment, une fois par
    // passage — le titre fait partie du passage, il est donc cherché.
    const titres = u.passages.map((p) => titresParId.get(p) || '').join(' ');
    const js = jetons(titres ? u.texte + ' ' + titres : u.texte);
    const tf = new Map();
    for (const j of js) tf.set(j, (tf.get(j) || 0) + 1);
    return { tf, dl: js.length };
  });
  const df = new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  const avgdl = docs.reduce((s, d) => s + d.dl, 0) / N;
  const idf = new Map();
  for (const [t, f] of df) idf.set(t, Math.log(1 + (N - f + 0.5) / (f + 0.5)));
  return { N, docs, idf, avgdl, k1, b };
}
function scoreBM25(lex, termes, i) {
  const d = lex.docs[i];
  let s = 0;
  for (const t of termes) {
    const f = d.tf.get(t);
    if (!f) continue;
    const idf = lex.idf.get(t) || 0;
    s += (idf * (f * (lex.k1 + 1))) / (f + lex.k1 * (1 - lex.b + (lex.b * d.dl) / lex.avgdl));
  }
  return s;
}

// bundle : l'objet JSON de recherche-donnees.json, déjà analysé.
export function preparerDonnees(bundle) {
  const uniques = bundle.segments.map((s) => ({
    texte: s.t,
    passages: s.p,
    k: s.p.length,
    vecteur: decoderVecteur(s.v, s.e),
  }));
  const passagesParId = new Map(bundle.passages.map((p) => [p.id, p]));
  const titresParId = new Map(bundle.passages.map((p) => [p.id, p.titre || '']));
  const lex = construitLexical(uniques, titresParId);
  return {
    uniques, lex, passagesParId,
    racineMerkle: bundle.racine_merkle_passages,
    modele: bundle.modele_embeddings,
    dimension: bundle.dimension,
    alpha: bundle.alpha ?? 0.5,
  };
}

// ---------- Ponts de vocabulaire ----------
// Déclencheurs écrits en forme normalisée (minuscules, sans accents —
// la comparaison se fait sur replieAccents(requête)). Expansions :
// les chaînes exactes mesurées à la batterie, sauf mention contraire.
export const PONTS_DE_VOCABULAIRE = [
  {
    nom: 'refus → recours, délai, examen à la CAI',
    declencheurs: ['dit non', 'ont dit non', 'dit que non', 'refus'],
    expansion: 'recours délai examen CAI refus',
  },
  {
    nom: 'silence → refus, délai de trente jours, examen à la CAI',
    declencheurs: ['repondent pas', 'repond pas', 'silence', 'aucune reponse', 'pas de reponse', 'ca fait un mois'],
    expansion: 'silence refus délai trente jours examen CAI',
  },
  {
    nom: 'plainte → demande d\u2019examen, examen de mésentente à la CAI',
    declencheurs: ['plainte', 'me plaindre'],
    expansion: 'demande d\u2019examen mésentente CAI étapes',
  },
  {
    // Déclencheur « mes droits » RETIRÉ après la batterie de fusion :
    // il se déclenchait sur « le contrat de Google dit quoi sur mes
    // droits » (question de conditions, pas de Loi 25) et y noyait les
    // synthèses visées (rang 6). « loi 25 » et « quels droits » restent.
    nom: 'droits (Loi 25) → accès, rectification, désindexation',
    declencheurs: ['loi 25', 'quels droits'],
    expansion: 'droits accès rectification désindexation',
  },
  {
    nom: 'vocation → SAVOIR, ACCÉDER, MÉMOIRE',
    declencheurs: ['vocation', 'but du site'],
    expansion: 'vocation SAVOIR ACCÉDER MÉMOIRE',
  },
  {
    nom: 'créé → auteur, créateur, méthode, dépôts',
    declencheurs: ['qui a fait', 'a cree', 'cree quoi'],
    expansion: 'auteur créateur méthode dépôts',
  },
  {
    // Candidat nommé au rapport de clôture (P11-Q2 : le passeport au
    // rang 5) — branché pour être mesuré à la batterie de fusion ;
    // son sort suit la mesure, consignée au rapport.
    nom: 'preuve d\u2019existence → antériorité, horodatage, empreinte, passeport',
    declencheurs: ['prouver', 'existait', 'anteriorite', 'preuve d\u2019existence'],
    expansion: 'antériorité preuve d\u2019existence horodatage empreinte passeport œuvre',
  },
];

// Ajoute à la requête les expansions des ponts déclenchés, jusqu'au
// point fixe : une expansion peut en déclencher une autre (le silence
// amène « refus », qui amène « recours ») — la fonction boucle donc
// (4 passes au plus) jusqu'à ce qu'aucun pont nouveau ne s'applique.
// Résultat : idempotent par construction, quel que soit l'appelant —
// expandRequete(expandRequete(q)) === expandRequete(q).
// `trace` (optionnel) : un tableau qui reçoit le nom des ponts appliqués.
export function expandRequete(requete, trace = null) {
  let sortie = String(requete);
  for (let passe = 0; passe < 4; passe++) {
    const normalisee = replieAccents(sortie);
    const presents = new Set(jetons(sortie));
    let ajoute = false;
    for (const pont of PONTS_DE_VOCABULAIRE) {
      const touche = pont.declencheurs.some((d) => normalisee.includes(d));
      if (!touche) continue;
      const termesPont = jetons(pont.expansion);
      if (termesPont.every((t) => presents.has(t))) continue;
      sortie += ' ' + pont.expansion;
      for (const t of termesPont) presents.add(t);
      if (trace && !trace.includes(pont.nom)) trace.push(pont.nom);
      ajoute = true;
    }
    if (!ajoute) break;
  }
  return sortie;
}

// ---------- Recherche ----------
const produit = (q, v) => {
  let s = 0;
  for (let i = 0; i < q.length; i++) s += q[i] * v[i];
  return s;
};
const minMax = (arr) => {
  let mn = Infinity, mx = -Infinity;
  for (const v of arr) { if (v < mn) mn = v; if (v > mx) mx = v; }
  return arr.map((v) => (mx > mn ? (v - mn) / (mx - mn) : 0));
};

// qVec : Float32Array/Array de dimension 384 (vecteur de requête normalisé),
// ou null pour le repli lexical seul. Retourne le classement complet par
// passage (meilleur d'abord) ; chaque entrée porte son meilleur segment.
export function rechercher(prep, { qVec, requete, alpha = prep.alpha, top = 3 }) {
  const { uniques, lex } = prep;
  // Les ponts de vocabulaire portent aussi le côté lexical, même si
  // l'appelant n'a pas étendu la requête lui-même (idempotent).
  requete = expandRequete(requete);
  const termes = [...new Set(jetons(requete))];
  const lexBrut = uniques.map((_, i) => scoreBM25(lex, termes, i));
  const lexN = minMax(lexBrut);
  const mode = qVec ? 'hybride' : 'lexical';
  let vecBrut = null, vecN = null;
  if (qVec) {
    vecBrut = uniques.map((u) => produit(qVec, u.vecteur));
    vecN = minMax(vecBrut);
  }
  const segScores = uniques.map((u, i) => {
    const fusion = qVec ? alpha * vecN[i] + (1 - alpha) * lexN[i] : lexN[i];
    return {
      i,
      vec: qVec ? vecBrut[i] : null,
      lex: lexBrut[i],
      fusion,
      final: fusion / (1 + Math.log(u.k)),
      k: u.k,
    };
  });
  // Agrégation par passage : MAX du meilleur segment (arbitrage documenté
  // en tête de fichier).
  const parPassage = new Map();
  for (const s of segScores) {
    for (const p of uniques[s.i].passages) {
      const actuel = parPassage.get(p);
      if (!actuel || s.final > actuel.score) {
        parPassage.set(p, { passage: p, score: s.final, meilleur: s });
      }
    }
  }
  const classement = [...parPassage.values()].sort((a, b) => b.score - a.score);
  return {
    mode,
    termes,
    requeteEtendue: requete,
    resultats: classement.slice(0, top).map((r) => ({
      passage: r.passage,
      score: r.score,
      meta: prep.passagesParId.get(r.passage),
      meilleurSegment: {
        texte: uniques[r.meilleur.i].texte,
        vec: r.meilleur.vec,
        lex: r.meilleur.lex,
        fusion: r.meilleur.fusion,
        k: r.meilleur.k,
        passagesPartages: uniques[r.meilleur.i].passages,
      },
    })),
    classementComplet: classement,
  };
}

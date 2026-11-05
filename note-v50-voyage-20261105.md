# Note v50 — « Le Voyage » (5 novembre 2026)

## Origine
Paquet candidat de la construction fidèle à la vidéo vision d'Alex (`files/entreprise-voyage-20261104/construction-video/paquet-candidat/`), jugé **publiable au code** par les deux jurys après reprise (compte des fautes : Construction 1, reprise à ses frais). Présenté à Alex le 5 nov. (~00 h 37, maillon #2928) avec le tableau des comparaisons complet (5 candidats).

## Directive de publication
Alex, 5 novembre 2026, 08 h 12 : « Fais la nouvelle version et mets-la en ligne et à partir de là on va l'améliorer. Je veux que ça soit fidèle à ce que je t'ai demandé et les tokens que j'ai dépensés. L'entreprise doit me sortir le site web fini sinon sanction par-dessus sanction, par-dessus sanction. »

- L'épreuve de rendu par Alex se fera sur le servi ; l'amélioration continue par-dessus, version après version.
- **E3.4** : le candidat est publié **tel que construit — φ par scène (option A)** ; l'arbitrage reste révisable en amélioration, il n'est pas réécrit en silence.

## Fusion avec le correctif icône (publié le matin même)
Le candidat avait été construit sur la base v49 remontée, AVANT le correctif icône (07 h 24). La fusion appliquée avant publication, pour ne rien régresser :
1. Les quatre actifs d'icône (tête PCF-23 jour, choix d'Alex) remplacent les anciens dans `assets/`.
2. La ligne du panneau « L'application » est corrigée (« le cerveau-coquillage chaîné, la tête d'or du site », comme au correctif).
3. L'entrée du correctif est insérée au journal des mises à jour (position 2, sous l'entrée v50) : **38 entrées**.
4. Sceau canonique recalculé après fusion (ci-dessous). Le corps du Voyage est par ailleurs octet-identique au candidat vérifié (harnais candidat : 252/252 PASS).

## Valeurs
- Index : 1 841 466 octets ; SHA-256 brut `8a6e839aac4f528a24bbeafc900d7e914add9bedcfa4664506b2bc7e8471d038`
- **Sceau canonique : `b0efb8a39ffd7719b31b7b288968e88836877aa70babd80dd80da89d0b008f77`** (point fixe revérifié)
- Racine de Merkle : inchangée `2f64fa6a9776b7e966d0776f733306cb7a36a011294a5423fd3f269b6a9dc920` (aucune chambre ne dépend de l'index ni des icônes)
- Cache travailleur de service : `sophia-site-v36`
- Journal des mises à jour : 38 entrées ; journal des dépôts : genèse, 0 entrée (le champ `ancrages` reste au futur — le service n'est pas déclaré ouvert)
- Gel : 2 862 / #2861, inchangé
- Surface d'accueil : 489 mots (≤ 490) — héritée du candidat vérifié ; la fusion ne touche pas le panneau d'accueil

## Delta de publication (vs le servi v49 + correctif)
11 fichiers + la présente note : `index.html`, `sw.js`, `llms.txt`, `assets/journal-mises-a-jour.json`, `assets/journal-depots.json`, `assets/cerveau.json`, `assets/voyage-accueil.mp4`, `assets/voyage-arrivee.webp`, `assets/voyage-finale.mp4`, `assets/voyage-identite-pcf23.jpg`, `assets/voyage-remise-fixe.jpg`.

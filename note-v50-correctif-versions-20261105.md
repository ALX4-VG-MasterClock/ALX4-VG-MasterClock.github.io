# Note v50 — correctif ciblé « La chambre des versions recalculée » (5 novembre 2026)

## Origine

Au passage quotidien d'amélioration du site du 5 novembre 2026 (14 h 50), l'étape 0 — le recalcul du servi par l'outil L0 d'auto-vérification — a rendu le verdict **ÉCART NOMMÉ (1 contrôle sur 26)** : dans le manifeste (`assets/cerveau.json`), le digest de la chambre « versions » valait `b6e66d8e…`, calculé au temps de l'entrée de la version 39, alors que le SHA-256 réel de sa source `assets/journal-mises-a-jour.json` (38 entrées) valait déjà `f51f9d4c…`. Tous les autres contrôles étaient MATCH (index octet-identique, sceau canonique en point fixe, racine cohérente avec l'ensemble périmé, gel 2 862 / #2861). Diagnostic borné : incohérence interne du paquet v50 publié lui-même — pas de dérive du servi.

Conformément à la discipline de l'étape 0, le passage s'est arrêté : aucune publication, aucune correction, aucune capture dans ce passage ; l'écart a été consigné (journal des actes autonomes, entrée 9 ; rapport `hidden_files/outils/rapport-recalcul-servi-20261105-1450.md`) et remonté à Alex au fil principal.

## Directive de correction

Alex, 5 novembre 2026, 14 h 54 : « Oui, corrige la chambre versions et republie la v50 corrigée » (bouton, puis confirmé en texte).

## Le correctif — et rien d'autre

1. **Entrée nº 39 du journal des mises à jour** (`assets/journal-mises-a-jour.json`), datée du 5 novembre 2026 : « Correctif ciblé — « La chambre des versions recalculée » » — elle consigne l'écart relevé par l'auto-vérification L0 et le présent recalcul, au format et au ton de l'entrée du correctif icône.
2. **Digest de la chambre « versions » recalculé** = SHA-256 du journal à 39 entrées : `950eb594fe1e54c8b1a79eecdafa6f5dad7b08489a53d4ff9af25a554d3930b0`. Dans `assets/cerveau.json`, la recette et la dernière croissance de la chambre disent désormais ce recalcul.
3. **Racine du cerveau recalculée** sur les six digests de chambres, dans l'ordre du manifeste (niveaux [6, 3, 2, 1] recalculés dans `assets/cerveau.json`) : `c2a81f2a8cf43676f4c22b90cab9f6bb0aaf4ca454951dc8084fee37f70faac4`. `assets/merkle.json` **inchangé** : il porte l'arbre du coffre (chambre « arbre », digest inchangé), pas la racine du cerveau.
4. **`index.html`** : la nouvelle racine est affichée aux quatre endroits d'état courant (`surface-racine`, `cerveau-racine`, `ec-racine`, variable `racineSite`). **Une occurrence de l'ancienne racine demeure, à dessein** : `de-racine-genese`, l'ancre figée du journal des dépôts (son `sceau_prec` de genèse, identique dans `assets/journal-depots.json`, inchangé) — c'est une valeur historique scellée, pas un état courant. Sceau canonique recalculé en point fixe sur le fichier final : `7ea9ea08e80a95c5e15a31b43a1ebb71422eca9a60a92572f3e0d0712367cba6`.
5. **Cache du service worker** : `sophia-site-v36` → `sophia-site-v36b` (`sw.js`, seule occurrence dans le code ; l'ancienne mention dans `note-v50-voyage-20261105.md` est historique et reste telle quelle).

## Valeurs

- Index : 1 841 466 octets (taille inchangée — remplacements hexadécimaux à longueur égale) ; SHA-256 brut `fd78cad357a3dd47926cb5bd8b9b1bccd8c21a540499174c1580f142616fbd9d`
- **Sceau canonique : `7ea9ea08e80a95c5e15a31b43a1ebb71422eca9a60a92572f3e0d0712367cba6`** (point fixe revérifié)
- Racine du cerveau : `c2a81f2a8cf43676f4c22b90cab9f6bb0aaf4ca454951dc8084fee37f70faac4` (était `2f64fa6a…`)
- Digest chambre « versions » : `950eb594fe1e54c8b1a79eecdafa6f5dad7b08489a53d4ff9af25a554d3930b0` (était `b6e66d8e…` au manifeste, `f51f9d4c…` en source à 38 entrées)
- Journal des mises à jour : **39 entrées** ; journal des dépôts : genèse, 0 entrée, inchangé
- Gel : 2 862 / #2861, inchangé ; cinq autres chambres : digests inchangés
- Cache : `sophia-site-v36b`

## Delta de publication (vs le paquet v50)

5 fichiers : `index.html`, `sw.js`, `assets/cerveau.json`, `assets/journal-mises-a-jour.json`, + la présente note. Aucun autre fichier modifié (diff complet contre le paquet v50 à l'appui).

## Vérification (locale, avant publication)

Cohérences L0 recalculées sur le paquet : chaque digest de chambre du manifeste égale la source recalculée — la chambre « versions » comprise (l'écart est soldé) ; racine recalculée = racine affichée ; sceau canonique point fixe MATCH ; journal à 39 entrées ; cache `sophia-site-v36b` lu dans `sw.js`.

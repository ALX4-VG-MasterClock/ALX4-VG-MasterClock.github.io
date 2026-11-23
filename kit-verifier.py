# -*- coding: utf-8 -*-
"""Kit de verification autonome — SoPHIa (version 62, 19 novembre 2026).

Verifie, hors ligne et sans serveur, la chaine publiee du dossier a partir de
deux fichiers telecharges depuis le site :
  1. assets/repertoire-maillons-propre.csv  (le repertoire des maillons, lecture "propre")
  2. gel-montage.json                        (le gel de la version, si vous l'avez)

Recette publique : le digest cumule du propre se recalcule ainsi —
  digest du premier maillon = SHA-256(sceau du maillon 0)
  digest du maillon n       = SHA-256(digest du maillon n-1 + sceau du maillon n)
(concatenation des chaines hexadecimales, encodage UTF-8.)

Usage : python3 kit-verifier.py repertoire-maillons-propre.csv [gel-montage.json]
Le script n'ecrit rien, ne se connecte a rien, et dit MATCH ou nomme le premier ecart.
"""
import csv, hashlib, json, sys

def sha(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def main():
    if len(sys.argv) < 2:
        print("Usage : python3 kit-verifier.py repertoire-maillons-propre.csv [gel-montage.json]")
        return 2
    lignes = list(csv.DictReader(open(sys.argv[1], encoding="utf-8")))
    digest = None
    for i, l in enumerate(lignes):
        sceau = l["sceau_propre"]
        digest = sha(sceau) if i == 0 else sha(digest + sceau)
        if digest != l["digest_cumul_propre"]:
            print("ECART au maillon", l["seq"], ": digest recalcule", digest,
                  "!= digest publie", l["digest_cumul_propre"])
            return 1
    print("MATCH —", len(lignes), "maillons reverifies, digest de tete :", digest)
    if len(sys.argv) > 2:
        gel = json.load(open(sys.argv[2], encoding="utf-8"))
        print("Gel fourni :", json.dumps(gel, ensure_ascii=False)[:300])
        print("Comparez le digest de tete ci-dessus a celui du gel et a celui affiche sur le site.")
    return 0

if __name__ == "__main__":
    sys.exit(main())

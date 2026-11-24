/* ===== Le palier P1 du site SoPHIa — la recherche par le sens =====
   Module ES chargé À LA DEMANDE seulement, quand le visiteur active le
   palier P1 dans la salle du cerveau (bouton opt-in de
   assets/js/cerveau-conversation.js, taille affichée avant le geste).

   Ce qu'il fait, et rien d'autre :
   1. charge les vecteurs du site (assets/semantique/vecteurs/) — les
      plongements des feuilles préparées et des endroits du site,
      calculés à la construction du site avec le même modèle ;
   2. charge le moteur local vendored dans le paquet (Transformers.js
      3.8.1 + ONNX Runtime Web, WASM, un seul fil) depuis
      assets/semantique/runtime/ — aucun CDN, aucun tiers ;
   3. charge le modèle de plongement français servi par le site
      (paraphrase-multilingual-MiniLM-L12-v2, quantifié q8, 384
      dimensions) depuis assets/semantique/modele/ : son fichier ONNX
      dépasse la limite de 100 Mo par fichier de GitHub Pages, il est
      donc servi en morceaux d'au plus 24 Mo (l'envoi par l'interface
      web GitHub plafonne à 25 Mo par fichier) que ce module
      réassemble dans le
      navigateur (cache personnalisé de Transformers.js,
      env.customCache), puis revérifie par SHA-256 contre l'empreinte
      consignée dans modele.json avant de créer la session ;
   4. branche la couche sémantique de la cascade (CV_SEMANTIQUE) : la
      question du visiteur est plongée ICI, dans son navigateur, et
      comparée aux vecteurs du site par cosinus (cvRechercheSemantique,
      fonction pure de cerveau-conversation.js).

   Bornes tenues : env.allowRemoteModels = false — Transformers.js ne
   peut joindre aucun serveur tiers (ni Hugging Face ni un CDN) ; les
   seuls fichiers lus sont ceux de ce site. Rien n'est envoyé, rien
   n'est gardé côté site. Si quoi que ce soit échoue (réseau, mémoire,
   WASM absent), l'activation échoue honnêtement et la cascade continue
   aux mots-clés et au recouvrement — rien n'est simulé. */
import * as ort from '../semantique/runtime/ort.wasm.min.mjs';

/* Le moteur WASM se sert dans le paquet, jamais au CDN que
   Transformers.js propose par défaut ; un seul fil, parce que GitHub
   Pages ne peut pas émettre les en-têtes d'isolation cross-origin que
   le multi-fil exige. */
ort.env.wasm.wasmPaths = new URL('../semantique/runtime/', import.meta.url).href;
ort.env.wasm.numThreads = 1;

var BASE = 'assets/semantique/';
var activation = null;   /* promesse en cours — un seul chargement */
var baseVecteurs = null; /* [{type:'feuille', id, vec} | {type:'endroit', page, ancre, titre, panneauNom, vec}] */
var metaVecteurs = null;
var extracteur = null;

function mo(octets) { return (octets / 1000000).toFixed(1).replace('.', ',') + ' Mo'; }

async function lireAvecProgres(url, progression, etiquette, dejaCharge) {
  var reponse = await fetch(url);
  if (!reponse.ok) throw new Error('fichier introuvable sur le site : ' + url + ' (' + reponse.status + ')');
  var total = Number(reponse.headers.get('Content-Length') || 0);
  if (!reponse.body || !reponse.body.getReader) {
    var buf = await reponse.arrayBuffer();
    return new Uint8Array(buf);
  }
  var lecteur = reponse.body.getReader();
  var morceaux = [], recus = 0;
  for (;;) {
    var lu = await lecteur.read();
    if (lu.done) break;
    morceaux.push(lu.value); recus += lu.value.length;
    if (progression && total) progression(etiquette + ' — ' + mo(dejaCharge + recus) + (total ? ' / ' + mo(dejaCharge + total) : ''));
  }
  var tout = new Uint8Array(recus);
  var pos = 0;
  morceaux.forEach(function (m) { tout.set(m, pos); pos += m.length; });
  return tout;
}

async function chargerVecteurs(progression) {
  progression('Chargement des vecteurs du site (les plongements des réponses et des endroits, calculés à la construction du site)…');
  var meta = await (await fetch(BASE + 'vecteurs/vecteurs.json')).json();
  var brut = await (await fetch(BASE + 'vecteurs/vecteurs.bin')).arrayBuffer();
  var int8 = new Int8Array(brut);
  var dims = meta.dimensions, echelle = meta.echelle_int8 || 127;
  if (int8.length !== meta.entrees.length * dims) throw new Error('le fichier de vecteurs ne correspond pas à ses métadonnées');
  var base = meta.entrees.map(function (e, i) {
    var vec = new Float32Array(dims);
    for (var j = 0; j < dims; j++) vec[j] = int8[i * dims + j] / echelle;
    if (e.type === 'feuille') return { type: 'feuille', id: e.id, vec: vec };
    return { type: 'endroit', page: e.page, ancre: e.ancre, titre: e.titre, panneauNom: e.panneauNom, vec: vec };
  });
  metaVecteurs = meta;
  baseVecteurs = base;
  return meta;
}

/* Le cache personnalisé de Transformers.js : pour le fichier du modèle,
   il sert le fichier réassemblé depuis ses morceaux servis par le site ;
   pour tout le reste (configuration, tokenizer), il s'efface et laisse
   Transformers.js lire les fichiers du site normalement. */
function fabriquerCache(progression) {
  var modeleMeta = null, assemble = null;
  return {
    match: async function (nom) {
      var cle = String(nom || '');
      if (!cle.includes('model_quantized.onnx')) return undefined;
      if (assemble) return new Response(assemble.slice(0), { status: 200, headers: { 'Content-Length': String(assemble.length), 'Content-Type': 'application/octet-stream' } });
      if (!modeleMeta) modeleMeta = await (await fetch(BASE + 'modele/modele.json')).json();
      progression('Téléchargement du modèle de plongement français, servi par ce site en ' + modeleMeta.morceaux.length + ' morceaux (' + mo(modeleMeta.octets_modele) + ' au total)…');
      var tout = new Uint8Array(modeleMeta.octets_modele);
      var pos = 0;
      for (var i = 0; i < modeleMeta.morceaux.length; i++) {
        var m = modeleMeta.morceaux[i];
        var part = await lireAvecProgres(BASE + 'modele/' + m.fichier, progression, 'Modèle — morceau ' + (i + 1) + '/' + modeleMeta.morceaux.length, pos);
        if (part.length !== m.octets) throw new Error('un morceau du modèle est incomplet (' + m.fichier + ')');
        tout.set(part, pos); pos += part.length;
      }
      progression('Réassemblage du modèle — revérification de son empreinte SHA-256…');
      var digest = await crypto.subtle.digest('SHA-256', tout);
      var hex = Array.from(new Uint8Array(digest)).map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      if (hex !== modeleMeta.sha256_modele) throw new Error('empreinte du modèle réassemblé différente de celle consignée par le site — activation arrêtée, rien n’est chargé');
      progression('Empreinte du modèle : MATCH. Création de la session locale (WASM)…');
      assemble = tout;
      return new Response(assemble.slice(0), { status: 200, headers: { 'Content-Length': String(assemble.length), 'Content-Type': 'application/octet-stream' } });
    },
    put: async function () { /* rien à garder ici : le navigateur garde les fichiers du site dans son cache HTTP ordinaire */ }
  };
}

async function fonctionSemantique(question) {
  var sortie = await extracteur(question, { pooling: 'mean', normalize: true });
  return window.cvRechercheSemantique(sortie.data, baseVecteurs);
}

/* Point d'entrée de l'activation (bouton opt-in de la salle).
   progression(message) reçoit l'avancement, en français. */
export async function cvActiverP1(progression) {
  progression = progression || function () {};
  if (window.CV_SEMANTIQUE && window.CV_SEMANTIQUE.actif) { progression('Le palier P1 est déjà actif.'); return; }
  if (activation) return activation;
  activation = (async function () {
    await chargerVecteurs(progression);
    progression('Chargement du moteur local (Transformers.js + ONNX Runtime Web, servis par ce site)…');
    var tf = await import('../semantique/runtime/transformers.web.min.js');
    tf.env.allowRemoteModels = false;      /* aucun tiers, jamais — Hugging Face et les CDN sont fermés */
    tf.env.allowLocalModels = true;
    tf.env.localModelPath = BASE;          /* le modèle « modele » vit à assets/semantique/modele/ */
    tf.env.useBrowserCache = false;
    tf.env.useCustomCache = true;
    tf.env.customCache = fabriquerCache(progression);
    extracteur = await tf.pipeline('feature-extraction', 'modele', {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: function (p) {
        if (p && p.status === 'progress' && p.file && !String(p.file).includes('model_quantized')) {
          progression('Chargement de ' + p.file + ' — ' + mo(p.loaded || 0) + (p.total ? ' / ' + mo(p.total) : ''));
        }
      }
    });
    window.CV_SEMANTIQUE.brancher(fonctionSemantique, metaVecteurs);
    progression('Palier P1 actif : la recherche par le sens est branchée.');
  })();
  try { await activation; } catch (e) { activation = null; throw e; }
}

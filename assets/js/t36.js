
/* ===== Fournée 7 (adoptée le 3 nov. 2026, 22 h 48) — miroir des exports (44),
   silence consigné (45), laisse des enfants (47), antériorité pour tous (48),
   effaceur de métadonnées (49), visite côté pisteur (50), carte des
   consentements (51), enveloppe d'incapacité bornée (52). =====
   Tout est local ; le scellement passe par le cerveau du visiteur. */
(function(){
  function $(id){ return document.getElementById(id); }
  function cerveau(){ try { return JSON.parse(window.localStorage.getItem('cerveau-utilisateur-v1') || 'null'); } catch(e){ return null; } }
  function sceller(type, objet){
    if(typeof window.sophiaCerveauAjouter !== 'function') return Promise.reject(new Error('moteur non prêt'));
    return window.sophiaCerveauAjouter(type, JSON.stringify(objet));
  }
  function sha256hex(buf){
    return crypto.subtle.digest('SHA-256', buf).then(function(h){
      return Array.prototype.map.call(new Uint8Array(h), function(b){ return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }
  function echap(s){ return String(s).replace(/</g, '&lt;'); }

  /* ---- 44 · Miroir des exports ---- */
  if($('mir-lire')) $('mir-lire').addEventListener('click', function(){
    var fic = $('mir-fichier').files && $('mir-fichier').files[0];
    var zone = $('mir-resultat');
    if(!fic){ zone.innerHTML = '<p class="petite">Choisis d’abord le fichier de ton export.</p>'; return; }
    var lecteur = new FileReader();
    lecteur.onload = function(){
      var r = mirAnalyser(String(lecteur.result));
      zone.innerHTML = '<p>Format lu : <strong>' + r.format + '</strong> — fichier « ' + echap(fic.name) + ' », ' + fic.size + ' octets, lu sur ton appareil.</p><pre class="mono" style="white-space:pre-wrap">' + r.lignes.map(echap).join('\n') + '</pre>' +
        '<p class="petite">Chaque rubrique ci-dessus est une matière de droits : accès (exercé), rectification si elle est fausse, suppression si elle ne devrait pas être gardée. Ce qui manque par rapport aux catégories déclarées se mesure au détecteur d’export partiel, juste au-dessus.</p>';
    };
    lecteur.readAsText(fic);
  });

  /* ---- 45 · Le silence consigné ---- */
  function demarchesLocales(){
    var etat = cerveau(); if(!etat || !etat.entrees) return [];
    var parId = {};
    etat.entrees.forEach(function(e){
      var c = null; try { c = JSON.parse(e.contenu); } catch(err) {}
      if(!c) return;
      if(e.type === 'demarche') parId[c.id] = {d: c, reponse: null};
      if(e.type === 'demarche-reponse' && parId[c.demarche_id]) parId[c.demarche_id].reponse = c;
    });
    return Object.keys(parId).map(function(k){ return parId[k]; });
  }
  function silPeupler(){
    var sel = $('sil-demarche'); if(!sel) return;
    var auj = new Date().toISOString().slice(0, 10);
    var eligibles = demarchesLocales().filter(function(it){ return !it.reponse && it.d.echeance < auj; });
    sel.innerHTML = eligibles.length
      ? eligibles.map(function(it){ return '<option value="' + echap(it.d.id) + '">' + echap(it.d.detenteur) + ' — ' + echap(it.d.type) + ' (envoyée le ' + it.d.date_envoi + ', échéance ' + it.d.echeance + ')</option>'; }).join('')
      : '<option value="">(aucune démarche échue sans réponse consignée pour le moment)</option>';
  }
  if($('sil-demarche')){
    silPeupler();
    $('sil-generer').addEventListener('click', function(){
      var id = $('sil-demarche').value;
      var it = demarchesLocales().filter(function(x){ return x.d.id === id; })[0];
      if(!it){ $('sil-etat').textContent = 'Aucune démarche éligible : le silence ne se compose qu’à l’échéance passée.'; return; }
      $('sil-annexe').value = silComposerAnnexe(it.d, $('sil-preuve').value.trim(), new Date().toISOString().slice(0, 10), 'fr');
      $('sil-etat').textContent = 'Annexe composée — relis-la, puis joins-la à la plainte ; scelle le silence pour le consigner.';
    });
    $('sil-copier').addEventListener('click', async function(){
      var t = $('sil-annexe').value;
      if(!t){ $('sil-etat').textContent = 'Compose d’abord l’annexe.'; return; }
      try { await navigator.clipboard.writeText(t); $('sil-etat').textContent = 'Annexe copiée.'; }
      catch(e){ $('sil-annexe').select(); $('sil-etat').textContent = 'Copie automatique refusée : le texte est sélectionné, copie-le manuellement.'; }
    });
    $('sil-sceller').addEventListener('click', function(){
      var id = $('sil-demarche').value;
      var it = demarchesLocales().filter(function(x){ return x.d.id === id; })[0];
      if(!it){ $('sil-etat').textContent = 'Aucune démarche éligible à sceller.'; return; }
      sceller('refus', {demarche_id: id, motif: 'silence du détenteur au-delà du délai de réponse — refus réputé ; annexe de plainte composée le ' + new Date().toISOString().slice(0, 10), date: new Date().toISOString().slice(0, 10), preuve_envoi: $('sil-preuve').value.trim() || null}).then(function(e){
        $('sil-etat').textContent = 'Silence scellé comme un refus dans ton cerveau (maillon ' + e.seq + '). L’annexe ci-dessus l’accompagne à la plainte.';
      }).catch(function(){ $('sil-etat').textContent = 'Le moteur de ton cerveau n’est pas prêt — recharge la page, puis rescelle.'; });
    });
  }

  /* ---- 47 · Décision parentale ---- */
  if($('enf-sceller')) $('enf-sceller').addEventListener('click', function(){
    var service = $('enf-service').value.trim(), dec = $('enf-decision').value.trim();
    if(!service || !dec){ $('enf-etat').textContent = 'Nomme le service et la décision : une acceptation sans objet nommé ne se scelle pas.'; return; }
    sceller('decision', {decision: 'laisse numérique des enfants — ' + service + ' : ' + dec, par: 'décision parentale', effet_attendu: 'les réglages et l’usage restent ceux qui ont été décidés ; toute dérive se constatera comme une preuve', consigne_le: new Date().toISOString().slice(0, 10)}).then(function(e){
      $('enf-etat').textContent = 'Décision parentale scellée (maillon ' + e.seq + '). Elle vit désormais à la section §A de ton dossier de suivi, avec ses preuves à venir.';
    }).catch(function(){ $('enf-etat').textContent = 'Le moteur de ton cerveau n’est pas prêt — recharge la page, puis rescelle.'; });
  });

  /* ---- 48 · Antériorité pour tous ---- */
  var antCourant = null;
  if($('ant-calculer')) $('ant-calculer').addEventListener('click', function(){
    var fic = $('ant-fichier').files && $('ant-fichier').files[0];
    var texte = $('ant-texte').value;
    var fait = function(buf, nom, taille){
      sha256hex(buf).then(function(fp){
        antCourant = {nom: nom, empreinte: fp, taille: taille};
        $('ant-empreinte').textContent = fp;
        $('ant-detail').textContent = nom + ' — ' + taille + ' octet(s), empreinte calculée sur cet appareil, à l’instant.';
        $('ant-sceller').disabled = false;
      });
    };
    if(fic){
      var lecteur = new FileReader();
      lecteur.onload = function(){ fait(lecteur.result, fic.name, fic.size); };
      lecteur.readAsArrayBuffer(fic);
    } else if(texte){
      fait(new TextEncoder().encode(texte).buffer, 'texte collé', new TextEncoder().encode(texte).length);
    } else $('ant-detail').textContent = 'Dépose un fichier ou colle un texte : sans matière, pas d’empreinte.';
  });
  if($('ant-sceller')) $('ant-sceller').addEventListener('click', function(){
    if(!antCourant) return;
    sceller('geste', {geste: 'anteriorite', nom: antCourant.nom, empreinte: antCourant.empreinte, taille: antCourant.taille, date: new Date().toISOString().slice(0, 10), note: 'Antériorité scellée par l’utilisateur : le fichier existait sous cette empreinte à cette date, dans sa chaîne.'}).then(function(e){
      $('ant-etat').textContent = 'Antériorité scellée dans ton cerveau (maillon ' + e.seq + '). Pour la porter chez un tiers, suis les chemins d’ancrage de la section §F de ce panneau.';
    }).catch(function(){ $('ant-etat').textContent = 'Le moteur de ton cerveau n’est pas prêt — recharge la page, puis rescelle.'; });
  });

  /* ---- 49 · Effaceur de métadonnées ---- */
  var effCourant = null;
  if($('eff-lire')) $('eff-lire').addEventListener('click', function(){
    var fic = $('eff-fichier').files && $('eff-fichier').files[0];
    var zone = $('eff-resultat');
    if(!fic){ zone.innerHTML = '<p class="petite">Choisis d’abord une photo JPEG ou PNG.</p>'; return; }
    var lecteur = new FileReader();
    lecteur.onload = function(){
      var buf = lecteur.result;
      var estJPEG = fic.type === 'image/jpeg' || /\.jpe?g$/i.test(fic.name);
      var tags = estJPEG ? effLireJPEG(buf) : effLirePNG(buf);
      if(tags === null){ zone.innerHTML = '<p class="petite">Ce fichier n’a pas la signature du format attendu — rien n’est lu ni produit.</p>'; effCourant = null; $('eff-nettoyer').disabled = true; return; }
      effCourant = {buf: buf, nom: fic.name, jpeg: estJPEG};
      zone.innerHTML = tags.length
        ? '<p><strong>Ce que cette photo raconte :</strong></p>' + tags.map(function(t){ return '<p class="petite"><strong>' + echap(t.nom) + '</strong> : ' + echap(t.valeur) + '</p>'; }).join('')
        : '<p>Aucune métadonnée lisible dans ce fichier (ni Exif, ni XMP, ni texte) : la photo ne raconte rien de plus que son image, dans les segments que cette page sait lire.</p>';
      $('eff-nettoyer').disabled = false;
    };
    lecteur.readAsArrayBuffer(fic);
  });
  if($('eff-nettoyer')) $('eff-nettoyer').addEventListener('click', function(){
    if(!effCourant) return;
    var r = effCourant.jpeg ? effNettoyerJPEG(effCourant.buf) : effNettoyerPNG(effCourant.buf);
    if(!r){ $('eff-etat').textContent = 'Le nettoyage a échoué sur ce fichier — l’original n’a pas bougé.'; return; }
    var blob = new Blob([r.donnees], {type: effCourant.jpeg ? 'image/jpeg' : 'image/png'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = effCourant.nom.replace(/(\.[^.]+)$/, '-nettoyee$1');
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 400);
    $('eff-etat').textContent = 'Copie nettoyée produite : ' + r.retires + ' segment(s) de métadonnées retiré(s), pixels intouchés. Vérifie-la dans le miroir de ta galerie avant de la partager — et garde l’original chez toi.';
  });

  /* ---- 50 · Visite guidée, côté pisteur ---- */
  if($('pis-commencer')) $('pis-commencer').addEventListener('click', function(){
    var zone = $('pis-etapes');
    var params = window.location.search || '(aucun)';
    var ref = document.referrer || '(aucun — arrivée directe, ou référent masqué par le navigateur)';
    var entrees = (performance.getEntriesByType ? performance.getEntriesByType('resource') : []);
    var hotes = {};
    entrees.forEach(function(e){ try { var u = new URL(e.name); if(u.origin !== window.location.origin) hotes[u.host] = 1; } catch(err){} });
    var etapes = [
      ['Il voit arriver une requête, horodatée à la seconde.', 'Ton adresse réseau et l’heure exacte de la visite : la matière première de tout journal. (Technique : journalisation serveur — hors de la page, et ce site le dit de lui-même.)'],
      ['Il lit ton référent : « ' + ref.slice(0, 90) + ' » et les paramètres de l’adresse : « ' + params.slice(0, 90) + ' ».', 'D’où tu viens, et parfois par quelle campagne tu es arrivé — les paramètres d’URL sont faits pour ça. (Technique : en-tête Referer, paramètres de campagne.)'],
      ['Il prend ton empreinte : ' + navigator.userAgent.slice(0, 90) + ' · écran ' + screen.width + '×' + screen.height + ' · fuseau ' + (Intl.DateTimeFormat().resolvedOptions().timeZone || '?') + '.', 'Assez de signaux stables pour te reconnaître d’une visite à l’autre sans aucun témoin — la section 36 te les montre tous, et te laisse sceller leur somme. (Technique : empreinte de navigateur.)'],
      ['Il compte ce que la page charge : ' + entrees.length + ' requête(s) ici, hôtes externes : ' + (Object.keys(hotes).length ? Object.keys(hotes).join(', ') : 'aucun à cet instant') + '.', 'Chaque ressource externe est un témoin de ta visite chez un tiers. Sur ce site, la liste est publique et courte — la section 37 la montre en direct. Chez un récoltant, elle est son inventaire. (Technique : inventaire de requêtes, pixels et bibliothèques tierces.)'],
      ['Il en déduit un profil, pas un nom — c’est assez.', 'Heure de vie, langue, lieu approximatif, centres d’intérêt probables : le ciblage n’a jamais eu besoin de ton nom. C’est pour cela que la demande écrite — accès, rectification, suppression — vise les données, pas l’identité. (Technique : inférence et appariement, vus au rapport sur les transits.)']
    ];
    zone.innerHTML = etapes.map(function(e, i){
      return '<div class="cv-entree"><strong>Étape ' + (i + 1) + '.</strong> ' + echap(e[0]) + '<br><span class="petite">' + echap(e[1]) + '</span></div>';
    }).join('');
  });
  if($('pis-effacer')) $('pis-effacer').addEventListener('click', function(){ $('pis-etapes').innerHTML = ''; });

  /* ---- 51 · Carte des consentements ---- */
  function consAfficher(){
    var zone = $('cons-liste'); if(!zone) return;
    var etat = cerveau();
    if(!etat || !etat.entrees){ zone.innerHTML = ''; return; }
    var retraits = {};
    etat.entrees.forEach(function(e){
      try { var c = JSON.parse(e.contenu); if(c && c.geste === 'retrait-consentement') retraits[c.pour_seq] = e; } catch(err) {}
    });
    var items = [];
    etat.entrees.forEach(function(e){
      try {
        var c = JSON.parse(e.contenu);
        if(c && c.geste === 'consentement') items.push({seq: e.seq, c: c, retrait: retraits[e.seq] || null});
      } catch(err) {}
    });
    zone.innerHTML = items.length ? items.map(function(it){
      return '<div class="cv-entree"><strong>' + echap(it.c.service) + '</strong> — ' + echap(it.c.objet) + ' <span class="petite">(acceptation scellée le ' + echap(it.c.date) + ', maillon ' + it.seq + ')</span><br>' +
        (it.retrait ? '<span class="verdict-ok">Retrait scellé le ' + String(it.retrait.ts).slice(0, 10) + ' (maillon ' + it.retrait.seq + ').</span>'
                    : '<button type="button" class="secondaire" data-retrait="' + it.seq + '">Sceller le retrait de ce consentement</button>') + '</div>';
    }).join('') : '<p class="petite">Aucune acceptation consignée pour le moment.</p>';
    zone.querySelectorAll('[data-retrait]').forEach(function(b){
      b.addEventListener('click', function(){
        sceller('geste', {geste: 'retrait-consentement', pour_seq: Number(b.getAttribute('data-retrait')), date: new Date().toISOString().slice(0, 10), note: 'Retrait consigné par l’utilisateur depuis la carte des consentements.'}).then(function(){ consAfficher(); $('cons-etat').textContent = 'Retrait scellé dans ton cerveau.'; });
      });
    });
  }
  if($('cons-consigner')){
    consAfficher();
    $('cons-consigner').addEventListener('click', function(){
      var service = $('cons-service').value.trim(), objet = $('cons-objet').value.trim();
      if(!service || !objet){ $('cons-etat').textContent = 'Nomme le service et ce qui a été accepté.'; return; }
      sceller('geste', {geste: 'consentement', service: service, objet: objet, date: new Date().toISOString().slice(0, 10)}).then(function(e){
        $('cons-etat').textContent = 'Acceptation scellée (maillon ' + e.seq + '). Son retrait, quand tu le feras, se scellera ici en regard.';
        consAfficher();
      }).catch(function(){ $('cons-etat').textContent = 'Le moteur de ton cerveau n’est pas prêt — recharge la page, puis rescelle.'; });
    });
  }

  /* ---- 52 · Enveloppe « en cas d'incapacité » (bornée, exploratoire) ---- */
  async function envDeriver(phrase, sel){
    var enc = new TextEncoder();
    var materiel = await crypto.subtle.importKey('raw', enc.encode(phrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({name: 'PBKDF2', salt: sel, iterations: 250000, hash: 'SHA-256'}, materiel, {name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
  }
  function b64(u8){ var s = ''; u8.forEach(function(b){ s += String.fromCharCode(b); }); return btoa(s); }
  function deb64(t){ return Uint8Array.from(atob(t), function(c){ return c.charCodeAt(0); }); }
  if($('env-sceller')) $('env-sceller').addEventListener('click', async function(){
    var texte = $('env-texte').value, phrase = $('env-phrase').value;
    if(!texte.trim() || phrase.length < 8){ $('env-etat').textContent = 'Il faut un texte et une phrase d’au moins 8 caractères — une enveloppe faible protège mal, et elle le dit.'; return; }
    try {
      var sel = crypto.getRandomValues(new Uint8Array(16));
      var iv = crypto.getRandomValues(new Uint8Array(12));
      var cle = await envDeriver(phrase, sel);
      var chiffre = await crypto.subtle.encrypt({name: 'AES-GCM', iv: iv}, cle, new TextEncoder().encode(texte));
      var e = await sceller('geste', {geste: 'enveloppe-incapacite', format: 'pbkdf2-sha256-250000/aes-256-gcm', sel: b64(sel), iv: b64(iv), chiffre: b64(new Uint8Array(chiffre)), date: new Date().toISOString().slice(0, 10), note: 'Enveloppe chiffrée par la phrase de l’utilisateur, dans son cerveau local. Jamais transmise ; le site ne peut pas l’ouvrir.'});
      $('env-texte').value = ''; $('env-phrase').value = '';
      $('env-etat').textContent = 'Enveloppe chiffrée et scellée dans ton cerveau (maillon ' + e.seq + '). Le clair a disparu de cette page ; seul le chiffré est dans ta chaîne.';
    } catch(err){ $('env-etat').textContent = 'Le scellement chiffré a échoué — recharge la page, puis réessaie.'; }
  });
  if($('env-ouvrir')) $('env-ouvrir').addEventListener('click', async function(){
    var phrase = $('env-phrase-lecture').value;
    var zone = $('env-lecture');
    var etat = cerveau();
    var trouvee = null;
    if(etat && etat.entrees) etat.entrees.forEach(function(e){
      try { var c = JSON.parse(e.contenu); if(c && c.geste === 'enveloppe-incapacite') trouvee = c; } catch(err) {}
    });
    if(!trouvee){ zone.innerHTML = '<p class="petite">Aucune enveloppe dans ton cerveau sur cet appareil.</p>'; return; }
    try {
      var cle = await envDeriver(phrase, deb64(trouvee.sel));
      var clair = await crypto.subtle.decrypt({name: 'AES-GCM', iv: deb64(trouvee.iv)}, cle, deb64(trouvee.chiffre));
      zone.innerHTML = '<div class="carte"><p class="etiquette">Ton enveloppe, ouverte ici —</p><p style="white-space:pre-wrap">' + echap(new TextDecoder().decode(clair)) + '</p><p class="petite">Referme en rechargeant la page : le clair ne vit que dans cet affichage.</p></div>';
    } catch(err){ zone.innerHTML = '<p class="petite">La phrase ne correspond pas à cette enveloppe (ou l’enveloppe est altérée) : le déchiffrement authentifié refuse — c’est sa fonction.</p>'; }
  });
})();

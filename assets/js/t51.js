
/* ===== v53 — bannière de l'accueil (date · heure · météo), porte météo
   documentée nº 2, et panneau Miroir =====
   La bannière lit le temps chez le visiteur (aucun serveur) ; sa météo
   dépend du mode choisi au panneau Miroir : relevé daté embarqué en mode
   local (le défaut), Porte documentée nº 2 (Open-Meteo, carte des
   transits, section 44) en mode démonstration avec serveurs.
   Le Miroir, lui, n'ouvre aucune porte : sa pertinence est de n'en ouvrir
   aucune — tout son relevé se calcule dans le navigateur du visiteur. */
(function(){
  'use strict';
  function $(id){ return document.getElementById(id); }
  function pad2(n){ return (n<10?'0':'')+n; }
  function echap(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  var reduit = false;
  try{ reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}

  /* ---------- Date : civile + calendrier 13 × 28 ----------
     Même arithmétique que le module donné au visiteur
     (assets/module-calendrier-13x28.js), intégrée comme au panneau
     Calendrier : origine (ancrage B) 19 mars 2026, 23 h 56 min 04 s,
     heure civile du Québec ; facteur sidéral 1,00273790935. */
  var B53_ORIGINE_MS = Date.UTC(2026, 2, 20, 3, 56, 4);
  function b53EtatCalendrier(ms){
    var ecouleS = (ms - B53_ORIGINE_MS) / 1000;
    var joursCivils = Math.floor(ecouleS / 86400);
    var jourDuCycle = ((joursCivils % 364) + 364) % 364;
    return {
      joursEcoules: joursCivils,
      cycle: Math.floor(joursCivils / 364) + 1,
      mois: Math.floor(jourDuCycle / 28) + 1,
      jourDuMois: (jourDuCycle % 28) + 1,
      jourDuCycle: jourDuCycle + 1
    };
  }
  /* ---------- Heure sidérale : même polynôme GMST que le panneau Temps,
     ramené à la longitude de Sainte-Martine (−73,7989°). ---------- */
  function b53Siderale(d){
    var JD = d.getTime() / 86400000 + 2440587.5;
    var gmst = 280.46061837 + 360.98564736629 * (JD - 2451545.0);
    var lst = ((gmst - 73.7989) % 360 + 360) % 360;
    var h = Math.floor(lst / 15), rem = lst - h * 15, m = Math.floor(rem * 4), s = Math.floor((rem * 4 - m) * 60);
    return pad2(h) + ':' + pad2(m) + ':' + pad2(s);
  }
  var fmtDateTO = new Intl.DateTimeFormat('fr-CA', {timeZone: 'America/Toronto', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
  var fmtHeureTO = new Intl.DateTimeFormat('fr-CA', {timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'});
  function b53MajBanniereTemps(){
    var d = new Date();
    var el;
    el = $('b53-date-civile'); if (el) el.textContent = fmtDateTO.format(d);
    el = $('b53-date-cal');
    if (el) {
      var ec = b53EtatCalendrier(d.getTime());
      el.textContent = 'Calendrier 13 × 28 : Mois ' + ec.mois + ' · Jour ' + ec.jourDuMois + ' · jour ' + ec.jourDuCycle + ' du cycle ' + ec.cycle;
    }
    el = $('b53-heure-civile'); if (el) el.textContent = fmtHeureTO.format(d);
    el = $('b53-heure-siderale'); if (el) el.textContent = 'Sidérale ' + b53Siderale(d) + ' · Sainte-Martine';
  }
  if ($('b53-date-civile')) {
    b53MajBanniereTemps();
    if (!reduit) setInterval(b53MajBanniereTemps, 1000);
  }

  /* ---------- Météo : relevé daté en mode local ; Porte documentée nº 2
     (Open-Meteo) en mode démonstration avec serveurs ---------- */
  var B53_WMO = {0:'Dégagé',1:'Principalement dégagé',2:'Partiellement nuageux',3:'Couvert',45:'Brouillard',48:'Brouillard givrant',51:'Bruine légère',53:'Bruine',55:'Bruine dense',56:'Bruine verglaçante',57:'Bruine verglaçante',61:'Pluie légère',63:'Pluie',65:'Pluie forte',66:'Pluie verglaçante',67:'Pluie verglaçante',71:'Neige légère',73:'Neige',75:'Neige forte',77:'Neige en grains',80:'Averses légères',81:'Averses',82:'Averses violentes',85:'Averses de neige',86:'Averses de neige',95:'Orage',96:'Orage avec grêle',99:'Orage avec grêle'};
  function b53FmtTemp(t){ return (Math.round(t * 10) / 10).toString().replace('.', ',') + ' °C'; }

  /* ---------- Le double mode (panneau Miroir) : local par défaut ;
     démonstration avec serveurs = opt-in, révocable, gardé dans le
     navigateur du visiteur (localStorage — son choix, sur son appareil). ---------- */
  var B53_CLE_MODE = 'sophia-mode-demonstration';
  var B53_ECHO_URL = 'https://sophia-miroir-echo.alexgagnon-m.workers.dev/echo';
  function b53ModeServeurs(){
    try { return window.localStorage.getItem(B53_CLE_MODE) === 'serveurs'; } catch(e){ return false; }
  }
  function b53PoserMode(serveurs){
    try {
      if (serveurs) window.localStorage.setItem(B53_CLE_MODE, 'serveurs');
      else window.localStorage.removeItem(B53_CLE_MODE);
    } catch(e){}
    b53MajModeUI();
    b53ChargerMeteo();
  }
  function b53MajModeUI(){
    var serveurs = b53ModeServeurs();
    var phrase = serveurs
      ? 'Mode actif : DÉMONSTRATION AVEC SERVEURS — les portes documentées (panneau « Les deux modes ») peuvent s’ouvrir à ta demande. Ton cerveau, les sceaux et le calendrier fonctionnent exactement comme en mode local.'
      : 'Mode actif : LOCAL (par défaut) — aucun serveur du site, aucune donnée du visiteur ne part, pas d’écho ; le relevé, ton cerveau et les calculs fonctionnent chez toi. Les appels sortants vers les services publics nommés (météo, lectures) sont listés à la carte des transits.';
    var etatM = $('mir53-mode-etat'); if (etatM) etatM.textContent = phrase;
    var etatP = $('modes53-etat'); if (etatP) etatP.textContent = phrase;
    var chipV = $('b53-mode-chip'); if (chipV) chipV.textContent = serveurs ? 'Serveurs' : 'Local';
    var chipD = $('b53-mode-detail'); if (chipD) chipD.textContent = serveurs ? 'Portes documentées actives — changer' : 'Aucun serveur du site, aucun écho — changer';
    var echoBtn = $('mir53-echo-bouton'); if (echoBtn) echoBtn.disabled = !serveurs;
    var bS = $('modes53-btn-serveurs'), bL = $('modes53-btn-local');
    if (bS) bS.disabled = serveurs;
    if (bL) bL.disabled = !serveurs;
  }

  var b53SnapshotPromise = null;
  function b53LireSnapshot(){
    if (!b53SnapshotPromise) {
      b53SnapshotPromise = fetch('assets/meteo-sainte-martine.json').then(function(r){
        if (!r.ok) throw new Error('relevé embarqué absent');
        return r.json();
      }).then(function(j){
        return {temperature_c: j.temperature_c, condition: j.condition, vent_kmh: j.vent_kmh, lu_le: j.releve_le, source: j.source};
      }).catch(function(){ return null; });
    }
    return b53SnapshotPromise;
  }
  function b53AfficherMeteo(m, nature){
    var val = $('b53-meteo-valeur'), det = $('b53-meteo-detail');
    var amV = $('am-valeur'), amD = $('am-detail');
    if (!m) {
      if (val) val.textContent = 'Sainte-Martine · météo indisponible';
      if (det) det.textContent = 'Aucun relevé disponible — dit tel quel.';
      if (amV) amV.textContent = 'Météo indisponible à cet instant — dit tel quel.';
      if (typeof b53AppliquerPointRetenu === 'function') b53AppliquerPointRetenu();
      return;
    }
    var texte = 'Sainte-Martine · ' + b53FmtTemp(m.temperature_c) + ' · ' + m.condition;
    if (val) val.textContent = texte;
    if (amV) amV.textContent = texte + ' · vent ' + m.vent_kmh + ' km/h';
    var jour = String(m.lu_le).slice(0, 10);
    var dateHeure = jour;
    try { dateHeure = new Intl.DateTimeFormat('fr-CA', {timeZone: 'America/Toronto', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'}).format(new Date(m.lu_le)) + ' (heure du Québec)'; } catch(e){}
    if (nature === 'direct') {
      if (det) det.textContent = 'En direct · Open-Meteo — porte documentée nº 2';
      if (amD) amD.textContent = 'Relevé en direct, lu à l’instant par la Porte documentée nº 2 — Open-Meteo (api.open-meteo.com) : la requête elle-même, aucune donnée personnelle (carte des transits, section 44).';
    } else if (nature === 'releve') {
      if (det) det.textContent = 'Relevé embarqué du ' + dateHeure + ' · la porte n’a pas répondu';
      if (amD) amD.textContent = 'Relevé embarqué du ' + dateHeure + ' (' + m.source + ') — affiché parce que la Porte documentée nº 2 n’a pas répondu à cet instant : un relevé daté et horodaté, jamais un blanc.';
    } else {
      if (det) det.textContent = 'Relevé embarqué du ' + dateHeure + ' · avec sa source — les données viennent des services météo nommés (Open-Meteo, MET Norway) ; ce qui est local, c’est qu’aucune donnée du visiteur ne part';
      if (amD) amD.textContent = 'Aucun appel n’a été fait pour ce bloc : le relevé affiché est le relevé embarqué du ' + dateHeure + ', montré avec sa source (' + m.source + ') — comme à l’Accueil, la date et l’heure du relevé sont écrites. En mode démonstration avec serveurs (panneau Miroir), la météo de l’ancre se lit en direct par la Porte documentée nº 2.';
    }
    if (typeof b53AppliquerPointRetenu === 'function') b53AppliquerPointRetenu();
  }
  function b53ChargerMeteo(){
    if (b53ModeServeurs()) {
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=45.24915&longitude=-73.7989&current=temperature_2m,weather_code,wind_speed_10m&timezone=America%2FToronto&forecast_days=1';
      fetch(url).then(function(r){
        if (!r.ok) throw new Error('porte sans réponse');
        return r.json();
      }).then(function(j){
        var c = j && j.current;
        if (!c || typeof c.temperature_2m !== 'number') throw new Error('relevé illisible');
        b53AfficherMeteo({temperature_c: c.temperature_2m, condition: B53_WMO[c.weather_code] || 'Condition non nommée', vent_kmh: Math.round(c.wind_speed_10m), lu_le: new Date().toISOString(), source: 'Open-Meteo (api.open-meteo.com)'}, 'direct');
      }).catch(function(){
        b53LireSnapshot().then(function(m){ b53AfficherMeteo(m, 'releve'); });
      });
    } else {
      b53LireSnapshot().then(function(m){ b53AfficherMeteo(m, 'local'); });
    }
  }
  b53ChargerMeteo();
  var bModeS = $('modes53-btn-serveurs'), bModeL = $('modes53-btn-local');
  if (bModeS) bModeS.addEventListener('click', function(){ b53PoserMode(true); });
  if (bModeL) bModeL.addEventListener('click', function(){ b53PoserMode(false); });
  b53MajModeUI();

  /* ---------- L'écho serveur : « voici ce qu'un serveur reçoit de toi » ---------- */
  var bEcho = $('mir53-echo-bouton');
  if (bEcho) bEcho.addEventListener('click', function(){
    var zone = $('mir53-echo-zone');
    if (!zone) return;
    zone.innerHTML = '<p class="petite">Appel de la porte écho en cours…</p>';
    fetch(B53_ECHO_URL, {method: 'GET'}).then(function(r){
      if (!r.ok) throw new Error('réponse ' + r.status);
      return r.json();
    }).then(function(j){
      var recu = j.recu_par_le_serveur || {};
      var meta = recu.metadonnees_reseau || {};
      var lignes = [];
      function ligne(nom, valeur){ if (valeur) lignes.push('<tr><th>' + echap(nom) + '</th><td>' + echap(valeur) + '</td></tr>'); }
      ligne('Adresse IP telle que le serveur la reçoit', recu.adresse_ip);
      ligne('Lieu du réseau (métadonnées de l’opérateur de bordure)', [meta.ville, meta.region, meta.pays].filter(Boolean).join(', '));
      ligne('Fournisseur d’accès (ASN)', meta.fournisseur);
      ligne('Protocole / TLS', [meta.http, meta.protocole_tls].filter(Boolean).join(' · '));
      ligne('Point de présence', meta.centre);
      var ent = recu.en_tetes || {};
      ['user-agent', 'accept-language', 'accept', 'referer', 'sec-ch-ua', 'sec-ch-ua-platform', 'sec-gpc', 'dnt'].forEach(function(k){
        if (ent[k]) ligne('En-tête ' + k, ent[k]);
      });
      zone.innerHTML = '<p><strong>Ce que le serveur du site a reçu de cette demande, et te renvoie :</strong></p><table>' + lignes.join('') + '</table>' +
        '<p class="petite">' + echap(j.conservation || 'Rien n’est journalisé ni conservé : cette réponse est calculée à la volée et renvoyée au seul demandeur.') + '</p>';
    }).catch(function(){
      zone.innerHTML = '<p class="petite">L’écho n’est pas joignable à cet instant — le panneau le dit, et tout continue en local : ton relevé, ton cerveau et les calculs n’ont pas besoin de lui.</p>';
    });
  });

  /* ================= Le Miroir — relevé maximal, 100 % local ================= */
  var mirCourant = null;
  function mirSha(texte){
    if (typeof cuSha256Hex === 'function') return cuSha256Hex(texte);
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte)).then(function(t){
      var o = new Uint8Array(t), s = '';
      for (var i = 0; i < o.length; i++) s += o[i].toString(16).padStart(2, '0');
      return s;
    });
  }
  function mirNonExpose(){ return 'non exposé par ce navigateur'; }
  function mirSondeStockage(stockage){
    try { var k = '__mir53_sonde__'; stockage.setItem(k, '1'); stockage.removeItem(k); return 'disponible'; }
    catch(e){ return 'non disponible'; }
  }
  function mirWebGL(){
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return mirNonExpose();
      var ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) return String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)) + ' — ' + String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
      return String(gl.getParameter(gl.VENDOR)) + ' — ' + String(gl.getParameter(gl.RENDERER));
    } catch(e){ return mirNonExpose(); }
  }
  async function mirCanvasEmpreinte(){
    try {
      var c = document.createElement('canvas'); c.width = 280; c.height = 60;
      var x = c.getContext('2d');
      x.fillStyle = '#f1ecdf'; x.fillRect(0, 0, 280, 60);
      x.fillStyle = '#0e7a54'; x.font = '16px Georgia, serif'; x.fillText('Miroir — SoPHIa φ 1,618', 8, 24);
      x.fillStyle = 'rgba(134,101,15,.75)'; x.font = '13px monospace'; x.fillText('sceau 23 · 32 · 55 · 89', 8, 46);
      x.beginPath(); x.arc(252, 30, 16, 0, 7); x.fillStyle = 'rgba(14,122,84,.5)'; x.fill();
      return await mirSha(c.toDataURL());
    } catch(e){ return mirNonExpose(); }
  }
  function mirAudio(){
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return mirNonExpose();
      var ctx = new AC();
      var v = 'taux d’échantillonnage ' + ctx.sampleRate + ' Hz · état ' + ctx.state;
      if (ctx.close) ctx.close();
      return v;
    } catch(e){ return mirNonExpose(); }
  }
  async function mirPermission(nom){
    try {
      if (!navigator.permissions || !navigator.permissions.query) return mirNonExpose();
      var st = await navigator.permissions.query({name: nom});
      return st.state === 'granted' ? 'accordée' : (st.state === 'denied' ? 'refusée' : 'à demander (jamais demandée par ce relevé)');
    } catch(e){ return mirNonExpose(); }
  }
  async function mir53Calculer(){
    var etat = $('mir53-etat'), groupesEl = $('mir53-groupes'), synth = $('mir53-synthese');
    if (!groupesEl) return;
    if (etat) etat.textContent = 'Calcul du relevé, dans ton navigateur…';
    var promesses = [];
    var uaEnrichi = 'non exposé par ce navigateur';
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      promesses.push(navigator.userAgentData.getHighEntropyValues(['platform', 'model', 'mobile', 'architecture', 'platformVersion']).then(function(h){
        var morceaux = [];
        if (h.platform) morceaux.push('plateforme ' + h.platform + (h.platformVersion ? ' ' + h.platformVersion : ''));
        if (h.model) morceaux.push('modèle ' + h.model);
        morceaux.push(h.mobile ? 'appareil mobile' : 'appareil non mobile');
        var archiUA = /x86_64|Win64|WOW64/.test(navigator.userAgent || '') ? 'x86_64' : (/aarch64|arm/i.test(navigator.userAgent || '') ? 'arm' : '');
        if (archiUA) morceaux.push('architecture ' + archiUA + ' (lue dans l’agent utilisateur, comme la ligne complète ci-dessus)');
        else if (h.architecture) morceaux.push('architecture ' + h.architecture);
        uaEnrichi = morceaux.join(' · ');
      }).catch(function(){}));
    }
    var batterie = 'non exposée par ce navigateur';
    if (navigator.getBattery) {
      promesses.push(navigator.getBattery().then(function(b){
        batterie = 'niveau ' + Math.round(b.level * 100) + ' % · ' + (b.charging ? 'en charge' : 'sur batterie');
      }).catch(function(){}));
    }
    var perms = {};
    ['notifications', 'geolocation', 'camera', 'microphone'].forEach(function(nom){
      promesses.push(mirPermission(nom).then(function(v){ perms[nom] = v; }));
    });
    var canvasFp = await mirCanvasEmpreinte();
    await Promise.all(promesses);
    var cerveau = null;
    try { cerveau = JSON.parse(window.localStorage.getItem('cerveau-utilisateur-v1') || 'null'); } catch(e){}
    var fuseau = mirNonExpose();
    try { fuseau = Intl.DateTimeFormat().resolvedOptions().timeZone || fuseau; } catch(e){}
    var conn = navigator.connection || {};
    var groupes = [
      {titre: 'Appareil et système', signaux: [
        {nom: 'Navigateur déclaré (agent utilisateur)', valeur: navigator.userAgent || mirNonExpose(), couche: 'TRANSIT', note: 'Lu ici, et envoyé en en-tête à chaque requête : c’est la carte d’identité que ton navigateur présente à tous les serveurs.'},
        {nom: 'Données client enrichies', valeur: uaEnrichi, couche: 'LOCAL', note: 'Détail que certains navigateurs (Chrome) exposent aux pages : plateforme, modèle, architecture. Un pisteur s’en sert pour départager des appareils qui se ressemblent.'},
        {nom: 'Plateforme déclarée', valeur: navigator.platform || mirNonExpose(), couche: 'LOCAL', note: 'Le système que le navigateur déclare, en abrégé.'},
        {nom: 'Cœurs de processeur déclarés', valeur: typeof navigator.hardwareConcurrency === 'number' ? String(navigator.hardwareConcurrency) : mirNonExpose(), couche: 'LOCAL', note: 'Un indice de la classe de l’appareil — et un morceau d’empreinte.'},
        {nom: 'Mémoire déclarée (arrondie)', valeur: typeof navigator.deviceMemory === 'number' ? '≈ ' + navigator.deviceMemory + ' Go' : mirNonExpose(), couche: 'LOCAL', note: 'Volontairement arrondie par le navigateur ; elle départage quand même les gammes d’appareils.'},
        {nom: 'Points de contact tactiles', valeur: String(navigator.maxTouchPoints), couche: 'LOCAL', note: 'Distingue un téléphone tactile d’un ordinateur à souris.'}
      ]},
      {titre: 'Affichage', signaux: [
        {nom: 'Écran', valeur: screen.width + ' × ' + screen.height + ' px', couche: 'LOCAL', note: 'La taille physique de l’écran : très distinctive d’un modèle à l’autre.'},
        {nom: 'Fenêtre', valeur: window.innerWidth + ' × ' + window.innerHeight + ' px', couche: 'LOCAL', note: 'La taille de la fenêtre à l’instant : un signal d’empreinte classique, car elle varie peu chez une même personne.'},
        {nom: 'Ratio de pixels', valeur: String(window.devicePixelRatio || 1), couche: 'LOCAL', note: 'La netteté de l’écran — un indice de gamme.'},
        {nom: 'Profondeur de couleur', valeur: screen.colorDepth + ' bits', couche: 'LOCAL', note: 'Presque toujours 24 ; c’est la stabilité des signaux qui fait l’empreinte.'},
        {nom: 'Orientation', valeur: (screen.orientation && screen.orientation.type) ? screen.orientation.type : mirNonExpose(), couche: 'LOCAL', note: 'Portrait ou paysage, à l’instant du relevé.'}
      ]},
      {titre: 'Langue et temps', signaux: [
        {nom: 'Langues préférées', valeur: (navigator.languages && navigator.languages.length) ? navigator.languages.join(', ') : (navigator.language || mirNonExpose()), couche: 'TRANSIT', note: 'Lues ici, et envoyées à chaque requête dans l’en-tête Accept-Language : elles situent ta langue et souvent ta région.'},
        {nom: 'Langue d’interface', valeur: navigator.language || mirNonExpose(), couche: 'LOCAL', note: 'La langue du navigateur lui-même.'},
        {nom: 'Fuseau horaire', valeur: fuseau, couche: 'LOCAL', note: 'Situe grossièrement où tu vis — America/Toronto n’est pas un secret, mais c’est un signal.'},
        {nom: 'Décalage avec UTC', valeur: String(new Date().getTimezoneOffset()) + ' minutes', couche: 'LOCAL', note: 'Le même renseignement que le fuseau, en minutes.'},
        {nom: 'Heure locale lue', valeur: new Date().toLocaleString('fr-CA'), couche: 'LOCAL', note: 'Ton horloge, telle que cette page la lit.'}
      ]},
      {titre: 'Réseau — ce qui se lit d’ici, et ce qui part', signaux: [
        {nom: 'Adresse IP', valeur: 'non lisible d’ici', couche: 'TRANSIT', note: 'Aucune page ne peut lire ta propre adresse IP sans appeler un serveur — celle-ci n’en appelle aucun. L’hébergeur, lui, la reçoit à chaque requête : elle situe ton fournisseur d’accès et ton agglomération. Un VPN déplace cette position lue.'},
        {nom: 'Type de connexion effectif', valeur: conn.effectiveType || mirNonExpose(), couche: 'LOCAL', note: 'La classe de débit estimée par le navigateur (4G, 3G…).'},
        {nom: 'Débit estimé', valeur: typeof conn.downlink === 'number' ? '≈ ' + conn.downlink + ' Mb/s' : mirNonExpose(), couche: 'LOCAL', note: 'Une estimation, pas une mesure — écrite comme telle.'},
        {nom: 'Latence estimée', valeur: typeof conn.rtt === 'number' ? '≈ ' + conn.rtt + ' ms' : mirNonExpose(), couche: 'LOCAL', note: 'Le temps de trajet estimé par le navigateur.'},
        {nom: 'Économie de données', valeur: typeof conn.saveData === 'boolean' ? (conn.saveData ? 'activée' : 'non activée') : mirNonExpose(), couche: 'LOCAL', note: 'Le réglage « réduire les données » de ton appareil.'},
        {nom: 'En ligne en ce moment', valeur: navigator.onLine ? 'oui' : 'non', couche: 'LOCAL', note: 'Et pourtant ce relevé se calcule aussi hors ligne : c’est le principe du site.'}
      ]},
      {titre: 'Navigateur', signaux: [
        {nom: 'Témoins (cookies) autorisés', valeur: navigator.cookieEnabled ? 'oui' : 'non', couche: 'LOCAL', note: 'Le réglage, pas le contenu : ce site ne pose aucun témoin.'},
        {nom: 'Stockage local disponible', valeur: mirSondeStockage(window.localStorage), couche: 'LOCAL', note: 'Sondé par un aller-retour d’une clé jetable — rien n’est conservé par la sonde. C’est là que vit ton cerveau local.'},
        {nom: 'Stockage de session disponible', valeur: mirSondeStockage(window.sessionStorage), couche: 'LOCAL', note: 'Le stockage qui s’efface à la fermeture de l’onglet.'},
        {nom: 'Signal Do Not Track (DNT)', valeur: (navigator.doNotTrack === null || typeof navigator.doNotTrack === 'undefined') ? mirNonExpose() : String(navigator.doNotTrack), couche: 'LOCAL', note: 'Une demande de ne pas être suivi, déclarative — rien n’oblige les sites à l’honorer, et la plupart l’ignorent.'},
        {nom: 'Global Privacy Control (GPC)', valeur: typeof navigator.globalPrivacyControl === 'boolean' ? String(navigator.globalPrivacyControl) : mirNonExpose(), couche: 'LOCAL', note: 'Le successeur du DNT, à valeur légale en certains endroits : un signal de refus du partage et de la vente.'}
      ]},
      {titre: 'Capacités et empreinte', signaux: [
        {nom: 'Moteur graphique (WebGL)', valeur: mirWebGL(), couche: 'LOCAL', note: 'Le fabricant et le modèle du moteur graphique : l’un des signaux les plus distinctifs — il nomme presque la puce de l’appareil.'},
        {nom: 'Empreinte canvas (SHA-256)', valeur: canvasFp, couche: 'LOCAL', note: 'Le hachage d’un petit dessin que ton appareil rend à sa manière (polices, lissage, puce) : deux appareils différents donnent rarement la même image au pixel près. L’empreinte est le hachage — le dessin n’a pas quitté cette page.'},
        {nom: 'Contexte audio', valeur: mirAudio(), couche: 'LOCAL', note: 'La chaîne de traitement du son a aussi sa signature ; elle entre dans les empreintes avancées.'},
        {nom: 'Batterie', valeur: batterie, couche: 'LOCAL', note: 'Quand le navigateur l’expose : un niveau de batterie stable aide à reconnaître un appareil d’une visite à l’autre.'}
      ]},
      {titre: 'Autorisations — états seulement, jamais demandées', signaux: [
        {nom: 'Notifications', valeur: perms.notifications || mirNonExpose(), couche: 'LOCAL', note: 'L’état de l’autorisation, lu sans la demander.'},
        {nom: 'Géolocation', valeur: perms.geolocation || mirNonExpose(), couche: 'LOCAL', note: 'Lue seulement : ce relevé ne demande pas où tu es.'},
        {nom: 'Caméra', valeur: perms.camera || mirNonExpose(), couche: 'LOCAL', note: 'L’état seulement — aucune image n’est captée.'},
        {nom: 'Microphone', valeur: perms.microphone || mirNonExpose(), couche: 'LOCAL', note: 'L’état seulement — aucun son n’est capté.'}
      ]},
      {titre: 'Ce que ce site garde de toi — chez toi', signaux: [
        {nom: 'Entrées de ton cerveau local', valeur: cerveau && cerveau.entrees ? String(cerveau.entrees.length) + ' entrée(s)' : 'aucun cerveau encore', couche: 'LOCAL', note: 'Ta mémoire cumulative, dans le stockage de ce navigateur : le site ne peut pas la lire de son bord — cette ligne la lit de ton bord, dans cette page.'},
        {nom: 'Genèse de ton cerveau', valeur: cerveau && cerveau.cree_le ? String(cerveau.cree_le).slice(0, 10) : '—', couche: 'LOCAL', note: 'La date à laquelle ton cerveau local est né sur cet appareil.'},
        {nom: 'Préférence de thème du site', valeur: (function(){ try { return window.localStorage.getItem('sophia-theme') || 'clair (par défaut, rien de posé)'; } catch(e){ return mirNonExpose(); } })(), couche: 'LOCAL', note: 'Le seul réglage que ce site pose chez toi, avec ton cerveau : ton thème. Rien d’autre.'}
      ]}
    ];
    var lignes = [], total = 0;
    var html = '';
    groupes.forEach(function(g){
      html += '<div class="mir53-groupe"><h3>' + echap(g.titre) + '</h3><table>';
      g.signaux.forEach(function(s){
        total++;
        lignes.push(g.titre + ' | ' + s.nom + ' = ' + s.valeur);
        html += '<tr><th>' + echap(s.nom) + '</th><td>' + echap(s.valeur) +
          '<span class="mir53-couche ' + (s.couche === 'TRANSIT' ? 'transit' : 'local') + '">' + s.couche + '</span>' +
          '<br><span class="petite">' + echap(s.note) + '</span></td></tr>';
      });
      html += '</table></div>';
    });
    groupesEl.innerHTML = html;
    var empreinte = await mirSha(lignes.join('\n'));
    mirCourant = {empreinte: empreinte, signaux: total, date: new Date().toISOString().slice(0, 10)};
    if (synth) synth.innerHTML = '<strong>' + total + ' signaux relevés</strong> — empreinte de ce relevé (SHA-256 des signaux, calculée chez toi) : <span class="mono">' + empreinte + '</span><br><span class="petite">Le relevé lui-même n’a appelé aucun serveur : chaque valeur ci-dessus a été lue dans ton navigateur. Sceller le relevé consigne son empreinte et son compte dans ton cerveau — chez toi, jamais transmise.</span>';
    var sc = $('mir53-sceller'); if (sc) sc.disabled = false;
    if (etat) etat.textContent = 'Relevé calculé à l’instant, dans ton navigateur — rien n’a été envoyé.';
  }
  var btnCalc = $('mir53-calculer');
  if (btnCalc) btnCalc.addEventListener('click', mir53Calculer);
  var btnSc = $('mir53-sceller');
  if (btnSc) btnSc.addEventListener('click', function(){
    var etat = $('mir53-etat');
    if (!mirCourant) { if (etat) etat.textContent = 'Calcule d’abord le relevé.'; return; }
    if (typeof window.sophiaCerveauAjouter !== 'function') { if (etat) etat.textContent = 'Le moteur de ton cerveau n’est pas prêt sur cette page — recharge-la, puis rescelle.'; return; }
    window.sophiaCerveauAjouter('geste', JSON.stringify({geste: 'releve-miroir', empreinte: mirCourant.empreinte, signaux: mirCourant.signaux, date: mirCourant.date})).then(function(e){
      if (etat) etat.textContent = 'Relevé scellé dans ton cerveau (maillon ' + e.seq + ') : ' + mirCourant.signaux + ' signaux, empreinte ' + mirCourant.empreinte.slice(0, 16) + '… — chez toi, jamais transmis.';
    }).catch(function(){ if (etat) etat.textContent = 'Le scellement a échoué — ton cerveau est peut-être plein ou bloqué par le navigateur.'; });
  });
  var panneauMiroir = $('p-miroir'), mirLance = false;
  if (panneauMiroir && typeof MutationObserver !== 'undefined') {
    new MutationObserver(function(){
      if (!mirLance && panneauMiroir.classList.contains('actif')) { mirLance = true; mir53Calculer(); }
    }).observe(panneauMiroir, {attributes: true, attributeFilter: ['class']});
  }
})();

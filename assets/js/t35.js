
// ---------- v32 — « Mes renseignements » : parcours d’aide à la demande d’accès ----------
// Faits vérifiés sur les pages officielles des commissariats le 3 novembre 2026
// (CAI, CPVP, OIPC de l’Alberta, OIPC de la Colombie-Britannique) — seuls ces
// faits entrent ici. La détermination de la loi est une fonction pure ; le
// générateur de lettre est une fonction pure. Tout reste dans l’onglet :
// aucun envoi réseau, aucune écriture dans le stockage local du navigateur.
(function(){
  var MENTION='Modèle d’aide à la rédaction — ce document n’est pas un formulaire officiel et ne constitue pas un avis juridique';
  var LIEN_CPvp='https://www.priv.gc.ca/fr/sujets-lies-a-la-protection-de-la-vie-privee/acces-aux-renseignements-personnels/api_bus';
  var LIEN_CPvp_PROV='https://www.priv.gc.ca/fr/sujets-lies-a-la-protection-de-la-vie-privee/lois-sur-la-protection-des-renseignements-personnels-au-canada/la-loi-sur-la-protection-des-renseignements-personnels-et-les-documents-electroniques-lprpde/r_o_p/prov-lprpde/';
  var LIEN_CAI='https://www.cai.gouv.qc.ca/protection-renseignements-personnels/citoyens-protection-renseignements-personnels/acces-et-protection-renseignements-personnels';
  var LIEN_CAI_LETTRES='https://www.cai.gouv.qc.ca/commission-acces-information/formulaires-lettres-types?pour-les-citoyens/';
  var LIEN_OIPC_AB='https://oipc.ab.ca/information-access-review/';
  var LIEN_OIPC_BC='https://www.oipc.bc.ca/for-the-public/how-do-i-request-records/';
  var NOMS_LIEUX={qc:'Québec',on:'Ontario',ab:'Alberta',bc:'Colombie-Britannique',mb:'Manitoba',nb:'Nouveau-Brunswick',ns:'Nouvelle-Écosse',pe:'Île-du-Prince-Édouard',nl:'Terre-Neuve-et-Labrador',sk:'Saskatchewan',yt:'Yukon',nt:'Territoires du Nord-Ouest',nu:'Nunavut'};
  function detLprpde(note){
    return {regime:'lprpde',
      loi:'Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE)',
      delai:'30 jours civils',
      delaiNote:'30 jours civils à compter de la réception. L’organisation peut proroger le délai jusqu’à 30 jours de plus dans des cas particuliers, en vous avisant avec motifs dans les 30 premiers jours.',
      destinataire:'L’organisation elle-même, par écrit — idéalement son responsable de la protection des renseignements personnels, si elle en désigne un.',
      frais:'L’accès est gratuit ou à coût minime.',
      silence:'',
      note:note||'',
      recours:{instance:'Commissariat à la protection de la vie privée du Canada (CPVP)',vehicule:'Plainte au CPVP — après avoir d’abord tenté de régler la question avec l’organisation',delai:'',lien:LIEN_CPvp},
      lettreType:{label:'Exemple de lettre du CPVP, sur sa page d’accès',lien:LIEN_CPvp},
      lienOfficiel:{label:'Page d’accès du CPVP',lien:LIEN_CPvp}};
  }
  function accesDeterminerLoi(entree){
    var lieu=(entree&&entree.lieu)||'qc';
    var fed=!!(entree&&entree.entrepriseFederale);
    var sante=!!(entree&&entree.secteurSante);
    var nomLieu=NOMS_LIEUX[lieu]||lieu;
    if(sante){
      return {regime:'sante',
        loi:'Loi provinciale sur les renseignements de santé ('+nomLieu+')',
        delai:null,
        delaiNote:'Aucun délai unique n’est affirmé ici : les renseignements de santé suivent le régime provincial de la santé, dont les règles propres s’appliquent. La page du CPVP sur les lois provinciales signale quelles lois de santé sont réputées essentiellement similaires à la LPRPDE (Ontario, Nouveau-Brunswick, Nouvelle-Écosse, Terre-Neuve-et-Labrador) ; des lois de santé existent aussi ailleurs, par exemple au Manitoba.',
        destinataire:'L’établissement ou l’organisation de santé qui détient le dossier, par écrit.',
        frais:'',
        silence:'',
        note:'Le secteur santé suit son régime provincial : la loi déterminée ici est la loi de santé de la province, pas la loi générale du secteur privé ni la LPRPDE.',
        recours:{instance:'Commissariat provincial compétent (protection de la vie privée / accès à l’information)',vehicule:'Plainte ou demande de révision selon la loi de santé provinciale',delai:'',lien:LIEN_CPvp_PROV},
        lettreType:null,
        lienOfficiel:{label:'Page du CPVP — lois provinciales et LPRPDE',lien:LIEN_CPvp_PROV}};
    }
    if(fed){
      return detLprpde('Entreprise fédérale : la LPRPDE s’applique même au Québec, en Alberta et en Colombie-Britannique — la détermination se fait au cas par cas (banques, télécommunications, transport, transferts transfrontaliers).');
    }
    if(lieu==='qc'){
      return {regime:'qc',
        loi:'Loi sur la protection des renseignements personnels dans le secteur privé (Québec)',
        delai:'30 jours',
        delaiNote:'30 jours à compter de la réception de la demande. L’absence de réponse à l’expiration du délai équivaut à un refus.',
        destinataire:'Le responsable de la protection des renseignements personnels de l’entreprise — par défaut, la personne ayant la plus haute autorité (par exemple le dirigeant) ; la fonction peut être déléguée par écrit, et le titre et les coordonnées du responsable sont publiés sur le site Web de l’entreprise. Vous devez vous identifier.',
        frais:'L’accès est gratuit en principe ; des frais peuvent être exigés, plafonnés au coût de transcription, de reproduction ou de transmission, et annoncés d’avance avec un montant approximatif.',
        silence:'L’absence de réponse à l’expiration des 30 jours équivaut à un refus.',
        note:'',
        recours:{instance:'Commission d’accès à l’information (CAI)',vehicule:'Demande de révision (en cas de refus d’accès) ; examen de mésentente pour les autres différends avec une entreprise privée — formulaire « Demande de révision et d’examen de mésentente »',delai:'',lien:LIEN_CAI},
        lettreType:{label:'Lettre type de la CAI — « Demande d’accès à vos renseignements personnels dans une entreprise privée » (PDF/DOCX)',lien:LIEN_CAI_LETTRES},
        lienOfficiel:{label:'Page d’accès de la CAI',lien:LIEN_CAI}};
    }
    if(lieu==='ab'){
      return {regime:'ab',
        loi:'Personal Information Protection Act (PIPA) de l’Alberta',
        delai:'45 jours',
        delaiNote:'45 jours (art. 28(1) de la PIPA) ; une prorogation est possible (art. 31).',
        destinataire:'L’organisation elle-même, par écrit.',
        frais:'',
        silence:'',
        note:'La PIPA de l’Alberta est une loi provinciale générale de secteur privé réputée essentiellement similaire à la LPRPDE.',
        recours:{instance:'OIPC de l’Alberta (Office of the Information and Privacy Commissioner)',vehicule:'Request for review (demande de révision)',delai:'À demander dans les 30 jours civils de l’avis de décision de l’organisation',lien:LIEN_OIPC_AB},
        lettreType:null,
        lienOfficiel:{label:'Page de révision de l’OIPC de l’Alberta',lien:LIEN_OIPC_AB}};
    }
    if(lieu==='bc'){
      return {regime:'bc',
        loi:'Personal Information Protection Act (PIPA) de la Colombie-Britannique',
        delai:'30 jours ouvrables',
        delaiNote:'30 jours ouvrables — la loi compte 30 jours en excluant les samedis et les jours fériés ; prorogation possible jusqu’à 30 jours de plus.',
        destinataire:'L’organisation elle-même, par écrit — la demande doit être assez détaillée pour identifier les renseignements demandés.',
        frais:'',
        silence:'',
        note:'La PIPA de la Colombie-Britannique est une loi provinciale générale de secteur privé réputée essentiellement similaire à la LPRPDE.',
        recours:{instance:'OIPC de la Colombie-Britannique',vehicule:'Demande de révision',delai:'À demander dans les 30 jours de l’avis (art. 46-47)',lien:LIEN_OIPC_BC},
        lettreType:null,
        lienOfficiel:{label:'Page de l’OIPC de la Colombie-Britannique',lien:LIEN_OIPC_BC}};
    }
    if(lieu==='yt'||lieu==='nt'||lieu==='nu'){
      return detLprpde('Dans les territoires, les entreprises relèvent de la réglementation fédérale : c’est la LPRPDE qui s’applique.');
    }
    return detLprpde('Seules les lois générales de secteur privé du Québec, de l’Alberta et de la Colombie-Britannique sont réputées essentiellement similaires à la LPRPDE ; partout ailleurs au Canada, c’est la LPRPDE qui s’applique aux entreprises.');
  }
  function accesGenererLettre(champs,det){
    champs=champs||{};
    function v(x){return (typeof x==='string')?x.trim():'';}
    var nom=v(champs.nom),adresse=v(champs.adresse),courriel=v(champs.courriel),tel=v(champs.telephone),
        org=v(champs.organisation),resp=v(champs.responsable),compte=v(champs.compte),
        date=v(champs.date),desc=v(champs.description);
    var L=[];
    L.push(MENTION);
    L.push('');
    if(date)L.push(date);
    L.push(nom||'[Votre nom]');
    if(adresse)L.push(adresse);
    if(courriel)L.push(courriel);
    if(tel)L.push(tel);
    L.push('');
    L.push(org||'[Nom de l’organisation]');
    L.push('À l’attention de : '+(resp?resp:'Responsable de la protection des renseignements personnels'));
    L.push('');
    L.push('Objet : Demande d’accès à mes renseignements personnels'+(det&&det.loi?(' — '+det.loi):''));
    L.push('');
    L.push('Madame, Monsieur,');
    L.push('');
    L.push('Je vous écris pour demander l’accès aux renseignements personnels que vous détenez à mon sujet, afin de pouvoir les consulter et, au besoin, en demander la rectification. Pour m’identifier : '+(nom||'[votre nom]')+(adresse?(', '+adresse):'')+(compte?('. Mon numéro de compte ou de dossier est le '+compte+'.'):'.'));
    L.push('');
    L.push('Renseignements demandés : '+(desc||'[décrivez ici les renseignements demandés, assez précisément pour qu’on puisse les identifier]'));
    if(det&&det.delai){
      L.push('');
      L.push('Selon les faits vérifiés pour la loi qui s’applique à cette demande, le délai de réponse est de '+det.delai+' à compter de la réception de la présente demande.');
    }
    L.push('');
    L.push('Je vous remercie de me confirmer la réception de cette demande et de m’informer à l’avance de tout frais applicable.');
    L.push('');
    L.push('Veuillez agréer, Madame, Monsieur, l’expression de mes salutations distinguées.');
    L.push('');
    L.push(nom||'[Votre nom]');
    return L.join('\n');
  }
  if(typeof window!=='undefined'){
    window.ParcoursAcces={determinerLoi:accesDeterminerLoi,genererLettre:accesGenererLettre,mention:MENTION,nomsLieux:NOMS_LIEUX};
  }
  if(typeof document!=='undefined'&&document.getElementById){
    var selLieu=document.getElementById('acces-lieu');
    if(selLieu){
      var caseFed=document.getElementById('acces-federale'),
          caseSante=document.getElementById('acces-sante'),
          btnDet=document.getElementById('btn-acces-determiner'),
          res=document.getElementById('acces-resultat'),
          detCourante=null;
      function el(tag,cls,texte){
        var e=document.createElement(tag);
        if(cls)e.className=cls;
        if(texte!=null)e.textContent=texte;
        return e;
      }
      function lienOfficiel(label,href){
        var p=el('p','petite');
        var a=document.createElement('a');
        a.href=href;a.target='_blank';a.rel='noopener';a.textContent=label;
        p.appendChild(a);
        return p;
      }
      function rendreDetermination(){
        var det=accesDeterminerLoi({lieu:selLieu.value,entrepriseFederale:!!(caseFed&&caseFed.checked),secteurSante:!!(caseSante&&caseSante.checked)});
        detCourante=det;
        if(!res)return det;
        res.replaceChildren();
        var boite=el('div',null);boite.style.marginTop='1rem';
        boite.appendChild(el('p','etiquette','Loi qui s’applique'));
        var h=el('h4',null,det.loi);h.style.margin='.1rem 0 .5rem';boite.appendChild(h);
        if(det.delai){
          boite.appendChild(el('p',null,'Délai de réponse : '+det.delai+'.'));
          boite.appendChild(el('p','petite',det.delaiNote));
        }else{
          boite.appendChild(el('p',null,'Délai de réponse : aucun délai unique n’est affirmé ici.'));
          boite.appendChild(el('p','petite',det.delaiNote));
        }
        boite.appendChild(el('p',null,'À qui adresser la demande : '+det.destinataire));
        if(det.frais)boite.appendChild(el('p',null,'Frais : '+det.frais));
        if(det.note)boite.appendChild(el('p','petite',det.note));
        boite.appendChild(el('p','etiquette','Le recours, si ça bloque'));
        boite.appendChild(el('p',null,det.recours.vehicule+' — '+det.recours.instance+(det.recours.delai?(' ('+det.recours.delai+')'):'')+'.'));
        if(det.recours.lien)boite.appendChild(lienOfficiel('Page officielle du recours',det.recours.lien));
        if(det.lettreType)boite.appendChild(lienOfficiel(det.lettreType.label,det.lettreType.lien));
        if(det.lienOfficiel)boite.appendChild(lienOfficiel(det.lienOfficiel.label,det.lienOfficiel.lien));
        boite.appendChild(el('p','petite','Faits vérifiés sur les pages officielles des commissariats le 3 novembre 2026. La lettre de l’étape 2 reprend la loi déterminée ici.'));
        res.appendChild(boite);
        return det;
      }
      if(btnDet)btnDet.addEventListener('click',rendreDetermination);
      var champsIds={nom:'acces-nom',adresse:'acces-adresse',courriel:'acces-courriel',telephone:'acces-telephone',organisation:'acces-organisation',responsable:'acces-responsable',compte:'acces-compte',date:'acces-date',description:'acces-description'};
      function lireChamps(){
        var c={};
        Object.keys(champsIds).forEach(function(k){
          var n=document.getElementById(champsIds[k]);
          c[k]=n?n.value:'';
        });
        return c;
      }
      var zoneLettre=document.getElementById('acces-lettre'),
          etatLettre=document.getElementById('acces-lettre-etat'),
          btnLettre=document.getElementById('btn-acces-lettre'),
          btnCopier=document.getElementById('btn-acces-copier'),
          btnTel=document.getElementById('btn-acces-telecharger'),
          btnImp=document.getElementById('btn-acces-imprimer'),
          champDate=document.getElementById('acces-date');
      if(champDate&&!champDate.value){
        try{champDate.value=new Date().toLocaleDateString('fr-CA',{day:'numeric',month:'long',year:'numeric'});}catch(e){}
      }
      function lettreCourante(){
        if(zoneLettre&&zoneLettre.value)return zoneLettre.value;
        return accesGenererLettre(lireChamps(),detCourante);
      }
      if(btnLettre)btnLettre.addEventListener('click',function(){
        if(!detCourante)rendreDetermination();
        var lettre=accesGenererLettre(lireChamps(),detCourante);
        if(zoneLettre)zoneLettre.value=lettre;
        if(etatLettre)etatLettre.textContent='Lettre produite — elle ne vit que dans cet onglet. Copie-la, télécharge-la ou imprime-la avant de fermer la page.';
      });
      if(btnCopier)btnCopier.addEventListener('click',function(){
        var lettre=lettreCourante();
        function ok(){if(etatLettre)etatLettre.textContent='Lettre copiée.';}
        function repli(){
          if(zoneLettre){zoneLettre.value=lettre;zoneLettre.focus();zoneLettre.select();try{document.execCommand('copy');ok();}catch(e){if(etatLettre)etatLettre.textContent='La copie automatique a échoué — sélectionne la lettre et copie-la à la main.';}}
        }
        if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(lettre).then(ok,repli);}
        else repli();
      });
      if(btnTel)btnTel.addEventListener('click',function(){
        var lettre=lettreCourante();
        var blob=new Blob([lettre],{type:'text/plain;charset=utf-8'});
        var url=URL.createObjectURL(blob);
        var a=document.createElement('a');
        a.href=url;a.download='demande-acces-renseignements.txt';
        document.body.appendChild(a);a.click();document.body.removeChild(a);
        setTimeout(function(){URL.revokeObjectURL(url);},2000);
        if(etatLettre)etatLettre.textContent='Lettre téléchargée en texte (.txt) — produite ici, rien n’a été envoyé.';
      });
      if(btnImp)btnImp.addEventListener('click',function(){
        var lettre=lettreCourante();
        var ifr=document.createElement('iframe');
        ifr.style.position='fixed';ifr.style.right='0';ifr.style.bottom='0';ifr.style.width='0';ifr.style.height='0';ifr.style.border='0';
        document.body.appendChild(ifr);
        var doc=ifr.contentWindow.document;
        var echappe=lettre.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        doc.open();
        doc.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Demande d’accès à mes renseignements personnels</title><style>body{font-family:Georgia,serif;margin:2.2cm;color:#111}pre{white-space:pre-wrap;font:inherit;line-height:1.55}</style></head><body><pre>'+echappe+'</pre></body></html>');
        doc.close();
        setTimeout(function(){
          try{ifr.contentWindow.focus();ifr.contentWindow.print();}catch(e){if(etatLettre)etatLettre.textContent='L’impression de la lettre seule a échoué dans ce navigateur — copie la lettre et imprime-la depuis ton traitement de texte.';}
          setTimeout(function(){document.body.removeChild(ifr);},1000);
        },250);
        if(etatLettre)etatLettre.textContent='Impression de la lettre seule — choisis « Enregistrer au format PDF » dans la fenêtre d’impression pour obtenir un PDF.';
      });
    }
  }
})();
/* ===== Fournée 6 (adoptée le 3 nov. 2026, 22 h 43) — empreinte du visiteur
   recalculée (36), surveillance de l'exposition (38), panneau de bord du
   non-tracking (37), preuve de présence consentie bornée (42). =====
   Tout est local : aucun signal ne quitte l'appareil ; le scellement passe
   par le cerveau local du visiteur (crochet exposé par le moteur). */
(function(){
  var calculer = document.getElementById('emp-calculer');
  if(!calculer) return;
  var courant = null;
  function sha256hex(texte){
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte)).then(function(buf){
      return Array.prototype.map.call(new Uint8Array(buf), function(b){ return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }
  function signaux(){
    var s = {};
    s['agent utilisateur'] = navigator.userAgent || 'indisponible';
    s['plateforme'] = navigator.platform || 'indisponible';
    s['langues'] = (navigator.languages || [navigator.language || 'indisponible']).join(', ');
    s['fuseau'] = (Intl.DateTimeFormat().resolvedOptions().timeZone || 'indisponible');
    s['écran'] = screen.width + '×' + screen.height + ' · profondeur ' + screen.colorDepth;
    s['cœurs logiques'] = String(navigator.hardwareConcurrency || 'indisponible');
    s['mémoire appareil (approx.)'] = navigator.deviceMemory ? String(navigator.deviceMemory) + ' Go (valeur arrondie par le navigateur)' : 'indisponible ou masquée';
    s['points tactiles'] = String(navigator.maxTouchPoints || 0);
    try {
      var cv = document.createElement('canvas'); cv.width = 220; cv.height = 40;
      var ctx = cv.getContext('2d');
      ctx.textBaseline = 'top'; ctx.font = '14px Arial'; ctx.fillStyle = '#123';
      ctx.fillText('SoPHIa — empreinte', 2, 2);
      s['canvas 2d'] = cv.toDataURL().length + ' caractères de dessin (le dessin lui-même reste ici)';
      s['canvas-haché'] = 'voir l’empreinte globale';
    } catch(e) { s['canvas 2d'] = 'indisponible'; }
    try {
      var gl = document.createElement('canvas').getContext('webgl');
      if(gl){
        var ext = gl.getExtension('WEBGL_debug_renderer_info');
        s['moteur graphique (WebGL)'] = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'masqué par le navigateur (Safari le masque souvent) — nommé, non comblé';
      } else s['moteur graphique (WebGL)'] = 'indisponible';
    } catch(e) { s['moteur graphique (WebGL)'] = 'indisponible'; }
    s['Web Bluetooth'] = ('bluetooth' in navigator) ? 'API présente (Chrome/Edge) — ce site ne l’utilise pas' : 'absente de ce navigateur (Safari, Firefox) — nommée';
    return s;
  }
  function empreintesScellees(){
    try {
      var etat = JSON.parse(window.localStorage.getItem('cerveau-utilisateur-v1') || 'null');
      if(!etat || !etat.entrees) return [];
      var out = [];
      etat.entrees.forEach(function(e){
        if(e.type !== 'geste') return;
        try { var c = JSON.parse(e.contenu); if(c && c.geste === 'empreinte-visiteur') out.push({seq: e.seq, ts: e.ts, c: c}); } catch(err) {}
      });
      return out;
    } catch(e) { return []; }
  }
  function comparer(nouveaux){
    var zone = document.getElementById('exp-comparaison');
    if(!zone) return;
    var prec = empreintesScellees();
    if(!prec.length){
      zone.innerHTML = '<p class="petite">Aucune empreinte scellée précédente dans ton cerveau : scelle celle-ci, et la prochaine visite aura de quoi comparer.</p>';
      return;
    }
    var dernier = prec[prec.length - 1];
    var anciens = dernier.c.signaux || {};
    var changements = [];
    Object.keys(nouveaux).forEach(function(k){
      if(String(anciens[k] || '—') !== String(nouveaux[k])) changements.push({signal: k, avant: String(anciens[k] || '—'), apres: String(nouveaux[k])});
    });
    Object.keys(anciens).forEach(function(k){ if(!(k in nouveaux)) changements.push({signal: k, avant: String(anciens[k]), apres: '—'}); });
    if(dernier.c.empreinte === courant.empreinte && !changements.length){
      zone.innerHTML = '<p><span class="verdict-ok">Aucun changement de ce qui est récoltable sur toi</span> depuis l’empreinte scellée le ' + String(dernier.ts).slice(0, 10) + ' (maillon ' + dernier.seq + ') : même empreinte, mêmes signaux.</p>';
      return;
    }
    var html = '<p><strong>' + changements.length + ' signal(aux) changé(s)</strong> depuis l’empreinte scellée le ' + String(dernier.ts).slice(0, 10) + ' (maillon ' + dernier.seq + ') — ce qui est récoltable sur toi a bougé :</p><ul>';
    changements.forEach(function(ch){
      html += '<li><strong>' + ch.signal.replace(/</g, '&lt;') + '</strong> : avant « ' + ch.avant.slice(0, 80).replace(/</g, '&lt;') + ' » → maintenant « ' + ch.apres.slice(0, 80).replace(/</g, '&lt;') + ' »</li>';
    });
    zone.innerHTML = html + '</ul><p class="petite">Scelle la nouvelle empreinte pour faire de cet état la prochaine somme de comparaison.</p>';
  }
  calculer.addEventListener('click', function(){
    var s = signaux();
    var stable = Object.keys(s).sort().map(function(k){ return k + '=' + s[k]; }).join('\n');
    sha256hex(stable).then(function(fp){
      courant = {signaux: s, empreinte: fp};
      var html = '<table>';
      Object.keys(s).forEach(function(k){ html += '<tr><th>' + k.replace(/</g, '&lt;') + '</th><td>' + String(s[k]).slice(0, 160).replace(/</g, '&lt;') + '</td></tr>'; });
      document.getElementById('emp-signaux').innerHTML = html + '</table>';
      document.getElementById('emp-valeur').textContent = fp;
      document.getElementById('emp-sceller').disabled = false;
      document.getElementById('emp-etat').textContent = 'Calculée ici, à l’instant — rien n’a été envoyé.';
      comparer(s);
    });
  });
  document.getElementById('emp-sceller').addEventListener('click', function(){
    var etat = document.getElementById('emp-etat');
    if(!courant){ etat.textContent = 'Calcule d’abord l’empreinte.'; return; }
    if(typeof window.sophiaCerveauAjouter !== 'function'){ etat.textContent = 'Le moteur de ton cerveau n’est pas prêt sur cette page — recharge-la, puis rescelle.'; return; }
    window.sophiaCerveauAjouter('geste', JSON.stringify({geste: 'empreinte-visiteur', empreinte: courant.empreinte, signaux: courant.signaux, date: new Date().toISOString().slice(0, 10)})).then(function(e){
      etat.textContent = 'Empreinte scellée dans ton cerveau (maillon ' + e.seq + '). À la prochaine visite, le recalcul se comparera à cette somme.';
    }).catch(function(){ etat.textContent = 'Le scellement a échoué — ton cerveau est peut-être plein ou bloqué par le navigateur.'; });
  });
  /* 37 — panneau de bord du non-tracking : les requêtes de CETTE page. */
  function ntAfficher(){
    var zone = document.getElementById('nt-liste');
    if(!zone || !performance.getEntriesByType) { if(zone) zone.innerHTML = '<p class="petite">L’API Performance n’est pas disponible dans ce navigateur — la liste ne peut pas être montrée, et son absence est dite plutôt que comblée.</p>'; return; }
    var entrees = performance.getEntriesByType('resource');
    var internes = 0, externes = {};
    entrees.forEach(function(e){
      try {
        var u = new URL(e.name);
        if(u.origin === window.location.origin) internes++;
        else externes[u.host] = (externes[u.host] || 0) + 1;
      } catch(err) { internes++; }
    });
    var html = '<p>Depuis le chargement de cette page : <strong>' + entrees.length + ' requête(s)</strong> au total — <strong>' + internes + '</strong> vers cette origine (le site lui-même)';
    var hotes = Object.keys(externes);
    if(hotes.length){
      html += ' ; externes : ' + hotes.map(function(h){ return h.replace(/</g, '&lt;') + ' (' + externes[h] + ')'; }).join(', ') + '. <span class="petite">Chaque hôte externe est un service que la page appelle pour une fonction nommée (météo, ancrages, relais) — l’inventaire complet est au panneau Confidentialité. Un hôte qui n’y figure pas serait un écart : c’est exactement ce que ce panneau sert à voir.</span>';
    } else html += ' ; <strong>aucune requête externe</strong> à cet instant.';
    zone.innerHTML = html + '</p>';
  }
  var ntBtn = document.getElementById('nt-rafraichir');
  if(ntBtn){ ntBtn.addEventListener('click', ntAfficher); ntAfficher(); setInterval(ntAfficher, 15000); }
  /* 42 — présence consentie : déclarée par l'utilisateur, jamais captée. */
  var presBtn = document.getElementById('pres-sceller');
  if(presBtn) presBtn.addEventListener('click', function(){
    var etat = document.getElementById('pres-etat');
    var lieu = String(document.getElementById('pres-lieu').value || '').trim();
    if(!lieu){ etat.textContent = 'Déclare un lieu, dans tes mots : sans déclaration, rien à sceller.'; return; }
    if(typeof window.sophiaCerveauAjouter !== 'function'){ etat.textContent = 'Le moteur de ton cerveau n’est pas prêt sur cette page — recharge-la, puis rescelle.'; return; }
    window.sophiaCerveauAjouter('decision', JSON.stringify({
      decision: 'présence déclarée : ' + lieu,
      par: 'moi-même (déclaration volontaire)',
      effet_attendu: 'aucun effet externe — déclaration non vérifiable par le site, gardée comme parole scellée',
      contexte: String(document.getElementById('pres-contexte').value || '').trim() || null,
      consigne_le: new Date().toISOString().slice(0, 10)
    })).then(function(e){
      etat.textContent = 'Déclaration scellée dans ton cerveau (maillon ' + e.seq + '), comme une décision : datée, chaînée, à toi. Le site ne l’a ni vérifiée ni transmise.';
    }).catch(function(){ etat.textContent = 'Le scellement a échoué — réessaie après un rechargement.'; });
  });
})();

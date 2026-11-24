
// ---------- v20 — Vérifie-moi sans moi : le vérificateur autonome ----------
// Le sceau de la page se recalcule chez le visiteur : octets exacts, recette
// canonique, crypto.subtle du navigateur. Aucun envoi. L'auto-revérification
// (couche agent, idée 31) relit la copie servie au chargement puis toutes
// les cinq minutes ; un échec de réseau y dit « non revérifié », jamais ÉCART.
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id)};
  /*VMM-CORE-DEBUT*/
  // Le cœur du calcul : des octets, rien que des octets (aucun DOM).
  function vmmSha256Hex(tampon){
    return crypto.subtle.digest('SHA-256',tampon).then(function(d){
      var u=new Uint8Array(d),s='';
      for(var i=0;i<u.length;i++){s+=('0'+u[i].toString(16)).slice(-2)}
      return s;
    });
  }
  // Cherche le bloc étiqueté « Sceau canonique de la version affichée » et
  // retourne {sceau, version} — ou null si le fichier n'en porte pas.
  function vmmExtraireEtiquette(tampon){
    var texte=new TextDecoder('utf-8').decode(tampon);
    var i=texte.indexOf('sceau-version-affiche">');
    if(i<0)return null;
    var m=texte.slice(i,i+300).match(/[0-9a-f]{64}/);
    if(!m)return null;
    var version=null;
    var mentions=texte.slice(Math.max(0,i-600),i).match(/v(\d+)\s*\(/g);
    if(mentions&&mentions.length){
      var d=mentions[mentions.length-1].match(/v(\d+)/);
      if(d)version=parseInt(d[1],10);
    }
    return {sceau:m[0],version:version};
  }
  // Positions (en octets) de toutes les occurrences ASCII d'une chaîne.
  function vmmIndicesOctets(vue,chaine){
    var idx=[],L=chaine.length;
    for(var i=0;i+L<=vue.length;i++){
      var ok=true;
      for(var j=0;j<L;j++){if(vue[i+j]!==chaine.charCodeAt(j)){ok=false;break}}
      if(ok){idx.push(i);i+=L-1}
    }
    return idx;
  }
  // La recette canonique : neutraliser le sceau étiqueté (64 fois « 0 »),
  // hacher, comparer. Sans étiquette : hacher tel quel contre le sceau
  // fourni (manuel), ou rendre le hachage seul (aucun verdict possible).
  function vmmVerifierOctets(tampon,sceauManuel){
    var et=vmmExtraireEtiquette(tampon);
    if(et){
      var copie=new Uint8Array(tampon);
      var idx=vmmIndicesOctets(copie,et.sceau);
      idx.forEach(function(o){for(var k=0;k<64;k++)copie[o+k]=48});
      return vmmSha256Hex(copie.buffer).then(function(calc){
        return {ok:calc===et.sceau,calc:calc,attendu:et.sceau,version:et.version,occurrences:idx.length,taille:tampon.byteLength,mode:'etiquette'};
      });
    }
    return vmmSha256Hex(tampon).then(function(calc){
      if(sceauManuel)return {ok:calc===sceauManuel,calc:calc,attendu:sceauManuel,version:null,occurrences:0,taille:tampon.byteLength,mode:'manuel'};
      return {ok:null,calc:calc,attendu:null,version:null,occurrences:0,taille:tampon.byteLength,mode:'aucun'};
    });
  }
  /*VMM-CORE-FIN*/
  function normaliserSceau(s){
    if(!s)return null;
    var t=String(s).trim().toLowerCase().replace(/\s+/g,'');
    return /^[0-9a-f]{64}$/.test(t)?t:null;
  }
  var contexteOk=!!(window.isSecureContext&&window.crypto&&crypto.subtle&&window.TextDecoder);
  var zoneRes=$('vmm-resultat'), elVerdict=$('vmm-verdict'), elDetail=$('vmm-detail'),
      elSceau=$('vmm-sceau'), elNote=$('vmm-note-resultat'), btnRecu=$('vmm-recu');
  var dernier=null;
  function afficher(res,source){
    dernier={res:res,source:source,quand:new Date()};
    zoneRes.hidden=false;
    elSceau.textContent=res.calc;
    var det=source+' · '+res.taille.toLocaleString('fr-CA')+' octets lus';
    if(res.mode==='etiquette')det+=' · version détectée : v'+res.version+' · sceau étiqueté neutralisé ('+res.occurrences+' occurrence)';
    if(res.mode==='manuel')det+=' · aucun sceau étiqueté dans le fichier : hachage tel quel, contre le sceau fourni';
    if(res.mode==='aucun')det+=' · aucun sceau étiqueté, aucun sceau fourni';
    elDetail.textContent=det;
    if(res.ok===true){
      elVerdict.textContent='MATCH'; elVerdict.className='vmm-verdict ok';
      elNote.textContent='La copie est identique, à l’octet près, à celle que le sceau désigne. Le reçu de visite, généré sur votre appareil, garde la trace de VOTRE calcul.';
      btnRecu.hidden=false;
    }else if(res.ok===false){
      elVerdict.textContent='ÉCART'; elVerdict.className='vmm-verdict ecart';
      elNote.textContent='Le sceau recalculé ne correspond pas au sceau attendu ('+res.attendu+'). Un seul octet différent suffit : soit la copie a été altérée, soit ce n’est pas la version que ce sceau désigne.';
      btnRecu.hidden=true;
    }else{
      elVerdict.textContent='AUCUN SCEAU'; elVerdict.className='vmm-verdict attente';
      elNote.textContent='Ce fichier ne porte pas le bloc étiqueté des versions de ce site, et aucun sceau attendu n’a été fourni : voici son empreinte telle quelle, à comparer à la main contre un sceau de confiance.';
      btnRecu.hidden=true;
    }
    zoneRes.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function afficherEchec(source,err){
    dernier=null;
    zoneRes.hidden=false;
    elVerdict.textContent='LECTURE IMPOSSIBLE'; elVerdict.className='vmm-verdict attente';
    elDetail.textContent=source;
    elSceau.textContent='—';
    elNote.textContent='La relecture a échoué ('+(err&&err.message?err.message:'réseau')+'). Ne pas pouvoir relire n’est pas un ÉCART : rien n’a été conclu sur cette copie.';
    btnRecu.hidden=true;
  }
  function enCours(source){
    zoneRes.hidden=false;
    elVerdict.textContent='Calcul en cours…'; elVerdict.className='vmm-verdict attente';
    elDetail.textContent=source; elSceau.textContent='…'; elNote.textContent=''; btnRecu.hidden=true;
  }
  function urlPage(){return location.href.split('#')[0]}
  function relirePage(){
    return fetch(urlPage(),{cache:'no-store'}).then(function(r){
      if(!r.ok)throw new Error('HTTP '+r.status);
      return r.arrayBuffer();
    });
  }
  // --- Geste 1 : cette page, maintenant ---
  var btnPage=$('vmm-btn-page');
  if(btnPage)btnPage.addEventListener('click',function(){
    enCours('Relecture des octets servis pour cette adresse…');
    relirePage().then(function(buf){return vmmVerifierOctets(buf,null)})
      .then(function(res){afficher(res,'Cette page, relue à l’instant depuis le serveur')})
      .catch(function(e){afficherEchec('Cette page, relue à l’instant depuis le serveur',e)});
  });
  // --- Geste 2 : une copie sauvegardée, déposée ---
  var zone=$('vmm-zone'), inpFichier=$('vmm-fichier');
  function lireFichier(f){
    if(!f)return;
    enCours('Lecture locale de « '+f.name+' » — le fichier ne quitte pas votre appareil…');
    var promesse=(f.arrayBuffer?f.arrayBuffer():new Promise(function(res,rej){
      var l=new FileReader(); l.onload=function(){res(l.result)}; l.onerror=rej; l.readAsArrayBuffer(f);
    }));
    promesse.then(function(buf){
      var manuel=normaliserSceau($('vmm-attendu-fichier').value);
      return vmmVerifierOctets(buf,manuel);
    }).then(function(res){afficher(res,'Copie déposée : « '+f.name+' »')})
      .catch(function(e){afficherEchec('Copie déposée : « '+f.name+' »',e)});
  }
  if(zone&&inpFichier){
    zone.addEventListener('click',function(e){if(e.target!==inpFichier)inpFichier.click()});
    zone.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();inpFichier.click()}});
    inpFichier.addEventListener('change',function(){lireFichier(inpFichier.files&&inpFichier.files[0]);inpFichier.value=''});
    ['dragover','dragenter'].forEach(function(ev){zone.addEventListener(ev,function(e){e.preventDefault();zone.classList.add('actif')})});
    ['dragleave','drop'].forEach(function(ev){zone.addEventListener(ev,function(e){e.preventDefault();zone.classList.remove('actif')})});
    zone.addEventListener('drop',function(e){var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];lireFichier(f)});
  }
  // --- Geste 3 : un texte libre ---
  var btnTexte=$('vmm-btn-texte'), btnExemple=$('vmm-btn-exemple');
  if(btnExemple)btnExemple.addEventListener('click',function(){
    $('vmm-texte').value='abc';
    $('vmm-attendu-texte').value='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  });
  if(btnTexte)btnTexte.addEventListener('click',function(){
    var attendu=normaliserSceau($('vmm-attendu-texte').value);
    if(!attendu){
      zoneRes.hidden=false;
      elVerdict.textContent='SCEAU ATTENDU ILLISIBLE'; elVerdict.className='vmm-verdict attente';
      elDetail.textContent='Le sceau attendu doit compter exactement 64 caractères hexadécimaux (0-9, a-f).'; elSceau.textContent='—'; elNote.textContent=''; btnRecu.hidden=true; dernier=null;
      return;
    }
    enCours('Hachage du texte collé, en UTF-8, tel quel…');
    var buf=new TextEncoder().encode($('vmm-texte').value);
    vmmSha256Hex(buf.buffer).then(function(calc){
      afficher({ok:calc===attendu,calc:calc,attendu:attendu,version:null,occurrences:0,taille:buf.byteLength,mode:'manuel'},'Texte libre collé dans le panneau');
    });
  });
  // --- Copier le sceau recalculé ---
  var btnCopier=$('vmm-copier');
  if(btnCopier)btnCopier.addEventListener('click',function(){
    var t=elSceau.textContent;
    function ok(){var a=btnCopier.textContent;btnCopier.textContent='Copié ✓';setTimeout(function(){btnCopier.textContent=a},1600)}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(ok,function(){ok()})}
    else{var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}catch(e){}document.body.removeChild(ta);ok()}
  });
  // --- Le reçu de visite : généré sur place, après un MATCH, à la demande ---
  if(btnRecu)btnRecu.addEventListener('click',function(){
    if(!dernier||dernier.res.ok!==true)return;
    var d=dernier, fmt=new Intl.DateTimeFormat('fr-CA',{timeZone:'America/Toronto',dateStyle:'full',timeStyle:'medium'});
    var lignes=[
      'REÇU DE VISITE — Audit Unisson',
      'Le site d’Alexandre Vautour Gagnon — la chaîne de mémoire, vérifiable par tous.',
      '',
      'Vérification faite dans votre navigateur, à votre demande, sans aucun envoi.',
      'Date et heure : '+fmt.format(d.quand)+' (heure de Toronto)',
      'Instant (ISO) : '+d.quand.toISOString(),
      'Objet vérifié : '+d.source,
      'Taille lue : '+d.res.taille+' octets'
    ];
    if(d.res.mode==='etiquette')lignes.push('Version détectée : v'+d.res.version);
    lignes.push('Sceau recalculé chez vous : '+d.res.calc);
    lignes.push('Verdict : MATCH — cette copie est identique, à l’octet près, à celle que le sceau désigne.');
    lignes.push('');
    lignes.push('Ce reçu est généré sur votre appareil, au moment du calcul. Il atteste que');
    lignes.push('VOUS avez recalculé : il ne dépend ni du serveur, ni de l’agente.');
    lignes.push('');
    lignes.push('Vous avez vérifié ; vous n’avez rien laissé.');
    var blob=new Blob([lignes.join('\n')],{type:'text/plain;charset=utf-8'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='recu-de-visite.txt';
    document.body.appendChild(a); a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},400);
  });
  // --- Auto-revérification : au chargement, puis toutes les cinq minutes ---
  var autoEtat=$('vmm-auto-etat'), autoVoyant=$('vmm-auto-voyant');
  var autoDernier=null, autoOk=null, autoEchec=false;
  function majLigneAuto(){
    if(!autoEtat)return;
    if(!contexteOk){autoEtat.textContent='non revérifié — contexte non sécurisé : le navigateur refuse ses outils de calcul (voir l’alerte du panneau).';return}
    if(!autoDernier){autoEtat.textContent='premier recalcul automatique en cours…';return}
    var mins=Math.max(0,Math.round((Date.now()-autoDernier.getTime())/60000));
    var quand=new Intl.DateTimeFormat('fr-CA',{timeZone:'America/Toronto',hour:'2-digit',minute:'2-digit'}).format(autoDernier);
    var ilya=mins<=0?'à l’instant':'il y a '+mins+' min';
    if(autoEchec){
      autoVoyant.className='voyant attente';
      autoEtat.textContent='non revérifié — la relecture du réseau a échoué (tentative '+ilya+', à '+quand+', heure de Toronto). Ne pas pouvoir relire n’est pas un ÉCART.';
    }else if(autoOk){
      autoVoyant.className='voyant ok';
      autoEtat.textContent='MATCH — la copie servie est identique au sceau qu’elle porte ; revérifié '+ilya+' (à '+quand+', heure de Toronto), puis toutes les cinq minutes tant que la page reste ouverte.';
    }else{
      autoVoyant.className='voyant ecart';
      autoEtat.textContent='ÉCART au recalcul automatique de '+quand+' (heure de Toronto) : la copie servie ne correspond plus au sceau qu’elle porte — refaites le geste 1 pour le constater vous-même.';
    }
  }
  function autoReverifier(){
    if(!contexteOk){majLigneAuto();return}
    relirePage().then(function(buf){return vmmVerifierOctets(buf,null)})
      .then(function(res){autoOk=(res.ok===true);autoEchec=false;autoDernier=new Date();majLigneAuto()})
      .catch(function(){autoOk=null;autoEchec=true;autoDernier=new Date();majLigneAuto()});
  }
  // --- Contexte non sécurisé : le dire, et désactiver plutôt que simuler ---
  if(!contexteOk){
    var alerte=$('vmm-alerte-contexte'); if(alerte)alerte.hidden=false;
    [btnPage,btnTexte,btnExemple].forEach(function(b){if(b)b.disabled=true});
    if(zone)zone.style.pointerEvents='none';
  }
  majLigneAuto();
  setTimeout(autoReverifier,1500);
  setInterval(autoReverifier,300000);
  setInterval(majLigneAuto,30000);
})();

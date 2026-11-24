
/* ===== v36 — « Les chambres » : le Cerveau coquillage par chambres, l'auto-épreuve
   « Vérifie le cerveau » et le bloc « Éprouve la loi » =====
   Le bloc marqué CERVEAU-FONCTIONS-PURES ne dépend pas du DOM : verifie-v36.py
   l'extrait de la page et l'éprouve sous node (racine du cerveau, racine de
   Merkle du coffre, mini-chaîne intacte puis rompue, Fibonacci, somme des 9). */
/* === CERVEAU-FONCTIONS-PURES — début === */
async function cvSha256Hex(texte){var b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(texte));return [...new Uint8Array(b)].map(function(x){return x.toString(16).padStart(2,'0')}).join('');}
async function cvSha256Octets(octets){var b=await crypto.subtle.digest('SHA-256',octets);return [...new Uint8Array(b)].map(function(x){return x.toString(16).padStart(2,'0')}).join('');}
async function cvNiveauxMerkle(digests){var niveaux=[],niv=[],i;for(i=0;i<digests.length;i++){niv.push(await cvSha256Hex(digests[i]));}niveaux.push(niv);while(niv.length>1){var suiv=[];for(i=0;i<niv.length;i+=2){var g=niv[i],d=(i+1<niv.length)?niv[i+1]:niv[i];suiv.push(await cvSha256Hex(g+d));}niveaux.push(suiv);niv=suiv;}return niveaux;}
async function cvRacineMerkle(digests){var n=await cvNiveauxMerkle(digests);return n[n.length-1][0];}
function cvFibonacci(nb){var s=[1,1];while(s.length<nb){s.push(s[s.length-1]+s[s.length-2]);}return s;}
function cvTermeNeuf(n){return '0,'+('9'.repeat(n));}
async function cvSceauMini(prev,texte){return cvSha256Hex(prev+texte);}
async function cvVerifieMini(genese,maillons){var prev=genese;for(var i=0;i<maillons.length;i++){var s=await cvSceauMini(prev,maillons[i].texte);if(s!==maillons[i].sceau){return {ok:false,premierEcart:i};}prev=s;}return {ok:true,premierEcart:-1};}
function ecComposeEtat(racine,chambres,geste){return {racine:racine,chambres:chambres.slice(),geste:geste,formule:racine+' + ['+chambres.join(', ')+'] + '+geste};}
function ecProchaineChambre(index,total){return (index+1)%total;}
function ecRotationComplete(index,total){return index===total-1;}
async function ecSceauMoment(horodatageIso,typeGeste){return cvSha256Hex(horodatageIso+' | '+typeGeste);}
function ecHeureSainteMartine(date){var parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(date),o={};parts.forEach(function(x){o[x.type]=x.value;});return o.hour+':'+o.minute+':'+o.second;}
/* === CERVEAU-FONCTIONS-PURES — fin === */
(function(){
  function el(id){return document.getElementById(id);}
  if(!el('cerveau-chambres'))return;
  var verdictEl=el('cerveau-verdict'), resultatsEl=el('cerveau-resultats'),
      racineEtatEl=el('cerveau-racine-etat'), racineEl=el('cerveau-racine');
  var manifeste=null;
  function fetchTxt(u){return fetch(u,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(u+' — HTTP '+r.status);return r.text();});}
  function fetchJson(u){return fetchTxt(u).then(function(t){return JSON.parse(t);});}
  function etatChambre(id,txt){var e=document.querySelector('[data-etat-chambre="'+id+'"]');if(e)e.textContent=txt;}
  /* Peinture d'abord : rendre la main au fil principal entre les lots d'un
     calcul bouclé, pour que la peinture et l'interaction ne soient jamais
     bloquées par le recalcul. */
  function rendreMain(){return new Promise(function(r){setTimeout(r,0);});}

  async function verifierCerveau(detail){
    var lignes=[];
    function ligne(id,nom,mode,ok,msg){lignes.push({nom:nom,mode:mode,ok:ok,msg:msg});etatChambre(id,'État en direct : '+(ok?'MATCH':'ÉCART')+' ('+mode+') — '+msg);}
    try{
      if(!manifeste){manifeste=await fetchJson('assets/cerveau.json');}
      var par={}; manifeste.chambres.forEach(function(c){par[c.id]=c;});
      /* La Chaîne — digest déclaré, présence et cohérence */
      var etatCh=null, okChaine=false, msgChaine='';
      try{
        etatCh=await fetchJson('assets/etat-chaine.json');
        var coherent=etatCh&&typeof etatCh.digest_cumule==='string'&&typeof etatCh.maillons==='number'&&typeof etatCh.dernier_maillon==='number';
        okChaine=!!(coherent&&etatCh.digest_cumule===par.chaine.digest);
        msgChaine=okChaine?('digest déclaré = digest du manifeste ; état cohérent ('+etatCh.maillons+' maillons, dernier #'+etatCh.dernier_maillon+').'):'le digest déclaré par l’état diffère de celui du manifeste, ou l’état est incohérent.';
      }catch(e){msgChaine='état de la chaîne illisible depuis votre navigateur ('+e.message+').';}
      ligne('chaine','La Chaîne','digest déclaré',okChaine,msgChaine);
      /* Le Coffre — digest déclaré + chaîne interne recalculée en cohérence */
      var coffre=null, okCoffre=false, msgCoffre='';
      try{
        coffre=await fetchJson('assets/coffre.json');
        var d=await cvSha256Hex(coffre.genese), i;
        for(i=0;i<coffre.entrees.length;i++){d=await cvSha256Hex(d+coffre.entrees[i].sha256); if(i%4===3)await rendreMain();}
        var coh=(d===coffre.digest_maitre);
        okCoffre=(coffre.digest_maitre===par.coffre.digest)&&coh;
        msgCoffre=okCoffre?'digest déclaré = manifeste, et la chaîne interne du coffre se recalcule jusqu’à son digest maître.':(!coh?'la chaîne interne du coffre ne retombe pas sur son digest maître.':'le digest maître déclaré diffère du manifeste.');
      }catch(e){msgCoffre='coffre illisible depuis votre navigateur ('+e.message+').';}
      ligne('coffre','Le Coffre synaptique','digest déclaré + cohérence recalculée',okCoffre,msgCoffre);
      /* L'Arbre — recalcul complet depuis le coffre */
      var okArbre=false, msgArbre='', racineArbre=null;
      if(coffre){
        try{
          racineArbre=await cvRacineMerkle(coffre.entrees.map(function(e2){return e2.sha256;}));
          okArbre=(racineArbre===par.arbre.digest);
          msgArbre=okArbre?'arbre entièrement recalculé depuis le coffre : racine = digest de la chambre.':'la racine recalculée diffère du digest de la chambre.';
        }catch(e){msgArbre='recalcul de l’arbre impossible ('+e.message+').';}
      }else{msgArbre='le coffre n’a pas été lu — l’arbre ne peut pas être recalculé.';}
      ligne('arbre','L’Arbre de Merkle','recalculé',okArbre,msgArbre);
      /* La Mémoire verrouillée — SHA-256 des octets servis */
      var okVerr=false, msgVerr='', digestVerr=null;
      try{
        var rep=await fetch('assets/coffre-prive.json',{cache:'no-store'});
        if(!rep.ok)throw new Error('HTTP '+rep.status);
        var buf=await rep.arrayBuffer();
        digestVerr=await cvSha256Octets(buf);
        okVerr=(digestVerr===par.verrouillee.digest);
        msgVerr=okVerr?'SHA-256 des octets servis = digest de la chambre : le paquet existe et est intact (son contenu reste chiffré).':'le SHA-256 des octets servis diffère du digest de la chambre.';
      }catch(e){msgVerr='paquet non servi à ce navigateur ('+e.message+') — la chambre ne peut pas être revérifiée d’ici.';}
      ligne('verrouillee','La Mémoire verrouillée','recalculé sur les octets',okVerr,msgVerr);
      /* Les Versions — SHA-256 des octets du journal */
      var okVers=false, msgVers='', digestVers=null;
      try{
        var tj=await fetchTxt('assets/journal-mises-a-jour.json');
        digestVers=await cvSha256Hex(tj);
        okVers=(digestVers===par.versions.digest);
        msgVers=okVers?'SHA-256 des octets du journal = digest de la chambre.':'le SHA-256 des octets du journal diffère du digest de la chambre.';
      }catch(e){msgVers='journal illisible depuis votre navigateur ('+e.message+').';}
      ligne('versions','Les Versions','recalculé sur les octets',okVers,msgVers);
      /* Les Archives — rehachage de la liste du manifeste */
      var okArch=false, msgArch='', digestArch=null;
      try{
        var liste=par.archives.captures.map(function(c){return c.version+':'+c.instantane;}).join('\n');
        digestArch=await cvSha256Hex(liste);
        okArch=(digestArch===par.archives.digest);
        msgArch=okArch?('la liste canonique du manifeste se rehache au digest de la chambre ('+par.archives.captures.length+' captures).'):'la liste du manifeste ne retombe pas sur le digest de la chambre.';
      }catch(e){msgArch='liste des captures absente du manifeste.';}
      ligne('archives','Les Archives','recalculé depuis la liste du manifeste',okArch,msgArch);
      /* La racine du cerveau — depuis les digests lus aux sources */
      var lus=[etatCh?etatCh.digest_cumule:null, coffre?coffre.digest_maitre:null, racineArbre, digestVerr, digestVers, digestArch];
      var racineOk=false, racineCalc=null;
      if(lus.every(function(x){return typeof x==='string';})){
        racineCalc=await cvRacineMerkle(lus);
        racineOk=(racineCalc===manifeste.racine_cerveau&&racineCalc===(racineEl?racineEl.textContent.trim():''));
      }
      if(racineEtatEl){
        racineEtatEl.textContent=racineOk?'Revérifiée en direct à l’instant, dans votre navigateur : les six digests lus aux sources se résument à la racine affichée — MATCH.':('ÉCART ou épreuve incomplète : la racine recalculée '+(racineCalc?'('+racineCalc+') ':'')+'ne rejoint pas la racine affichée, ou une source n’a pas été relue. Le détail est dit au verdict du bouton « Vérifie le cerveau ».');
      }
      /* Les interconnexions — chaque lien pointe sur une chambre existante */
      var valides={}; manifeste.chambres.forEach(function(c){valides[c.id]=true;}); valides['chambres']=true; valides['racine']=true;
      var liensOk=manifeste.interconnexions.every(function(ic){return !!(valides[ic.de]&&valides[ic.vers]);});
      var tout=okChaine&&okCoffre&&okArbre&&okVerr&&okVers&&okArch&&racineOk&&liensOk;
      if(detail&&resultatsEl){
        var h='<ul>';
        lignes.forEach(function(L){h+='<li><strong>'+L.nom+'</strong> — '+(L.ok?'MATCH':'ÉCART')+' ('+L.mode+') : '+L.msg+'</li>';});
        h+='<li><strong>La racine du cerveau</strong> — '+(racineOk?'MATCH':'ÉCART')+' (recalculée depuis les digests lus aux sources).</li>';
        h+='<li><strong>Les interconnexions</strong> — '+(liensOk?'MATCH':'ÉCART')+' : '+manifeste.interconnexions.length+' liens, chacun pointe sur une chambre existante (ou sur l’ensemble des chambres et la racine).</li>';
        h+='</ul>';
        resultatsEl.innerHTML=h;
      }
      if(verdictEl){
        verdictEl.textContent=tout?'Verdict global : MATCH — les six chambres, la racine et les interconnexions tiennent, revérifiés dans votre navigateur à l’instant.':'Verdict global : ÉCART — au moins un élément ne tient pas ; le détail est dit ci-dessus, élément par élément.';
      }
      return tout;
    }catch(e){
      if(verdictEl)verdictEl.textContent='ÉCHEC de l’épreuve : '+e.message+' — dit tel quel.';
      return false;
    }
  }
  var btnV=el('cerveau-verifier'); if(btnV)btnV.addEventListener('click',function(){lancerRecalcul(true);});
  /* v59 — audit tour 6, P2-3 : le recalcul complet repart a chaque ouverture
     du panneau Memoire (les initialisations ne partent qu'une fois) — ainsi
     l'horodatage affiche est celui du recalcul reel, pas du premier chargement. */
  var dernierRecalculAuto=0;
  document.addEventListener('panneau-ouvert',function(ev){
    if(!ev.detail||ev.detail.nom!=='memoire')return;
    var t=Date.now(); if(t-dernierRecalculAuto<3000)return; dernierRecalculAuto=t;
    lancerRecalcul(false);
  });
  document.querySelectorAll('.cerveau-copier').forEach(function(b){
    b.addEventListener('click',function(){
      var v=b.getAttribute('data-copie');
      function fait(){var t=b.textContent;b.textContent='Copié';setTimeout(function(){b.textContent=t;},1500);}
      if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(v).then(fait).catch(function(){});}
    });
  });
  /* Peinture d'abord : le recalcul vivant du cerveau ne part plus au
     chargement de la page ; il part après la peinture, à la première
     ouverture du panneau Mémoire (ou en temps mort après le chargement,
     via le registre) — et sa ligne d'état dit son départ et sa fin. */
  var recalculEl=el('cerveau-recalcul-etat');
  function heureRecalcul(){ try{ return ecHeureSainteMartine(new Date()); }catch(e){ return ''; } }
  async function lancerRecalcul(detail){
    if(recalculEl)recalculEl.textContent='Recalcul en cours… (parti à '+heureRecalcul()+')';
    try{ await verifierCerveau(detail); }catch(e){}
    if(recalculEl)recalculEl.textContent='Recalcul terminé à '+heureRecalcul()+'.';
  }
  if(window.crypto&&crypto.subtle){
    if(window.definirInitPanneau)definirInitPanneau('memoire',function(){lancerRecalcul(false);});
    else lancerRecalcul(false);
  }

  /* --- Éprouve la loi (a) : l'accumulateur de Fibonacci --- */
  var fibo=[1,1];
  function fiboAffiche(){
    var s=el('fibo-suite'), r=el('fibo-rapport'); if(!s)return;
    s.textContent=fibo.join(', ');
    if(r){
      var rapport=(fibo[fibo.length-1]/fibo[fibo.length-2]).toFixed(10);
      r.textContent='Rapport des deux derniers termes : '+rapport+' — la suite des rapports converge vers φ = 1,6180339887…'+(fibo.length>=30?' Trente termes affichés ; la suite, elle, ne finit pas.':'');
    }
  }
  var bf=el('fibo-btn'); if(bf)bf.addEventListener('click',function(){if(fibo.length<30){fibo.push(fibo[fibo.length-1]+fibo[fibo.length-2]);}fiboAffiche();});
  var rf=el('fibo-reset'); if(rf)rf.addEventListener('click',function(){fibo=[1,1];fiboAffiche();});
  fiboAffiche();

  /* --- Éprouve la loi (b) : le un qui grandit --- */
  var neufN=1;
  function neufAffiche(){
    var s=el('neuf-somme'), e=el('neuf-ecart'); if(!s)return;
    s.textContent=cvTermeNeuf(neufN);
    if(e)e.textContent='Écart au un : 0,'+('0'.repeat(neufN-1))+'1 — à chaque étape finie, la somme reste sous le un ; l’égalité 0,999… = 1 appartient à la somme entière, qui ne finit pas.';
  }
  var bn=el('neuf-btn'); if(bn)bn.addEventListener('click',function(){if(neufN<40)neufN++;neufAffiche();});
  var rn=el('neuf-reset'); if(rn)rn.addEventListener('click',function(){neufN=1;neufAffiche();});
  neufAffiche();

  /* --- Éprouve la loi (c) : la mini-chaîne jouable --- */
  var mini=[], geneseSceau=null;
  async function miniVerifie(){
    if(!geneseSceau)return;
    var res=await cvVerifieMini(geneseSceau,mini);
    document.querySelectorAll('[data-mini-verdict]').forEach(function(e2){
      var i=+e2.getAttribute('data-mini-verdict');
      e2.textContent=(res.ok||i<res.premierEcart)?'MATCH':'ÉCART';
    });
    var etat=el('mini-etat');
    if(etat){
      etat.textContent=mini.length===0?'':(res.ok?('Votre mini-chaîne tient : '+mini.length+' maillon(s), tous les sceaux recalculés concordent.'):('Chaîne rompue à partir du maillon '+(res.premierEcart+1)+' : son sceau recalculé ne correspond plus, et tous les suivants tombent — la somme des précédents ne pardonne aucune réécriture.'));
    }
  }
  function miniAffiche(){
    var liste=el('mini-liste'); if(!liste)return;
    liste.innerHTML='';
    mini.forEach(function(m,i){
      var d=document.createElement('div'); d.className='coffre-entree';
      var p=document.createElement('p'); p.className='petite';
      p.innerHTML='Maillon '+(i+1)+' — sceau <span class="mono">'+m.sceau.slice(0,16)+'…</span> — <strong data-mini-verdict="'+i+'">…</strong>';
      var inp=document.createElement('input'); inp.type='text'; inp.className='champ-cerveau'; inp.value=m.texte;
      inp.setAttribute('aria-label','Texte du maillon '+(i+1)+' — modifiez-le pour casser la chaîne');
      inp.addEventListener('input',function(){mini[i].texte=inp.value;miniVerifie();});
      d.appendChild(p); d.appendChild(inp); liste.appendChild(d);
    });
    miniVerifie();
  }
  if(window.crypto&&crypto.subtle){
    cvSha256Hex('cerveau-coquillage|genese').then(function(g){
      geneseSceau=g;
      var ge=el('mini-genese'); if(ge)ge.textContent=g.slice(0,16)+'…';
    }).catch(function(){});
  }

  /* --- v37 — « L'état conscient » : composition de l'état, gestes, pouls --- */
  var ecRacineEl=el('ec-racine'), ecChambresEl=el('ec-chambres'), ecGesteEl=el('ec-geste'),
      ecSceauEl=el('ec-sceau-moment'), ecCopierEl=el('ec-copier'), ecHeureEl=el('ec-heure'),
      ecMeteoEl=el('ec-meteo'), ecPoulsEl=el('ec-pouls'), ecPoulsRacineEl=el('ec-pouls-racine');
  var EC_ORDRE=['chaine','coffre','arbre','verrouillee','versions','archives'];
  var EC_NOMS={chaine:'La Chaîne',coffre:'Le Coffre synaptique',arbre:'L’Arbre de Merkle',verrouillee:'La Mémoire verrouillée',versions:'Les Versions',archives:'Les Archives'};
  var ecRemontees=[], ecManifeste=null, ecPar=null;
  function ecMarquerChambre(id){
    if(EC_ORDRE.indexOf(id)<0||ecRemontees.indexOf(id)>=0)return;
    ecRemontees.push(id); ecAfficherChambres();
  }
  function ecAfficherChambres(){
    if(!ecChambresEl)return;
    ecChambresEl.textContent=ecRemontees.length?ecRemontees.map(function(id){return EC_NOMS[id];}).join(', '):'aucune encore — l’auto-épreuve du panneau remonte les six chambres au chargement ; chacune ne compte ici que lorsque sa source a réellement été lue par une épreuve de cette page.';
  }
  function ecAfficherMeteo(){
    if(!ecMeteoEl)return;
    var t=el('mt-temp'), c=el('mt-ciel'), lu=[];
    if(t&&t.textContent&&t.textContent.indexOf('cours')<0)lu.push(t.textContent.trim());
    if(c&&c.textContent&&c.textContent.indexOf('cours')<0)lu.push(c.textContent.trim());
    ecMeteoEl.textContent=lu.length?('Météo de l’ancre, déjà lue par cette page (panneau Météo) : '+lu.join(' — ')+'. Aucun appel météo dédié n’a été fait pour ce bloc.'):'Météo de l’ancre : pas encore lue par cette page — ce bloc ne fait aucun appel météo dédié ; l’heure seule est affichée ici, dit tel quel.';
  }
  function ecComposer(typeGeste){
    var maintenant=new Date(), iso=maintenant.toISOString();
    if(ecHeureEl)ecHeureEl.textContent=ecHeureSainteMartine(maintenant);
    if(ecGesteEl)ecGesteEl.textContent=typeGeste+' — à '+ecHeureSainteMartine(maintenant)+' (Sainte-Martine), '+iso+'.';
    ecAfficherMeteo();
    if(window.crypto&&crypto.subtle){
      ecSceauMoment(iso,typeGeste).then(function(s){
        if(ecSceauEl)ecSceauEl.textContent=s.slice(0,16)+'…';
        if(ecCopierEl)ecCopierEl.setAttribute('data-copie',s);
      }).catch(function(){if(ecSceauEl)ecSceauEl.textContent='indisponible dans ce navigateur';});
    }else if(ecSceauEl){ecSceauEl.textContent='indisponible — Web Crypto absent de ce navigateur';}
    return ecComposeEtat(ecRacineEl?ecRacineEl.textContent.trim():'',ecRemontees,typeGeste);
  }
  if(ecCopierEl)ecCopierEl.addEventListener('click',function(){
    var v=ecCopierEl.getAttribute('data-copie');
    function fait(){var t=ecCopierEl.textContent;ecCopierEl.textContent='Copié';setTimeout(function(){ecCopierEl.textContent=t;},1500);}
    if(v&&navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(v).then(fait).catch(function(){});
    ecComposer('copie du sceau du moment');
  });
  /* Les gestes réels qui lisent des sources : bouton « Vérifie le cerveau » (les six
     sources), boutons copier des cartes de chambres (la chambre de la carte), et
     l'auto-épreuve au chargement (détectée par le changement d'état de la racine). */
  if(btnV)btnV.addEventListener('click',function(){
    EC_ORDRE.forEach(ecMarquerChambre);
    ecComposer('bouton « Vérifie le cerveau » — les six sources relues');
  });
  document.querySelectorAll('[data-chambre] .cerveau-copier').forEach(function(b){
    b.addEventListener('click',function(){
      var carte=b.closest('[data-chambre]'); if(!carte)return;
      var id=carte.getAttribute('data-chambre');
      ecMarquerChambre(id);
      ecComposer('copie du digest de la chambre « '+(EC_NOMS[id]||id)+' »');
    });
  });
  var ecLiens=el('cerveau-liens');
  if(ecLiens)ecLiens.addEventListener('click',function(){
    ecComposer('consultation des interconnexions du cerveau');
  });
  if(racineEtatEl&&window.MutationObserver){
    var ecObs=new MutationObserver(function(){
      if(racineEtatEl.textContent.indexOf('Relevé statique')<0){
        EC_ORDRE.forEach(ecMarquerChambre);
        ecComposer('auto-épreuve au chargement — les six sources lues par la page');
        ecObs.disconnect();
      }
    });
    ecObs.observe(racineEtatEl,{childList:true,characterData:true,subtree:true});
  }
  /* Le pouls : rotation sur les six chambres, une source relue par battement. */
  var ecMinuteur=null, ecBattement=0, ecIndex=0, ecLus={};
  async function ecChargerManifeste(){
    if(ecManifeste)return ecManifeste;
    ecManifeste=await fetchJson('assets/cerveau.json');
    ecPar={}; ecManifeste.chambres.forEach(function(c){ecPar[c.id]=c;});
    return ecManifeste;
  }
  async function ecLireDigest(id){
    if(id==='chaine'){var e=await fetchJson('assets/etat-chaine.json');return e.digest_cumule;}
    if(id==='coffre'){var cf=await fetchJson('assets/coffre.json');return cf.digest_maitre;}
    if(id==='arbre'){var cf2=await fetchJson('assets/coffre.json');return cvRacineMerkle(cf2.entrees.map(function(x){return x.sha256;}));}
    if(id==='verrouillee'){var rep=await fetch('assets/coffre-prive.json',{cache:'no-store'});if(!rep.ok)throw new Error('HTTP '+rep.status);return cvSha256Octets(await rep.arrayBuffer());}
    if(id==='versions'){var tj=await fetchTxt('assets/journal-mises-a-jour.json');return cvSha256Hex(tj);}
    if(id==='archives'){await ecChargerManifeste();var liste=ecPar.archives.captures.map(function(c){return c.version+':'+c.instantane;}).join('\n');return cvSha256Hex(liste);}
    return null;
  }
  async function ecBattre(){
    var id=EC_ORDRE[ecIndex];
    try{
      await ecChargerManifeste();
      var d=await ecLireDigest(id);
      ecLus[id]=d; ecBattement++;
      var ok=(d===ecPar[id].digest);
      if(ecPoulsEl)ecPoulsEl.textContent='battement nº '+ecBattement+' — chambre « '+EC_NOMS[id]+' » revérifiée : '+(ok?'MATCH':'ÉCART')+', à '+ecHeureSainteMartine(new Date())+'.';
      ecMarquerChambre(id);
      if(ecRotationComplete(ecIndex,EC_ORDRE.length)){
        var tous=EC_ORDRE.map(function(x){return ecLus[x];});
        if(tous.every(function(x){return typeof x==='string';})){
          var r=await cvRacineMerkle(tous);
          var okR=(r===ecManifeste.racine_cerveau);
          if(ecPoulsRacineEl)ecPoulsRacineEl.textContent='dernière racine revérifiée : '+(okR?'MATCH':'ÉCART — racine recomposée '+r)+' à '+ecHeureSainteMartine(new Date())+'.';
        }
      }
    }catch(e){
      ecBattement++;
      if(ecPoulsEl)ecPoulsEl.textContent='battement nº '+ecBattement+' — chambre « '+EC_NOMS[id]+' » : ÉCHEC de lecture ('+e.message+'), dit tel quel, à '+ecHeureSainteMartine(new Date())+'.';
    }
    ecIndex=ecProchaineChambre(ecIndex,EC_ORDRE.length);
  }
  function ecPanneauOuvert(){var p=el('p-memoire');return !!(p&&p.classList.contains('actif'));}
  function ecDemarrerPouls(){
    if(ecMinuteur||!ecPanneauOuvert())return;
    /* v56 — le sceau du moment se fige à l'ouverture du panneau : composé ici,
       une fois par ouverture (horodatage et geste écrits au même instant), il
       n'est plus réécrit par les battements du pouls — même horodatage, même
       valeur, à toute lecture. */
    ecComposer('ouverture du panneau Mémoire');
    ecMinuteur=setInterval(ecBattre,5000);
    if(ecPoulsEl&&ecBattement===0)ecPoulsEl.textContent='pouls démarré — un battement environ toutes les cinq secondes, tant que le panneau Mémoire est ouvert.';
  }
  function ecArreterPouls(){
    if(!ecMinuteur)return;
    clearInterval(ecMinuteur); ecMinuteur=null;
    if(ecPoulsEl)ecPoulsEl.textContent='pouls arrêté — le panneau Mémoire est fermé (borne : le pouls vit tant que le panneau est ouvert). Dernier battement : nº '+ecBattement+'.';
  }
  var ecPanneau=el('p-memoire');
  if(ecPanneau&&window.MutationObserver){
    new MutationObserver(function(){ecPanneauOuvert()?ecDemarrerPouls():ecArreterPouls();}).observe(ecPanneau,{attributes:true,attributeFilter:['class']});
  }
  ecDemarrerPouls();
  /* v55 — chien de garde du pouls : toutes les 5 s, l'état du minuteur est réconcilié avec l'état réel du panneau (le MutationObserver seul pouvait manquer une transition, et le message « pouls arrêté » contredisait alors un panneau ouvert — audit de la v54). Le sceau du moment, lui, se recompose à chaque battement (voir ecBattre). */
  setInterval(function(){ if(ecPanneauOuvert()){ ecDemarrerPouls(); } else { ecArreterPouls(); } },5000);
  ecComposer('chargement de la page — composition initiale de l’état');

  var bm=el('mini-btn');
  if(bm)bm.addEventListener('click',function(){
    var champ=el('mini-texte'), etat=el('mini-etat');
    var t=champ?(champ.value||'').trim():'';
    if(!geneseSceau){if(etat)etat.textContent='Web Crypto n’est pas disponible dans ce navigateur — la mini-chaîne ne peut pas se sceller ici.';return;}
    if(!t){if(etat)etat.textContent='Écrivez un texte, puis scellez le maillon.';return;}
    var prev=mini.length?mini[mini.length-1].sceau:geneseSceau;
    cvSceauMini(prev,t).then(function(s){mini.push({texte:t,sceau:s});if(champ)champ.value='';miniAffiche();});
  });
})();


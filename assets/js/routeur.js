/* Routeur de la refonte A — voir le manifeste (assets/manifeste.json). */
// ---------- Routeur de la refonte A (pages par chambre) ----------
// Adaptation du routeur du fichier unique : ouvrirPanneau garde sa
// sémantique — ouverture locale quand le panneau est dans la page
// (Accueil et Méthode en 30 secondes au noyau ; FAQ, Répertoire et Vision
// nichés dans Temps), navigation vers la page de la chambre sinon, avec
// l'endroit en adresse. Le retour, la pile, les initialisations différées
// et l'historique réel suivent les mêmes règles que le régime d'origine.
var PAGE_PAR_PANNEAU = {"acces": "acces.html", "accueil": "index.html", "agir": "agir-sur-mes-donnees.html", "aller": "aller.html", "ancrage": "ancrage.html", "application": "application.html", "articles": "articles.html", "assurances": "assurances.html", "bris": "bris.html", "calendrier": "calendrier.html", "cameras": "cameras.html", "capsules": "capsules.html", "cerveau-coquillage": "cerveau-coquillage.html", "chercheur": "chercheur.html", "conditions": "conditions.html", "conditions-site": "conditions-site.html", "confidentialite": "confidentialite.html", "contact": "contact.html", "decisions": "decisions.html", "depose-empreinte": "depose-empreinte.html", "don": "don.html", "donnees": "donnees.html", "droits": "droits.html", "ecrire": "ecrire.html", "edition": "edition.html", "etat51": "etat51.html", "evolution": "evolution.html", "explication": "explication.html", "exposition": "exposition.html", "faq": "temps.html", "fenetres": "fenetres.html", "for": "for.html", "ingenierie": "ingenierie.html", "instance": "instance.html", "memoire": "memoire.html", "meteo": "meteo.html", "methode": "methode.html", "methode-30": "index.html", "miroir": "miroir.html", "modes": "modes.html", "ouverture": "ouverture.html", "parcours": "parcours.html", "partenaires": "partenaires.html", "petitions": "petitions.html", "politique-site": "politique-site.html", "preuves": "preuves.html", "recherche": "recherche.html", "recu": "recu.html", "recus": "recus.html", "registre": "registre.html", "repertoire": "temps.html", "sceller": "sceller.html", "suivi": "suivi.html", "suivi-familial": "suivi-familial.html", "suspendu": "suspendu.html", "temps": "temps.html", "transits": "transits.html", "transmission": "transmission.html", "transparence": "transparence.html", "transparence-audit": "transparence-audit-unisson.html", "verifier": "verifier.html", "vision": "temps.html", "voir": "voir.html"};
var PAGE_PAR_SECTION = {"acces": "acces.html", "accueil-plat": "index.html", "aller-amazon": "aller.html", "aller-apple": "aller.html", "aller-cadre": "aller.html", "aller-detecteur": "aller.html", "aller-discord": "aller.html", "aller-google": "aller.html", "aller-meta": "aller.html", "aller-microsoft": "aller.html", "aller-miroir": "aller.html", "aller-snapchat": "aller.html", "aller-tiktok": "aller.html", "aller-x": "aller.html", "ancrage-2026-11-08": "ancrage.html", "ancrage-2026-11-15": "ancrage.html", "ancrage-2026-11-16": "ancrage.html", "ancrage-anteriorite": "ancrage.html", "ancrages": "ancrage.html", "ancrer-bitcoin": "ancrage.html", "application": "application.html", "articles": "articles.html", "assurances-1": "assurances.html", "assurances-2": "assurances.html", "assurances-3": "assurances.html", "assurances-4": "assurances.html", "assurances-5": "assurances.html", "assurances-6": "assurances.html", "assurances-sommaire": "assurances.html", "bornes": "preuves.html", "bris": "bris.html", "calendrier": "calendrier.html", "calendrier-bissextile": "calendrier.html", "calendrier-compte": "calendrier.html", "calendrier-departs": "calendrier.html", "calendrier-formules": "calendrier.html", "calendrier-gregorien": "calendrier.html", "calendrier-histoire": "calendrier.html", "calendrier-recupere": "calendrier.html", "calendrier-retomber": "calendrier.html", "calendrier-structure": "calendrier.html", "cameras-chemin": "cameras.html", "cameras-effaceur": "cameras.html", "cameras-reglages": "cameras.html", "cameras-regulateurs": "cameras.html", "cameras-transit": "cameras.html", "capsules": "capsules.html", "capsules-externes": "capsules.html", "chercheur": "chercheur.html", "chercheur-pi": "chercheur.html", "chronologie": "parcours.html", "conditions": "conditions.html", "conditions-consentements": "conditions.html", "conditions-enfants": "conditions.html", "conditions-site-cadre": "conditions-site.html", "conditions-site-conformite": "conditions-site.html", "conditions-site-dons": "conditions-site.html", "conditions-site-ecrire": "conditions-site.html", "conditions-site-est": "conditions-site.html", "conditions-site-faire": "conditions-site.html", "conditions-site-modifications": "conditions-site.html", "conditions-site-preambule": "conditions-site.html", "conditions-site-preuve": "conditions-site.html", "conditions-site-qui": "conditions-site.html", "confidentialite": "confidentialite.html", "contact-temoin": "contact.html", "coquillage": "methode.html", "coquillage-scrub": "methode.html", "couche-chaine": "memoire.html", "couche-pouls": "memoire.html", "couche-registre": "memoire.html", "couche-sceaux": "memoire.html", "decisions-atome": "suivi.html", "decisions-attente": "decisions.html", "decisions-registre": "decisions.html", "defaillances": "preuves.html", "demo-decisions": "droits.html", "depose-empreinte": "depose-empreinte.html", "direct": "evolution.html", "documents": "chercheur.html", "don-choix": "don.html", "don-comment": "don.html", "don-pourquoi": "don.html", "don-usages": "don.html", "donnees": "donnees.html", "droits": "droits.html", "ecrire": "ecrire.html", "edition-jour": "edition.html", "empreinte": "exposition.html", "etat51-assemblage": "etat51.html", "etat51-etat": "etat51.html", "etat51-plusloin": "etat51.html", "etat51-portes": "etat51.html", "etat51-tableau": "etat51.html", "etat51-these": "etat51.html", "evolution": "evolution.html", "explication-generateur": "explication.html", "explication-lois": "explication.html", "explication-parcours": "explication.html", "exposition-suivi": "exposition.html", "faq": "temps.html", "fenetres": "fenetres.html", "for-carte": "for.html", "for-lettre": "for.html", "for-recours": "for.html", "for-verifier": "for.html", "foyers": "evolution.html", "gradMetal1": "index.html", "gradMetal10": "index.html", "gradMetal2": "index.html", "gradMetal3": "index.html", "gradMetal4": "index.html", "gradMetal5": "index.html", "gradMetal6": "index.html", "gradMetal7": "index.html", "gradMetal8": "index.html", "gradMetal9": "index.html", "histoire": "parcours.html", "infolettre": "suivi.html", "ingenierie": "ingenierie.html", "journal": "evolution.html", "memoire": "memoire.html", "menus": "index.html", "meteo": "meteo.html", "methode": "methode.html", "methode-30": "index.html", "miroir-modes": "miroir.html", "miroir-releve": "miroir.html", "miroir-transit": "miroir.html", "modes-choix": "modes.html", "modes-jamais": "modes.html", "modes-local": "modes.html", "modes-plusloin": "modes.html", "modes-pourquoi": "modes.html", "modes-recherche": "modes.html", "modes-serveurs": "modes.html", "modes-tableau": "modes.html", "non-tracking": "exposition.html", "outils": "sceller.html", "parcours-sceptique": "verifier.html", "partenaires-ceque": "partenaires.html", "partenaires-cherche": "partenaires.html", "partenaires-construit": "partenaires.html", "partenaires-fonctions": "partenaires.html", "partenaires-refus": "partenaires.html", "partenaires-relation": "partenaires.html", "petitions": "petitions.html", "pisteur-visite": "exposition.html", "politique-cerveau": "politique-site.html", "politique-conformite": "politique-site.html", "politique-dons": "politique-site.html", "politique-droits": "politique-site.html", "politique-ecrire": "politique-site.html", "politique-mineurs": "politique-site.html", "politique-modifications": "politique-site.html", "politique-non-fait": "politique-site.html", "politique-preambule": "politique-site.html", "politique-verrouillee": "politique-site.html", "portes-documentees": "transits.html", "presence": "exposition.html", "preuves-chemins": "ancrage.html", "probleme": "parcours.html", "recherche": "recherche.html", "recherche-reliee": "instance.html", "recu-visite": "recu.html", "recu-visite-accueil": "index.html", "recus-gestes": "recus.html", "registre": "registre.html", "repertoire": "temps.html", "resultats": "preuves.html", "reviens-preuve": "ancrage.html", "sceptique": "preuves.html", "suivi": "suivi.html", "suivi-familial-1": "suivi-familial.html", "suivi-familial-2": "suivi-familial.html", "suivi-familial-3": "suivi-familial.html", "suivi-familial-4": "suivi-familial.html", "suivi-familial-5": "suivi-familial.html", "suivi-familial-sommaire": "suivi-familial.html", "suivi-silence": "suivi.html", "surface-compteurs": "index.html", "surface-gestes": "index.html", "surface-histoire": "index.html", "suspendu-droit": "suspendu.html", "suspendu-fiches": "suspendu.html", "suspendu-memoire": "suspendu.html", "suspendu-parcours": "suspendu.html", "suspendu-premiere-heure": "suspendu.html", "telephone-soir": "exposition.html", "temps": "temps.html", "terrains": "parcours.html", "tout-verifier": "verifier.html", "transits": "transits.html", "transits-kit": "transits.html", "transits-lieux": "transits.html", "transits-proximite": "transits.html", "transits-voyage": "transits.html", "transmission": "transmission.html", "transparence": "transparence.html", "trouve-ecart": "verifier.html", "verifie-moi": "verifier.html", "verifie-nous": "exposition.html", "vision": "temps.html", "voir-cerveau": "voir.html", "voir-enveloppe": "voir.html"};
var PAGE_PAR_CIBLE = {"acces": "acces.html", "ancrages": "ancrage.html", "archives": "ancrage.html", "articles": "articles.html", "chercheur": "chercheur.html", "chronologie": "parcours.html", "confidentialite": "confidentialite.html", "coquillage": "methode.html", "donnees": "donnees.html", "menu-cerveau-site": "index.html", "menu-comprendre": "index.html", "menu-donnees": "index.html", "menu-dossier": "index.html", "menu-ecrire": "index.html", "menu-verifier": "index.html", "menus": "index.html", "methode": "methode.html", "outils": "sceller.html", "registre": "registre.html", "tout-verifier": "verifier.html", "tv-ancrages": "verifier.html", "tv-chaine": "verifier.html", "tv-dates": "verifier.html", "tv-orcid": "verifier.html", "tv-registre": "verifier.html", "voyage": "index.html"};
var CARTE_PANNEAUX = {"acces": "acces", "ancrages": "ancrage", "archives": "ancrage", "articles": "articles", "bornes": "preuves", "capsules": "capsules", "chercheur": "chercheur", "chronologie": "parcours", "confidentialite": "confidentialite", "contact": "contact", "coquillage": "methode", "defaillances": "preuves", "documents": "chercheur", "donnees": "donnees", "droits": "droits", "ecrire": "ecrire", "evolution": "evolution", "faq": "chercheur", "histoire": "parcours", "instance": "instance", "methode": "methode", "outils": "sceller", "partenaires": "partenaires", "petitions": "petitions", "probleme": "accueil", "recherche": "recherche", "registre": "registre", "resultats": "preuves", "terrains": "parcours", "transparence": "transparence", "verifier": "verifier"};
var ALIAS_SECTIONS = {"hubs": "menus", "mapping": "transits", "memoire-2": "memoire-desaccords", "partenaires-2": "partenaires-construit", "quite": "suspendu", "temoignages": "tv-temoignage"};
var FICHIER_COURANT = (location.pathname.split('/').pop() || 'index.html');
var PANNEAU_PAGE = window.PANNEAU_PAGE || 'accueil';
const boutons=[...document.querySelectorAll('#onglets button')];
var pileNavigation=[];
var panneauCourant=PANNEAU_PAGE;
var initsPanneaux={}, initsLancees={};
function lancerInitsPanneau(nom){
  var liste=initsPanneaux[nom]||[];
  initsPanneaux[nom]=[];
  liste.forEach(function(f){
    requestAnimationFrame(function(){requestAnimationFrame(function(){try{f();}catch(e){}});});
  });
}
window.definirInitPanneau=function(nom,fn){
  if(!fn)return;
  if(initsLancees[nom]){
    requestAnimationFrame(function(){requestAnimationFrame(function(){try{fn();}catch(e){}});});
    return;
  }
  (initsPanneaux[nom]=initsPanneaux[nom]||[]).push(fn);
};
window.addEventListener('load',function(){
  var partir=function(){
    Object.keys(initsPanneaux).forEach(function(n){initsLancees[n]=true;lancerInitsPanneau(n);});
  };
  if(window.requestIdleCallback)window.requestIdleCallback(partir,{timeout:2500});
  else setTimeout(partir,400);
});
var idxNav=0, premierOuverture=true, navDepuisPop=false, dernierPop=0;
window.addEventListener('popstate',function(ev){
  dernierPop=Date.now();
  var nom=(location.hash||'').slice(1);
  if(typeof ALIAS_SECTIONS!=='undefined'&&ALIAS_SECTIONS[nom])nom=ALIAS_SECTIONS[nom];
  var idx=(ev.state&&typeof ev.state.navIdx==='number')?ev.state.navIdx:null;
  if(idx!==null&&idx<idxNav){var retire=idxNav-idx;while(retire>0){pileNavigation.pop();retire--;}}
  if(idx!==null)idxNav=idx;
  navDepuisPop=true;
  if(!nom){ouvrirLocal(PANNEAU_PAGE,{retour:true});}
  else if(document.getElementById('p-'+nom)){ouvrirLocal(nom,{retour:true});}
  else if(document.getElementById(nom)){var el=document.getElementById(nom);if(el)el.scrollIntoView();}
  else{var f=PAGE_PAR_PANNEAU[nom]||PAGE_PAR_SECTION[nom]||PAGE_PAR_CIBLE[nom];if(f&&f!==FICHIER_COURANT)location.href=f+'#'+nom;}
  navDepuisPop=false;
});
function ouvrirLocal(nom,opts){
  if(!document.getElementById('p-'+nom))return;
  if(!(opts&&opts.retour)&&nom!==panneauCourant)pileNavigation.push(panneauCourant);
  panneauCourant=nom;
  boutons.forEach(b=>b.classList.toggle('actif',b.dataset.panneau===nom));
  document.querySelectorAll('.rail-arbre [data-ouvrir]').forEach(b=>b.classList.toggle('actif',b.dataset.ouvrir===nom));
  document.querySelectorAll('.panneau').forEach(p=>p.classList.toggle('actif',p.id==='p-'+nom));
  try{document.dispatchEvent(new CustomEvent('panneau-ouvert',{detail:{nom:nom}}));}catch(e){}
  if(navDepuisPop||Date.now()-dernierPop<800){}
  else if(premierOuverture||(opts&&opts.retour)){history.replaceState(history.state,'','#'+nom);}
  else if(location.hash!=='#'+nom){idxNav++;history.pushState({navIdx:idxNav},'','#'+nom);}
  premierOuverture=false;
  window.scrollTo({top:0,behavior:'smooth'});
  initsLancees[nom]=true;
  lancerInitsPanneau(nom);
}
function allerA(id){
  var el=document.getElementById(id);
  if(el){el.scrollIntoView({behavior:'smooth'});try{history.pushState(null,'','#'+id);}catch(e){}return;}
  var f=PAGE_PAR_SECTION[id]||PAGE_PAR_CIBLE[id];
  if(f&&f!==FICHIER_COURANT)location.href=f+'#'+id;
}
function ouvrirPanneau(nom,opts){
  if(!nom)return;
  if(typeof ALIAS_SECTIONS!=='undefined'&&ALIAS_SECTIONS[nom]){
    var a=ALIAS_SECTIONS[nom];
    if(document.getElementById('p-'+a)||PAGE_PAR_PANNEAU[a])nom=a;
    else{allerA(a);return;}
  }
  if(CARTE_PANNEAUX[nom])nom=CARTE_PANNEAUX[nom];
  if(document.getElementById('p-'+nom)){
    ouvrirLocal(nom,opts);
    var cc=opts&&(opts.cible||opts.ancre);
    if(cc)setTimeout(function(){var el=document.getElementById(cc);if(el)el.scrollIntoView({behavior:'smooth'});},120);
    return;
  }
  var f=PAGE_PAR_PANNEAU[nom];
  if(!f)return;
  var ancre=(opts&&(opts.ancre||opts.cible))?(opts.ancre||opts.cible):nom;
  location.href=f+'#'+ancre;
}
window.ouvrirPanneau=ouvrirPanneau;
function retourPanneau(){
  if(idxNav>0){history.back();return;}
  var cible=pileNavigation.pop();
  if(cible){ouvrirPanneau(cible,{retour:true});return;}
  if(FICHIER_COURANT!=='index.html'){location.href='index.html';return;}
  window.scrollTo({top:0,behavior:'smooth'});
}
boutons.forEach(b=>b.addEventListener('click',()=>ouvrirPanneau(b.dataset.panneau)));
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
  const id=a.getAttribute('href').slice(1);
  if(!id)return;
  const pan=CARTE_PANNEAUX[id];
  if(pan){e.preventDefault();ouvrirPanneau(pan,{ancre:id});
    if(document.getElementById('p-'+pan)){setTimeout(()=>{const c=document.getElementById(id);if(c)c.scrollIntoView({behavior:'smooth'});},120);}
    return;}
  if(document.getElementById(id))return;
  const f=PAGE_PAR_SECTION[id]||PAGE_PAR_CIBLE[id]||PAGE_PAR_PANNEAU[id];
  if(f&&f!==FICHIER_COURANT){e.preventDefault();location.href=f+'#'+id;}
}));
document.querySelectorAll('.nav-retour').forEach(b=>b.addEventListener('click',retourPanneau));
var marqueAccueil=document.getElementById('marque-accueil');
if(marqueAccueil){marqueAccueil.addEventListener('click',()=>ouvrirPanneau('accueil'));marqueAccueil.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();ouvrirPanneau('accueil');}});}
// ---------- Atterrissage : la page affichée est un panneau ----------
// Différé à DOMContentLoaded : tous les blocs de la page ont alors
// enregistré leurs écoutes (panneau-ouvert, initialisations différées).
function declencherPanneauPage(){
  boutons.forEach(b=>b.classList.toggle('actif',b.dataset.panneau===PANNEAU_PAGE));
  try{document.dispatchEvent(new CustomEvent('panneau-ouvert',{detail:{nom:PANNEAU_PAGE}}));}catch(e){}
  initsLancees[PANNEAU_PAGE]=true;
  lancerInitsPanneau(PANNEAU_PAGE);
}
function atterrissage(){
  var h=(location.hash||'').slice(1);
  if(h){
    if(document.getElementById('p-'+h)){if(h!==PANNEAU_PAGE)ouvrirLocal(h,{retour:true});else declencherPanneauPage();return;}
    if(typeof ALIAS_SECTIONS!=='undefined'&&ALIAS_SECTIONS[h]){
      var a=ALIAS_SECTIONS[h];
      if(document.getElementById('p-'+a)){ouvrirLocal(a,{retour:true});return;}
      if(document.getElementById(a)){declencherPanneauPage();setTimeout(()=>{var el=document.getElementById(a);if(el)el.scrollIntoView();},80);return;}
      var fa=PAGE_PAR_SECTION[a];if(fa&&fa!==FICHIER_COURANT){location.replace(fa+'#'+a);return;}
    }
    if(CARTE_PANNEAUX[h]){ouvrirPanneau(CARTE_PANNEAUX[h],{ancre:h});return;}
    if(document.getElementById(h)){declencherPanneauPage();setTimeout(()=>{var el=document.getElementById(h);if(el)el.scrollIntoView();},80);return;}
    var f=PAGE_PAR_PANNEAU[h]||PAGE_PAR_SECTION[h]||PAGE_PAR_CIBLE[h];
    if(f&&f!==FICHIER_COURANT){location.replace(f+'#'+h);return;}
  }
  declencherPanneauPage();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',atterrissage);
else atterrissage();
// ---------- Compteurs animés ----------
const obsC=new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting)return;obsC.unobserve(e.target);
  const cible=+e.target.dataset.cible;let n=0;const pas=Math.max(1,Math.round(cible/60));
  const iv=setInterval(()=>{n+=pas;if(n>=cible){n=cible;clearInterval(iv)}e.target.textContent=n.toLocaleString('fr-CA')},24);
}),{threshold:.4});
document.querySelectorAll('.nombre').forEach(el=>obsC.observe(el));
// ---------- Spirale d'or animée (fond, signature du modèle) ----------
// ---------- Spirale d'or animée (fond, signature du modèle) ----------
(function(){
  const c=document.getElementById('spirale');if(!c)return;const x=c.getContext('2d');let W,H,t=0;
  function taille(){W=c.width=innerWidth;H=c.height=innerHeight}taille();addEventListener('resize',taille);
  /* v7 — la spirale se met en pause quand l'onglet est caché ou si l'appareil
     préfère les mouvements réduits : elle ne brûle plus de cycles en arrière-plan. */
  let spiralePause=document.hidden||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('visibilitychange',()=>{spiralePause=document.hidden||window.matchMedia('(prefers-reduced-motion: reduce)').matches});
  (function boucle(){
    if(!spiralePause){
    x.clearRect(0,0,W,H);const cx=W*0.85,cy=H*0.15;
    const pts59=[];
    for(let i=0;i<160;i++){
      const a=t*0.15+i*0.42,r=Math.pow(1.618,i*0.055)*1.4;
      const px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r;
      if(px<-20||px>W+20||py<-20||py>H+20)continue;
      pts59.push([px,py]);
      x.beginPath();x.arc(px,py,i%32===0?3:1.6,0,7);x.fillStyle='rgba(178,134,22,'+(0.5-i/320)+')';x.fill();
    }
    /* v59 — couche d'attrait : les points de la spirale se relient comme des
       maillons — la chaîne se dessine, pas seulement ses points. */
    if(pts59.length>1){x.beginPath();x.moveTo(pts59[0][0],pts59[0][1]);for(let k=1;k<pts59.length;k++)x.lineTo(pts59[k][0],pts59[k][1]);x.strokeStyle='rgba(178,134,22,0.16)';x.lineWidth=1;x.stroke();}
    t+=0.008;}
    requestAnimationFrame(boucle);
  })();
})();

// ---------- Révélation douce des cartes ----------
const obsR=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('vu');obsR.unobserve(e.target)}}),{threshold:.1});
document.querySelectorAll('.carte,.terrain,.entree,.etape-pas').forEach(el=>{el.classList.add('revele');obsR.observe(el)});

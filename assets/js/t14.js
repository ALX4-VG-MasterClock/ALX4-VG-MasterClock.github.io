
/* ===== v5+ — parcours, preuve en un geste, test du sceptique, recherche ===== */
document.querySelectorAll('[data-ouvrir]').forEach(b=>b.addEventListener('click',()=>{
  /* Refonte A — la cible (un endroit précis) traverse les pages : le routeur
     la met dans l'adresse quand la chambre est sur une autre page. */
  if(b.dataset.cible)ouvrirPanneau(b.dataset.ouvrir,{cible:b.dataset.cible});
  else ouvrirPanneau(b.dataset.ouvrir);
}));
function preuveEnUnGeste(){
  /* Refonte A — si le Registre est sur une autre page, le geste se dépose
     en témoin de session ; la page Registre le reprend après son rendu,
     et le témoin du Registre mène ensuite à la page Vérifier. */
  if(!document.getElementById('p-registre')){
    try{sessionStorage.setItem('geste-preuve','11');}catch(e){}
    ouvrirPanneau('registre');
    return;
  }
  ouvrirPanneau('registre');
  let essais=0;
  const iv=setInterval(()=>{
    const b=document.querySelector('[data-verifier="11"]');essais++;
    if(b){clearInterval(iv);b.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>b.click(),450);}
    else if(essais>25)clearInterval(iv);
  },300);
}
const b30=document.getElementById('btn-preuve-30s');if(b30)b30.addEventListener('click',preuveEnUnGeste);
const bp=document.getElementById('btn-parcours-preuve');if(bp)bp.addEventListener('click',preuveEnUnGeste);
// --- Test du sceptique ---
const AFFIRMATIONS={
  chaine:{statut:'<span class="match">ÉTABLI — au mieux de l\u2019état actuel</span>',
    preuve:'Revérification complète de la chaîne : 2 310 maillons recalculés un à un, verdict MATCH (1<sup>er</sup> novembre 2026). Le registre des pièces tient à 508 / 508.',
    methode:'Chaque sceau est recalculé depuis le précédent et comparé ; le digest cumulé atteste la série entière. Le calcul est reproductible par tout tiers qui tient la chaîne.',
    borne:'L\u2019intégrité prouve qu\u2019un contenu n\u2019a pas changé depuis son scellement — pas que son contenu initial était vrai.'},
  simulation:{statut:'<span class="match">ÉTABLI — sur la série mesurée</span>',
    preuve:'20 252 sceaux présentés par un modèle comme des hachages « calculés » ont été comparés au recalcul : seuls les hachages de la chaîne vide concordaient.',
    methode:'Comparaison exhaustive, un à un, entre les valeurs présentées dans les conversations et le SHA-256 recalculé des mêmes ingrédients.',
    borne:'La mesure porte sur la série documentée du dossier ; elle ne dit rien, à elle seule, des autres modèles ni des autres périodes.'},
  replication:{statut:'<span class="ecart">NON — pas encore</span>',
    preuve:'À ce jour, la méthode est opérée par son auteur (N = 1). La réplication par des utilisateurs naïfs, les batteries adverses administrées par d\u2019autres et l\u2019audit à juges humains sont l\u2019étape suivante déclarée — et l\u2019objet des demandes de financement en préparation.',
    methode:'Critère de sortie écrit d\u2019avance : des tiers opèrent le protocole sans l\u2019auteur, avec des taux de détection mesurés et publiés, y compris négatifs.',
    borne:'Tant que cette étape n\u2019a pas eu lieu, le dossier se présente comme démontré par son auteur — rien de plus, et il le dit lui-même.'}
};
const zoneS=document.getElementById('sceptique-detail');
function afficheAff(cle){
  const a=AFFIRMATIONS[cle];if(!a||!zoneS)return;
  zoneS.innerHTML='<div class="ligne"><span class="quoi">Statut</span><span>'+a.statut+'</span></div>'
    +'<div class="ligne"><span class="quoi">Preuve</span><span>'+a.preuve+'</span></div>'
    +'<div class="ligne"><span class="quoi">Méthode</span><span>'+a.methode+'</span></div>'
    +'<div class="ligne"><span class="quoi">Borne</span><span>'+a.borne+'</span></div>';
  document.querySelectorAll('[data-aff]').forEach(b=>b.classList.toggle('actif',b.dataset.aff===cle));
}
document.querySelectorAll('[data-aff]').forEach(b=>b.addEventListener('click',()=>afficheAff(b.dataset.aff)));
afficheAff('chaine');
// --- Recherche dans le registre historique ---
const champR=document.getElementById('recherche-registre'),compteR=document.getElementById('compte-registre');
function filtreRegistre(){
  if(!champR)return;
  const q=champR.value.trim().toLowerCase();let visibles=0;
  document.querySelectorAll('#registre-historique .entree').forEach(e=>{
    const ok=!q||e.textContent.toLowerCase().includes(q);
    e.style.display=ok?'':'none';if(ok)visibles++;
  });
  document.querySelectorAll('#registre-historique .groupe-date').forEach(g=>{
    let n=g.nextElementSibling,visible=false;
    while(n&&!n.classList.contains('groupe-date')){if(n.classList.contains('entree')&&n.style.display!=='none')visible=true;n=n.nextElementSibling}
    g.style.display=visible?'':'none';
  });
  if(compteR)compteR.textContent=q?visibles+' entrée(s) sur 11 correspondent à « '+champR.value.trim()+' ».':'';
}
if(champR){champR.addEventListener('input',filtreRegistre);
  const obs=new MutationObserver(()=>filtreRegistre());
  obs.observe(document.getElementById('registre-historique'),{childList:true});}

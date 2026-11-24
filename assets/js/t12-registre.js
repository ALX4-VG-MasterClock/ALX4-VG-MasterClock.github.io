/* Refonte A — bloc « registre » extrait de l'ancien bloc utilitaires/outils
   du fichier unique (découpage à ses frontières de sections, texte conservé). */
// ---------- Registre historique : présentation refondue ----------
const TITRES={
 1:{t:"La question fondatrice",o:"La première donnée stabilisée du registre : la question qui ouvre le chantier — le protocole proposé comme réponse à l'entropie de l'intelligence artificielle. Ce sceau établit que cette formulation existait, sous cette forme exacte, à cet instant."},
 2:{t:"Axe de convergence alpha",o:"Une note de cadrage déposée quelques minutes plus tard : l'alignement des structures sous l'indice constant Phi."},
 3:{t:"Un point d'interrogation",o:"Le dépôt minimal du registre : un seul caractère. Il établit qu'aucun contenu n'est trop petit pour recevoir un sceau complet — et revérifiable."},
 4:{t:"La latence de nos discussions",o:"Une question de mesure, déposée telle quelle : le texte source conserve l'orthographe et le saut de ligne d'origine."},
 5:{t:"L'harmonisation de l'entropie systémique",o:"La formulation-programme du protocole, déposée le même jour."},
 6:{t:"Fin de la phase de test du registre",o:"Deux jours après l'ouverture, cette entrée clôt la phase d'essai : le registre passe des tests aux dépôts."},
 7:{t:"Commencement des dépôts de preuves d'antériorité",o:"L'annonce du passage aux preuves d'antériorité de propriété intellectuelle : le registre devient un instrument de dépôt daté."},
 8:{t:"Le Mémorandum Technique",o:"Le dépôt le plus substantiel de juillet : un script Python complet et le texte du Mémorandum Technique qu'il met en hachage. Le détail dépliable conserve le texte intégral, tel que déposé."},
 9:{t:"Une empreinte pour contenu",o:"Le contenu déposé est lui-même un hachage SHA-256 : une empreinte peut être la matière d'un sceau, et recevoir à son tour une date prouvable."},
 10:{t:"La divulgation intégrale #V-G-ULTIMA-S10",o:"Une synthèse consolidée, rédigée dans le fil de travail de l'époque et déposée telle quelle, avec son propre hachage interne. Le texte intégral est dans le détail dépliable."},
 11:{t:"Le digest cumulé de la chaîne de l'agente",o:"Le pont entre ce site et la chaîne vivante : le contenu déposé est le digest cumulé de la chaîne au maillon n° 2143 — l'empreinte de 2 143 maillons, déposée publiquement."}
};
function fmtDate(iso){
  const d=new Date(iso);
  return d.toLocaleDateString('fr-CA',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})+' · '+iso.slice(11,19)+' UTC';
}
function jourLabel(iso){
  return new Date(iso).toLocaleDateString('fr-CA',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
}
fetch('assets/registre-historique.json').then(r=>r.json()).then(liste=>{
  const zone=$('registre-historique');let html='',jour='';
  liste.forEach(e=>{
    const j=jourLabel(e.horodatage_calcul_retrouve);
    if(j!==jour){jour=j;html+='<div class="groupe-date">'+esc(j)+'</div>'}
    const meta=TITRES[e.id]||{t:'Dépôt n° '+e.id,o:''};
    html+='<article class="entree" id="sceau-'+e.id+'">'
      +'<h3>'+esc(meta.t)+'</h3>'
      +'<p class="date">Sceau n° '+e.id+' — calculé le '+fmtDate(e.horodatage_calcul_retrouve)+'</p>'
      +'<p class="objet">'+esc(meta.o)+'</p>'
      +'<div class="statut-ligne"><span class="pastille">Vérifié — MATCH</span><span class="petite">Recalculé le 29 octobre 2026 · recette publique : SHA-256( texte + 1,61803398875 + horodatage du calcul )</span></div>'
      +'<div class="sceau-boite"><span class="mono">'+esc(e.sceau)+'</span></div>'
      +'<div class="actions">'
      +'<button class="mini" data-copier="'+e.id+'">Copier le sceau</button>'
      +'<button class="mini" data-verifier="'+e.id+'">Vérifier ce sceau</button>'
      +'</div>'
      +'<details><summary>Texte source et données complètes</summary><div class="corps-detail">'
      +'<div class="source-texte">'+esc(e.texte)+'</div>'
      +'<p class="petite" style="margin-top:.7rem">Horodatage du calcul (retrouvé à la milliseconde) : <span class="mono">'+esc(e.horodatage_calcul_retrouve)+'</span><br>'
      +'Horodatage serveur du dépôt : <span class="mono">'+esc(e.horodatage_serveur)+'</span><br>'
      +'Statut consigné : '+esc(e.statut)+'</p>'
      +'</div></details></article>';
  });
  zone.innerHTML=html;
  zone.querySelectorAll('[data-copier]').forEach(b=>b.addEventListener('click',()=>{
    const e=liste.find(x=>x.id===+b.dataset.copier);
    const fait=()=>{b.textContent='Copié ✓';setTimeout(()=>b.textContent='Copier le sceau',1800)};
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(e.sceau).then(fait).catch(fait)}else{fait()}
  }));
  zone.querySelectorAll('[data-verifier]').forEach(b=>b.addEventListener('click',()=>{
    const e=liste.find(x=>x.id===+b.dataset.verifier);
    /* Refonte A — le vérificateur vit sur sa propre page : le témoin passe
       par la mémoire locale du navigateur, la page Vérifier le reprend. */
    try{localStorage.setItem('verification-en-attente',JSON.stringify({texte:e.texte,horo:e.horodatage_calcul_retrouve,sceau:e.sceau,phi:true}));}catch(err){}
    location.href='verifier.html';
  }));
}).catch(()=>{$('registre-historique').innerHTML='<p class="petite">Le registre historique ne s\u2019est pas chargé depuis ce navigateur. Ses onze entrées, leurs textes et leurs sceaux sont conservés dans le dossier (fichier registre-historique.json du site) et restent recalculables avec la recette publique ci-dessus.</p>'});

/* Refonte A — reprise du « geste preuve » déposé depuis une autre page. */
(function(){
  var id=null;
  try{ id=sessionStorage.getItem('geste-preuve'); if(id)sessionStorage.removeItem('geste-preuve'); }catch(e){}
  if(!id) return;
  var essais=0;
  var iv=setInterval(function(){
    var b=document.querySelector('[data-verifier="'+id+'"]'); essais++;
    if(b){ clearInterval(iv); b.scrollIntoView({behavior:'smooth',block:'center'}); setTimeout(function(){b.click();},450); }
    else if(essais>25) clearInterval(iv);
  },300);
})();

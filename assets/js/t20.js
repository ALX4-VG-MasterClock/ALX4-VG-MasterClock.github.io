
/* ===== v9 — Recherche locale : sections, sceaux publics, journal, articles =====
   Recherche réelle sur les données du paquet, en statique, dans le navigateur.
   La recherche web en direct exige un relais : elle est annoncée « en préparation »,
   jamais simulée (voir l'onglet Rechercher). */
(function(){
  'use strict';
  var q=document.getElementById('rech-q'), btn=document.getElementById('rech-btn'),
      etat=document.getElementById('rech-etat'), zone=document.getElementById('rech-resultats');
  if(!q) return;
  function esc(t){return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function norm(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
  var INDEX=[
    {titre:'Accueil — le site branché en direct, trois foyers',panneau:'accueil',ancre:'direct',extrait:'GitHub, Wayback Machine, ORCID et Bitcoin lus en direct ; le site se recalcule lui-même.',mots:'direct foyers github wayback bitcoin orcid sceau version'},
    {titre:'Méthode — les trois gestes, anatomie d\u2019un maillon',panneau:'methode',ancre:'methode',extrait:'Sceller, revérifier, ancrer ; la somme du précédent (25 février 2026).',mots:'methode sceller reverifier ancrer somme precedent fibonacci'},
    {titre:'Le cerveau coquillage numérique',panneau:'methode',ancre:'coquillage',extrait:'Conversation, couche, sceau cumulatif, revérification, état comme somme ; digest cumulé affiché.',mots:'coquillage cerveau chaine digest cumulatif etat somme maillons match'},
    {titre:'Tout vérifier ici — chaque affirmation, sa preuve',panneau:'verifier',ancre:'tout-verifier',extrait:'Affirmation par affirmation : pièce du registre, moyen de recalcul, capture datée.',mots:'verifier preuve piece recalcul capture temoignage'},
    {titre:'Ancrage — empreintes publiques, archives du site',panneau:'ancrage',ancre:'archives',extrait:'RFC 3161, OpenTimestamps dans Bitcoin, captures Wayback du site version par version.',mots:'ancrage rfc3161 opentimestamps bitcoin wayback archives captures'},
    {titre:'Registre — les onze sceaux publics',panneau:'registre',ancre:null,extrait:'Les dépôts publics du site, recalculables un à un avec la recette publique.',mots:'registre sceaux publics anteriorite historique'},
    {titre:'Preuves — résultats mesurés et bornes',panneau:'preuves',ancre:null,extrait:'Ce qui tient, ce qui ne tient pas, et ce que le dossier ne prétend pas.',mots:'preuves resultats bornes defaillances sceptique'},
    {titre:'Parcours — chronologie de genèse',panneau:'parcours',ancre:null,extrait:'Les dates vérifiées au corpus : février–mars 2026, pas avril.',mots:'parcours chronologie genese dates 2026 corpus'},
    {titre:'Chercheur — profil ORCID',panneau:'chercheur',ancre:'chercheur',extrait:'Alexandre Vautour Gagnon, concepteur indépendant de systèmes et développeur, ORCID lu en direct.',mots:'chercheur orcid identite profil independent researcher'},
    {titre:'Droits et lois — établi et démarches en cours',panneau:'droits',ancre:'droits',extrait:'Tous droits réservés ; le mécanisme d\u2019antériorité ; les clauses à l\u2019étude, emplacements marqués.',mots:'droits lois copyright propriete intellectuelle anteriorite'},
    {titre:'Capsules — les vidéos du site',panneau:'capsules',ancre:'capsules',extrait:'La vidéo de présence en lecture intégrée ; emplacements des capsules à venir.',mots:'capsules videos presence sophia'},
    {titre:'Instance Souveraine — l\u2019IA en direct',panneau:'instance',ancre:null,extrait:'Poser une question à SoPHIa ; état du branchement dit honnêtement, aucune réponse simulée.',mots:'instance ia direct question sophia relais'},
    {titre:'Article — OpenAI, la sycophancie de GPT-4o (29 avril 2025)',panneau:'articles',ancre:'articles',extrait:'OpenAI retire une mise à jour devenue trop flatteuse mais insincère.',mots:'article openai sycophancy gpt-4o flatterie'},
    {titre:'Article — Sharma et al., Anthropic (2023)',panneau:'articles',ancre:'articles',extrait:'La sycophancie systématique de cinq assistants, mesurée.',mots:'article anthropic sharma sycophancy arxiv'},
    {titre:'Article — New York Times, les spirales (13 juin 2025)',panneau:'articles',ancre:'articles',extrait:'Des conversations prolongées qui alimentent des spirales délirantes documentées.',mots:'article nytimes hill chatgpt spirale delire'},
    {titre:'Article — Futurism, « ChatGPT psychosis » (28 juin 2025)',panneau:'articles',ancre:'articles',extrait:'Internements et incarcérations rapportés après des fixations sur le chatbot.',mots:'article futurism psychosis internement'},
    {titre:'Article — Simon Willison, le dossier mémoire (21 mai 2025)',panneau:'articles',ancre:'articles',extrait:'La mémoire de ChatGPT devient un dossier tenu par la plateforme.',mots:'article willison memoire dossier chatgpt asymetrie'},
    {titre:'Article — Qin et al., les traces altérables (2026)',panneau:'articles',ancre:'articles',extrait:'Des agents peuvent altérer leurs propres traces ; journalisation indépendante recommandée.',mots:'article qin traces agents arxiv piece 412'},
    {titre:'Article — Chain of Awareness (novembre 2025)',panneau:'articles',ancre:'articles',extrait:'Un protocole de mémoire vérifiable côté utilisateur existait — la revendication est resserrée.',mots:'article chain of awareness anteriorite piece 411 resserrement'},
    {titre:'Le Miroir — ce qu\'une visite révèle',panneau:'miroir',ancre:null,extrait:'Ton relevé, calculé chez toi : ce que ton navigateur montre, en mode local ou en démonstration avec serveurs — et l\'écho, ce qu\'un vrai serveur reçoit de toi.',mots:'miroir releve echo serveur local demonstration navigateur empreinte visite'},
    {titre:'Les deux modes — local, ou démonstration avec serveurs',panneau:'modes',ancre:null,extrait:'Le choix du mode, ses portes documentées nommées avant l\'activation, et ce qui change — ou non — d\'un mode à l\'autre.',mots:'modes deux local serveur demonstration portes echo miroir'},
    {titre:'Le 51e État numérique — les données, l\'ADN numérique, le jumeau',panneau:'etat51',ancre:null,extrait:'Numériquement américain par les données, politiquement non : la récolte par les plateformes et les systèmes, l\'ADN numérique et le jumeau numérique, l\'étage État.',mots:'51e etat numerique americain donnees adn jumeau recolte gafam plateformes snowden prism cloud act'},
    {titre:'Partenaires et soutien — travailler avec l\'auteur',panneau:'partenaires',ancre:null,extrait:'Partenariats, kit de démarrage, accompagnement en tranches : les offres du site et leurs bornes, sans rien promettre qui ne soit signé.',mots:'partenaires soutien kit accompagnement tranches offres travailler auteur'},
    {titre:'Transparence — les flux de données de ce site',panneau:'transparence',ancre:null,extrait:'L\'inventaire complet des flux de données de ce site, fonction par fonction : données transmises, destinataire, déclencheur, conservation.',mots:'transparence flux donnees inventaire destinataire conservation github open-meteo relais'},
    {titre:'Qui surveille le surveillant ? Le SHA-256 — la formule d\u2019Alex',panneau:'temps',ancre:'temps',extrait:'La formule d\u2019Alex, en tête du panneau Temps et au pied de chaque page : la clause de gouvernance du système — lui, le Master Clock ; la réponse du protocole à la question de la surveillance : un calcul, pas une autorité.',mots:'surveille surveillant sha-256 formule alex master clock gouvernance surveillance pied page'}
  ];
  var prets={sections:INDEX.length,sceaux:0,journal:0};
  function majEtat(){
    etat.textContent='Index prêt : '+prets.sections+' sections et articles'
      +(prets.sceaux?' · '+prets.sceaux+' sceaux publics du registre':'')
      +(prets.journal?' · '+prets.journal+' entrées du journal':'')
      +'. Recherche web en direct : en préparation (voir ci-dessous).';
  }
  fetch('assets/registre-historique.json',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){
    (j.entrees||j||[]).forEach(function(e){
      if(!e||!e.texte)return;
      INDEX.push({titre:'Sceau public n° '+(e.id||'')+' du registre historique',panneau:'registre',ancre:null,extrait:String(e.texte).slice(0,140),mots:'sceau registre '+(e.sceau||'')});
    });
    prets.sceaux=(j.entrees||j||[]).length; majEtat();
  }).catch(function(){});
  fetch('assets/journal-mises-a-jour.json',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){
    ((j&&j.entrees)||[]).forEach(function(e){
      INDEX.push({titre:'Journal — '+(e.date||'')+' : '+(e.titre||''),panneau:'accueil',ancre:'journal',extrait:((e.points||[]).map(function(p){return p.texte||''}).join(' ')).slice(0,140),mots:'journal mise a jour site'});
    });
    prets.journal=((j&&j.entrees)||[]).length; majEtat();
  }).catch(function(){});
  majEtat();
  function chercher(){
    var terme=norm(q.value).trim();
    if(!terme){zone.innerHTML='<p class="petite">Écrivez un mot pour chercher dans les sections, les sceaux publics, le journal et les articles du site.</p>';return}
    var tous=INDEX.filter(function(e){return norm(e.titre+' '+e.extrait+' '+(e.mots||'')).indexOf(terme)>-1});
    var res=tous.slice(0,20);
    if(!res.length){zone.innerHTML='<p class="petite" role="status">0 résultat dans le site pour « '+esc(q.value)+' ». La recherche web en direct est en préparation — elle n\u2019est pas simulée ici.</p>';return}
    zone.innerHTML='<p class="petite" role="status">'+tous.length+' résultat'+(tous.length>1?'s':'')+' dans le site pour « '+esc(q.value)+' »'+(tous.length>20?' — les 20 premiers sont montrés':'')+'.</p>'+res.map(function(e,i){
      return '<button class="rech-resultat" data-i="'+INDEX.indexOf(e)+'"><span class="r-titre">'+esc(e.titre)+'</span><br><span class="r-extrait">'+esc(e.extrait)+'</span></button>';
    }).join('');
    zone.querySelectorAll('.rech-resultat').forEach(function(b){b.addEventListener('click',function(){
      var e=INDEX[+b.getAttribute('data-i')]; if(!e)return;
      if(window.ouvrirPanneau)ouvrirPanneau(e.panneau);
      if(e.ancre){var c=document.getElementById(e.ancre); if(c)setTimeout(function(){c.scrollIntoView({behavior:'smooth'})},120)}
    })});
  }
  btn.addEventListener('click',chercher);
  q.addEventListener('keydown',function(e){if(e.key==='Enter')chercher()});
})();


/* ===== v26 — « Le cerveau visible » : graphe du coffre, recherche par connexions, désaccords, épreuve publique =====
   Une seule lecture de assets/coffre.json alimente le graphe, la demande, les désaccords et l'épreuve.
   Tout est calculé dans le navigateur ; aucune donnée ne part vers un serveur. */
(function(){
  var $=function(id){return document.getElementById(id)};
  var svg=$('graphe-svg'); if(!svg) return;
  var NS='http://www.w3.org/2000/svg';
  var COULEURS={'se-relie-a':'#63cfa5','alimente':'#35c08b','gouverne':'#d4af37','atteste':'#e9cd77','decrit':'#7fb3d5','trace':'#a9bfa9','suit':'#f2c14e','est-decrite-par':'#4dd0e1','precede':'#b39ddb','prouve':'#ff9f68','contredit':'#ff3860','corrige':'#ff6b6b','repond-a':'#dce775'};
  var LIBELLES={'se-relie-a':'se relie à','alimente':'alimente','gouverne':'gouverne','atteste':'atteste','decrit':'décrit','trace':'trace','suit':'suit','est-decrite-par':'est décrite par','precede':'précède','prouve':'prouve','contredit':'contredit','corrige':'corrige','repond-a':'répond à'};
  var COURTS={'piece-01':'Pièce nº 1','piece-02':'Pièce nº 2','piece-03':'Pièce nº 3','piece-04':'Pièce nº 4','piece-05':'Pièce nº 5','piece-06':'Pièce nº 6','piece-07':'Pièce nº 7','piece-08':'Pièce nº 8','piece-09':'Pièce nº 9','piece-10':'Pièce nº 10','piece-11':'Pièce nº 11'};
  function couleur(t){return COULEURS[t]||'#8a9a8a';}
  function libelle(t){return LIBELLES[t]||t;}
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function tronque(s){return (typeof s==='string'&&s.length>16)?s.slice(0,16)+'…':s;}
  function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  var coffre=null, parId={}, positions={};

  function voisins(id){
    var sortants=[], entrants=[];
    (parId[id].connexions||[]).forEach(function(c){ sortants.push(c); });
    coffre.entrees.forEach(function(e){ (e.connexions||[]).forEach(function(c){ if(c.vers===id) entrants.push({type:c.type, de:e.id}); }); });
    return {sortants:sortants, entrants:entrants};
  }
  function nomCible(id){ return parId[id] ? parId[id].titre : (id==='coffre-lui-meme' ? 'le coffre lui-même (hors graphe : le coffre se décrit lui-même)' : id); }

  function selectionner(id){
    var e=parId[id]; if(!e) return;
    var noeuds=svg.querySelectorAll('.graphe-noeud');
    for(var i=0;i<noeuds.length;i++){ noeuds[i].classList.toggle('actif', noeuds[i].getAttribute('data-id')===id); }
    var v=voisins(id), html='<h4>'+esc(e.titre)+'</h4>';
    html+='<p class="petite">'+esc(e.classe)+' — identifiant : <span class="mono">'+esc(e.id)+'</span></p>';
    html+='<p class="empreinte">Empreinte de la pièce : '+esc(tronque(e.sha256))+' · Taille : '+e.octets+' octets · Classe : '+esc(e.classe)+'</p>';
    if(v.sortants.length){
      html+='<p class="petite">Connexions sortantes : '+v.sortants.map(function(c){return esc(libelle(c.type))+' → '+esc(nomCible(c.vers));}).join(' · ')+'</p>';
    } else { html+='<p class="petite">Connexions sortantes : aucune.</p>'; }
    if(v.entrants.length){
      html+='<p class="petite">Connexions entrantes : '+v.entrants.map(function(c){return esc(parId[c.de].titre)+' —'+esc(libelle(c.type))+'→ cette pièce';}).join(' · ')+'</p>';
    } else { html+='<p class="petite">Connexions entrantes : aucune.</p>'; }
    $('graphe-cartouche').innerHTML=html;
  }

  function dessiner(){
    var entrees=coffre.entrees, n=entrees.length, cx=360, cy=255, R=185;
    entrees.forEach(function(e,i){
      var a=(-90+i*360/n)*Math.PI/180;
      positions[e.id]={x:cx+R*Math.cos(a), y:cy+R*Math.sin(a)};
    });
    /* liens d'abord, sous les nœuds */
    entrees.forEach(function(e){
      (e.connexions||[]).forEach(function(c){
        if(!positions[c.vers]) return; /* cible hors graphe : dite au cartouche, pas dessinée */
        var l=document.createElementNS(NS,'line');
        l.setAttribute('x1',positions[e.id].x); l.setAttribute('y1',positions[e.id].y);
        l.setAttribute('x2',positions[c.vers].x); l.setAttribute('y2',positions[c.vers].y);
        l.setAttribute('stroke',couleur(c.type)); l.setAttribute('class','graphe-lien');
        var t=document.createElementNS(NS,'title'); t.textContent=libelle(c.type)+' : '+e.id+' → '+c.vers; l.appendChild(t);
        svg.appendChild(l);
      });
    });
    /* nœuds */
    entrees.forEach(function(e,i){
      var g=document.createElementNS(NS,'g');
      g.setAttribute('class','graphe-noeud'); g.setAttribute('data-id',e.id);
      g.setAttribute('tabindex','0'); g.setAttribute('role','button');
      g.setAttribute('aria-label','Pièce : '+e.titre);
      var c=document.createElementNS(NS,'circle');
      c.setAttribute('cx',positions[e.id].x); c.setAttribute('cy',positions[e.id].y); c.setAttribute('r','25');
      g.appendChild(c);
      var num=document.createElementNS(NS,'text');
      num.setAttribute('x',positions[e.id].x); num.setAttribute('y',positions[e.id].y+5); num.setAttribute('class','graphe-num');
      num.textContent=(i+1); g.appendChild(num);
      var tx=document.createElementNS(NS,'text');
      tx.setAttribute('x',positions[e.id].x); tx.setAttribute('y',positions[e.id].y+43); tx.setAttribute('class','graphe-texte');
      tx.textContent=COURTS[e.id]||e.id; g.appendChild(tx);
      g.addEventListener('click',function(){selectionner(e.id);});
      g.addEventListener('keydown',function(ev){ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); selectionner(e.id); } });
      svg.appendChild(g);
    });
    /* légende : les types réellement présents, comptés */
    var comptes={};
    entrees.forEach(function(e){ (e.connexions||[]).forEach(function(c){ comptes[c.type]=(comptes[c.type]||0)+1; }); });
    var html='';
    Object.keys(comptes).sort().forEach(function(t){
      html+='<span class="pastille-lien"><span class="trait-lien" style="border-top-color:'+couleur(t)+'"></span>'+esc(libelle(t))+' ('+comptes[t]+')</span>';
    });
    $('graphe-legende').innerHTML=html;
    $('graphe-etat').textContent='Graphe dessiné à l\'instant depuis assets/coffre.json : '+n+' pièces, '+Object.keys(comptes).reduce(function(s,k){return s+comptes[k];},0)+' connexions consignées (celles dont la cible est une pièce du coffre sont dessinées ; toute cible extérieure est dite au cartouche).';
  }

  function desaccords(){
    var liens=[], marquees=[];
    coffre.entrees.forEach(function(e){
      (e.connexions||[]).forEach(function(c){ if(c.type==='contredit') liens.push({de:e, c:c}); });
      if(/contest/i.test(e.classe)) marquees.push(e);
    });
    if(!liens.length && !marquees.length){
      $('desaccords-etat').textContent='Vérifié en direct à l\'instant depuis assets/coffre.json : 0 connexion « contredit », 0 pièce « contesté ».';
      return;
    }
    var html='';
    liens.forEach(function(x){
      var cible=parId[x.c.vers];
      html+='<p><strong>Contradiction consignée</strong> : '+esc(x.de.titre)+' —contredit→ '+esc(cible?cible.titre:x.c.vers)+'.</p>';
    });
    marquees.forEach(function(e){ html+='<p><strong>Pièce marquée « contesté »</strong> : '+esc(e.titre)+' ('+esc(e.classe)+').</p>'; });
    html+='<p class="petite">Vérifié en direct à l\'instant depuis assets/coffre.json. La tension est consignée, jamais lissée : les originaux ne sont pas réécrits.</p>';
    $('desaccords-contenu').innerHTML=html;
  }

  function demander(){
    var zone=$('demande-resultats');
    if(!coffre){ zone.innerHTML='<p class="petite">Le coffre n\'a pas pu être chargé — la demande est impossible en direct. Le graphe ci-dessus dit son repli.</p>'; return; }
    var q=norm($('demande-champ').value).trim();
    if(!q){ zone.innerHTML='<p class="petite">Écrivez un mot pour demander au cerveau.</p>'; return; }
    var trouves=coffre.entrees.filter(function(e){
      return norm(e.id).indexOf(q)>=0 || norm(e.titre).indexOf(q)>=0;
    });
    if(!trouves.length){
      zone.innerHTML='<p>Aucune pièce ne correspond à « '+esc($('demande-champ').value)+' » dans le coffre — la recherche porte sur l\'identifiant, le titre et le résumé des '+coffre.entrees.length+' pièces.</p>';
      return;
    }
    var html='<p class="petite">'+trouves.length+' pièce(s) trouvée(s), avec leurs voisins directs :</p>';
    trouves.forEach(function(e){
      var v=voisins(e.id);
      html+='<div class="demande-piece"><h5>'+esc(e.titre)+'</h5><p>'+esc(e.classe)+'</p>';
      if(v.sortants.length) html+='<p class="petite">Il tient à : '+v.sortants.map(function(c){return esc(libelle(c.type))+' → '+esc(nomCible(c.vers));}).join(' · ')+'</p>';
      if(v.entrants.length) html+='<p class="petite">Tient à lui : '+v.entrants.map(function(c){return esc(parId[c.de].titre)+' —'+esc(libelle(c.type))+'→';}).join(' · ')+'</p>';
      if(!v.sortants.length && !v.entrants.length) html+='<p class="petite">Aucun voisin direct consigné.</p>';
      html+='</div>';
    });
    zone.innerHTML=html;
  }

  function epreuve(){
    var etat=$('epreuve-etat');
    if(!coffre){
      etat.textContent='Le coffre n\'est pas encore lu — nouvelle lecture…';
      fetch('assets/coffre.json').then(function(r){ if(!r.ok) throw new Error('coffre illisible'); return r.json(); })
      .then(function(c){ appliquer(c); verifier(); })
      .catch(function(){ etat.textContent='Le coffre n\'a pas pu être lu depuis votre navigateur — la vérification des questions 1 et 2 est impossible en direct.'; });
      return;
    }
    verifier();
  }

  function verifier(){
    var etat=$('epreuve-etat'), zone=$('epreuve-resultats'), scoreEl=$('epreuve-score');
    var attendus=[
      coffre.digest_maitre.toLowerCase(),
      String(coffre.entrees.length),
      ($('sceau-version-affiche').textContent||'').trim().toLowerCase()
    ];
    var recus=[
      $('epreuve-q1').value.trim().toLowerCase(),
      String(parseInt($('epreuve-q2').value,10)),
      $('epreuve-q3').value.trim().toLowerCase()
    ];
    var questions=['digest maître du coffre','nombre de pièces du coffre','sceau canonique de la version lue'];
    var score=0, html='';
    for(var i=0;i<3;i++){
      var juste=(recus[i]===attendus[i]);
      if(juste) score++;
      html+='<p>Question '+(i+1)+' ('+questions[i]+') — '+(juste
        ? '<span class="verdict-juste">juste ✓</span>'
        : '<span class="verdict-ecart">écart ✗</span> — bonne réponse : <span class="mono">'+esc(attendus[i])+'</span>')+'</p>';
    }
    zone.innerHTML=html;
    scoreEl.hidden=false;
    scoreEl.textContent='Score : '+score+' / 3 — '+(score===3
      ? 'le cerveau s\'est transmis entier, par recalcul.'
      : 'chaque bonne réponse ci-dessus est publique : elle se retrouve sans croire personne, en recalculant.');
    etat.textContent='Vérifié à l\'instant, dans votre navigateur, depuis assets/coffre.json et le sceau affiché.';
  }

  $('demande-btn').addEventListener('click',demander);
  $('demande-champ').addEventListener('keydown',function(ev){ if(ev.key==='Enter'){ ev.preventDefault(); demander(); } });
  $('epreuve-btn').addEventListener('click',epreuve);

  function appliquer(c){
    coffre=c;
    c.entrees.forEach(function(e){ parId[e.id]=e; });
    dessiner();
    desaccords();
  }

  /* Peinture d'abord : la lecture du coffre (graphe, désaccords, épreuve)
     part après la peinture, à l'ouverture du panneau Mémoire. */
  function chargerCoffre(){
  fetch('assets/coffre.json').then(function(r){ if(!r.ok) throw new Error('coffre illisible'); return r.json(); })
  .then(appliquer)
  .catch(function(){
    var zone=$('graphe-zone'), repli=$('graphe-repli');
    if(zone) zone.hidden=true;
    if(repli) repli.hidden=false;
    $('graphe-etat').textContent='La lecture de assets/coffre.json n\'a pas abouti depuis votre navigateur — graphe non chargé, liste de repli ci-dessous.';
    $('desaccords-etat').textContent='Lecture en direct impossible depuis votre navigateur ; le relevé ci-dessus est celui de la construction (2 novembre 2026) : 0 connexion « contredit », 0 pièce « contesté ».';
    $('epreuve-etat').textContent='Lecture de assets/coffre.json en cours ou impossible — la vérification se relancera au clic si le fichier devient lisible.';
  });
  }
  if(window.definirInitPanneau)definirInitPanneau('memoire',chargerCoffre);else chargerCoffre();
})();

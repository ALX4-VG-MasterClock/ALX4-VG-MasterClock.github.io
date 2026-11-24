
/* ===== v35 — « L'arbre et l'archive » : racine de Merkle du coffre, épreuve d'appartenance, sceau de génération ===== */
(function(){
  function el(id){return document.getElementById(id);}
  function hex(buf){var u=new Uint8Array(buf),s='';for(var i=0;i<u.length;i++){s+=('0'+u[i].toString(16)).slice(-2);}return s;}
  function h256(t){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)).then(hex);}
  function h512(t){return crypto.subtle.digest('SHA-512',new TextEncoder().encode(t)).then(hex);}
  var etatMerkle=el('merkle-etat'), verdict=el('merkle-verdict'), chemin=el('merkle-chemin');
  /* --- Sceau de génération : calculé à l'affichage, depuis les ingrédients publics --- */
  var blocGen=el('sceau-generation'), affiche=el('sceau-version-affiche'), racineAffichee=el('merkle-racine'), valGen=el('sceau-generation-valeur');
  if(blocGen&&affiche&&valGen&&window.crypto&&crypto.subtle){
    var racineTxt=(racineAffichee?racineAffichee.textContent:'').trim().toLowerCase();
    h512((affiche.textContent||'').trim().toLowerCase()+' | '+racineTxt+' | '+(blocGen.getAttribute('data-digest')||'')).then(function(g){
      valGen.textContent=g;
    }).catch(function(){});
  }
  /* --- Arbre de Merkle : recalcul en direct depuis assets/coffre.json --- */
  if(!etatMerkle||!(window.crypto&&crypto.subtle)){
    if(etatMerkle)etatMerkle.textContent='Relevé statique ci-dessus, vérifié à la construction ; le recalcul en direct demande Web Crypto (contexte sécurisé).';
    return;
  }
  var arbre=null; /* {feuilles:[{id,titre,empreinte,digest}], niveaux:[[..],..], racine} */
  function construireArbre(entrees){
    var promesses=entrees.map(function(e){return h256(e.sha256).then(function(d){return {id:e.id,titre:e.titre,empreinte:e.sha256,digest:d};});});
    return Promise.all(promesses).then(function(feuilles){
      var niveaux=[feuilles.map(function(f){return f.digest;})];
      function pas(){
        var niv=niveaux[niveaux.length-1];
        if(niv.length<=1)return Promise.resolve();
        var suiv=[];
        function paire(i){
          if(i>=niv.length)return Promise.resolve();
          var g=niv[i], d=(i+1<niv.length)?niv[i+1]:niv[i];
          return h256(g+d).then(function(x){suiv.push(x);return paire(i+2);});
        }
        return paire(0).then(function(){niveaux.push(suiv);return pas();});
      }
      return pas().then(function(){return {feuilles:feuilles,niveaux:niveaux,racine:niveaux[niveaux.length-1][0]};});
    });
  }
  /* Peinture d'abord : le recalcul de l'arbre part après la peinture,
     à l'ouverture du panneau Mémoire. */
  function chargerMerkle(){
  fetch('assets/coffre.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('coffre illisible');return r.json();}).then(function(coffre){
    return construireArbre(coffre.entrees);
  }).then(function(a){
    arbre=a;
    var racineCalc=a.racine, racineAff=(racineAffichee?racineAffichee.textContent:'').trim().toLowerCase();
    if(racineCalc===racineAff){
      etatMerkle.textContent='Revérifié en direct à l\'instant, dans votre navigateur, depuis assets/coffre.json : '+a.feuilles.length+' feuilles, profondeur '+(a.niveaux.length-1)+', racine recalculée = racine affichée — MATCH.';
    }else{
      etatMerkle.textContent='ÉCART : la racine recalculée depuis assets/coffre.json ('+racineCalc+') diffère de la racine affichée ('+racineAff+'). L\'écart est dit, pas maquillé.';
    }
    var sel=el('merkle-choix');
    if(sel&&!sel.options.length){
      a.feuilles.forEach(function(f){var o=document.createElement('option');o.value=f.id;o.textContent=f.titre;sel.appendChild(o);});
    }
  }).catch(function(){
    etatMerkle.textContent='La lecture de assets/coffre.json n\'a pas abouti depuis votre navigateur — relevé statique ci-dessus, vérifié à la construction.';
  });
  }
  if(window.definirInitPanneau)definirInitPanneau('memoire',chargerMerkle);else chargerMerkle();
  function recalculerChemin(){
    if(!arbre){if(verdict)verdict.textContent='L\'arbre n\'est pas encore recalculé — la lecture de assets/coffre.json est en cours ou n\'a pas abouti.';return;}
    var sel=el('merkle-choix'); if(!sel)return;
    var idx=-1,i;
    for(i=0;i<arbre.feuilles.length;i++){if(arbre.feuilles[i].id===sel.value){idx=i;break;}}
    if(idx<0)return;
    var f=arbre.feuilles[idx], courant=f.digest, html='<p class="petite">Feuille « '+f.id+' » — empreinte <span class="mono">'+f.empreinte+'</span><br>Digest de feuille (SHA-256 de l\'empreinte) : <span class="mono">'+courant+'</span></p>', pos=idx, niv;
    for(niv=0;niv<arbre.niveaux.length-1;niv++){
      var niveau=arbre.niveaux[niv], frere, cote;
      if(pos%2===0){ frere=(pos+1<niveau.length)?niveau[pos+1]:niveau[pos]; cote=(pos+1<niveau.length)?'à droite':'à droite (duplication du dernier digest, niveau impair)'; }
      else{ frere=niveau[pos-1]; cote='à gauche'; }
      var parent=arbre.niveaux[niv+1][Math.floor(pos/2)];
      html+='<p class="petite">Niveau '+niv+' → '+(niv+1)+' : frère '+cote+' <span class="mono">'+frere+'</span> → nœud <span class="mono">'+parent+'</span></p>';
      courant=parent; pos=Math.floor(pos/2);
    }
    if(chemin)chemin.innerHTML=html;
    if(verdict){
      if(courant===arbre.racine&&courant===(racineAffichee?racineAffichee.textContent:'').trim().toLowerCase()){
        verdict.textContent='MATCH — le chemin de « '+f.id+' » aboutit à la racine affichée : la pièce appartient à l\'ensemble scellé.';
      }else{
        verdict.textContent='ÉCART — le chemin recalculé aboutit à '+courant+', qui diffère de la racine affichée. L\'écart est dit, pas maquillé.';
      }
    }
  }
  var btn=el('merkle-btn'); if(btn)btn.addEventListener('click',recalculerChemin);
  var sel2=el('merkle-choix'); if(sel2)sel2.addEventListener('change',function(){if(chemin)chemin.innerHTML='';if(verdict)verdict.textContent='';});
})();

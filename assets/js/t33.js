
// ---------- v29 — Transmission : démonstration « Essaie la chaîne » ----------
// Tout se calcule dans le navigateur du visiteur (Web Crypto) : aucun appel
// réseau, aucune écriture localStorage. La chaîne vit en mémoire seulement,
// le temps de la page. Genèse : SHA-256 de « TRANSMISSION|genese ».
(function(){
  var GENESE_TEXTE='TRANSMISSION|genese';
  var etat={entrees:[],digest:null};
  function transmissionHacher(texte){
    var buf=new TextEncoder().encode(texte);
    return crypto.subtle.digest('SHA-256',buf).then(function(h){
      var b=new Uint8Array(h),hex='';
      for(var i=0;i<b.length;i++){hex+=('0'+b[i].toString(16)).slice(-2);}
      return hex;
    });
  }
  function transmissionDigestInitial(){
    return transmissionHacher(GENESE_TEXTE);
  }
  function transmissionScellerTexte(texte){
    return transmissionHacher(texte).then(function(sceau){
      return transmissionHacher(etat.digest+sceau).then(function(digest){
        var entree={numero:etat.entrees.length+1,texte:texte,sceau:sceau};
        etat.entrees.push(entree);
        etat.digest=digest;
        return entree;
      });
    });
  }
  function transmissionReverifier(){
    return transmissionDigestInitial().then(function(d){
      var chaine=Promise.resolve({digest:d,ecart:0});
      etat.entrees.forEach(function(e,idx){
        chaine=chaine.then(function(acc){
          if(acc.ecart)return acc;
          return transmissionHacher(e.texte).then(function(sceau){
            if(sceau!==e.sceau)return {digest:acc.digest,ecart:idx+1};
            return transmissionHacher(acc.digest+sceau).then(function(nd){
              return {digest:nd,ecart:0};
            });
          });
        });
      });
      return chaine.then(function(acc){
        if(acc.ecart)return {ok:false,ecart:acc.ecart,digest:acc.digest};
        var ok=acc.digest===etat.digest;
        return {ok:ok,ecart:ok?0:-1,digest:acc.digest};
      });
    });
  }
  if(typeof window!=='undefined'){
    window.TransmissionDemo={etat:etat,hacher:transmissionHacher,digestInitial:transmissionDigestInitial,scellerTexte:transmissionScellerTexte,reverifier:transmissionReverifier};
  }
  if(typeof document!=='undefined'&&document.getElementById){
    var zoneTexte=document.getElementById('transmission-texte');
    if(zoneTexte){
      var elDigest=document.getElementById('transmission-digest'),
          elListe=document.getElementById('transmission-liste'),
          elVerdict=document.getElementById('transmission-verdict'),
          elInd=document.getElementById('transmission-indispo'),
          bSceller=document.getElementById('btn-transmission-sceller'),
          bRever=document.getElementById('btn-transmission-reverifier');
      if(!(typeof crypto!=='undefined'&&crypto.subtle)){
        if(elInd){
          elInd.style.display='block';
          elInd.textContent='La démonstration ne peut pas calculer ici : Web Crypto (crypto.subtle) est indisponible dans ce contexte — elle exige une page servie en contexte sécurisé (HTTPS). Rien n’a été calculé, rien n’a été envoyé.';
        }
        if(bSceller)bSceller.disabled=true;
        if(bRever)bRever.disabled=true;
        if(elDigest)elDigest.textContent='indisponible (Web Crypto absente)';
      } else {
        transmissionDigestInitial().then(function(d){
          etat.digest=d;
          if(elDigest)elDigest.textContent=d;
        });
        if(bSceller)bSceller.addEventListener('click',function(){
          var t=zoneTexte.value;
          if(!t||!t.trim()){if(elVerdict)elVerdict.textContent='Écris d’abord un texte à sceller.';return;}
          if(!etat.digest){if(elVerdict)elVerdict.textContent='La genèse se calcule — réessaie dans un instant.';return;}
          transmissionScellerTexte(t).then(function(e){
            if(elListe){
              var li=document.createElement('li');
              var titre=document.createElement('span');
              titre.className='t-num';
              titre.textContent='nº '+e.numero+' — ';
              li.appendChild(titre);
              li.appendChild(document.createTextNode(e.texte.length>80?e.texte.slice(0,80)+'…':e.texte));
              var sc=document.createElement('span');
              sc.className='mono t-sceau';
              sc.textContent='sceau : '+e.sceau;
              li.appendChild(sc);
              elListe.appendChild(li);
            }
            if(elDigest)elDigest.textContent=etat.digest;
            if(elVerdict)elVerdict.textContent='Entrée nº '+e.numero+' scellée — le digest cumulé a avancé.';
            zoneTexte.value='';
          });
        });
        if(bRever)bRever.addEventListener('click',function(){
          transmissionReverifier().then(function(r){
            if(!elVerdict)return;
            if(r.ok){elVerdict.textContent='MATCH — la chaîne entière se recalcule, de la genèse au digest affiché.';}
            else if(r.ecart>0){elVerdict.textContent='ÉCART — l’entrée nº '+r.ecart+' ne se recalcule pas : son sceau ne correspond plus à son texte.';}
            else{elVerdict.textContent='ÉCART — le digest recalculé ne correspond pas au digest affiché.';}
          });
        });
      }
    }
  }
})();

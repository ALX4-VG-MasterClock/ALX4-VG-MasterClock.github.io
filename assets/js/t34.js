
// ---------- v31 — Transmission : vérification d'un export du Cerveau coquillage ----------
// Le visiteur dépose ou colle un export JSON produit par la page autonome
// « Cerveau coquillage numérique » ; la chaîne de l'export est recalculée ici,
// selon la recette de cette page : genèse SHA-256 de « cerveau-coquillage/v1/genesis »,
// Hn = SHA-256(UTF-8("cerveau-coquillage/v1\n" + Hn-1 + "\n" + représentation canonique)).
// Tout se fait dans le navigateur : aucun appel réseau, aucune écriture
// localStorage. Le bloc de provenance de l'export est lu et résumé, mais il est
// DÉCLARATIF : il n'entre pas dans le calcul de la chaîne — voir la borne rendue
// avec chaque verdict.
(function(){
  var DOMAINE='cerveau-coquillage/v1';
  function vexportHacher(texte){
    var buf=new TextEncoder().encode(texte);
    return crypto.subtle.digest('SHA-256',buf).then(function(h){
      var b=new Uint8Array(h),hex='';
      for(var i=0;i<b.length;i++){hex+=('0'+b[i].toString(16)).slice(-2);}
      return hex;
    });
  }
  function vexportCanonique(r){
    return JSON.stringify({id:r.id,index:r.index,createdAt:r.createdAt,kind:r.kind,title:r.title,content:r.content,tags:r.tags,links:r.links});
  }
  function vexportAnalyserForme(d){
    if(!d||typeof d!=='object'||Array.isArray(d))return {ok:false,erreur:'Le contenu lu n’est pas un objet JSON d’export.'};
    if(d.format!=='cerveau-coquillage-numerique')return {ok:false,erreur:'Format non reconnu : « format » devrait valoir « cerveau-coquillage-numerique ».'};
    if(d.formatVersion!==1)return {ok:false,erreur:'Version de format non prise en charge : « formatVersion » devrait valoir 1.'};
    if(d.methodVersion!==DOMAINE)return {ok:false,erreur:'Version de méthode inattendue : « methodVersion » devrait valoir « '+DOMAINE+' ».'};
    if(!Array.isArray(d.records))return {ok:false,erreur:'« records » devrait être le tableau des enregistrements de l’export.'};
    return {ok:true};
  }
  function vexportProvenance(d){
    var p=(d&&typeof d==='object'&&!Array.isArray(d))?d.provenance:null;
    if(!p||typeof p!=='object'||Array.isArray(p))return {present:false};
    return {present:true,
      auteur:(typeof p.attributedAuthor==='string'&&p.attributedAuthor)||(typeof p.auteur_attribue==='string'&&p.auteur_attribue)||'',
      mention:(typeof p.rightsNotice==='string'&&p.rightsNotice)||(typeof p.mention==='string'&&p.mention)||'',
      borne:'Le bloc de provenance est déclaratif : il n’entre pas dans le calcul de la chaîne recalculée ici. Sa présence est constatée et son contenu résumé tel quel ; son intégrité n’est pas prouvée par ce calcul — un bloc de provenance modifié ne ferait pas échouer la revérification des enregistrements.'};
  }
  function vexportVerifier(d){
    var prov=vexportProvenance(d);
    var forme=vexportAnalyserForme(d);
    if(!forme.ok)return Promise.resolve({forme:false,erreur:forme.erreur,provenance:prov});
    var records=d.records,i,r,n;
    for(i=0;i<records.length;i++){
      r=records[i];n=i+1;
      if(!r||typeof r!=='object'||Array.isArray(r))
        return Promise.resolve({forme:true,chaine:'ECART',ecart:n,type:'structure',detail:'L’enregistrement nº '+n+' n’est pas un objet.',provenance:prov});
      if(r.index!==n)
        return Promise.resolve({forme:true,chaine:'ECART',ecart:n,type:'structure',detail:'Index non séquentiel à l’enregistrement nº '+n+' : « index » vaut '+JSON.stringify(r.index)+', attendu '+n+'.',provenance:prov});
      var idAttendu='node-'+('000000'+n).slice(-6);
      if(r.id!==idAttendu)
        return Promise.resolve({forme:true,chaine:'ECART',ecart:n,type:'structure',detail:'Identifiant inattendu à l’enregistrement nº '+n+' : « id » vaut '+JSON.stringify(r.id)+', attendu « '+idAttendu+' ».',provenance:prov});
      if(!Array.isArray(r.tags)||!Array.isArray(r.links))
        return Promise.resolve({forme:true,chaine:'ECART',ecart:n,type:'structure',detail:'« tags » et « links » doivent être des tableaux (enregistrement nº '+n+').',provenance:prov});
      for(var j=0;j<r.links.length;j++){
        var cible=r.links[j],trouve=false;
        for(var k=0;k<i;k++){if(records[k]&&records[k].id===cible){trouve=true;break;}}
        if(!trouve)
          return Promise.resolve({forme:true,chaine:'ECART',ecart:n,type:'structure',detail:'L’enregistrement nº '+n+' se relie à « '+cible+' », qui n’est pas un enregistrement antérieur.',provenance:prov});
      }
      if(typeof r.previousHash!=='string'||typeof r.hash!=='string')
        return Promise.resolve({forme:true,chaine:'ECART',ecart:n,type:'structure',detail:'« previousHash » et « hash » doivent être des chaînes (enregistrement nº '+n+').',provenance:prov});
    }
    return vexportHacher(DOMAINE+'/genesis').then(function(genese){
      var chaine=Promise.resolve({prev:genese,ecart:0,type:'',detail:''});
      records.forEach(function(r,idx){
        chaine=chaine.then(function(acc){
          if(acc.ecart)return acc;
          if(r.previousHash!==acc.prev)
            return {prev:acc.prev,ecart:idx+1,type:'previousHash',detail:'Le « previousHash » de l’enregistrement nº '+(idx+1)+' ne correspond pas à l’empreinte recalculée du maillon précédent.'};
          return vexportHacher(DOMAINE+'\n'+acc.prev+'\n'+vexportCanonique(r)).then(function(h){
            if(h!==r.hash)
              return {prev:acc.prev,ecart:idx+1,type:'hash',detail:'L’empreinte recalculée de l’enregistrement nº '+(idx+1)+' diffère de son « hash » consigné : le contenu ou l’ordre a changé depuis l’export.'};
            return {prev:h,ecart:0,type:'',detail:''};
          });
        });
      });
      return chaine.then(function(acc){
        var connexions=0;
        records.forEach(function(r){connexions+=r.links.length;});
        if(acc.ecart)
          return {forme:true,chaine:'ECART',ecart:acc.ecart,type:acc.type,detail:acc.detail,entrees:records.length,connexions:connexions,provenance:prov};
        return {forme:true,chaine:'MATCH',ecart:0,entrees:records.length,connexions:connexions,tete:acc.prev,provenance:prov};
      });
    });
  }
  if(typeof window!=='undefined'){
    window.VerifieExportCerveau={verifierExport:vexportVerifier,analyserForme:vexportAnalyserForme,canonique:vexportCanonique,hacher:vexportHacher,provenance:vexportProvenance};
  }
  if(typeof document!=='undefined'&&document.getElementById){
    var zoneV=document.getElementById('vexport-texte');
    if(zoneV){
      var resV=document.getElementById('vexport-resultat'),
          indV=document.getElementById('vexport-indispo'),
          bVerif=document.getElementById('btn-vexport-verifier'),
          bFich=document.getElementById('btn-vexport-fichier'),
          inFich=document.getElementById('vexport-fichier');
      function ligne(tag,cls,texte){
        var el=document.createElement(tag);
        if(cls)el.className=cls;
        el.textContent=texte;
        return el;
      }
      function rendreVerdict(v){
        if(!resV)return;
        resV.replaceChildren();
        if(!v.forme){
          resV.appendChild(ligne('p','petite','ÉCART DE FORME — '+v.erreur));
        } else if(v.chaine==='MATCH'){
          resV.appendChild(ligne('p',null,'MATCH — la chaîne de cet export se recalcule au complet : '+v.entrees+' entrée(s), '+v.connexions+' connexion(s).'));
          var tete=ligne('p','petite','Tête de chaîne recalculée : ');
          var m=document.createElement('span');m.className='mono';m.textContent=v.tete;
          tete.appendChild(m);
          resV.appendChild(tete);
        } else {
          resV.appendChild(ligne('p',null,'ÉCART — premier écart à l’enregistrement nº '+v.ecart+' ('+v.type+').'));
          resV.appendChild(ligne('p','petite',v.detail));
        }
        if(v.provenance&&v.provenance.present){
          var resume='Provenance constatée dans l’export — auteur attribué : '+(v.provenance.auteur||'(non nommé)');
          if(v.provenance.mention)resume+=' ; mention de droits : '+v.provenance.mention;
          resV.appendChild(ligne('p','petite',resume));
          resV.appendChild(ligne('p','petite','Borne : '+v.provenance.borne));
        } else if(v.forme){
          resV.appendChild(ligne('p','petite','Aucun bloc de provenance dans cet export : il ne porte pas la déclaration d’attribution.'));
        }
      }
      function lancer(){
        var brut=zoneV.value;
        if(!brut||!brut.trim()){rendreVerdict({forme:false,erreur:'Colle d’abord le contenu d’un export, ou choisis son fichier.',provenance:{present:false}});return;}
        var d;
        try{d=JSON.parse(brut);}
        catch(e){rendreVerdict({forme:false,erreur:'Le texte lu n’est pas un JSON lisible ('+e.message+').',provenance:{present:false}});return;}
        vexportVerifier(d).then(rendreVerdict);
      }
      if(!(typeof crypto!=='undefined'&&crypto.subtle)){
        if(indV){
          indV.style.display='block';
          indV.textContent='Le vérificateur ne peut pas calculer ici : Web Crypto (crypto.subtle) est indisponible dans ce contexte — il exige une page servie en contexte sécurisé (HTTPS). Rien n’a été calculé, rien n’a été envoyé.';
        }
        if(bVerif)bVerif.disabled=true;
        if(bFich)bFich.disabled=true;
      } else {
        if(bVerif)bVerif.addEventListener('click',lancer);
        if(bFich&&inFich){
          bFich.addEventListener('click',function(){inFich.click();});
          inFich.addEventListener('change',function(){
            var f=inFich.files&&inFich.files[0];
            if(!f)return;
            var lecteur=new FileReader();
            lecteur.onload=function(){zoneV.value=String(lecteur.result||'');lancer();};
            lecteur.onerror=function(){rendreVerdict({forme:false,erreur:'Le fichier choisi n’a pas pu être lu.',provenance:{present:false}});};
            lecteur.readAsText(f);
            inFich.value='';
          });
        }
      }
    }
  }
})();


/* ===== v15 — Trouve l'écart : un caractère suffit =====
   La phrase de démonstration est scellée au chargement par Web Crypto ;
   aucune valeur de hachage n'est écrite dans la page. */
(function(){
  var phraseEl=document.getElementById('te-phrase'); if(!phraseEl)return;
  var origineEl=document.getElementById('te-sceau-origine'),
      recalcEl=document.getElementById('te-sceau-recalcul'),
      verdictEl=document.getElementById('te-verdict'),
      msgEl=document.getElementById('te-message'),
      btnMod=document.getElementById('te-btn-modifier'),
      btnRec=document.getElementById('te-btn-recalculer'),
      btnRet=document.getElementById('te-btn-retablir');
  if(!window.crypto||!crypto.subtle){
    origineEl.textContent='Web Crypto n’est pas disponible dans ce contexte (page non sécurisée) : le calcul ne peut pas se faire ici.';
    return;
  }
  var ORIGINE=phraseEl.textContent.trim();
  var sceauOrigine=null;
  function sha256hex(texte){
    return crypto.subtle.digest('SHA-256',new TextEncoder().encode(texte)).then(function(buf){
      return Array.prototype.map.call(new Uint8Array(buf),function(b){return ('0'+b.toString(16)).slice(-2)}).join('');
    });
  }
  function attente(){verdictEl.textContent='en attente du recalcul';verdictEl.className='verdict attente';}
  sha256hex(ORIGINE).then(function(h){sceauOrigine=h;origineEl.textContent=h;});
  /* v59 — la phrase se modifie au clavier, dans la page : le recalcul suit en
     direct, le sceau casse sous les yeux, le premier caractere change se nomme. */
  var diffEl=document.getElementById('te-diff');
  phraseEl.setAttribute('contenteditable','true');
  phraseEl.setAttribute('spellcheck','false');
  phraseEl.title='Cliquez et changez un caractère : le sceau casse en direct.';
  function premierEcart(a,b){
    var n=Math.min(a.length,b.length);
    for(var i=0;i<n;i++){ if(a[i]!==b[i]) return i; }
    return a.length===b.length ? -1 : n;
  }
  phraseEl.addEventListener('input',function(){
    var t=phraseEl.textContent;
    var i=premierEcart(ORIGINE,t);
    if(diffEl) diffEl.textContent = i<0 ? 'Texte identique à l’origine, caractère par caractère.' : ('Premier écart au caractère '+(i+1)+' : « '+(ORIGINE[i]||'∅')+' » est devenu « '+(t[i]||'∅')+' ».');
    sha256hex(t).then(function(h){
      recalcEl.textContent=h;
      var boite=phraseEl.closest('.te-boite');
      if(sceauOrigine&&h===sceauOrigine){
        verdictEl.textContent='MATCH'; verdictEl.className='verdict ok';
        if(boite)boite.classList.remove('casse');
        msgEl.textContent='La phrase affichée est intacte : son empreinte recalculée égale le sceau d’origine. C’est le verdict de la chaîne entière, maillon après maillon.';
      }else{
        verdictEl.textContent='ÉCART'; verdictEl.className='verdict ecart';
        if(boite)boite.classList.add('casse');
        msgEl.textContent='Le sceau casse en direct : un seul caractère changé, et l’empreinte ne correspond plus — c’est ce que détecte le recalcul, sur cette phrase comme sur la chaîne entière.';
      }
    });
  });
  btnMod.addEventListener('click',function(){
    var t=phraseEl.textContent, i=t.lastIndexOf('é');
    if(i<0){msgEl.textContent='La phrase affichée ne contient plus le caractère d’origine à modifier — rétablissez le texte pour recommencer.';return;}
    phraseEl.textContent=t.slice(0,i)+'e'+t.slice(i+1);
    recalcEl.textContent='— pas encore recalculé —'; attente();
    msgEl.textContent='Un caractère vient de changer dans la phrase affichée — un accent, presque invisible. Recalculez, et comparez les deux empreintes.';
  });
  btnRec.addEventListener('click',function(){
    sha256hex(phraseEl.textContent).then(function(h){
      recalcEl.textContent=h;
      if(sceauOrigine&&h===sceauOrigine){
        verdictEl.textContent='MATCH'; verdictEl.className='verdict ok';
        msgEl.textContent='La phrase affichée est intacte : son empreinte recalculée égale le sceau d’origine. C’est le verdict de la chaîne entière, maillon après maillon.';
      }else{
        verdictEl.textContent='ÉCART'; verdictEl.className='verdict ecart';
        msgEl.textContent='Un seul caractère changé, et l’empreinte ne correspond plus — c’est ce que détecte le recalcul. Aucun serveur, aucune alerte : deux calculs, comparés.';
      }
    });
  });
  btnRet.addEventListener('click',function(){
    phraseEl.textContent=ORIGINE;
    var boiteR=phraseEl.closest('.te-boite'); if(boiteR)boiteR.classList.remove('casse');
    if(diffEl)diffEl.textContent='';
    recalcEl.textContent='— pas encore recalculé —'; attente();
    msgEl.textContent='Texte d’origine rétabli. Recalculez : le verdict doit revenir à MATCH.';
  });
})();

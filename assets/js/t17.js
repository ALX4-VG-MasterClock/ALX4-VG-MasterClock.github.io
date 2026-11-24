
/* ===== v8 — Trois foyers : auto-vérification en direct ; la visite scellée ===== */
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id)};
  var ZEROS='0'.repeat(64);
  async function sha256hex(txt){
    var b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(txt));
    return [...new Uint8Array(b)].map(function(x){return x.toString(16).padStart(2,'0')}).join('');
  }
  var affiche=$('sceau-version-affiche');
  var SCEAU=affiche?affiche.textContent.trim():'';
  var afficheCh=$('sceau-chaine-affiche'), affichePrev=$('sceau-chaine-precedent');
  var CHAINE=afficheCh?afficheCh.textContent.trim():'';
  var PREVCHAINE=affichePrev?affichePrev.textContent.trim():'';
  function heureToronto(){
    try{return new Date().toLocaleString('fr-CA',{timeZone:'America/Toronto',dateStyle:'long',timeStyle:'medium'})}
    catch(e){return new Date().toLocaleString('fr-CA')}
  }
  /* --- Foyer 1 (GitHub Pages) : recalcul de la copie servie --- */
  async function verifierFoyer1(){
    var v=$('fv-gh-voyant'),verd=$('fv-gh-verdict'),etat=$('fv-gh-etat'),j=$('foyers-journal');
    if(!SCEAU){if(etat)etat.textContent='Sceau de version illisible dans cette copie.';return}
    try{
      var url=location.href.split('#')[0];
      var r=await fetch(url,{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      var txt=await r.text();
      var canon=txt.split(SCEAU).join(ZEROS);
      var calc=await sha256hex(canon);
      var ok=(calc===SCEAU);
      if(v)v.className='voyant '+(ok?'ok':'ecart');
      if(verd){verd.textContent=ok?'MATCH':'ÉCART';verd.className='verdict '+(ok?'ok':'ecart')}
      if(etat)etat.innerHTML=ok
        ? 'Empreinte recalculée dans votre navigateur : <span class="mono">'+calc+'</span> — identique au sceau de version affiché. La copie servie est, à cet instant, exactement la version scellée.'
        : 'Empreinte recalculée : <span class="mono">'+calc+'</span> — DIFFÉRENTE du sceau affiché. La copie servie ne correspond pas à la version scellée : comparez avec la capture Wayback du foyer 3.';
      if(j)j.textContent='Dernière vérification des foyers : '+heureToronto()+' (heure de Toronto), dans votre navigateur.';
      /* v59 — le sceau chaîné de version, recalculé sur la même copie servie :
         empreinte du contenu (les deux emplacements de sceaux remplacés par
         des zéros), puis SHA-256 du sceau canonique précédent et d'elle. */
      var etatCh=$('fv-ch-etat');
      if(etatCh&&CHAINE&&PREVCHAINE){
        try{
          var canonContenu=txt.split(SCEAU).join(ZEROS).split(CHAINE).join(ZEROS);
          var empreinte=await sha256hex(canonContenu);
          var calcCh=await sha256hex(PREVCHAINE+empreinte);
          var okCh=(calcCh===CHAINE);
          etatCh.innerHTML=okCh
            ? 'Sceau chaîné recalculé dans votre navigateur : empreinte du contenu <span class="mono">'+empreinte+'</span> ; SHA-256 du sceau canonique de la version précédente et de cette empreinte = <span class="mono">'+calcCh+'</span> — identique au sceau chaîné affiché : MATCH. Cette version descend de la précédente, et le calcul le prouve.'
            : 'Sceau chaîné recalculé : <span class="mono">'+calcCh+'</span> — DIFFÉRENT du sceau chaîné affiché : ÉCART.';
        }catch(e){ etatCh.textContent='Le recalcul du sceau chaîné a échoué depuis ce navigateur (hors ligne, ou copie ouverte hors de son foyer).'; }
      }
    }catch(e){
      if(v)v.className='voyant attente';
      if(verd){verd.textContent='Recalcul impossible ici';verd.className='verdict attente'}
      if(etat)etat.textContent='Le recalcul en direct a échoué depuis ce navigateur (hors ligne, ou copie ouverte hors de son foyer). Le sceau affiché demeure le relevé de référence, recalculable avec la recette publique.';
      if(j)j.textContent='Tentative de vérification : '+heureToronto()+' — recalcul local impossible, relevés statiques affichés.';
    }
  }
  var bf=$('btn-foyers-verif'); if(bf)bf.addEventListener('click',verifierFoyer1);
  verifierFoyer1();
  /* --- Foyer 3 (Wayback Machine) : état d'archive en direct --- */
  (async function(){
    var etat=$('fv-wb-etat'),detail=$('fv-wb-detail'),voy=$('fv-wb-voyant'),verd=$('fv-wb-verdict');
    if(!etat)return;
    try{
      var r=await fetch('https://archive.org/wayback/available?url=alx4-vg-masterclock.github.io/');
      var d=await r.json();
      var c=d&&d.archived_snapshots&&d.archived_snapshots.closest;
      if(c&&c.available&&c.timestamp>'20261101185534'){
        var ts=c.timestamp;
        var iso=ts.slice(0,4)+'-'+ts.slice(4,6)+'-'+ts.slice(6,8)+'T'+ts.slice(8,10)+':'+ts.slice(10,12)+':'+ts.slice(12,14)+'Z';
        var quand=new Date(iso).toLocaleString('fr-CA',{timeZone:'America/Toronto',dateStyle:'long',timeStyle:'short'});
        if(detail)detail.innerHTML='Capture la plus récente du foyer vivant : <b>'+quand+'</b> (heure de Toronto) — <a href="'+c.url+'" target="_blank" rel="noopener">voir la capture</a>. Elle montre la version en ligne à cette date-là.';
        if(voy)voy.className='voyant ok';
        if(verd)verd.textContent='Archivé — capture récente';
        etat.innerHTML='Lecture en direct auprès de l\u2019Internet Archive, faite à l\u2019instant dans votre navigateur. Si cette capture est postérieure à la publication de la v12, la version en cours est archivée ; sinon, son absence demeure dite ici même, sans maquillage.';
      }else{
        etat.innerHTML='<b>Capture de la version en cours (v12) : elle n\u2019existe pas encore</b> — la lecture en direct le confirme : la capture la plus récente demeure celle de la version précédente (ci-dessus). Elle est demandée à la publication de la v12, puis inscrite au registre des archives tenu par SoPHIa. Borne : la Wayback sert une copie réécrite pour l\u2019affichage (adresses adaptées) — ce foyer prouve la date et l\u2019existence, pas l\u2019identité octet par octet.';
      }
    }catch(e){
      etat.innerHTML='<b>Capture de la version en cours (v12) : elle n\u2019existe pas encore.</b> La lecture en direct de l\u2019Internet Archive a échoué depuis ce navigateur ; le relevé statique ci-dessus (capture du 1<sup>er</sup> novembre 2026, 13 h 55) vient du registre des archives tenu par SoPHIa, vérifié au timemap. L\u2019API de disponibilité accuse parfois un retard d\u2019indexation sur une capture pourtant existante — constaté le 1<sup>er</sup> novembre.';
    }
  })();
  /* --- La visite scellée --- */
  var CLEV='visites-vg-v1';
  function visites(){try{return JSON.parse(localStorage.getItem(CLEV))||[]}catch(e){return[]}}
  function sauveVisites(v){try{localStorage.setItem(CLEV,JSON.stringify(v))}catch(e){}}
  function renduVisites(){
    var zone=$('visite-liste'); if(!zone)return;
    var v=visites();
    if(!v.length){zone.innerHTML='<p class="petite" style="margin-top:1rem">Aucun maillon de visite dans ce navigateur pour le moment. Le premier prendra sa genèse dans le sceau de version ci-dessus.</p>';return}
    zone.innerHTML=v.map(function(m,i){
      return '<div class="visite-carte"><p class="etiquette">Maillon de visite n° '+(i+1)+' — '+m.quand+'</p>'
      +'<p class="mono">sceau : '+m.sceau+'</p>'
      +'<p class="petite">précédent : <span class="mono">'+m.prev+'</span>'+(m.mot?' · mot : « '+String(m.mot).replace(/</g,'&lt;')+' »':'')+'</p>'
      +'<div class="rangee"><button class="secondaire" data-vcopier="'+i+'">Copier ce sceau</button><button class="secondaire" data-vverif="'+i+'">Revérifier</button><span class="petite" id="vverdict-'+(i+1)+'"></span></div></div>';
    }).join('');
    zone.querySelectorAll('[data-vcopier]').forEach(function(btn){btn.addEventListener('click',function(){
      var m=visites()[+btn.getAttribute('data-vcopier')];
      if(m&&navigator.clipboard)navigator.clipboard.writeText(m.sceau);
      btn.textContent='Copié ✓'; setTimeout(function(){btn.textContent='Copier ce sceau'},1600);
    })});
    zone.querySelectorAll('[data-vverif]').forEach(function(btn){btn.addEventListener('click',async function(){
      var m=visites()[+btn.getAttribute('data-vverif')]; if(!m)return;
      var out=$('vverdict-'+m.n); if(!out)return;
      var calc=await sha256hex(m.prev+'|'+m.iso+'|'+m.mot);
      out.innerHTML=calc===m.sceau?'<span class="verdict ok">MATCH — recalculé à l\u2019instant</span>':'<span class="verdict ecart">ÉCART</span>';
    })});
  }
  var bv=$('btn-visite');
  if(bv)bv.addEventListener('click',async function(){
    var v=visites();
    var prev=v.length?v[v.length-1].sceau:SCEAU;
    var iso=new Date().toISOString();
    var mot=($('visite-mot')?$('visite-mot').value:'').trim();
    var sceau=await sha256hex(prev+'|'+iso+'|'+mot);
    v.push({n:v.length+1,iso:iso,quand:heureToronto(),mot:mot,prev:prev,sceau:sceau});
    sauveVisites(v); renduVisites();
    var z=$('visite-resultat');
    if(z)z.innerHTML='<div class="visite-carte"><p class="etiquette">Votre maillon n° '+v.length+' — scellé à l\u2019instant</p><p class="mono">'+sceau+'</p><p class="petite">Chaîné à : <span class="mono">'+prev+'</span>'+(v.length===1?' (le sceau de version de ce site — la genèse de votre chaîne)':' (votre maillon précédent)')+'. Conservez-le : avec la recette publique, quiconque peut le recalculer.</p></div>';
  });
  var be=$('btn-visite-export');
  if(be)be.addEventListener('click',function(){
    var blob=new Blob([JSON.stringify(visites(),null,2)],{type:'application/json'});
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='mes-maillons-de-visite.json'; a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href)},2000);
  });
  renduVisites();
})();

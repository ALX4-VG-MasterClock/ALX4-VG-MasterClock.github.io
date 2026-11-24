
// ---------- v24 : calendrier 13 × 28, Historique quotidien, menu ☰ ----------
(function(){
  'use strict';
  // --- Calendrier 13 × 28 : la logique du module testé (module-calendrier-13x28.js), intégrée ---
  var JOUR_SIDERAL_S=86164.0905,FACTEUR_SIDERAL=1.00273790935,JOUR_SOLAIRE_S=86400;
  var ORIGINE_MS=Date.UTC(2026,2,20,3,56,4);
  function etatCalendrier24(maintenantMs){
    var ecouleS=(maintenantMs-ORIGINE_MS)/1000;
    var joursCivils=Math.floor(ecouleS/JOUR_SOLAIRE_S);
    var rotations=(ecouleS/JOUR_SOLAIRE_S)*FACTEUR_SIDERAL;
    var avanceRotations=rotations-ecouleS/JOUR_SOLAIRE_S;
    var jourDuCycle=((joursCivils%364)+364)%364;
    var mois=Math.floor(jourDuCycle/28)+1;
    var jourDuMois=(jourDuCycle%28)+1;
    var cycle=Math.floor(joursCivils/364)+1;
    var rotationsAuDebut=364*(cycle-1)*FACTEUR_SIDERAL;
    var cibleRotations=Math.floor(rotationsAuDebut+364*FACTEUR_SIDERAL)+1;
    var instantTourMs=ORIGINE_MS+cibleRotations*JOUR_SIDERAL_S*1000;
    if(instantTourMs<=maintenantMs){var rSuiv=364*cycle*FACTEUR_SIDERAL;cibleRotations=Math.floor(rSuiv+364*FACTEUR_SIDERAL)+1;instantTourMs=ORIGINE_MS+cibleRotations*JOUR_SIDERAL_S*1000;}
    return {joursCivils:joursCivils,rotations:rotations,avanceRotations:avanceRotations,cycle:cycle,mois:mois,jourDuMois:jourDuMois,jourDuCycle:jourDuCycle+1,instantTourMs:instantTourMs};
  }
  function fmtN24(x,n){return x.toLocaleString('fr-CA',{minimumFractionDigits:n,maximumFractionDigits:n});}
  var fmtTour24=new Intl.DateTimeFormat('fr-CA',{timeZone:'America/Toronto',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  function fmtHMS24(sec){sec=Math.round(sec);var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return h+' h '+('0'+m).slice(-2)+' min '+('0'+s).slice(-2)+' s';}
  function majCalendrier24(){
    var d=document.getElementById('cal-date');if(!d)return;
    var e=etatCalendrier24(Date.now());
    d.textContent='Mois '+e.mois+' — jour '+e.jourDuMois;
    var cyc=document.getElementById('cal-cycle');if(cyc)cyc.textContent='Cycle '+e.cycle+' · jour '+e.jourDuCycle+' du cycle de 364';
    var rot=document.getElementById('cal-rotations');if(rot)rot.textContent=fmtN24(e.rotations,4);
    var av=document.getElementById('cal-avance');if(av)av.textContent=fmtN24(e.avanceRotations,5)+' rotation';
    var avd=document.getElementById('cal-avance-detail');if(avd)avd.textContent='Soit '+fmtHMS24(e.avanceRotations*JOUR_SIDERAL_S)+' d\u2019avance sidérale sur le compte civil — la même valeur, à la seconde, qu\u2019au panneau Calendrier.';
    var tour=document.getElementById('cal-tour');if(tour)tour.textContent=fmtTour24.format(new Date(e.instantTourMs));
    var rec=document.getElementById('cal-reconcil');if(rec){var secEq=Math.round(((Date.now()-Date.UTC(2026,2,20,14,46,0))/86400000)*(FACTEUR_SIDERAL-1)*JOUR_SIDERAL_S);var secAn=Math.round(e.avanceRotations*JOUR_SIDERAL_S);rec.textContent='Réconciliation des deux avances : depuis l\u2019ancre du 19 mars 2026, 23 h 56 min 04 s (ce panneau et le panneau Calendrier) : '+fmtHMS24(secAn)+' ; depuis l\u2019équinoxe de printemps 2026 (20 mars, 14 h 46 UTC — la mesure de la triangulation, plus haut dans ce panneau) : '+fmtHMS24(secEq)+'. Écart constant : '+fmtHMS24(secAn-secEq)+' — l\u2019avance sidérale accumulée pendant les 10 h 49 min 56 s qui séparent l\u2019ancre de l\u2019équinoxe. Les deux mesures sont vraies ; chacune nomme son origine.';}
  }
  if(document.getElementById('cal-date')){majCalendrier24();setInterval(majCalendrier24,1000);}
  // --- Historique quotidien : lecture du fichier tenu à jour ---
  function echapper24(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  var hListe=document.getElementById('historique-liste'),hEtat=document.getElementById('historique-etat');
  if(hListe&&window.fetch){
    fetch('assets/historique.json',{cache:'no-store'}).then(function(r){return r.json();}).then(function(hist){
      var es=(hist&&hist.entrees)||[];
      if(!es.length)throw new Error('vide');
      var html='';
      es.forEach(function(e){
        var dig=String(e.digest_apres||e.empreinte||'');
        var statut=(e.date==='2026-11-02')?'Ancrage OpenTimestamps : soumis le 2 novembre 2026 — confirmation Bitcoin en attente.':'Ancrage : statut consigné dans le fichier de l\u2019Historique.';
        html+='<div class="coffre-entree"><h4>'+echapper24(e.date)+' — jour clos</h4><p class="empreinte">Digest cumulé : '+echapper24(dig.slice(0,16))+'…</p><p class="petite">'+statut+'</p></div>';
      });
      hListe.innerHTML=html;
      if(hEtat)hEtat.textContent='Historique lu à l\u2019instant depuis son fichier (assets/historique.json) — '+es.length+' jour'+(es.length>1?'s':'')+' clos.';
    }).catch(function(){
      if(hEtat)hEtat.textContent='Le fichier de l\u2019Historique n\u2019a pas pu être lu ici ; le relevé statique ci-dessus reste la référence vérifiée à la construction.';
    });
  }
  // --- Menu ☰ : tiroir, recherche en direct, navigation par ouvrirPanneau ---
  var mBtn=document.getElementById('menu-btn'),mPan=document.getElementById('menu-panneau'),
      mRech=document.getElementById('menu-recherche'),mVide=document.getElementById('menu-vide'),
      mFermer=document.getElementById('menu-fermer'),mLangue=document.getElementById('btn-langue');
  function menuEstOuvert(){return mPan&&!mPan.hidden;}
  function ouvrirMenu(){
    if(!mPan)return;
    mPan.hidden=false;mBtn.textContent='✕';mBtn.setAttribute('aria-expanded','true');
    mBtn.setAttribute('aria-label',(mLangue&&mLangue.textContent==='FR')?'Close the menu':'Fermer le menu');
    if(mRech)mRech.focus();
  }
  function fermerMenu(){
    if(!mPan)return;
    mPan.hidden=true;mBtn.textContent='☰';mBtn.setAttribute('aria-expanded','false');
    mBtn.setAttribute('aria-label',(mLangue&&mLangue.textContent==='FR')?'Open the menu':'Ouvrir le menu');
  }
  if(mBtn&&mPan){
    mBtn.addEventListener('click',function(){menuEstOuvert()?fermerMenu():ouvrirMenu();});
    if(mFermer)mFermer.addEventListener('click',fermerMenu);
    document.addEventListener('keydown',function(ev){if(ev.key==='Escape'&&menuEstOuvert())fermerMenu();});
    mPan.querySelectorAll('button.menu-entree').forEach(function(b){
      b.addEventListener('click',function(){
        var cible=b.dataset.cible,ancre=b.dataset.ancre;
        fermerMenu();
        if(cible&&typeof ouvrirPanneau==='function')ouvrirPanneau(cible,ancre?{cible:ancre}:undefined);
        if(ancre)setTimeout(function(){var el=document.getElementById(ancre);if(el)el.scrollIntoView({behavior:'smooth'});},150);
      });
    });
    if(mRech){
      var normalise24=function(s){return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');};
      mRech.addEventListener('input',function(){
        var q=normalise24(mRech.value).trim(),total=0;
        mPan.querySelectorAll('button.menu-entree').forEach(function(b){
          var ok=!q||normalise24(b.textContent+' '+(b.dataset.mots||'')).indexOf(q)>-1;
          b.parentElement.style.display=ok?'':'none';
          if(ok)total++;
        });
        mPan.querySelectorAll('.menu-famille').forEach(function(f){
          var entrees=f.querySelectorAll('button.menu-entree');
          if(!entrees.length)return;
          var any=false;
          entrees.forEach(function(b){if(b.parentElement.style.display!=='none')any=true;});
          f.style.display=any?'':'none';
        });
        if(mVide)mVide.style.display=total?'none':'';
      });
    }
    if(mLangue)mLangue.addEventListener('click',function(){
      var en=(mLangue.textContent==='FR');
      if(mRech)mRech.placeholder=en?'Search the site…':'Rechercher dans le site…';
      mBtn.setAttribute('aria-label',en?(menuEstOuvert()?'Close the menu':'Open the menu'):(menuEstOuvert()?'Fermer le menu':'Ouvrir le menu'));
    });
  }
})();

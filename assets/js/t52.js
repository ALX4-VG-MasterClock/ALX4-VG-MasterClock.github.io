
/* ===== v59 — moteurs de la couche imagerie-aventure (maison, sans traqueur) ===== */
(function(){
  'use strict';
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  fetch('assets/cerveau.json',{cache:'no-store'}).then(function(r){return r.json();}).then(function(man){
    if(man&&man.version_site){
      var n=String(man.version_site).replace(/^v/,'');
      document.querySelectorAll('[data-version-courante]').forEach(function(e){e.textContent=n;});
    }
  }).catch(function(){});
  var coq=document.getElementById('coq59');
  if(coq){
    var couchesSvg=[].slice.call(coq.querySelectorAll('#coq59-svg .couche'));
    var couchesLi=[].slice.call(coq.querySelectorAll('.coq59-liste li'));
    var etatCoq=document.getElementById('coq59-etat');
    function majCoq(){
      var n;
      if(RM){ n=couchesSvg.length; }
      else{
        var r=coq.getBoundingClientRect(), vh=window.innerHeight||800;
        var p=(vh*0.88 - r.top)/(r.height + vh*0.3);
        p=Math.max(0,Math.min(1,p));
        n=Math.round(p*couchesSvg.length);
      }
      couchesSvg.forEach(function(c,i){c.classList.toggle('posee',i<n);});
      couchesLi.forEach(function(c,i){c.classList.toggle('posee',i<n);});
      if(etatCoq) etatCoq.textContent = n===0 ? 'Fais défiler : les couches se posent une à une, chacune sur les précédentes.' : ('Couche '+n+' sur '+couchesSvg.length+' — chaque couche porte toutes les précédentes ; la somme ne réécrit rien.');
    }
    addEventListener('scroll',majCoq,{passive:true});
    addEventListener('resize',majCoq);
    document.addEventListener('panneau-ouvert',function(){ setTimeout(majCoq,90); });
    majCoq();
  }
  var cv=document.getElementById('cal59-canvas');
  if(cv){
    var ORIGINE59=Date.UTC(2026,2,20,3,56,4), JOUR59=86400000;
    var etatCal=document.getElementById('cal59-etat');
    function dessinCal(){
      var now=Date.now(), jours=Math.floor((now-ORIGINE59)/JOUR59);
      var jourCycle=jours%364, thMax=Math.PI*5.2;
      if(etatCal) etatCal.textContent='Aujourd’hui : jour '+(jourCycle+1)+' du cycle sur la spirale ('+jours.toLocaleString('fr-CA')+' jours depuis l’origine). Les points dorés sont les jours écoulés ; le point lumineux, le jour en cours ; l’anneau rouge au bout, le jour du tour — le 365e, hors grille, qui s’ajoute une fois le cycle plein.';
      var ctx=cv.getContext('2d'); if(!ctx)return;
      var W=cv.width,H=cv.height;
      ctx.clearRect(0,0,W,H);
      function pt(i){
        var th=(i/364)*thMax, r=14+ (i/364)*(Math.min(W,H)*0.44);
        return [W/2+Math.cos(th)*r*1.28, H/2+Math.sin(th)*r*0.92];
      }
      var sombre=document.documentElement.getAttribute('data-theme')==='sombre';
      for(var i=0;i<364;i++){
        var p=pt(i);
        ctx.beginPath(); ctx.arc(p[0],p[1], i===jourCycle?4.5:2.1, 0, 7);
        ctx.fillStyle = i<jourCycle ? 'rgba(212,175,55,0.9)' : (sombre?'rgba(233,205,119,0.28)':'rgba(120,90,20,0.3)');
        ctx.fill();
      }
      var ptour=pt(364);
      ctx.beginPath(); ctx.arc(ptour[0],ptour[1],8,0,7);
      ctx.strokeStyle='#c0392b'; ctx.lineWidth=2.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(ptour[0],ptour[1],2.6,0,7); ctx.fillStyle='#c0392b'; ctx.fill();
    }
    dessinCal();
    if(!RM) setInterval(function(){ var p=document.getElementById('p-calendrier'); if(p&&p.classList.contains('actif')) dessinCal(); },1000);
    document.addEventListener('panneau-ouvert',function(ev){ if(ev.detail&&ev.detail.nom==='calendrier') setTimeout(dessinCal,90); });
  }
  var jum=document.getElementById('jumeau-visuel');
  if(jum){
    var btnJ=document.getElementById('jumeau-btn'), etatJ=document.getElementById('jumeau-etat');
    function assembler(){ if(!jum.classList.contains('retour')) jum.classList.add('assemble'); }
    if('IntersectionObserver' in window && !RM){
      new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting) assembler(); }); },{threshold:.25}).observe(jum);
    } else { jum.classList.add('assemble'); }
    if(btnJ) btnJ.addEventListener('click',function(){
      var retour=jum.classList.toggle('retour');
      jum.classList.toggle('assemble',!retour);
      if(etatJ) etatJ.textContent = retour
        ? 'Les pièces reviennent chez la personne : l’export repris, la copie tenue chez soi, la somme des précédents gardée de son bord. Le jumeau des plateformes continue d’exister chez elles — mais il n’est plus le seul exemplaire, et il n’a plus le dernier mot.'
        : 'Quatre familles de pièces — dire, faire, aller, écouter — partent de la personne vers les plateformes, qui les assemblent en un jumeau numérique : une personne reconstruite, sans elle. Regarde l’assemblage se faire.';
      btnJ.textContent = retour ? 'Revoir l’assemblage' : 'Ramener les pièces chez moi';
    });
  }
  function bandeVm(){
    var z=document.getElementById('vm-bande'); if(!z)return;
    var etatB=document.getElementById('vm-bande-etat');
    var n=0, somme='';
    try{
      var brut=localStorage.getItem('cerveau-utilisateur-v1');
      if(brut){ var d=JSON.parse(brut); if(d&&d.entrees){ n=d.entrees.length; var der=d.entrees[n-1]; if(der) somme=der.somme||der.sceau||der.digest||''; } }
    }catch(e){}
    var cle=n+'|'+String(somme).slice(0,16);
    if(z.dataset.cle===cle) return;
    z.dataset.cle=cle;
    z.innerHTML='';
    for(var i=0;i<n;i++){
      var s=document.createElement('span'); s.className='vm-maillon plein'; s.title='Maillon '+(i+1); z.appendChild(s);
      if(i<n-1){ var l=document.createElement('span'); l.className='vm-lien'; z.appendChild(l); }
    }
    if(etatB) etatB.textContent = n
      ? (n+' maillon(s) dans ta chaîne, sur cet appareil — chaque geste scellé en ajoute un, ici, en direct, et la somme se recalcule.'+(somme?' Somme courante : '+String(somme).slice(0,16)+'…':''))
      : 'Ton cerveau est encore vide sur cet appareil : le premier geste scellé posera le premier maillon, ici, en direct.';
  }
  document.addEventListener('panneau-ouvert',function(ev){ if(ev.detail&&ev.detail.nom==='voir') setTimeout(bandeVm,160); });
  var vmOuvrir=document.getElementById('vm-ouvrir');
  if(vmOuvrir) vmOuvrir.addEventListener('click',function(){ setTimeout(bandeVm,250); });
  addEventListener('storage',bandeVm);
  setInterval(function(){ var p=document.getElementById('p-voir'); if(p&&p.classList.contains('actif')) bandeVm(); },1500);
  bandeVm();
})();

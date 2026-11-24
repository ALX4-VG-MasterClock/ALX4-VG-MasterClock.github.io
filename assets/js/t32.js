
// ---------- v27 : bascule de thème (clair par défaut ; sombre en option, persisté sur l'appareil) ----------
(function(){
  var racine=document.documentElement,b=document.getElementById('btn-theme');
  if(!b)return;
  function anglais(){var l=document.getElementById('btn-langue');return !!(l&&l.textContent.trim()==='FR');}
  function etiquette(){
    var sombre=racine.getAttribute('data-theme')==='sombre';
    var fr=sombre?'☀ Clair':'☾ Sombre',en=sombre?'☀ Light':'☾ Dark';
    b.dataset.en=en;b.dataset.frTxt=fr;b.textContent=anglais()?en:fr;
    b.setAttribute('aria-pressed',sombre?'true':'false');
  }
  b.addEventListener('click',function(){
    var sombre=racine.getAttribute('data-theme')==='sombre';
    if(sombre){racine.removeAttribute('data-theme');try{localStorage.setItem('sophia-theme','clair');}catch(e){}}
    else{racine.setAttribute('data-theme','sombre');try{localStorage.setItem('sophia-theme','sombre');}catch(e){}}
    var m=document.querySelector('meta[name="theme-color"]');
    if(m)m.setAttribute('content',sombre?'#FAF6ED':'#16130C');
    etiquette();
  });
  etiquette();
})();
// ---------- v27 : révélation douce des cartes à l'arrivée dans le champ (le contenu reste visible sans ce script) ----------
(function(){
  if(!('IntersectionObserver' in window))return;
  var cibles=document.querySelectorAll('.carte,.entree,.direct-tuile,.terrain,.etape-pas,.etape-visite,.refus-carte,.pouls-tuile');
  if(!cibles.length)return;
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('entree-vue');io.unobserve(e.target);}});},{rootMargin:'0px 0px -8% 0px',threshold:.08});
  cibles.forEach(function(el){io.observe(el);});
})();

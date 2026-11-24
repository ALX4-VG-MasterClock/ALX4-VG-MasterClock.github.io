
/* ===== v7 — le site branché en direct : GitHub, Wayback, Bitcoin =====
   Trois interfaces publiques, sans clé ni compte. Chaque tuile porte un relevé
   statique vérifié au déploiement de la v7 (1er novembre 2026) : si l'appel en
   direct échoue ou ne signale rien, le relevé demeure et la tuile le dit. */
(function(){
  const $=id=>document.getElementById(id);
  const fmtN=n=>n.toLocaleString('fr-CA');
  const fmtDateT=(iso)=>{
    const d=new Date(iso);
    const date=d.toLocaleDateString('fr-CA',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Toronto'});
    const heure=d.toLocaleTimeString('fr-CA',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Toronto'});
    return {date,heure};
  };
  function appel(url,ms){
    const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),ms||9000);
    return fetch(url,{signal:ctl.signal}).then(r=>{clearTimeout(t);if(!r.ok)throw new Error('HTTP '+r.status);return r});
  }
  /* --- 1. GitHub : les publications du site lui-même --- */
  appel('https://api.github.com/repos/ALX4-VG-MasterClock/ALX4-VG-MasterClock.github.io/commits?per_page=100')
    .then(r=>r.json())
    .then(liste=>{
      if(!Array.isArray(liste)||!liste.length)throw new Error('liste vide');
      const nb=liste.length>=100?'100+':String(liste.length);
      const der=liste[0].commit.committer.date, f=fmtDateT(der);
      const msg=(liste[0].commit.message||'').split('\n')[0];
      $('gh-valeur').textContent=nb+' publication'+(nb==='1'?'':'s')+' du site';
      $('gh-detail').innerHTML='Dernière publication : <b>'+f.date+', '+f.heure+'</b> (heure de l\u2019Est) — « '+msg.replace(/</g,'&lt;')+' ». Dépôt public : <a href="https://github.com/ALX4-VG-MasterClock/ALX4-VG-MasterClock.github.io" target="_blank" rel="noopener">ALX4-VG-MasterClock.github.io</a> — chaque version du site y est un commit daté, consultable par quiconque.';
      $('gh-etat').textContent='Lu en direct à l\u2019instant depuis l\u2019API publique GitHub (api.github.com) — aucune clé, aucun compte.';
    })
    .catch(()=>{const e=$('gh-etat');if(e)e.textContent='La lecture en direct n\u2019a pas abouti depuis votre navigateur ; le relevé statique vérifié au déploiement de la v7 demeure ci-dessus.';});
  /* --- 2. Wayback Machine : la capture d'archive la plus proche --- */
  appel('https://archive.org/wayback/available?url=alx4-vg-masterclock.github.io')
    .then(r=>r.json())
    .then(j=>{
      const s=j&&j.archived_snapshots&&j.archived_snapshots.closest;
      if(s&&s.available&&s.url&&s.timestamp){
        const ts=s.timestamp, iso=ts.slice(0,4)+'-'+ts.slice(4,6)+'-'+ts.slice(6,8)+'T'+ts.slice(8,10)+':'+ts.slice(10,12)+':'+ts.slice(12,14)+'Z';
        const f=fmtDateT(iso);
        $('wb-valeur').textContent='Archivé le '+f.date;
        const lien=$('wb-lien');if(lien)lien.href=s.url;
        $('wb-etat').textContent='Capture la plus proche signalée en direct par l\u2019API de disponibilité d\u2019archive.org : '+f.date+', '+f.heure+' (heure de Toronto).';
      }else{
        $('wb-etat').textContent='L\u2019API de disponibilité d\u2019archive.org ne signale pas encore la capture dans son index rapide ; la capture vérifiée ci-dessus — lue au timemap de la Wayback Machine au déploiement de la v7 — demeure.';
      }
    })
    .catch(()=>{const e=$('wb-etat');if(e)e.textContent='La lecture en direct n\u2019a pas abouti depuis votre navigateur ; le relevé statique vérifié au déploiement de la v7 demeure ci-dessus.';});
  /* --- 3. Bitcoin : la hauteur de la chaîne publique, face aux ancrages --- */
  appel('https://mempool.space/api/blocks/tip/height')
    .then(r=>r.text())
    .then(txt=>{
      const h=parseInt(txt,10);
      if(!Number.isFinite(h))throw new Error('hauteur illisible');
      $('btc-hauteur').textContent=fmtN(h);
      $('btc-avance').textContent=fmtN(h-971630)+' blocs';
      $('btc-etat').textContent='Lu en direct à l\u2019instant depuis l\u2019API publique mempool.space — aucune clé, aucun compte.';
    })
    .catch(()=>{const e=$('btc-etat');if(e)e.textContent='Relevé statique vérifié au déploiement de la v7 (1er novembre 2026) ; la lecture en direct n\u2019a pas abouti depuis votre navigateur.';});
  /* --- Boutons « Copier » des empreintes d'ancrage --- */
  document.querySelectorAll('[data-copier-texte]').forEach(b=>b.addEventListener('click',()=>{
    const fait=()=>{const avant=b.textContent;b.textContent='Copié ✓';setTimeout(()=>b.textContent=avant,1800)};
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(b.dataset.copierTexte).then(fait).catch(fait)}else{fait()}
  }));
  /* --- Vidéos : mouvement réduit respecté, présence en pause hors écran --- */
  const mq=window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('video[data-auto]').forEach(v=>{
    if(mq.matches){v.removeAttribute('autoplay');v.pause()}
  });
  const vp=$('video-presence');
  if(vp&&'IntersectionObserver' in window&&!mq.matches){
    new IntersectionObserver(es=>es.forEach(e=>{
      if(e.isIntersecting){vp.play().catch(()=>{})}else{vp.pause()}
    }),{threshold:.15}).observe(vp);
  }
})();

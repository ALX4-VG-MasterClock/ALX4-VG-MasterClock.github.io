
/* ===== Profil du chercheur : API publique ORCID (sans clé) =====
   Lit https://pub.orcid.org/v3.0/<iD>/record (Accept: application/json) et
   rafraîchit nom, biographie, mots-clés et emploi de la section « Le chercheur ».
   Le contenu statique de la page est le repli : si l'appel échoue côté visiteur,
   les données vérifiées le 1er novembre 2026 restent affichées. */
(function(){
  const ID = '0009-0006-9124-4407';
  const set = (id, txt) => { const el = document.getElementById(id); if (el && txt) el.textContent = txt; };
  fetch('https://pub.orcid.org/v3.0/' + ID + '/record', {headers: {'Accept': 'application/json'}})
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(j => {
      const p = j.person || {};
      const nom = [p.name && p.name['given-names'] && p.name['given-names'].value,
                   p.name && p.name['family-name'] && p.name['family-name'].value].filter(Boolean).join(' ');
      set('orc-nom', nom);
      set('orc-bio', p.biography && p.biography.content);
      const kw = ((p.keywords && p.keywords.keyword) || []).map(k => k.content).filter(Boolean);
      if (kw.length) set('orc-motscles', kw.join(' · '));
      const groupes = (((j['activities-summary'] || {}).employments || {})['affiliation-group']) || [];
      const emplois = [];
      groupes.forEach(g => (g.summaries || []).forEach(s => {
        const e = s['employment-summary']; if (!e) return;
        const a = (e.organization && e.organization.address) || {};
        const lieu = [a.city, a.region, a.country].filter(Boolean).join(', ');
        emplois.push((e['role-title'] || 'Independent Researcher') + (lieu ? ' — ' + lieu : ''));
      }));
      if (emplois.length) set('orc-emploi', emplois.join(' ; '));
      set('orc-etat', 'Affichage : données lues en direct depuis l\u2019API publique ORCID (pub.orcid.org), profil ' + ID + ' — aucune clé, aucun compte, l\u2019API des profils publics est ouverte. Le profil ORCID d\u2019Alexandre Vautour Gagnon déclare ce site comme son site personnel.');
    })
    .catch(() => { /* Repli statique déjà présent dans la page. */ });
})();

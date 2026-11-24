/* Refonte A — bloc « sceller » extrait de l'ancien bloc utilitaires/outils
   du fichier unique (découpage à ses frontières de sections, texte conservé). */
// ---------- Outil « Sceller » : registre local chaîné ----------
const CLE='registre-vg-v2';
function monRegistre(){try{return JSON.parse(localStorage.getItem(CLE))||[]}catch(e){return[]}}
function sauveRegistre(r){localStorage.setItem(CLE,JSON.stringify(r))}
function afficheMonRegistre(){
  const r=monRegistre(),zone=$('mon-registre');
  if(!r.length){zone.innerHTML='<p class="petite">Votre registre est vide pour l\u2019instant.</p>';return}
  zone.innerHTML=r.map((e,i)=>'<div style="border-left:3px solid var(--or);padding:.3rem 0 .3rem 1rem;margin-bottom:1rem"><div style="font-weight:700">Sceau n\u00b0 '+(i+1)+' — '+esc(e.horodatage)+'</div>'+
    '<div class="chaine-lien">'+(i?'↳ calculé à partir du sceau n\u00b0 '+i+' ('+r[i-1].sceau.slice(0,16)+'…), du texte et de l\u2019horodatage':'↳ premier sceau — précédent : GENÈSE')+'</div>'+
    '<div class="petite">'+esc(e.texte.slice(0,180))+(e.texte.length>180?'…':'')+'</div>'+
    '<div class="mono">'+esc(e.sceau)+'</div></div>').join('');
}
$('btn-sceller').addEventListener('click',async()=>{
  const tx=$('texte-sceau').value;if(!tx.trim())return;
  const r=monRegistre(),prev=r.length?r[r.length-1].sceau:'GENÈSE';
  const horo=new Date().toISOString();
  const sceau=await sha256(prev+tx+horo);
  r.push({texte:tx,horodatage:horo,sceau});sauveRegistre(r);afficheMonRegistre();
  $('resultat-sceau').innerHTML='<span class="match">Sceau chaîné généré</span> — <span class="mono">'+sceau+'</span><br><span class="petite">Ingrédients : sceau précédent ('+prev.slice(0,16)+'…) + votre texte + '+horo+'. Recalculable par quiconque avec l\u2019outil « Vérifier un sceau » (sans la case Φ).</span>';
});
$('btn-reverifier').addEventListener('click',async()=>{
  const r=monRegistre();let prev='GENÈSE',ok=true;
  for(const e of r){const s=await sha256(prev+e.texte+e.horodatage);if(s!==e.sceau){ok=false;break}prev=e.sceau}
  $('resultat-sceau').innerHTML=r.length?(ok?'<span class="match">MATCH — votre chaîne de '+r.length+' sceau(x) se revérifie au complet.</span>':'<span class="ecart">ÉCART — un sceau ne se recalcule pas : le registre a été modifié.</span>'):'<span class="petite">Registre vide : rien à revérifier.</span>';
});
$('btn-exporter').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(monRegistre(),null,1)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='registre-vg.json';a.click();
});
const fi=$('fichier-import');
$('btn-importer').addEventListener('click',()=>fi.click());
fi.addEventListener('change',()=>{const f=fi.files[0];if(!f)return;f.text().then(t=>{try{sauveRegistre(JSON.parse(t));afficheMonRegistre()}catch(e){alert('Fichier illisible.')}})});
afficheMonRegistre();

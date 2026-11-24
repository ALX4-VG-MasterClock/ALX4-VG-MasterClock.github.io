/* Refonte A — bloc « verifier » extrait de l'ancien bloc utilitaires/outils
   du fichier unique (découpage à ses frontières de sections, texte conservé). */
// ---------- Outil « Vérifier un sceau » ----------
async function verifierSceau(){
  const prev=$('v-prev').value,tx=$('v-texte').value,
        horo=$('v-horo').value,att=$('v-attendu').value.trim().toLowerCase(),
        phi=$('v-phi').checked;
  const calc=phi?await sha256(tx+'1.61803398875'+horo):await sha256(prev+tx+horo);
  $('resultat-verif').innerHTML='Calculé : <span class="mono">'+calc+'</span><br>'+
    (calc===att?'<span class="match">MATCH — le sceau est authentique pour ces ingrédients.</span>':'<span class="ecart">ÉCART — ce sceau ne correspond pas à ces ingrédients.</span>');
  return calc===att;
}
$('btn-verifier').addEventListener('click',verifierSceau);

/* Refonte A — reprise du témoin déposé par la page Registre historique. */
(function(){
  var cle='verification-en-attente', brut=null;
  try{ brut=localStorage.getItem(cle); if(brut)localStorage.removeItem(cle); }catch(e){}
  if(!brut) return;
  try{
    var t=JSON.parse(brut);
    if(!t||!t.texte) return;
    $('v-prev').value=''; $('v-texte').value=t.texte; $('v-horo').value=t.horo||'';
    $('v-attendu').value=t.sceau||''; $('v-phi').checked=!!t.phi;
    verifierSceau();
  }catch(e){}
})();

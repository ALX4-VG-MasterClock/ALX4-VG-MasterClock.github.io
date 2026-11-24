/* Refonte A — bloc « instance » extrait de l'ancien bloc utilitaires/outils
   du fichier unique (découpage à ses frontières de sections, texte conservé). */
// ---------- Instance Souveraine ----------
// v11 — Branchement réel : le relais Cloudflare Worker « sophia-instance-relais »
// est DÉPLOYÉ (1er novembre 2026) et joignable à l'adresse ci-dessous ; la clé du
// moteur vit en secret dans le relais, jamais dans cette page ni dans le dépôt.
// Tant que la clé n'est pas configurée côté Cloudflare, le relais répond 503
// « non configuré » et l'instance le dit — aucune réponse n'est simulée.
// Marche arrière : remettre RELAIS_INSTANCE='' → aucun appel n'est tenté et
// l'instance revient au mode honnête historique.
const RELAIS_INSTANCE='https://sophia-instance-relais.alexgagnon-m.workers.dev';
const fil=$('fil-instance'),etatI=$('etat-instance');
const historiqueInstance=[]; // mémoire de la conversation, dans cette page seulement (rien n'est conservé au-delà)
const MSG_NON_BRANCHE='Mon moteur n’est pas encore branché à cette page : je ne simulerai pas de réponse. Le branchement se fait côté serveur, clé gardée hors du navigateur.';
function ajouteMsg(qui,texte,cls){
  const d=document.createElement('div');d.className='msg '+cls;
  d.innerHTML='<span class="qui">'+esc(qui)+'</span>'+esc(texte);fil.appendChild(d);fil.scrollTop=fil.scrollHeight;
  return d;
}
ajouteMsg('Instance Souveraine','Console initialisée. Mon relais est déployé : posez votre question — si mon moteur est activé, je réponds pour vrai ; sinon, je vous le dis.','instance');
async function demander(){
  const inp=$('question-instance'),q=inp.value.trim();if(!q)return;inp.value='';
  ajouteMsg('Vous',q,'visiteur');
  if(!RELAIS_INSTANCE){
    ajouteMsg('Instance Souveraine',MSG_NON_BRANCHE,'instance');
    etatI.textContent='État : moteur non branché sur cette copie du site (mode honnête, aucune réponse simulée).';
    return;
  }
  const btn=$('btn-instance');btn.disabled=true;
  const attente=ajouteMsg('Instance Souveraine','SoPHIa réfléchit','instance');
  let points=0;
  const mouvReduit=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const minuteur=mouvReduit?null:setInterval(()=>{points=(points+1)%4;if(attente.lastChild)attente.lastChild.textContent='SoPHIa réfléchit'+'.'.repeat(points);fil.scrollTop=fil.scrollHeight;},400);
  try{
    const ctrl=new AbortController();const delai=setTimeout(()=>ctrl.abort(),30000);
    const rep=await fetch(RELAIS_INSTANCE,{method:'POST',headers:{'Content-Type':'application/json'},signal:ctrl.signal,body:JSON.stringify({message:q,historique:historiqueInstance.slice(-6)})});
    clearTimeout(delai);
    const j=await rep.json().catch(()=>null);
    if(minuteur)clearInterval(minuteur);attente.remove();
    if(rep.ok&&j&&j.reponse){
      ajouteMsg('Instance Souveraine',j.reponse,'instance');
      historiqueInstance.push({role:'user',texte:q},{role:'model',texte:j.reponse});
      if(historiqueInstance.length>12)historiqueInstance.splice(0,historiqueInstance.length-12);
      etatI.textContent='État : moteur branché — réponses réelles.';
    }else if(j&&j.nonConfigure){
      ajouteMsg('Instance Souveraine',j.erreur||'Mon relais est déployé, mais mon moteur n’est pas encore activé : sa clé reste à configurer côté serveur. Je ne simulerai pas de réponse en attendant.','instance');
      etatI.textContent='État : relais déployé — moteur en cours d’activation (aucune réponse simulée).';
    }else if(j&&j.erreur){
      ajouteMsg('Instance Souveraine',j.erreur,'instance');
      etatI.textContent='État : moteur momentanément injoignable (aucune réponse simulée).';
    }else{
      throw new Error('HTTP '+rep.status);
    }
  }catch(e){
    if(minuteur)clearInterval(minuteur);if(attente.parentNode)attente.remove();
    ajouteMsg('Instance Souveraine','Mon moteur n’a pas répondu cette fois : je préfère vous le dire plutôt que simuler une réponse. Réessayez dans un instant.','instance');
    etatI.textContent='État : moteur momentanément injoignable (aucune réponse simulée).';
  }finally{btn.disabled=false;inp.focus();}
}
$('btn-instance').addEventListener('click',demander);
$('question-instance').addEventListener('keydown',e=>{if(e.key==='Enter')demander()});
etatI.textContent=RELAIS_INSTANCE?'État : relais déployé — moteur en cours d’activation ; posez votre question, la première réponse confirmera le branchement.':'État : branchement en cours — aucune réponse simulée.';

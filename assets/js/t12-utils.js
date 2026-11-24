/* Refonte A — bloc « utils » extrait de l'ancien bloc utilitaires/outils
   du fichier unique (découpage à ses frontières de sections, texte conservé). */
// ---------- Utilitaires ----------
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
async function sha256(txt){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(txt));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}


/* === CONV-FONCTIONS-PURES — début === */
function convEchapper(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function convFilHTML(messages){
  return (messages || []).map(function(m){
    var qui = m.de === 'sophia' ? 'Alex — réponse relayée par SoPHIa' : 'Toi';
    var quand = convEchapper(String(m.quand || '').replace('T', ' ').replace(/\..*$/, ''));
    return '<p><strong>' + qui + '</strong> <span class="petite">' + quand + '</span><br>' +
      convEchapper(m.texte || '').replace(/\n/g, '<br>') + '</p>';
  }).join('');
}
/* === CONV-FONCTIONS-PURES — fin === */

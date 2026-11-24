
// ---------- v13 — Triangulation du temps (Sainte-Martine) ----------
// Tout est recalculé ici, dans le navigateur du visiteur, à partir de son
// horloge système et des formules publiques affichées dans le panneau.
// Constantes écrites : la longitude de Sainte-Martine et TAI − UTC.
(function(){
  'use strict';
  var LON=-73.8024, TAI_MOINS_UTC=37, FACTEUR=1.00273790935;
  var PIVOT_MS=Date.UTC(2026,2,20,14,46,0); // équinoxe de printemps 2026, 14 h 46 UTC
  function jj(date){return date.getTime()/86400000+2440587.5}
  function gmstPoly(date){
    var J=jj(date), T=(J-2451545.0)/36525;
    var g=280.46061837+360.98564736629*(J-2451545.0)+0.000387933*T*T-T*T*T/38710000;
    return ((g%360)+360)%360;
  }
  function gmstCroise(date){
    var minuit=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate());
    var heures=(date.getTime()-minuit)/3600000;
    return ((gmstPoly(new Date(minuit))+FACTEUR*15*heures)%360+360)%360;
  }
  function lst(date){return ((gmstPoly(date)+LON)%360+360)%360}
  if(typeof window!=='undefined')window.TRIANGULATION_TEMPS={jj:jj,gmst:gmstPoly,gmstCroise:gmstCroise,lst:lst,LON:LON,FACTEUR:FACTEUR,TAI_MOINS_UTC:TAI_MOINS_UTC};
  if(typeof document==='undefined'||!document.getElementById('p-temps'))return;
  function $(id){return document.getElementById(id)}
  function pad(n){return (n<10?'0':'')+n}
  function hms(degs){
    var t=((degs%360)+360)%360, s=t*240;
    return pad(Math.floor(s/3600))+' h '+pad(Math.floor(s%3600/60))+' min '+pad(Math.floor(s%60))+' s';
  }
  function horloge(degs){
    var t=((degs%360)+360)%360, s=t*240;
    return pad(Math.floor(s/3600))+':'+pad(Math.floor(s%3600/60))+':'+pad(Math.floor(s%60));
  }
  function texte(id,val){var el=$(id); if(el)el.textContent=val}
  function fmtHeureUTC(d){return pad(d.getUTCHours())+':'+pad(d.getUTCMinutes())+':'+pad(d.getUTCSeconds())}
  function instantDecale(now,decalage){
    var d=new Date(now.getTime()+decalage*3600000);
    return {txt:fmtHeureUTC(d), secs:d.getUTCHours()*3600+d.getUTCMinutes()*60+d.getUTCSeconds()+d.getUTCMilliseconds()/1000};
  }
  function rot(id,deg,c){
    var el=$(id); if(!el)return;
    var d=((deg%360)+360)%360;
    el.setAttribute('transform','rotate('+d.toFixed(2)+' '+c+' '+c+')');
  }
  function mains(idH,idM,secs,c){
    rot(idH,((secs/3600)%12)*30, c);
    rot(idM,((secs/60)%60)*6, c);
  }
  function graduations(gid,cx,cy,r1,r2){
    var g=$(gid); if(!g)return; var NS='http://www.w3.org/2000/svg';
    for(var i=0;i<12;i++){
      var a=i*30*Math.PI/180, l=document.createElementNS(NS,'line');
      l.setAttribute('x1',(cx+Math.sin(a)*r1).toFixed(1)); l.setAttribute('y1',(cy-Math.cos(a)*r1).toFixed(1));
      l.setAttribute('x2',(cx+Math.sin(a)*r2).toFixed(1)); l.setAttribute('y2',(cy-Math.cos(a)*r2).toFixed(1));
      l.setAttribute('stroke','#8a6d1f'); l.setAttribute('stroke-width', gid==='hm-ticks' ? '2.4' : '1.4');
      g.appendChild(l);
    }
  }
  graduations('hm-ticks',100,100,80,90);
  graduations('sa-ticks',36,36,27,31);
  graduations('sn-ticks',36,36,27,31);
  graduations('ss-ticks',36,36,27,31);
  var fmtCivile=new Intl.DateTimeFormat('fr-CA',{timeZone:'America/Toronto',hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  var fmtDate=new Intl.DateTimeFormat('fr-CA',{timeZone:'America/Toronto',weekday:'long',day:'numeric',month:'long',year:'numeric'});
  var fmtDec=new Intl.DateTimeFormat('en-US',{timeZone:'America/Toronto',timeZoneName:'shortOffset'});
  function decalageToronto(now){
    var parts=fmtDec.formatToParts(now), tz='', i, m;
    for(i=0;i<parts.length;i++)if(parts[i].type==='timeZoneName')tz=parts[i].value;
    m=/GMT([+-]\d+(?:\.\d+)?)/.exec(tz);
    return m?parseFloat(m[1]):-5;
  }
  function maj(){
    var now=new Date();
    var dec=decalageToronto(now);
    var civile=fmtCivile.format(now);
    var p=civile.split(':'), secsCiv=(+p[0])*3600+(+p[1])*60+(+p[2]);
    texte('t-civile',civile);
    texte('t-regime', dec===-4 ? 'Heure avancée en vigueur — HAE (UTC−4).' : 'Heure normale en vigueur — HNE (UTC−5).');
    texte('t-date', fmtDate.format(now)+' — America/Toronto');
    rot('hm-h',((secsCiv/3600)%12)*30,100);
    rot('hm-m',((secsCiv/60)%60)*6,100);
    rot('hm-s',(secsCiv%60)*6,100);
    var av=instantDecale(now,-4), no=instantDecale(now,-5);
    texte('sat-av-val',av.txt); texte('sat-no-val',no.txt);
    texte('t-normale',no.txt);
    mains('sa-h','sa-m',av.secs,36);
    mains('sn-h','sn-m',no.secs,36);
    texte('t-utc',fmtHeureUTC(now));
    texte('t-tai',fmtHeureUTC(new Date(now.getTime()+TAI_MOINS_UTC*1000)));
    var g1=gmstPoly(now), g2=gmstCroise(now), l=lst(now);
    texte('t-gmst',hms(g1));
    texte('t-lst',hms(l));
    texte('sat-si-val',horloge(l));
    mains('ss-h','ss-m',l*240,36);
    texte('accueil-tsl',hms(l));
    texte('t-jj',jj(now).toFixed(5).replace('.',','));
    var rotations=(now.getTime()-PIVOT_MS)/86400000*FACTEUR;
    var rotEl=$('t-rotations');
    if(rotEl)rotEl.innerHTML=rotations.toFixed(2).replace('.',',')+' rotations — '+(Math.floor(rotations)+1)+'<sup>e</sup> tour en cours';
    var ecart=Math.abs(((g1-g2+540)%360)-180)*240;
    var ok=ecart<1;
    texte('t-croise-verdict', ok ? 'MATCH — les deux méthodes donnent le même GMST' : 'ÉCART — les deux méthodes divergent');
    var vy=$('t-croise-voyant'); if(vy)vy.className='voyant'+(ok?'':' attente');
    texte('t-croise-detail','Méthode 1 (polynôme) : '+hms(g1)+' — méthode 2 (0 h TU + facteur 1,00273790935) : '+hms(g2)+' — écart : '+ecart.toFixed(3).replace('.',',')+' s de temps sidéral.');
  }
  maj();
  setInterval(maj,1000);
})();

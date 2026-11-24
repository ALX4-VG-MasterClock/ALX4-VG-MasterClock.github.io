
/* ===== v21 — « La planète » : moteur astronomique maison, comptes confrontés, globe WebGL =====
   Mécanismes : cahier des charges fonctionnel inspiré des panneaux d’astronomie publics
   (quelles grandeurs, quels enchaînements) ; implémentation entièrement maison —
   formules publiées (Meeus, Astronomical Algorithms, formes basse précision ; famille
   solaire NOAA déjà au panneau), données publiques (NASA pour l’imagerie d’origine du
   site, Open-Meteo pour les nuages). Aucun code, texte, image ou donnée de tiers repris. */
(function(){
'use strict';
// MOTEUR21-CORE-DEBUT
var M21=(function(){
  var RAD=Math.PI/180, DEG=180/Math.PI;
  var F_SID=1.00273790935;            // rotations sidérales par jour solaire (constante du panneau)
  var C_KMS=299792.458;               // vitesse de la lumière, km/s
  var UA_KM=149597870.7;              // unité astronomique, km
  var JOUR_SID_S=86164.0905;          // jour sidéral, secondes
  var PIVOT_MS=Date.UTC(2026,2,20,14,46,0); // équinoxe de printemps 2026 (pivot du panneau)
  function norm360(x){x%=360;return x<0?x+360:x}
  function norm180(x){x=norm360(x);return x>180?x-360:x}
  function norm24(x){x%=24;return x<0?x+24:x}
  function jj(date){return date.getTime()/86400000+2440587.5}
  function gmstDeg(date){var J=jj(date),T=(J-2451545)/36525;return norm360(280.46061837+360.98564736629*(J-2451545)+0.000387933*T*T-T*T*T/38710000)}
  function epsDeg(T){return 23+(26+((21.448-T*(46.815+T*(0.00059-T*0.001813))))/60)/60}
  // Soleil — Meeus, forme basse précision (précision ≈ 0,01° sur la longitude, ≈ 0,0002 UA sur la distance)
  function soleilPrecis(date){
    var J=jj(date),T=(J-2451545)/36525;
    var L0=norm360(280.46646+T*(36000.76983+0.0003032*T));
    var M=357.52911+T*(35999.05029-0.0001537*T);
    var e=0.016708634-T*(0.000042037+0.0000001267*T);
    var C=(1.914602-T*(0.004817+0.000014*T))*Math.sin(M*RAD)+(0.019993-0.000101*T)*Math.sin(2*M*RAD)+0.000289*Math.sin(3*M*RAD);
    var vraiLong=L0+C, vraieAnom=M+C;
    var R=(1.000001018*(1-e*e))/(1+e*Math.cos(vraieAnom*RAD));
    var omega=125.04-1934.136*T;
    var lambda=vraiLong-0.00569-0.00478*Math.sin(omega*RAD);
    var eps=epsDeg(T)+0.00256*Math.cos(omega*RAD);
    var ra=norm360(Math.atan2(Math.cos(eps*RAD)*Math.sin(lambda*RAD),Math.cos(lambda*RAD))*DEG)/15;
    var dec=Math.asin(Math.sin(eps*RAD)*Math.sin(lambda*RAD))*DEG;
    return {longitudeEcliptique:lambda,ascensionDroiteH:ra,declinaison:dec,distanceUA:R,distanceKm:R*UA_KM,tempsLumiereMin:(R*UA_KM)/C_KMS/60,obliquite:eps};
  }
  // Lune — Meeus, forme basse précision (précision ≈ 0,3° sur la longitude, ≈ 0,1° sur la latitude, quelques milliers de km sur la distance)
  function lunePrecise(date){
    var J=jj(date),T=(J-2451545)/36525;
    var Lp=norm360(218.3164477+481267.88123421*T);
    var D=norm360(297.8501921+445267.1114034*T);
    var M=357.5291092+35999.0502909*T;
    var Mp=norm360(134.9633964+477198.8675055*T);
    var F=norm360(93.272095+483202.0175233*T);
    var lon=Lp+6.289*Math.sin(Mp*RAD)+1.274*Math.sin((2*D-Mp)*RAD)+0.658*Math.sin(2*D*RAD)+0.214*Math.sin(2*Mp*RAD)-0.186*Math.sin(M*RAD)-0.114*Math.sin(2*F*RAD);
    lon=norm360(lon);
    var lat=5.128*Math.sin(F*RAD)+0.281*Math.sin((Mp+F)*RAD)+0.278*Math.sin((Mp-F)*RAD)+0.173*Math.sin((2*D-F)*RAD);
    var dist=385000.56-20905*Math.cos(Mp*RAD)-3699*Math.cos((2*D-Mp)*RAD)-2956*Math.cos(2*D*RAD)-570*Math.cos(2*Mp*RAD);
    var eps=epsDeg(T);
    var ra=norm360(Math.atan2(Math.sin(lon*RAD)*Math.cos(eps*RAD)-Math.tan(lat*RAD)*Math.sin(eps*RAD),Math.cos(lon*RAD))*DEG)/15;
    var dec=Math.asin(Math.sin(lat*RAD)*Math.cos(eps*RAD)+Math.cos(lat*RAD)*Math.sin(eps*RAD)*Math.sin(lon*RAD))*DEG;
    return {longitudeEcliptique:lon,latitudeEcliptique:lat,ascensionDroiteH:ra,declinaison:dec,distanceKm:dist,tempsLumiereS:dist/C_KMS,elongationDeg:D};
  }
  function illumination(date){
    var s=soleilPrecis(date), l=lunePrecise(date);
    var cosPsi=Math.sin(s.declinaison*RAD)*Math.sin(l.declinaison*RAD)+Math.cos(s.declinaison*RAD)*Math.cos(l.declinaison*RAD)*Math.cos((s.ascensionDroiteH-l.ascensionDroiteH)*15*RAD);
    cosPsi=Math.max(-1,Math.min(1,cosPsi));
    var psi=Math.acos(cosPsi)*DEG; // élongation Soleil–Lune vue de la Terre
    return {fraction:(1-Math.cos(psi*RAD))/2,elongationDeg:psi};
  }
  function altaz(raH,decDeg,lstH,latDeg){
    var H=(lstH-raH)*15*RAD, dec=decDeg*RAD, lat=latDeg*RAD;
    var alt=Math.asin(Math.sin(dec)*Math.sin(lat)+Math.cos(dec)*Math.cos(lat)*Math.cos(H))*DEG;
    var az=Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(lat)-Math.tan(dec)*Math.cos(lat))*DEG+180;
    return {altitude:alt,azimut:norm360(az)};
  }
  function pointSub(raH,decDeg,date){ // point de la Terre où l’astre est au zénith
    var lon=norm180(raH*15-gmstDeg(date));
    return {lat:decDeg,lon:lon};
  }
  // Lever/coucher pour un zénith donné — algorithme solaire NOAA généralisé (même famille que soleil() du panneau)
  function passageZenith(date,lat,lon,zenith,lever){
    var deg=DEG;
    var jour=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate());
    var N=Math.round((jour-Date.UTC(date.getUTCFullYear(),0,0))/86400000);
    var lngHour=lon/15;
    var t=N+((lever?6:18)-lngHour)/24;
    var M=(0.9856*t)-3.289;
    var L=norm360(M+1.916*Math.sin(M*RAD)+0.020*Math.sin(2*M*RAD)+282.634);
    var RA=Math.atan(0.91764*Math.tan(L*RAD))*deg; if(RA<0)RA+=360;
    RA+=(Math.floor(L/90)*90-Math.floor(RA/90)*90); RA/=15;
    var sinDec=0.39782*Math.sin(L*RAD), cosDec=Math.cos(Math.asin(sinDec));
    var cosH=(Math.cos(zenith*RAD)-sinDec*Math.sin(lat*RAD))/(cosDec*Math.cos(lat*RAD));
    if(cosH>1||cosH<-1)return null;
    var H=(lever?360-Math.acos(cosH)*deg:Math.acos(cosH)*deg)/15;
    var T2=H+RA-0.06571*t-6.622;
    return norm24(T2-lngHour); // heures UTC (fraction)
  }
  function comptes(date){
    var J=jj(date);
    var solJ2000=J-2451545;
    var sidJ2000=solJ2000*F_SID;
    var solEq=(date.getTime()-PIVOT_MS)/86400000;
    var sidEq=solEq*F_SID;
    return {jj:J,jourSideral:sidJ2000,diffJ2000:sidJ2000-solJ2000,rotSolairesEq:solEq,rotSideralesEq:sidEq,diffEq:sidEq-solEq,diffEqSecondes:(sidEq-solEq)*JOUR_SID_S};
  }
  return {F_SID:F_SID,JOUR_SID_S:JOUR_SID_S,PIVOT_MS:PIVOT_MS,jj:jj,gmstDeg:gmstDeg,soleilPrecis:soleilPrecis,lunePrecise:lunePrecise,illumination:illumination,altaz:altaz,pointSub:pointSub,passageZenith:passageZenith,comptes:comptes,norm360:norm360,norm180:norm180,norm24:norm24};
})();
// MOTEUR21-CORE-FIN
if(typeof window!=='undefined')window.MOTEUR_ASTRO_V21=M21;
if(typeof document==='undefined')return;
var LAT=45.25, LON=-73.8024;
function $(id){return document.getElementById(id)}
function txt(id,v){var el=$(id);if(el)el.textContent=v}
function fr(x,d){return x.toFixed(d).replace('.',',')}
function frInt(x){return Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g,' ')}
function pad2(n){return (n<10?'0':'')+n}
function hms(h){h=M21.norm24(h);var H=Math.floor(h),m=Math.floor((h-H)*60),s=Math.floor((((h-H)*60)-m)*60);return H+' h '+pad2(m)+' min '+pad2(s)+' s'}
function hm(h){h=M21.norm24(h);var H=Math.floor(h),m=Math.round((h-H)*60);if(m===60){m=0;H=(H+1)%24}return H+' h '+pad2(m)}
function heureUTC(date,frac){var ms=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())+frac*3600000;return new Date(ms)}
function fmtHeureToronto(d){try{return new Intl.DateTimeFormat('fr-CA',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Toronto'}).format(d)}catch(e){return d.toUTCString()}}
function lstHeures(date,lon){ // LST en heures via le GMST du moteur (même polynôme que le panneau)
  return M21.norm24((M21.gmstDeg(date)+lon)/15);
}
function majV21(){
  var now=new Date();
  var T=window.TEMPS_V16||null;
  // ----- Comptes confrontés -----
  var c=M21.comptes(now);
  txt('cc-jj',fr(c.jj,5));
  txt('cc-js',fr(c.jourSideral,5));
  txt('cc-diff',fr(c.diffJ2000,5)+' rotation'+(c.diffJ2000>=2?'s':''));
  txt('cc-rot-sol',fr(c.rotSolairesEq,4));
  txt('cc-rot-sid',fr(c.rotSideralesEq,4));
  txt('cc-diff-rot',fr(c.diffEq,4)+' rotation');
  txt('cc-diff-temps',hms(c.diffEqSecondes/3600));
  // ----- Soleil et Lune -----
  var s=M21.soleilPrecis(now), l=M21.lunePrecise(now), il=M21.illumination(now);
  var lst=lstHeures(now,LON);
  var azS=M21.altaz(s.ascensionDroiteH,s.declinaison,lst,LAT);
  var azL=M21.altaz(l.ascensionDroiteH,l.declinaison,lst,LAT);
  var subS=M21.pointSub(s.ascensionDroiteH,s.declinaison,now);
  var subL=M21.pointSub(l.ascensionDroiteH,l.declinaison,now);
  txt('esp-sol-dist',frInt(s.distanceKm)+' km ('+fr(s.distanceUA,4)+' UA)');
  txt('esp-sol-lumiere',fr(s.tempsLumiereMin,2)+' minutes-lumière');
  txt('esp-sol-ecl',fr(s.longitudeEcliptique,2)+'° écliptique');
  txt('esp-sol-eq',fr(s.ascensionDroiteH,3)+' h AD · '+fr(s.declinaison,2)+'° décl.');
  txt('esp-sol-altaz','hauteur '+fr(azS.altitude,1)+'° · azimut '+fr(azS.azimut,1)+'°');
  txt('esp-sol-sub','point subsolaire : '+fr(Math.abs(subS.lat),1)+'° '+(subS.lat>=0?'N':'S')+' · '+fr(Math.abs(subS.lon),1)+'° '+(subS.lon>=0?'E':'O'));
  txt('esp-lune-dist',frInt(l.distanceKm)+' km');
  txt('esp-lune-lumiere',fr(l.tempsLumiereS,2)+' secondes-lumière');
  txt('esp-lune-ecl',fr(l.longitudeEcliptique,2)+'° écl. · lat. '+fr(l.latitudeEcliptique,2)+'°');
  txt('esp-lune-eq',fr(l.ascensionDroiteH,3)+' h AD · '+fr(l.declinaison,2)+'° décl.');
  txt('esp-lune-altaz','hauteur '+fr(azL.altitude,1)+'° · azimut '+fr(azL.azimut,1)+'°');
  txt('esp-lune-phase','illumination '+fr(il.fraction*100,1)+' % · élongation '+fr(il.elongationDeg,1)+'°');
  txt('esp-lune-sub','point sublunaire : '+fr(Math.abs(subL.lat),1)+'° '+(subL.lat>=0?'N':'S')+' · '+fr(Math.abs(subL.lon),1)+'° '+(subL.lon>=0?'E':'O'));
  // ----- Déclinaison et cycle -----
  var decl=s.declinaison;
  txt('esp-dec',fr(decl,2)+'°');
  var hauteurMidi=90-Math.abs(LAT-decl);
  txt('esp-midi',fr(hauteurMidi,1)+'°');
  var solPan=T?T.soleil(now,LAT,LON):null;
  if(solPan){txt('esp-jour',hm(solPan.coucher-solPan.lever)+' de jour')}
  var solsticeHiver=Date.UTC(now.getUTCFullYear(),11,21);
  var joursSolstice=Math.round((solsticeHiver-Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()))/86400000);
  txt('esp-cycle',decl<0?(joursSolstice>0?('déclinaison sud, en route vers le solstice d’hiver — plus que '+joursSolstice+' jours'):'au plus profond du cycle sud, près du solstice d’hiver'):('déclinaison nord — le Soleil expose surtout l’hémisphère nord'));
  // ----- Géométrie de la météo (onglet Météo) -----
  txt('geo-dec',fr(decl,2)+'°');
  txt('geo-midi',fr(hauteurMidi,1)+'° au-dessus de l’horizon sud');
  if(solPan){txt('geo-duree',hm(solPan.coucher-solPan.lever));txt('geo-levercoucher','lever '+fmtHeureToronto(heureUTC(now,solPan.lever))+' · coucher '+fmtHeureToronto(heureUTC(now,solPan.coucher))+' (heure de Toronto) — calculés par l’algorithme solaire de la NOAA, exécuté par le moteur du site dans votre navigateur : la même valeur qu’à la lecture météo ci-dessus et qu’au panneau Méthode.')}
  // ----- La rotation en direct : cadrans sidéral et civil depuis minuit -----
  (function(){
    try{
      var fmtR=new Intl.DateTimeFormat('fr-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
      function naiveR(d){var pp={};fmtR.formatToParts(d).forEach(function(x){pp[x.type]=x.value});return Date.UTC(+pp.year,+pp.month-1,+pp.day,(+pp.hour)%24,+pp.minute,+pp.second);}
      var partsR={};fmtR.formatToParts(now).forEach(function(x){partsR[x.type]=x.value});
      var cibleR=Date.UTC(+partsR.year,+partsR.month-1,+partsR.day,0,0,0);
      var minuitR=cibleR+5*3600000;
      for(var k=0;k<3;k++){minuitR-=(naiveR(new Date(minuitR))-cibleR);}
      var rotSidR=((now.getTime()-minuitR)/1000)/86164.0905;
      var rotCivR=((naiveR(now)-cibleR)/1000)/86400;
      var diffR=rotSidR-rotCivR;
      txt('rot-sid-tours',fr(rotSidR,4)+' tour');
      txt('rot-civ-tours',fr(rotCivR,4)+' tour');
      txt('rot-diff-deg',fr(diffR*360,2)+'° d’avance');
      txt('rot-diff-temps',hms(diffR*86164.0905/3600));
      var cEq=M21.comptes(now);
      txt('rot-diff-eq',fr(cEq.diffEq,4)+' rotation');
      txt('rot-diff-eq-temps',hms(cEq.diffEqSecondes/3600));
      var aS=document.getElementById('rot-aig-sid'); if(aS)aS.setAttribute('transform','rotate('+((rotSidR*360)%360).toFixed(1)+' 75 75)');
      var aC=document.getElementById('rot-aig-civ'); if(aC)aC.setAttribute('transform','rotate('+((rotCivR*360)%360).toFixed(1)+' 75 75)');
    }catch(e){}
  })();
  // ----- Compte civil de 24 heures (calendrier de Toronto) et temps atomique -----
  (function(){
    try{
      var fmt=new Intl.DateTimeFormat('fr-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
      function lectureNaive(d){var parts={};fmt.formatToParts(d).forEach(function(x){parts[x.type]=x.value});
        return Date.UTC(+parts.year,(+parts.month)-1,+parts.day,(+parts.hour)%24,+parts.minute,+parts.second);}
      var civ=(lectureNaive(now)-lectureNaive(new Date(M21.PIVOT_MS)))/86400000;
      txt('cc-rot-civ',fr(civ,4));
      var ecartS=(c.rotSolairesEq-civ)*86400;
      txt('cc-diff-civ',(ecartS>=0?'+':'−')+' '+hms(Math.abs(ecartS)/3600));
    }catch(e){}
    var tai=new Date(now.getTime()+37000);
    txt('tai-horloge',pad2(tai.getUTCHours())+' h '+pad2(tai.getUTCMinutes())+' min '+pad2(tai.getUTCSeconds())+' s TAI');
    txt('tai-secondes',frInt(Math.floor((now.getTime()-M21.PIVOT_MS)/1000))+' s');
  })();
  // ----- Fiche sidérale confrontée -----
  txt('fs-ancre',hms(lst));
  try{txt('fs-civile',new Intl.DateTimeFormat('fr-CA',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'America/Toronto'}).format(now))}catch(e){}
  var mv=$('mir-v-siderale'), mt=$('mir-v-titre');
  if(mv&&mv.textContent&&mv.textContent.indexOf('h')>-1){
    txt('fs-visiteur',mv.textContent.trim());
    if(mt)txt('fs-visiteur-nom',mt.textContent.trim());
    var m2=mv.textContent.match(/(\d+)\s*h\s*(\d+)\s*min\s*(\d+)/);
    if(m2){var vh=(+m2[1])+(+m2[2])/60+(+m2[3])/3600;var d=((vh-lst+36)%24)-12;txt('fs-ecart',(d>=0?'+':'−')+' '+hms(Math.abs(d))+(d>=0?' — son horloge sidérale avance sur l’ancre':' — son horloge sidérale retarde sur l’ancre'))}
  }
  // ----- Ce soir à l’ancre (recalculé toutes les minutes seulement) -----
  if(!majV21._soirTs||now.getTime()-majV21._soirTs>60000){majV21._soirTs=now.getTime();majSoir(now)}
}
function majSoir(now){
  var coucher=M21.passageZenith(now,LAT,LON,90.833,false);
  var finCiv=M21.passageZenith(now,LAT,LON,96,false);
  var finNau=M21.passageZenith(now,LAT,LON,102,false);
  var finAst=M21.passageZenith(now,LAT,LON,108,false);
  if(coucher===null){txt('soir-coucher','le Soleil ne se couche pas aujourd’hui à l’ancre (cas polaire — dit, pas maquillé)');return}
  var dCoucher=heureUTC(now,coucher);
  txt('soir-coucher',fmtHeureToronto(dCoucher)+' (heure de Toronto)');
  txt('soir-civil',finCiv!==null?fmtHeureToronto(heureUTC(now,finCiv)):'pas de crépuscule civil complet ce soir');
  txt('soir-nautique',finNau!==null?fmtHeureToronto(heureUTC(now,finNau)):'pas de crépuscule nautique complet ce soir');
  txt('soir-astro',finAst!==null?fmtHeureToronto(heureUTC(now,finAst)):'la nuit astronomique complète n’est pas atteinte ce soir');
  // Exposition lunaire : balayage de la nuit, pas de 10 minutes
  var demain=new Date(now.getTime()+86400000);
  var lever=M21.passageZenith(demain,LAT,LON,90.833,true);
  var finNuit=lever!==null?heureUTC(demain,lever).getTime():dCoucher.getTime()+12*3600000;
  var debut=dCoucher.getTime(), total=0, dessus=0, maxAlt=-90, maxT=null;
  for(var t=debut;t<=finNuit;t+=600000){
    var d=new Date(t), ll=M21.lunePrecise(d), aa=M21.altaz(ll.ascensionDroiteH,ll.declinaison,lstHeures(d,LON),LAT);
    total++; if(aa.altitude>0)dessus++; if(aa.altitude>maxAlt){maxAlt=aa.altitude;maxT=d}
  }
  var il=M21.illumination(now);
  if(total>0){
    var expo=il.fraction*(dessus/total)*100;
    txt('soir-lune','culmination '+fmtHeureToronto(maxT)+' à '+fr(maxAlt,0)+'° · au-dessus de l’horizon '+fr(dessus/total*100,0)+' % de la nuit · exposition (illumination × présence) ≈ '+fr(expo,0)+' %');
  }
  // Nuages du soir — Open-Meteo, sourcés et datés ; l’échec se dit
  if(!majSoir._nuagesTs||Date.now()-majSoir._nuagesTs>1800000){
    majSoir._nuagesTs=Date.now();
    try{
      fetch('https://api.open-meteo.com/v1/forecast?latitude=45.24915&longitude=-73.7989&hourly=cloud_cover&timezone=America%2FToronto&forecast_days=2')
      .then(function(r){return r.json()})
      .then(function(j){
        var H=j&&j.hourly; if(!H||!H.time)throw new Error('format');
        var jour=new Date().toLocaleDateString('fr-CA',{timeZone:'America/Toronto'});
        var vals=[];
        for(var i=0;i<H.time.length;i++){if(H.time[i].indexOf(jour)===0){var hh=+H.time[i].substr(11,2);if(hh>=18&&hh<=23)vals.push(H.cloud_cover[i])}}
        if(vals.length){var moy=vals.reduce(function(a,b){return a+b},0)/vals.length;txt('soir-nuages','couverture nuageuse moyenne de 18 h à 24 h : '+Math.round(moy)+' % — Open-Meteo, relevé du '+jour+' (heure de Toronto)')}
        else txt('soir-nuages','nuages du soir : série horaire non rejointe dans la réponse d’Open-Meteo');
      })
      .catch(function(){txt('soir-nuages','nuages du soir : Open-Meteo non rejoint à l’instant — aucune valeur inventée')});
    }catch(e){txt('soir-nuages','nuages du soir : lecture impossible dans ce navigateur')}
  }
}
// ----- Globe WebGL : sphère, terminateur sur la surface, axe et écliptique -----
(function initGlobe(){
  var cv=$('globe-webgl'); if(!cv)return;
  var etat=$('globe-webgl-etat');
  var gl=null;
  try{gl=cv.getContext('webgl')||cv.getContext('experimental-webgl')}catch(e){}
  if(!gl){if(etat)etat.textContent='Globe WebGL : non disponible dans ce navigateur — la scène actuelle demeure, intacte (repli écrit).';return}
  function sh(type,src){var o=gl.createShader(type);gl.shaderSource(o,src);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))return null;return o}
  var vs='attribute vec3 pos;attribute vec3 nor;attribute vec2 uv;uniform mat4 mvp;uniform mat4 rot;varying vec2 vUv;varying vec3 vTerre;varying vec3 vVue;void main(){vUv=uv;vTerre=nor;vec4 p=rot*vec4(pos,1.0);vVue=(rot*vec4(nor,0.0)).xyz;gl_Position=mvp*p;}';
  var fs='precision mediump float;varying vec2 vUv;varying vec3 vTerre;varying vec3 vVue;uniform sampler2D tex;uniform vec3 soleil;uniform vec3 centre;uniform float aTex;uniform float mode;uniform vec3 couleur;'+
  'float h21(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}'+
  'void main(){if(mode>0.5){gl_FragColor=vec4(couleur,1.0);return;}vec3 base=aTex>0.5?texture2D(tex,vUv).rgb:vec3(0.04,0.12,0.22);'+
  'float loin=1.0-smoothstep(0.2,0.9,dot(normalize(vTerre),normalize(centre)));'+
  'base=mix(base,vec3(0.03,0.10,0.20),loin*0.75);'+
  'float d=dot(normalize(vTerre),normalize(soleil));'+
  'float jour=smoothstep(-0.10,0.28,d);'+
  'vec3 col=base*(0.05+1.10*max(d,0.0));'+
  'col=mix(base*0.10+vec3(0.008,0.016,0.045),col,jour);'+
  'float lum=dot(base,vec3(0.299,0.587,0.114));'+
  'float sp=step(0.968,h21(floor(vUv*vec2(900.0,450.0))));'+
  'col+=vec3(1.0,0.84,0.52)*sp*(1.0-jour)*smoothstep(0.22,0.55,lum)*0.85;'+
  'float rim=pow(1.0-abs(normalize(vVue).z),3.0);'+
  'col+=vec3(0.22,0.45,0.75)*rim*0.35;'+
  'gl_FragColor=vec4(col,1.0);}';
  var v=sh(gl.VERTEX_SHADER,vs), f=sh(gl.FRAGMENT_SHADER,fs);
  if(!v||!f){if(etat)etat.textContent='Globe WebGL : shaders refusés par ce navigateur — la scène actuelle demeure (repli écrit).';return}
  var pr=gl.createProgram();gl.attachShader(pr,v);gl.attachShader(pr,f);gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){if(etat)etat.textContent='Globe WebGL : programme non lié — la scène actuelle demeure (repli écrit).';return}
  gl.useProgram(pr);
  // Géométrie de la sphère (pas de 3°)
  var P=[],N=[],U=[],I=[];
  for(var la=-90;la<90;la+=3){for(var lo=0;lo<360;lo+=3){
    function pt(lat,lon){var p=lat*Math.PI/180,l=lon*Math.PI/180;return [Math.cos(p)*Math.sin(l),Math.sin(p),Math.cos(p)*Math.cos(l)]}
    var a=pt(la,lo),b=pt(la,lo+3),c2=pt(la+3,lo+3),d2=pt(la+3,lo);
    var base=P.length/3;
    [a,b,c2,d2].forEach(function(q){P.push(q[0],q[1],q[2]);N.push(q[0],q[1],q[2])});
    U.push(lo/360,1-(la+90)/180,(lo+3)/360,1-(la+90)/180,(lo+3)/360,1-(la+93)/180,lo/360,1-(la+93)/180);
    I.push(base,base+1,base+2,base,base+2,base+3);
  }}
  function buf(data,type){var b=gl.createBuffer();gl.bindBuffer(type,b);gl.bufferData(type,data,gl.STATIC_DRAW);return b}
  var bP=buf(new Float32Array(P),gl.ARRAY_BUFFER), bN=buf(new Float32Array(N),gl.ARRAY_BUFFER), bU=buf(new Float32Array(U),gl.ARRAY_BUFFER);
  var bI=buf(new Uint16Array(I),gl.ELEMENT_ARRAY_BUFFER);
  function attr(nom,b,taille){var l=gl.getAttribLocation(pr,nom);gl.enableVertexAttribArray(l);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.vertexAttribPointer(l,taille,gl.FLOAT,false,0,0)}
  attr('pos',bP,3);attr('nor',bN,3);attr('uv',bU,2);
  var uMvp=gl.getUniformLocation(pr,'mvp'), uRot=gl.getUniformLocation(pr,'rot'), uSoleil=gl.getUniformLocation(pr,'soleil'), uCentre=gl.getUniformLocation(pr,'centre'), uTex=gl.getUniformLocation(pr,'aTex');
  var uMode=gl.getUniformLocation(pr,'mode'), uCouleur=gl.getUniformLocation(pr,'couleur');
  gl.uniform1f(uMode,0);
  // Texture : la photo Terre du site (imagerie d’origine NASA, déjà au paquet)
  var tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([8,32,48,255]));
  gl.uniform1i(uTex,0);gl.uniform1f(gl.getUniformLocation(pr,'aTex'),0);
  var img=document.querySelector('.planete-globe img');
  function chargeTex(){
    if(!img||!img.naturalWidth)return;
    try{gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.uniform1f(gl.getUniformLocation(pr,'aTex'),1);}catch(e){}
  }
  if(img&&img.complete)chargeTex(); else if(img)img.addEventListener('load',chargeTex);
  function matI(){return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]}
  function mul(a,b){var o=new Array(16);for(var c=0;c<4;c++)for(var r=0;r<4;r++){o[c*4+r]=0;for(var k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k]}return o}
  function ry(a){var c=Math.cos(a),s=Math.sin(a);return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]}
  function rx(a){var c=Math.cos(a),s=Math.sin(a);return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]}
  function persp(fov,asp,n,f){var t=1/Math.tan(fov/2);return [t/asp,0,0,0, 0,t,0,0, 0,0,(f+n)/(n-f),-1, 0,0,2*f*n/(n-f),0]}
  function transZ(z){var m=matI();m[14]=z;return m}
  var cur={lon:-40,lat:25};
  var lignes=gl.createBuffer();
  function dessineLignes(rot,mvp){
    // Axe des pôles (prolongé) + grand cercle de l’écliptique du jour
    var sub=window.TEMPS_V16?window.TEMPS_V16.pointSubsolaire(new Date()):{lat:0,lon:0};
    var sl=sub.lat*Math.PI/180, so=sub.lon*Math.PI/180;
    var S=[Math.cos(sl)*Math.sin(so),Math.sin(sl),Math.cos(sl)*Math.cos(so)];
    var pts=[[0,-1.32,0],[0,1.32,0]];
    var vx=-S[2],vy=0,vz=S[0]; var vl=Math.sqrt(vx*vx+vz*vz)||1; vx/=vl;vz/=vl;
    for(var i=0;i<=72;i++){var t=i/72*2*Math.PI;pts.push([S[0]*Math.cos(t)+vx*Math.sin(t),S[1]*Math.cos(t)+vy*Math.sin(t),S[2]*Math.cos(t)+vz*Math.sin(t)])}
    gl.bindBuffer(gl.ARRAY_BUFFER,lignes);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([].concat.apply([],pts)),gl.DYNAMIC_DRAW);
    var l=gl.getAttribLocation(pr,'pos');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,3,gl.FLOAT,false,0,0);
    gl.uniformMatrix4fv(uRot,false,new Float32Array(rot));gl.uniformMatrix4fv(uMvp,false,new Float32Array(mvp));
    gl.uniform1f(uMode,1);
    gl.uniform3f(uCouleur,0.83,0.69,0.22); // axe : or
    gl.drawArrays(gl.LINES,0,2);
    gl.uniform3f(uCouleur,0.45,0.75,0.65); // écliptique : vert d’eau
    gl.drawArrays(gl.LINE_STRIP,2,73);
    gl.uniform1f(uMode,0);
  }
  var actif=false;
  function cadre(){
    requestAnimationFrame(cadre);
    var T=window.TEMPS_V16;
    if(T&&T.vueActuelle){var cible=T.vueActuelle();
      var dl=((cible.lon-cur.lon+540)%360)-180; cur.lon+=dl*0.10; cur.lat+=(cible.lat-cur.lat)*0.10;}
    var w=cv.clientWidth||300, h=cv.clientHeight||300, dpr=Math.min(window.devicePixelRatio||1,2);
    if(cv.width!==Math.round(w*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}
    gl.viewport(0,0,cv.width,cv.height);
    gl.clearColor(0.01,0.03,0.02,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    var rot=mul(rx(-cur.lat*Math.PI/180),ry(-cur.lon*Math.PI/180));
    var mvp=mul(persp(Math.PI/4,1,0.1,10),mul(transZ(-2.75),rot));
    var sub=window.TEMPS_V16?window.TEMPS_V16.pointSubsolaire(new Date()):{lat:0,lon:0};
    var sl=sub.lat*Math.PI/180, so=sub.lon*Math.PI/180;
    gl.uniformMatrix4fv(uRot,false,new Float32Array(rot));
    gl.uniformMatrix4fv(uMvp,false,new Float32Array(mvp));
    gl.uniform3f(uSoleil,Math.cos(sl)*Math.sin(so),Math.sin(sl),Math.cos(sl)*Math.cos(so));
    var cl=25*Math.PI/180, co=-40*Math.PI/180;
    gl.uniform3f(uCentre,Math.cos(cl)*Math.sin(co),Math.sin(cl),Math.cos(cl)*Math.cos(co));
    attr('pos',bP,3);attr('nor',bN,3);attr('uv',bU,2);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,bI);
    gl.uniform1f(uMode,0);
    gl.drawElements(gl.TRIANGLES,I.length,gl.UNSIGNED_SHORT,0);
    dessineLignes(rot,mvp);
    if(!actif){actif=true;cv.style.display='block';
      if(img)img.style.visibility='hidden';
      var nuit=$('planete-nuit'); if(nuit)nuit.style.display='none';
      if(etat)etat.textContent='Globe WebGL actif : la sphère tourne avec la vue (glissez le globe), le terminateur est calculé sur sa surface à chaque seconde, l’axe des pôles est prolongé en or et le grand cercle de l’écliptique du jour est tracé — l’axe est incliné à 23,44° sur ce plan. La texture reprend la photo de l’Atlantique du site, enroulée : la face opposée s’y atténue vers l’océan profond plutôt que d’inventer des continents. Lueurs de villes stylisées sur la face nuit.';}
  }
  requestAnimationFrame(cadre);
})();
try{majV21();setInterval(majV21,1000)}catch(e){}
})();

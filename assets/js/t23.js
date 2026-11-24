
// ---------- v16 — Temps planétaire, ancrage ressenti, miroir du visiteur, Météo, recherche reliée ----------
// La Terre au centre ; Sainte-Martine, l’ancre fixe ; des horloges de comparaison
// ajoutables, chacune avec son heure civile, son heure sidérale (même polynôme
// GMST que le module v13) et l’histoire de son heure. Les « sens » de l’ancre et
// l’onglet Météo triangulent leurs sources et disent leurs échecs.
(function(){
  'use strict';
  var LAT_ANCRE=45.25, LON_ANCRE=-73.8024, ZONE_ANCRE='America/Toronto';
  // Réparation du 7 novembre 2026 (ordre d'Alex : « tu laisses pas une dérive ») — le point météo de l'ancre
  // est l'ancrage canonique du site (45,24915, −73,7989 : Master Clock, relevé embarqué, Porte nº 2).
  // LAT_ANCRE/LON_ANCRE restent les constantes partagées des calculs sidéraux et des sens, inchangées.
  var LAT_METEO_ANCRE=45.24915, LON_METEO_ANCRE=-73.7989;
  // ----- Fonctions pures (exposées pour vérification) -----
  function jj(date){return date.getTime()/86400000+2440587.5}
  function gmstPoly(date){
    var J=jj(date), T=(J-2451545.0)/36525;
    var g=280.46061837+360.98564736629*(J-2451545.0)+0.000387933*T*T-T*T*T/38710000;
    return ((g%360)+360)%360;
  }
  function gmst(date){
    if(typeof window!=='undefined'&&window.TRIANGULATION_TEMPS&&window.TRIANGULATION_TEMPS.gmst)return window.TRIANGULATION_TEMPS.gmst(date);
    return gmstPoly(date);
  }
  function lstLieu(date,lon){return ((gmst(date)+lon)%360+360)%360}
  function projection(lat,lon){
    var lat0=VUE.lat*Math.PI/180, d0=VUE.lon;
    var phi=lat*Math.PI/180, dLam=(lon-d0)*Math.PI/180;
    var cosc=Math.sin(lat0)*Math.sin(phi)+Math.cos(lat0)*Math.cos(phi)*Math.cos(dLam);
    var x=Math.cos(phi)*Math.sin(dLam);
    var y=Math.cos(lat0)*Math.sin(phi)-Math.sin(lat0)*Math.cos(phi)*Math.cos(dLam);
    return {x:x,y:y,visible:cosc>0};
  }
  function decalageHeures(zone,date){
    var fmt=new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'shortOffset'});
    var parts=fmt.formatToParts(date), tz='', i, m;
    for(i=0;i<parts.length;i++)if(parts[i].type==='timeZoneName')tz=parts[i].value;
    m=/GMT([+-]\d+(?::\d+)?)?/.exec(tz);
    if(!m||!m[1])return 0;
    var sgn=m[1].charAt(0)==='-'?-1:1, corps=m[1].replace(/^[+-]/,''), morceaux=corps.split(':');
    return sgn*(parseFloat(morceaux[0])+(morceaux[1]?parseFloat(morceaux[1])/60:0));
  }
  function histoireHeure(zone,date){
    var an=date.getFullYear();
    var jan=decalageHeures(zone,new Date(Date.UTC(an,0,1,12,0,0)));
    var jul=decalageHeures(zone,new Date(Date.UTC(an,6,1,12,0,0)));
    var base=decalageHeures(zone,date), prochain=null, d, t;
    for(d=1;d<=400;d++){
      t=new Date(date.getTime()+d*86400000);
      if(decalageHeures(zone,t)!==base){prochain=t;break}
    }
    return {jan:jan,jul:jul,change:jan!==jul,prochain:prochain};
  }
  function ageLune(date){
    var syn=29.53058867, a=(jj(date)-2451550.1)%syn;
    return a<0?a+syn:a;
  }
  function illumLune(date){return (1-Math.cos(2*Math.PI*ageLune(date)/29.53058867))/2}
  function soleil(date,lat,lon){
    // Algorithme solaire standard de la NOAA — lever/coucher en heures UTC (fraction).
    var rad=Math.PI/180, deg=180/Math.PI;
    var jour=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate());
    var N=Math.round((jour-Date.UTC(date.getUTCFullYear(),0,0))/86400000);
    var lngHour=lon/15;
    function calc(lever){
      var t=N+((lever?6:18)-lngHour)/24;
      var M=(0.9856*t)-3.289;
      var L=(M+1.916*Math.sin(M*rad)+0.020*Math.sin(2*M*rad)+282.634)%360; if(L<0)L+=360;
      var RA=Math.atan(0.91764*Math.tan(L*rad))*deg; if(RA<0)RA+=360;
      RA+=(Math.floor(L/90)*90-Math.floor(RA/90)*90); RA/=15;
      var sinDec=0.39782*Math.sin(L*rad), cosDec=Math.cos(Math.asin(sinDec));
      var cosH=(Math.cos(90.833*rad)-sinDec*Math.sin(lat*rad))/(cosDec*Math.cos(lat*rad));
      if(cosH>1||cosH<-1)return null;
      var H=(lever?360-Math.acos(cosH)*deg:Math.acos(cosH)*deg)/15;
      var T=H+RA-0.06571*t-6.622;
      var UT=(T-lngHour)%24; if(UT<0)UT+=24;
      return UT;
    }
    var l=calc(true), c=calc(false);
    if(l===null||c===null)return null;
    return {lever:l,coucher:c};
  }
  function heureSolaireApprox(date,lon){
    var h=(date.getUTCHours()+date.getUTCMinutes()/60+date.getUTCSeconds()/3600+lon/15)%24;
    return h<0?h+24:h;
  }
  function haversine(lat1,lon1,lat2,lon2){
    var R=6371, rad=Math.PI/180;
    var dLat=(lat2-lat1)*rad, dLon=(lon2-lon1)*rad;
    var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return 2*R*Math.asin(Math.sqrt(a));
  }
  function pliage(s){
    return String(s).replace(/./g,function(c){
      var f=c.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return (f.charAt(0)||c).toLowerCase();
    });
  }
  // ----- v18 — Vue pivotante, Soleil calculé et ombre de nuit -----
  var VUE={lat:25,lon:-40}; // centre de la projection orthographique (la vue Atlantique par défaut)
  var dernierGlisser=0;
  function definirVue(lon,lat){
    VUE.lon=((lon+540)%360)-180;
    VUE.lat=Math.max(-60,Math.min(60,lat));
  }
  function vueActuelle(){return {lat:VUE.lat,lon:VUE.lon}}
  function pointSubsolaire(date){
    // Formules solaires standard de la NOAA (année fractionnaire) : déclinaison
    // du Soleil et équation du temps, puis la longitude où il est midi vrai.
    var debut=Date.UTC(date.getUTCFullYear(),0,0);
    var jour=Math.floor((Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())-debut)/86400000);
    var hUTC=date.getUTCHours()+date.getUTCMinutes()/60+date.getUTCSeconds()/3600;
    var g=2*Math.PI/365*(jour-1+(hUTC-12)/24);
    var eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
    var decl=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
    var lon=(720-(hUTC*60+eq))/4;
    return {lat:decl*180/Math.PI,lon:((lon+540)%360)-180,eqtime:eq};
  }
  function elevationSoleil(date,lat,lon){
    var s=pointSubsolaire(date), rad=Math.PI/180;
    var c=Math.sin(lat*rad)*Math.sin(s.lat*rad)+Math.cos(lat*rad)*Math.cos(s.lat*rad)*Math.cos((lon-s.lon)*rad);
    c=Math.max(-1,Math.min(1,c));
    return 90-Math.acos(c)*180/Math.PI;
  }
  function vecteurDir(lat,lon){
    var r=Math.PI/180;
    return {x:Math.cos(lat*r)*Math.cos(lon*r),y:Math.cos(lat*r)*Math.sin(lon*r),z:Math.sin(lat*r)};
  }
  function cheminNuit(date){
    // Polygone de la partie visible du globe plongée dans la nuit, en
    // coordonnées du disque unité (x vers l’est, y vers le nord) : l’arc
    // visible du terminateur, fermé par l’arc du limbe opposé au Soleil.
    var s=pointSubsolaire(date);
    var S=vecteurDir(s.lat,s.lon), V=vecteurDir(VUE.lat,VUE.lon);
    var rad=Math.PI/180, phi0=VUE.lat*rad, lam0=VUE.lon*rad;
    var E={x:-Math.sin(lam0),y:Math.cos(lam0),z:0};
    var N={x:-Math.sin(phi0)*Math.cos(lam0),y:-Math.sin(phi0)*Math.sin(lam0),z:Math.cos(phi0)};
    function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z}
    function disquePlein(){
      var c=[], i, t;
      for(i=0;i<72;i++){t=i/72*2*Math.PI; c.push([Math.cos(t),Math.sin(t)])}
      return c;
    }
    var dotSV=dot(S,V);
    if(dotSV<-0.999999)return disquePlein();
    if(dotSV>0.999999)return [];
    var ref=Math.abs(S.z)<0.9?{x:0,y:0,z:1}:{x:1,y:0,z:0};
    var u={x:S.y*ref.z-S.z*ref.y,y:S.z*ref.x-S.x*ref.z,z:S.x*ref.y-S.y*ref.x};
    var ul=Math.sqrt(dot(u,u)); u={x:u.x/ul,y:u.y/ul,z:u.z/ul};
    var v={x:S.y*u.z-S.z*u.y,y:S.z*u.x-S.x*u.z,z:S.x*u.y-S.y*u.x};
    var NP=720, ech=[], i, t;
    for(i=0;i<NP;i++){
      t=i/NP*2*Math.PI;
      var P={x:u.x*Math.cos(t)+v.x*Math.sin(t),y:u.y*Math.cos(t)+v.y*Math.sin(t),z:u.z*Math.cos(t)+v.z*Math.sin(t)};
      ech.push({c:dot(P,V),x:dot(P,E),y:dot(P,N)});
    }
    var i0=-1;
    for(i=0;i<NP;i++)if(ech[i].c<=0){i0=i;break}
    if(i0===-1)return dot(S,V)<0?disquePlein():[];
    var arc=[], avant=ech[i0], apres=null, k;
    for(k=1;k<=NP;k++){
      var sm=ech[(i0+k)%NP];
      if(sm.c>0)arc.push(sm);
      else if(arc.length){apres=sm;break}
      else avant=sm;
    }
    if(!arc.length||!apres)return dot(S,V)<0?disquePlein():[];
    function croisement(a,b){
      var f=a.c/(a.c-b.c), x=a.x+(b.x-a.x)*f, y=a.y+(b.y-a.y)*f;
      var L=Math.sqrt(x*x+y*y)||1;
      return {x:x/L,y:y/L};
    }
    var deb=croisement(avant,arc[0]), fin=croisement(arc[arc.length-1],apres);
    function pointLimbe(a){
      return {x:E.x*Math.cos(a)+N.x*Math.sin(a),y:E.y*Math.cos(a)+N.y*Math.sin(a),z:E.z*Math.cos(a)+N.z*Math.sin(a)};
    }
    var deuxPi=2*Math.PI;
    var aD=Math.atan2(deb.y,deb.x), aF=Math.atan2(fin.y,fin.x);
    var delta=((aD-aF)%deuxPi+deuxPi)%deuxPi;
    var sens=dot(pointLimbe(aF+delta/2),S)<0?1:-1;
    var total=sens>0?delta:delta-deuxPi, pas=total/48;
    var poly=[[deb.x,deb.y]];
    arc.forEach(function(sm){poly.push([sm.x,sm.y])});
    poly.push([fin.x,fin.y]);
    for(k=1;k<48;k++){var a=aF+pas*k; poly.push([Math.cos(a),Math.sin(a)])}
    return poly;
  }
  function couchersCandidats(date,lat,lon){
    // Instants de coucher du Soleil (ms) autour de l’instant donné, par
    // l’algorithme NOAA déjà utilisé pour l’ancre (soleil()) : les dates UTC
    // voisines sont balayées pour ne pas rater le coucher « du jour » local.
    var res=[], d, s, base;
    for(d=-1;d<=1;d++){
      var j=new Date(date.getTime()+d*86400000);
      s=soleil(j,lat,lon);
      if(!s)continue;
      base=Date.UTC(j.getUTCFullYear(),j.getUTCMonth(),j.getUTCDate());
      res.push(base+s.coucher*3600000);
    }
    return res.sort(function(a,b){return a-b});
  }
  function prochainCoucher(date,lat,lon){
    var cs=couchersCandidats(date,lat,lon), i;
    for(i=0;i<cs.length;i++)if(cs[i]>=date.getTime()&&cs[i]-date.getTime()<=86400000)return cs[i];
    return null;
  }
  function dernierCoucher(date,lat,lon){
    var cs=couchersCandidats(date,lat,lon), i, r=null;
    for(i=0;i<cs.length;i++)if(cs[i]<=date.getTime())r=cs[i];
    return r;
  }
  var PISTES_ORBITE=[1,0.78,1.18]; // v17 — pistes de l’orbite : rayon principal, intérieur, extérieur
  if(typeof window!=='undefined')window.TEMPS_V16={jj:jj,gmst:gmstPoly,lstLieu:lstLieu,projection:projection,decalageHeures:decalageHeures,histoireHeure:histoireHeure,ageLune:ageLune,illumLune:illumLune,soleil:soleil,heureSolaireApprox:heureSolaireApprox,haversine:haversine,pliage:pliage,rechercherUnites:rechercherUnites,placerOrbite:placerOrbite,placerPastilles:placerPastilles,geometriePour:geometriePour,pointSubsolaire:pointSubsolaire,elevationSoleil:elevationSoleil,cheminNuit:cheminNuit,prochainCoucher:prochainCoucher,dernierCoucher:dernierCoucher,definirVue:definirVue,vueActuelle:vueActuelle,LAT_ANCRE:LAT_ANCRE,LON_ANCRE:LON_ANCRE};
  if(typeof document==='undefined')return;
  // ----- Outils d’affichage -----
  function $(id){return document.getElementById(id)}
  function texte(id,val){var el=$(id); if(el)el.textContent=val}
  function pad(n){return (n<10?'0':'')+n}
  function fr(n,dec){return n.toFixed(dec).replace('.',',')}
  function horlogeDeg(degs){
    var t=((degs%360)+360)%360, s=t*240;
    return pad(Math.floor(s/3600))+':'+pad(Math.floor(s%3600/60))+':'+pad(Math.floor(s%60));
  }
  function hmsLong(degs){
    var t=((degs%360)+360)%360, s=t*240;
    return pad(Math.floor(s/3600))+' h '+pad(Math.floor(s%3600/60))+' min '+pad(Math.floor(s%60))+' s';
  }
  function fmtEcart(h){
    if(h===0)return '0 h';
    var sgn=h>0?'+':'−', a=Math.abs(h), H=Math.floor(a), M=Math.round((a-H)*60);
    if(M===60){H++;M=0}
    return sgn+H+' h'+(M?' '+pad(M):'');
  }
  function fmtUTC(h){
    if(h===0)return 'UTC';
    var sgn=h>0?'+':'−', a=Math.abs(h), H=Math.floor(a), M=Math.round((a-H)*60);
    if(M===60){H++;M=0}
    return 'UTC'+sgn+H+(M?':'+pad(M):'');
  }
  function fmtAge(quand){
    if(!quand)return '';
    var mins=Math.max(0,Math.round((Date.now()-quand.getTime())/60000));
    if(mins<=0)return 'à l’instant';
    if(mins<60)return 'il y a '+mins+' min';
    return 'il y a '+Math.floor(mins/60)+' h '+pad(mins%60);
  }
  function fmtHeureZone(epochMs,zone){
    return new Intl.DateTimeFormat('fr-CA',{timeZone:zone,hourCycle:'h23',hour:'2-digit',minute:'2-digit'}).format(new Date(epochMs));
  }
  var fmtCivilCache={};
  function fmtCivil(zone){
    if(!fmtCivilCache[zone])fmtCivilCache[zone]=new Intl.DateTimeFormat('fr-CA',{timeZone:zone,hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'});
    return fmtCivilCache[zone];
  }
  function fmtCoord(lat,lon){
    var la=Math.abs(lat).toFixed(2).replace('.',',')+'° '+(lat>=0?'N':'S');
    var lo=Math.abs(lon).toFixed(4).replace('.',',').replace(/0+$/,'').replace(/,$/,'')+'° '+(lon>=0?'E':'O');
    return la+' · '+lo;
  }
  // ----- Les lieux -----
  var LIEUX=[
    {id:'sainte-martine',nom:'Sainte-Martine',zone:'America/Toronto',lat:45.25,lon:-73.8024,ancre:true,note:'Sainte-Martine suit le régime nord-américain : heure avancée du deuxième dimanche de mars au premier dimanche de novembre. Le 1er novembre 2026, le Québec a reculé ses horloges — le jour même où la Colombie-Britannique cessait de le faire. C’est pour lire ces régimes ensemble, plutôt que les croire un à un, que ce panneau triangule.'},
    {id:'vancouver',nom:'Vancouver',zone:'America/Vancouver',lat:49.28,lon:-123.12,note:'Le 8 mars 2026, la Colombie-Britannique a avancé ses horloges pour la dernière fois : la province demeure depuis à UTC−7 toute l’année, et le recul du 1er novembre 2026 n’a pas eu lieu chez elle. La loi de 2019 qui le permettait a été mise en vigueur le 9 mars 2026 — l’heure fixe y est toute récente.'},
    {id:'los-angeles',nom:'Los Angeles',zone:'America/Los_Angeles',lat:34.05,lon:-118.24,note:'En novembre 2018, les électeurs californiens ont approuvé la proposition 7 (environ 60 %) : la législature peut changer le régime d’heure, mais l’heure d’été permanente exige un feu vert du Congrès, jamais venu. Los Angeles continue donc d’avancer et de reculer aux dates fédérales.'},
    {id:'mexico',nom:'Mexico',zone:'America/Mexico_City',lat:19.43,lon:-99.13,note:'Le Mexique a aboli l’heure d’été le 30 octobre 2022 pour la plus grande partie du pays ; Mexico demeure à UTC−6 toute l’année. Seules des municipalités proches de la frontière américaine continuent de suivre le régime des États-Unis.'},
    {id:'new-york',nom:'New York',zone:'America/New_York',lat:40.71,lon:-74.01,note:'L’heure d’été américaine naît en 1918, est uniformisée par l’Uniform Time Act de 1966, et court depuis 2007 du deuxième dimanche de mars au premier dimanche de novembre. New York suit ce régime fédéral — aux mêmes dates que le Québec.'},
    {id:'sao-paulo',nom:'São Paulo',zone:'America/Sao_Paulo',lat:-23.55,lon:-46.63,note:'Le Brésil a aboli l’heure d’été par décret présidentiel le 25 avril 2019, après l’avoir pratiquée depuis 1931 : les économies d’énergie attendues étaient devenues négligeables. São Paulo demeure depuis à UTC−3 toute l’année.'},
    {id:'reykjavik',nom:'Reykjavík',zone:'Atlantic/Reykjavik',lat:64.15,lon:-21.94,note:'L’Islande a fixé son heure à GMT (UTC+0) le 7 avril 1968 et n’a plus jamais changé d’heure depuis. À sa latitude, les jours d’hiver sont si courts et les nuits d’été si claires que déplacer l’heure n’y gagne rien.'},
    {id:'londres',nom:'Londres',zone:'Europe/London',lat:51.51,lon:-0.13,note:'L’heure d’été britannique naît du Summer Time Act de 1916, mesure de guerre : les horloges avancent pour la première fois le 21 mai 1916. Depuis 1980, Londres avance le dernier dimanche de mars et recule le dernier dimanche d’octobre — des dates harmonisées avec l’Europe depuis les années 1990.'},
    {id:'paris',nom:'Paris',zone:'Europe/Paris',lat:48.86,lon:2.35,note:'Paris avance ses horloges pour la première fois le 14 juin 1916. L’heure d’été disparaît après 1945, revient en 1976, et suit depuis le rythme européen : dernier dimanche de mars, dernier dimanche d’octobre.'},
    {id:'le-caire',nom:'Le Caire',zone:'Africa/Cairo',lat:30.04,lon:31.24,note:'L’Égypte a réintroduit l’heure d’été en 2023 (loi 24 de 2023), pour économiser l’énergie : UTC+3 du dernier vendredi d’avril au dernier jeudi d’octobre. Elle l’avait déjà pratiquée de 1957 à 2010, puis en 2014-2015.'},
    {id:'dubai',nom:'Dubaï',zone:'Asia/Dubai',lat:25.20,lon:55.27,note:'Dubaï vit à UTC+4 toute l’année : les Émirats n’appliquent aucun changement d’heure saisonnier. Quand l’écart de Dubaï avec un autre lieu bouge, c’est toujours l’autre lieu qui a changé.'},
    {id:'delhi',nom:'Delhi',zone:'Asia/Kolkata',lat:28.61,lon:77.21,note:'L’Inde entière vit sur une seule heure, UTC+5:30, adoptée le 1er janvier 1906 et calculée sur le méridien de 82,5° E. L’heure d’été n’y a été utilisée que brièvement, pendant les guerres de 1962, 1965 et 1971.'},
    {id:'singapour',nom:'Singapour',zone:'Asia/Singapore',lat:1.35,lon:103.82,note:'Le 1er janvier 1982, Singapour a avancé d’une demi-heure pour passer à UTC+8, suivant la standardisation de la Malaisie voisine — alors que sa longitude la placerait plutôt à UTC+7. Près de l’équateur, la longueur du jour varie à peine : aucune heure d’été.'},
    {id:'tokyo',nom:'Tokyo',zone:'Asia/Tokyo',lat:35.68,lon:139.69,note:'Tokyo ne change jamais d’heure : le Japon vit à UTC+9 toute l’année. L’heure d’été n’y a existé que de 1948 à 1951, imposée pendant l’occupation alliée, puis abolie en 1952 — elle n’est jamais revenue.'},
    {id:'sydney',nom:'Sydney',zone:'Australia/Sydney',lat:-33.87,lon:151.21,note:'Sydney change d’heure à l’envers de l’hémisphère nord : la Nouvelle-Galles du Sud avance le premier dimanche d’octobre et recule le premier dimanche d’avril, un régime en place depuis 1971. Le Queensland voisin, lui, n’y participe pas.'},
    {id:'auckland',nom:'Auckland',zone:'Pacific/Auckland',lat:-36.85,lon:174.76,note:'Le Time Act de 1974 a établi l’heure d’été moderne néo-zélandaise ; depuis 2007, elle court du dernier dimanche de septembre au premier dimanche d’avril — vingt-sept semaines. Auckland passe ainsi de UTC+12 à UTC+13 pendant l’été austral.'},
    {id:'honolulu',nom:'Honolulu',zone:'Pacific/Honolulu',lat:21.31,lon:-157.86,note:'Hawaï s’est retirée du régime fédéral d’heure d’été en 1967 et n’y est jamais revenue : Honolulu demeure à UTC−10 toute l’année. Si près de l’équateur, la longueur du jour varie trop peu pour que le changement vaille quelque chose.'}
  ];
  function lieuParId(id){for(var i=0;i<LIEUX.length;i++)if(LIEUX[i].id===id)return LIEUX[i]; return null}
  // ----- Planète : orbite, repères, cartes, grande lecture -----
  var ajoutes={}, refs={}, selection='sainte-martine';
  var DISQUE={cx:50, cy:49.8, rx:41.6, ry:39.8};
  function placerRepere(el,l){
    var p=projection(l.lat,l.lon);
    el.style.left=(DISQUE.cx+p.x*DISQUE.rx)+'%';
    el.style.top=(DISQUE.cy-p.y*DISQUE.ry)+'%';
    el.classList.toggle('loin',!p.visible);
    el.title=l.nom+(p.visible?'':' — autre côté du globe');
    if(l.ancre&&el._etiquette)placerEtiquetteAncre(el._etiquette,p);
  }
  // ----- v20 — Le cartouche de l’ancre, posé sur la scène -----
  // Le repère vit dans le globe (overflow hidden, bord circulaire) : son
  // étiquette y était coupée et noyée. Le cartouche vit sur la scène, mesuré
  // au DOM à chaque appel : il suit le repère quand la vue tourne. Règles de
  // garde — vue pleine : à droite du repère, retourné à sa gauche si la place
  // manque ; vue compacte : sous le repère, décalé pour rester entier ; dans
  // tous les cas, le cartouche reste dans la scène, à 2 px des bords au
  // moins, et il s’estompe comme le repère quand l’ancre passe de l’autre
  // côté du globe.
  function placerEtiquetteAncre(etq,p,evitements){
    var scene=$('planete-scene'); if(!scene)return;
    var globe=scene.querySelector('.planete-globe'); if(!globe)return;
    var rs=scene.getBoundingClientRect(), rg=globe.getBoundingClientRect();
    var mx=(rg.left-rs.left)+(DISQUE.cx+p.x*DISQUE.rx)/100*rg.width;
    var my=(rg.top-rs.top)+(DISQUE.cy-p.y*DISQUE.ry)/100*rg.height;
    etq.style.display='block';
    etq.style.opacity=p.visible?'1':'0.35';
    var W=etq.offsetWidth, H=etq.offsetHeight, SW=scene.clientWidth, SH=scene.clientHeight;
    // Positions candidates, dans l’ordre de préférence. Vue pleine : à
    // droite du repère, puis à sa gauche, puis dessous. Vue compacte : sous
    // le repère, puis au-dessus, puis décalé à droite. Chacune est ramenée
    // dans la scène (2 px de marge au moins) avant d’être notée : le
    // cartouche n’est JAMAIS coupé, c’est la garde qui prime.
    var cand;
    if(scene.classList.contains('compacte')){
      cand=[[mx-16,my+14],[mx-16,my-H-14],[mx+9,my+14],[mx+9,my-H-14]];
    }else{
      cand=[[mx+9,my-14],[mx-9-W,my-14],[mx+9,my+18],[mx-9-W,my+18]];
    }
    function borner(x,y){
      if(x+W>SW-2)x=SW-2-W;
      if(x<2)x=2;
      if(y<2)y=2;
      if(y+H>SH-2)y=SH-2-H;
      if(y<2)y=2;
      return [x,y];
    }
    // Note d’une position : surface de pastilles couverte, la zone centrale
    // d’une pastille (son texte) comptant dix fois — couvrir un bord passe,
    // couvrir un nom ou une heure, non, tant qu’un autre choix existe.
    function note(x,y){
      if(!evitements||!evitements.length)return 0;
      var tot=0;
      for(var i=0;i<evitements.length;i++){
        var r=evitements[i];
        var ox=Math.min(x+W,r[2])-Math.max(x,r[0]);
        var oy=Math.min(y+H,r[3])-Math.max(y,r[1]);
        if(ox>0&&oy>0){
          tot+=ox*oy;
          var cx1=r[0]+(r[2]-r[0])*0.25, cx2=r[2]-(r[2]-r[0])*0.25;
          var cy1=r[1]+(r[3]-r[1])*0.25, cy2=r[3]-(r[3]-r[1])*0.25;
          var px=Math.min(x+W,cx2)-Math.max(x,cx1);
          var py=Math.min(y+H,cy2)-Math.max(y,cy1);
          if(px>0&&py>0)tot+=9*px*py;
        }
      }
      return tot;
    }
    var choisi=null, meilleur=null;
    for(var c=0;c<cand.length;c++){
      var pos=borner(cand[c][0],cand[c][1]);
      var n=note(pos[0],pos[1]);
      if(n===0){choisi=pos;break}
      if(!meilleur||n<meilleur.n)meilleur={pos:pos,n:n};
    }
    if(!choisi&&evitements&&evitements.length){
      // Aucune position candidate n’est libre (scène saturée, petit
      // écran) : le cartouche cherche la place la moins couverte de la
      // scène, au pas de 8 px, la plus proche du repère à note égale.
      // Il reste entier dans la scène, et son fond opaque le garde
      // lisible partout : c’est lui qui couvre, jamais l’inverse.
      var ref=borner(cand[0][0],cand[0][1]);
      for(var gy=2;gy+H<=SH-2;gy+=8){
        for(var gx=2;gx+W<=SW-2;gx+=8){
          var n2=note(gx,gy);
          if(n2===0){meilleur={pos:[gx,gy],n:0};gy=SH;break}
          if(meilleur&&n2<meilleur.n)meilleur={pos:[gx,gy],n:n2};
          else if(meilleur&&n2===meilleur.n){
            var d1=(gx-mx)*(gx-mx)+(gy-my)*(gy-my);
            var d2=(meilleur.pos[0]-mx)*(meilleur.pos[0]-mx)+(meilleur.pos[1]-my)*(meilleur.pos[1]-my);
            if(d1<d2)meilleur={pos:[gx,gy],n:n2};
          }
        }
      }
      if(meilleur)choisi=meilleur.pos;
      if(!choisi)choisi=ref;
    }
    if(!choisi)choisi=meilleur?meilleur.pos:borner(cand[0][0],cand[0][1]);
    etq.style.left=choisi[0]+'px'; etq.style.top=choisi[1]+'px';
  }
  function creerRepere(l){
    var zone=$('planete-reperes'); if(!zone)return null;
    var s=document.createElement('span');
    s.className='rep'+(l.ancre?' ancre':'');
    s.setAttribute('data-act','choix'); s.setAttribute('data-id',l.id);
    if(l.ancre){
      // v19 — l’ancre se nomme au complet, dans les mots d’Alex.
      // v20 — mais plus DANS le globe : le nom posé dans .planete-reperes est
      // coupé par le bord circulaire du globe (overflow hidden) et sa 2e ligne
      // se noyait dans les nuages (constats de l’inspection v19, 2 nov.). Le
      // nom devient un cartouche posé sur la SCÈNE, hors du globe : fond
      // sombre, bord doré, ombrage porté — et placerRepere le fait suivre le
      // repère à chaque vue (voir placerEtiquetteAncre).
      var etq=document.createElement('div'); etq.className='etiquette-ancre';
      etq.textContent='Sainte-Martine — Québec, Canada';
      var so=document.createElement('span'); so.className='ea-l2';
      so.textContent='ancrage : '+fmtCoord(l.lat,l.lon);
      etq.appendChild(so);
      var scene0=$('planete-scene'); if(scene0)scene0.appendChild(etq);
      s._etiquette=etq;
    }else{
      var n=document.createElement('span'); n.className='rep-nom';
      n.textContent=l.nom;
      s.appendChild(n);
    }
    zone.appendChild(s);
    placerRepere(s,l);
    return s;
  }
  function ligneValeurs(l,now){
    var civile=fmtCivil(l.zone).format(now);
    var lst=lstLieu(now,l.lon);
    var ecart=decalageHeures(l.zone,now)-decalageHeures(ZONE_ANCRE,now);
    var hs=heureSolaireApprox(now,l.lon);
    var jour=hs>=6&&hs<18;
    return {civile:civile,siderale:horlogeDeg(lst),ecart:ecart,jour:jour,solH:hs};
  }
  function creerHorloge(l){
    var orb=$('planete-horloges'); if(!orb)return null;
    var wrap=document.createElement('div');
    wrap.className='planete-horloge';
    var b=document.createElement('button');
    b.className='ph-contre'; b.setAttribute('data-act','choix'); b.setAttribute('data-id',l.id);
    b.setAttribute('aria-label','Grande lecture : '+l.nom);
    var interne=document.createElement('span'); interne.className='ph-interne';
    var nom=document.createElement('span'); nom.className='ph-nom'; nom.textContent=l.nom;
    var ligne=document.createElement('span'); ligne.className='ph-ligne-heure';
    var civ=document.createElement('span'); civ.className='ph-civile mono';
    var sec=document.createElement('span'); sec.className='ph-secondes mono';
    ligne.appendChild(civ); ligne.appendChild(sec);
    interne.appendChild(nom); interne.appendChild(ligne);
    b.appendChild(interne); wrap.appendChild(b); orb.appendChild(wrap);
    return {wrap:wrap,civ:civ,sec:sec};
  }
  // ----- v17 — Espacement de l’orbite : des pastilles cadrans qui ne se touchent plus -----
  // Fonction pure (exposée pour vérification). Chaque élément reçoit une piste
  // (rayon principal, intérieur 0,78, extérieur 1,18) et un angle effectif ; la
  // distance entre centres respecte la somme des demi-largeurs + 6 px de jeu.
  // Les satellites de la triangulation sont fixes sur la piste principale ; les
  // lieux essaient leur angle vrai sur chaque piste, puis un créneau voisin
  // décalé — le trait de liaison vers le point de longitude vraie dit l’écart.
  function placerOrbite(elems,rayonRef){
    function norm(a){return ((a%360)+360)%360}
    function pt(facteur,angDeg){
      var r=facteur*rayonRef, rad=angDeg*Math.PI/180;
      return {x:r*Math.sin(rad),y:-r*Math.cos(rad)};
    }
    function dist(p,q){return Math.sqrt((p.x-q.x)*(p.x-q.x)+(p.y-q.y)*(p.y-q.y))}
    function chercher(e,obstacles){
      function libre(facteur,ang){
        var p=pt(facteur,ang), i;
        for(i=0;i<obstacles.length;i++)if(dist(p,obstacles[i].p)<e.demi+obstacles[i].demi+6)return false;
        return true;
      }
      var av=norm(e.angle), k, j, d;
      for(k=0;k<PISTES_ORBITE.length;k++)
        if(libre(PISTES_ORBITE[k],av))return {piste:PISTES_ORBITE[k],angleEff:av,trait:PISTES_ORBITE[k]!==1};
      for(d=2;d<=178;d+=2){
        var candidats=[av+d,av-d];
        for(j=0;j<candidats.length;j++)
          for(k=0;k<PISTES_ORBITE.length;k++)
            if(libre(PISTES_ORBITE[k],candidats[j]))return {piste:PISTES_ORBITE[k],angleEff:norm(candidats[j]),trait:true};
      }
      return null;
    }
    function repli(e,obstacles){
      var av=norm(e.angle), mieux=-1, choix=null, k, j;
      for(k=0;k<PISTES_ORBITE.length;k++){
        var pR=pt(PISTES_ORBITE[k],av), dMin=Infinity;
        for(j=0;j<obstacles.length;j++){var dd=dist(pR,obstacles[j].p); if(dd<dMin)dMin=dd;}
        if(dMin>mieux){mieux=dMin; choix={piste:PISTES_ORBITE[k],angleEff:av,trait:true};}
      }
      return choix;
    }
    var tri=elems.slice().sort(function(a,b){return norm(a.angle)-norm(b.angle)});
    var poses={};
    function obstaclesSauf(id){
      var obs=[];
      for(var id2 in poses)if(id2!==id)obs.push({p:poses[id2].p,demi:poses[id2].demi});
      return obs;
    }
    function poser(e,pl){
      poses[e.id]={piste:pl.piste,angleEff:pl.angleEff,trait:pl.trait,p:pt(pl.piste,pl.angleEff),demi:e.demi,fixe:!!e.fixe};
    }
    tri.forEach(function(e){ if(e.fixe)poser(e,{piste:1,angleEff:norm(e.angle),trait:false}); });
    tri.forEach(function(e){
      if(e.fixe)return;
      poser(e,chercher(e,obstaclesSauf(e.id))||repli(e,obstaclesSauf(e.id)));
    });
    // Passe de réparation : tant qu’une paire se touche, re-placer l’un des deux
    // lieux dans un créneau vérifié libre contre tous les autres (60 essais max).
    // Chaque réparation réussie supprime une collision sans en créer : la
    // recherche de créneau contrôle tous les obstacles.
    function collision(){
      var ids=Object.keys(poses), i, j;
      for(i=0;i<ids.length;i++)for(j=i+1;j<ids.length;j++){
        var A=poses[ids[i]], B=poses[ids[j]];
        if(dist(A.p,B.p)<A.demi+B.demi+6)return [ids[i],ids[j]];
      }
      return null;
    }
    for(var essai=0;essai<60;essai++){
      var col=collision(); if(!col)break;
      var bouge=false;
      for(var m=0;m<2&&!bouge;m++){
        var eB=null;
        tri.forEach(function(e){if(e.id===col[m])eB=e});
        if(!eB||eB.fixe)continue;
        var ancien=poses[col[m]];
        delete poses[col[m]];
        var pl2=chercher(eB,obstaclesSauf(col[m]));
        if(pl2){poser(eB,pl2); bouge=true;}
        else poses[col[m]]=ancien;
      }
      if(!bouge)break;
    }
    var sortie={};
    for(var id3 in poses)sortie[id3]={piste:poses[id3].piste,angleEff:poses[id3].angleEff,trait:poses[id3].trait};
    return sortie;
  }
  // ----- v18 — Géométrie des pastilles et moteur d’espacement -----
  // Règle vérifiée point par point : une position n’est libre que si la
  // pastille y tient entièrement hors du disque du globe (distance du centre
  // du globe au rectangle de la pastille ≥ rayon du globe + 2 px), dans les
  // limites de la scène et de la fenêtre, et sans toucher aucune voisine
  // (rectangles alignés, jeu visé de 4 px entre bords).
  function geometriePour(S,H,vw){
    var compacte=S<520;
    var tailles=compacte
      ? {lieu:{w:82,h:46},ancre:{w:108,h:56},sat:{w:88,h:50}}
      : {lieu:{w:96,h:54},ancre:{w:128,h:64},sat:{w:136,h:60}};
    for(var k in tailles){var t=tailles[k]; t.demi=Math.sqrt(t.w*t.w+t.h*t.h)/2}
    // Limites du centre d’une pastille : verticalement, la pastille tient dans
    // la scène ; horizontalement, elle peut déborder la scène — comme en v17 —
    // mais jamais la fenêtre (limX = demi-fenêtre − marge).
    return {S:S,H:H,compacte:compacte,Rg:S*0.25,pistes:[0.40,0.4275,0.455,0.4825,0.51,0.5375,0.565],tailles:tailles,
      limX:(vw&&vw>S)?vw/2-4:S/2-2,limY:H/2-2};
  }
  function geometrieScene(){
    var vw=(typeof window!=='undefined'&&window.innerWidth)?window.innerWidth:1200;
    var S=Math.min(600,0.96*vw);
    if(S<520)return geometriePour(S,Math.round(S*1.3),vw);
    return geometriePour(S,S,vw);
  }
  function ROT(){return -40-VUE.lon}
  function placerPastilles(elems,geom){
    function norm(a){return ((a%360)+360)%360}
    function pt(f,angDeg){
      var r=angDeg*Math.PI/180;
      return {x:f*geom.S*Math.sin(r),y:-f*geom.H*Math.cos(r)};
    }
    function dist(p,q){return Math.sqrt((p.x-q.x)*(p.x-q.x)+(p.y-q.y)*(p.y-q.y))}
    function ecartRect(e,p,o){
      // Distance entre deux rectangles alignés (0 s’ils se touchent ou se recouvrent).
      var dxr=Math.max(Math.abs(p.x-o.p.x)-(e.w+o.w)/2,0);
      var dyr=Math.max(Math.abs(p.y-o.p.y)-(e.h+o.h)/2,0);
      return Math.sqrt(dxr*dxr+dyr*dyr);
    }
    function seTouchent(A,B){
      return Math.abs(A.p.x-B.p.x)<(A.w+B.w)/2+4 && Math.abs(A.p.y-B.p.y)<(A.h+B.h)/2+4;
    }
    function librePoint(e,p,obs){
      if(Math.abs(p.x)+e.w/2>geom.limX)return false;
      if(Math.abs(p.y)+e.h/2>geom.limY)return false;
      // Aucun coin de la pastille dans le disque : distance du centre du globe
      // au rectangle (et non au centre de la pastille) ≥ rayon du globe + 2 px.
      var gx=Math.max(Math.abs(p.x)-e.w/2,0), gy=Math.max(Math.abs(p.y)-e.h/2,0);
      if(Math.sqrt(gx*gx+gy*gy)<geom.Rg+2)return false;
      for(var i=0;i<obs.length;i++)if(seTouchent({p:p,w:e.w,h:e.h},obs[i]))return false;
      return true;
    }
    function libre(e,f,ang,obs){return librePoint(e,pt(f,ang),obs)}
    function chercherGrille(e,obs){
      // Recours par grille : des centres candidats sont balayés dans toute la
      // couronne des pistes (rayon continu), du méridien du lieu vers
      // l’extérieur, jusqu’au premier centre vérifié libre.
      var av=norm(e.angle), fMin=geom.pistes[0], fMax=geom.pistes[geom.pistes.length-1];
      var pasG=10, cand=[], gx, gy;
      var xMax=geom.limX-e.w/2, yMax=geom.limY-e.h/2;
      for(gx=-xMax;gx<=xMax+0.01;gx+=pasG)for(gy=-yMax;gy<=yMax+0.01;gy+=pasG){
        var f=Math.sqrt((gx/geom.S)*(gx/geom.S)+(gy/geom.H)*(gy/geom.H));
        if(f<fMin-0.004||f>fMax+0.004)continue;
        var ang=norm(Math.atan2(gx/geom.S,-gy/geom.H)*180/Math.PI);
        var da=Math.abs(((ang-av+540)%360)-180);
        cand.push({p:{x:gx,y:gy},f:f,ang:ang,da:da,dr:Math.abs(f-fMin)});
      }
      cand.sort(function(a,b){return (a.da-b.da)||(a.dr-b.dr)});
      for(var i=0;i<cand.length;i++)
        if(librePoint(e,cand[i].p,obs))return {piste:cand[i].f,angleEff:cand[i].ang,p:cand[i].p};
      return null;
    }
    function chercher(e,obs){
      var av=norm(e.angle), k, d, j;
      for(k=0;k<geom.pistes.length;k++)
        if(libre(e,geom.pistes[k],av,obs))return {piste:geom.pistes[k],angleEff:av,p:pt(geom.pistes[k],av)};
      for(d=1;d<=179;d++){
        var cand=[av+d,av-d];
        for(j=0;j<2;j++)for(k=0;k<geom.pistes.length;k++)
          if(libre(e,geom.pistes[k],cand[j],obs))return {piste:geom.pistes[k],angleEff:norm(cand[j]),p:pt(geom.pistes[k],norm(cand[j]))};
      }
      return null;
    }
    function repli(e,obs){
      var av=norm(e.angle), mieux=null, mieuxScore=-Infinity, k, j;
      for(k=0;k<geom.pistes.length;k++){
        var p=pt(geom.pistes[k],av), dMin=Infinity;
        for(j=0;j<obs.length;j++){var dd=ecartRect(e,p,obs[j]); if(dd<dMin)dMin=dd}
        var score=dMin;
        if(Math.abs(p.x)+e.w/2>geom.limX||Math.abs(p.y)+e.h/2>geom.limY)score-=10000;
        var gx=Math.max(Math.abs(p.x)-e.w/2,0), gy=Math.max(Math.abs(p.y)-e.h/2,0);
        if(Math.sqrt(gx*gx+gy*gy)<geom.Rg+2)score-=10000;
        if(score>mieuxScore){mieuxScore=score; mieux={piste:geom.pistes[k],angleEff:av,p:p,repli:true}}
      }
      return mieux;
    }
    function chercherContinu(e,obs){
      // Dernier recours : le rayon est balayé en continu (par quarts de piste)
      // entre la piste intérieure et la piste extérieure, à chaque créneau.
      var av=norm(e.angle), k, d, j, f;
      var fMin=geom.pistes[0], fMax=geom.pistes[geom.pistes.length-1], pas=(fMax-fMin)/12;
      for(d=0;d<=179;d++){
        var cand=d===0?[av]:[av+d,av-d];
        for(j=0;j<cand.length;j++)
          for(k=0;k<=12;k++){
            f=fMin+pas*k;
            if(libre(e,f,cand[j],obs))return {piste:f,angleEff:norm(cand[j]),p:pt(f,norm(cand[j]))};
          }
      }
      return null;
    }
    function seRecouvrent(A,B){
      return Math.abs(A.p.x-B.p.x)<(A.w+B.w)/2 && Math.abs(A.p.y-B.p.y)<(A.h+B.h)/2;
    }
    function bilanDe(P2){
      var ids=Object.keys(P2), rec=0, repl=0, i, j;
      for(i=0;i<ids.length;i++){
        if(P2[ids[i]].repli)repl++;
        for(j=i+1;j<ids.length;j++)if(seRecouvrent(P2[ids[i]],P2[ids[j]]))rec++;
      }
      return {recouvrements:rec, replis:repl};
    }
    function meilleurQue(b1,b2){
      return b1.recouvrements<b2.recouvrements||(b1.recouvrements===b2.recouvrements&&b1.replis<b2.replis);
    }
    function scoreDe(P2){
      // Coût d’une configuration : un recouvrement vaut plus que tout le
      // reste, un repli ensuite, puis le déplacement angulaire total —
      // triple pour l’ancre, qui doit rester près de son méridien.
      var ids=Object.keys(P2), rec=0, repl=0, cout=0, i, j;
      for(i=0;i<ids.length;i++){
        var A=P2[ids[i]];
        if(A.repli)repl++;
        var da=Math.abs(((A.angleEff-A.av0+540)%360)-180);
        cout+=Math.min(da,90)*(A.prio===0?3:1);
        for(j=i+1;j<ids.length;j++)if(seRecouvrent(A,P2[ids[j]]))rec++;
      }
      return rec*100000+repl*10000+cout;
    }
    function poseObjet(e,pl){
      var av0=norm(e.angleVrai!==undefined?e.angleVrai:e.angle);
      var ecart=Math.abs(((pl.angleEff-av0+540)%360)-180);
      return {piste:pl.piste,angleEff:pl.angleEff,p:pl.p,demi:e.demi,w:e.w,h:e.h,prio:e.prio,av0:av0,
        trait:pl.piste!==geom.pistes[0]||ecart>0.5,repli:!!pl.repli};
    }
    function resoudre(ordre){
      var poses={};
      function obstaclesSauf(id){
        var obs=[];
        for(var i2 in poses)if(i2!==id)obs.push(poses[i2]);
        return obs;
      }
      function poser(e,pl){poses[e.id]=poseObjet(e,pl)}
    ordre.forEach(function(e){
      poser(e,chercher(e,obstaclesSauf(e.id))||repli(e,obstaclesSauf(e.id)));
    });
    // Passe de réparation (héritée de la v17) : tant qu’une paire se touche,
    // on replace l’élément de priorité moindre dans un créneau vérifié libre
    // contre tous les autres ; chaque réparation réussie supprime une
    // collision sans en créer.
    function collision(){
      var ids=Object.keys(poses), i, j;
      for(i=0;i<ids.length;i++)for(j=i+1;j<ids.length;j++){
        if(seTouchent(poses[ids[i]],poses[ids[j]]))return [ids[i],ids[j]];
      }
      return null;
    }
    for(var essai=0;essai<80;essai++){
      var col=collision(); if(!col)break;
      var parId={};
      ordre.forEach(function(e){parId[e.id]=e});
      var cands=[col[0],col[1]].sort(function(a,b){return parId[b].prio-parId[a].prio});
      var bouge=false;
      for(var m=0;m<2&&!bouge;m++){
        var idB=cands[m], eB=parId[idB], ancien=poses[idB];
        delete poses[idB];
        var pl2=chercher(eB,obstaclesSauf(idB));
        if(pl2){poser(eB,pl2); bouge=true}
        else poses[idB]=ancien;
      }
      if(!bouge)break;
    }
    // Consolidation : tout élément resté en repli, ou encore en collision,
    // retente un créneau vérifié libre contre la configuration courante —
    // d’abord sur les pistes, puis, au besoin, sur le rayon continu.
    for(var tour=0;tour<3;tour++){
      var aBouge=false;
      ordre.forEach(function(e){
        var pl=poses[e.id], enCollision=false, ids2=Object.keys(poses), q;
        for(q=0;q<ids2.length;q++){
          if(ids2[q]===e.id)continue;
          if(seTouchent(pl,poses[ids2[q]])){enCollision=true;break}
        }
        if(!pl.repli&&!enCollision)return;
        var ancien=pl;
        delete poses[e.id];
        var pl2=chercher(e,obstaclesSauf(e.id))||chercherContinu(e,obstaclesSauf(e.id))||chercherGrille(e,obstaclesSauf(e.id));
        if(pl2){poser(e,pl2); aBouge=true}
        else poses[e.id]=ancien;
      });
      if(!aBouge)break;
    }
    var b0=bilanDe(poses);
    if(b0.recouvrements>0||b0.replis>0){
      var coincesIds={}, idsC=Object.keys(poses), iC, jC;
      for(iC=0;iC<idsC.length;iC++){
        if(poses[idsC[iC]].repli)coincesIds[idsC[iC]]=true;
        for(jC=iC+1;jC<idsC.length;jC++){
          var A3=poses[idsC[iC]], B3=poses[idsC[jC]];
          if(Math.abs(A3.p.x-B3.p.x)<(A3.w+B3.w)/2 && Math.abs(A3.p.y-B3.p.y)<(A3.h+B3.h)/2){coincesIds[idsC[iC]]=true; coincesIds[idsC[jC]]=true}
        }
      }
      var coinces=[];
      ordre.forEach(function(e){if(coincesIds[e.id])coinces.push(e)});
      var base={};
      Object.keys(poses).forEach(function(id){if(!coincesIds[id])base[id]=poses[id]});
      var ordresR=[coinces.slice().sort(function(a,b){return (a.prio-b.prio)||(norm(a.angle)-norm(b.angle))}),
                   coinces.slice().sort(function(a,b){return norm(b.angle)-norm(a.angle)})];
      var meilleur=null, meilleurScore=scoreDe(poses);
      for(var oi=0;oi<ordresR.length;oi++){
        var essai={};
        Object.keys(base).forEach(function(id){essai[id]=base[id]});
        ordresR[oi].forEach(function(e){
          var obs=[];
          Object.keys(essai).forEach(function(id2){obs.push(essai[id2])});
          var pl=chercherContinu(e,obs)||chercherGrille(e,obs)||repli(e,obs);
          essai[e.id]=poseObjet(e,pl);
        });
        var bs=scoreDe(essai);
        if(bs<meilleurScore){meilleur=essai; meilleurScore=bs}
        if(meilleur){var bm2=bilanDe(meilleur); if(bm2.recouvrements===0&&bm2.replis===0)break}

      }
      if(meilleur){
        Object.keys(poses).forEach(function(id){delete poses[id]});
        Object.keys(meilleur).forEach(function(id){poses[id]=meilleur[id]});
      }
    }
    // Recours régional, en boucle tant que le bilan s’améliore : toute la
    // zone congestionnée est libérée — éléments coincés et voisins proches —
    // puis repeuplée (pistes d’abord, rayon continu et grille ensuite), dans
    // deux ordres d’insertion ; on ne garde que ce qui améliore le bilan
    // (recouvrements d’abord, replis ensuite).
    for(var tourZ=0;tourZ<4;tourZ++){
      var b1=bilanDe(poses);
      if(b1.recouvrements===0&&b1.replis===0)break;
      var zone={}, idsZ=Object.keys(poses), iZ, jZ;
      for(iZ=0;iZ<idsZ.length;iZ++){
        if(poses[idsZ[iZ]].repli)zone[idsZ[iZ]]=true;
        for(jZ=0;jZ<idsZ.length;jZ++)
          if(iZ!==jZ&&seRecouvrent(poses[idsZ[iZ]],poses[idsZ[jZ]]))zone[idsZ[iZ]]=true;
      }
      var zoneIds=Object.keys(zone);
      for(iZ=0;iZ<idsZ.length;iZ++){
        if(zone[idsZ[iZ]])continue;
        for(jZ=0;jZ<zoneIds.length;jZ++){
          var A4=poses[idsZ[iZ]], B4=poses[zoneIds[jZ]];
          if(Math.abs(A4.p.x-B4.p.x)<150&&Math.abs(A4.p.y-B4.p.y)<110){zone[idsZ[iZ]]=true;break}
        }
      }
      var zoneElems=[];
      ordre.forEach(function(e){if(zone[e.id])zoneElems.push(e)});
      var zoneOrdres=[zoneElems, zoneElems.slice().sort(function(a,b){return norm(b.angle)-norm(a.angle)})];
      var meilleurZ=null, meilleurSZ=scoreDe(poses);
      for(var zo=0;zo<zoneOrdres.length;zo++){
        var essaiZ={};
        Object.keys(poses).forEach(function(id){if(!zone[id])essaiZ[id]=poses[id]});
        zoneOrdres[zo].forEach(function(e){
          var obs=[];
          Object.keys(essaiZ).forEach(function(id2){obs.push(essaiZ[id2])});
          var pl=chercher(e,obs)||chercherContinu(e,obs)||chercherGrille(e,obs)||repli(e,obs);
          essaiZ[e.id]=poseObjet(e,pl);
        });
        var sz=scoreDe(essaiZ);
        if(sz<meilleurSZ){meilleurZ=essaiZ; meilleurSZ=sz}
      }
      if(!meilleurZ)break;
      Object.keys(poses).forEach(function(id){delete poses[id]});
      Object.keys(meilleurZ).forEach(function(id){poses[id]=meilleurZ[id]});
    }
    return poses;
    }
    var ordreBase=elems.slice().sort(function(a,b){return (a.prio-b.prio)||(norm(a.angle)-norm(b.angle))});
    var meilleur=resoudre(ordreBase), mb=bilanDe(meilleur), ms=scoreDe(meilleur);
    if(mb.recouvrements>0||mb.replis>0){
      // Essais supplémentaires : ordre bousculé dans chaque groupe de
      // priorité et angles de départ décalés de quelques degrés (graine
      // fixe : le résultat reste reproductible). On garde le meilleur bilan.
      var graine=987654321;
      function rand(){graine=(graine*1103515245+12345)%2147483648; return graine/2147483648}
      var debutMs=Date.now();
      for(var essaiR=0;essaiR<48;essaiR++){
        if(essaiR>0&&Date.now()-debutMs>1600)break;
        var groupes={};
        elems.forEach(function(e){
          var c={};
          for(var k in e)c[k]=e[k];
          c.angleVrai=e.angle;
          c.angle=e.angle+(rand()*10-5);
          (groupes[e.prio]=groupes[e.prio]||[]).push(c);
        });
        var ordreR=[];
        [0,1,2].forEach(function(pr){
          var g=groupes[pr]||[];
          for(var i=g.length-1;i>0;i--){var j=Math.floor(rand()*(i+1)); var tmp=g[i]; g[i]=g[j]; g[j]=tmp}
          ordreR=ordreR.concat(g);
        });
        var p2=resoudre(ordreR), b2=bilanDe(p2), s2=scoreDe(p2);
        if(s2<ms){meilleur=p2; mb=b2; ms=s2}
        if(mb.recouvrements===0&&mb.replis===0)break;
      }
    }
    return meilleur;
  }
  function espacerOrbite(){
    var scene=$('planete-scene'); if(!scene)return;
    var geom=geometrieScene();
    scene.classList.toggle('compacte',geom.compacte);
    var elems=[], sats=scene.querySelectorAll('.temps-sat'), i;
    for(i=0;i<sats.length;i++){
      var a=parseFloat((sats[i].style.getPropertyValue('--a')||'0').replace('deg',''));
      elems.push({id:'__sat'+i,angle:a,w:geom.tailles.sat.w,h:geom.tailles.sat.h,demi:geom.tailles.sat.demi,prio:1,el:sats[i]});
    }
    LIEUX.forEach(function(l){
      var r=refs[l.id];
      if(!r||!r.horloge||!r.horloge.wrap)return;
      var t=l.ancre?geom.tailles.ancre:geom.tailles.lieu;
      elems.push({id:l.id,angle:l.lon+ROT(),w:t.w,h:t.h,demi:t.demi,prio:l.ancre?0:2,el:r.horloge.wrap});
    });
    var places=placerPastilles(elems,geom);
    elems.forEach(function(e){
      var pl=places[e.id]; if(!pl)return;
      e.el.style.width=e.w+'px'; e.el.style.height=e.h+'px';
      e.el.style.left='50%'; e.el.style.top='50%';
      e.el.style.transform='translate('+pl.p.x.toFixed(1)+'px,'+pl.p.y.toFixed(1)+'px) translate(-50%,-50%)';
    });
    // v20 — le cartouche de l’ancre se replace contre les pastilles posées :
    // parmi ses positions candidates, celle qui n’en couvre aucune (à défaut,
    // celle qui couvre le moins). Il reste entier dans la scène dans tous
    // les cas — c’est la garde qui prime.
    LIEUX.forEach(function(la){
      if(!la.ancre)return;
      var ra=refs[la.id];
      if(!ra||!ra.rep||!ra.rep._etiquette)return;
      var rects=[];
      elems.forEach(function(e){
        var pl=places[e.id]; if(!pl)return;
        rects.push([geom.S/2+pl.p.x-e.w/2,geom.H/2+pl.p.y-e.h/2,geom.S/2+pl.p.x+e.w/2,geom.H/2+pl.p.y+e.h/2]);
      });
      placerEtiquetteAncre(ra.rep._etiquette,projection(la.lat,la.lon),rects);
    });
    rendreTraits(places,geom);
  }
  function rendreTraits(places,geom){
    var svg=$('planete-traits'); if(!svg)return;
    var NS='http://www.w3.org/2000/svg';
    svg.setAttribute('viewBox','0 0 '+geom.S+' '+geom.H);
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    function ellipse(f,classe){
      var el=document.createElementNS(NS,'ellipse');
      el.setAttribute('cx',geom.S/2); el.setAttribute('cy',geom.H/2);
      el.setAttribute('rx',f*geom.S); el.setAttribute('ry',f*geom.H);
      el.setAttribute('class',classe);
      svg.appendChild(el);
    }
    ellipse(geom.pistes[0],'trait-anneau');
    ellipse(0.30,'trait-anneau2');
    LIEUX.forEach(function(l){
      var pl=places[l.id];
      if(!pl||!pl.trait)return;
      var av=((l.lon+ROT())%360+360)%360, r=av*Math.PI/180;
      var li=document.createElementNS(NS,'line');
      li.setAttribute('x1',geom.S/2+geom.pistes[0]*geom.S*Math.sin(r));
      li.setAttribute('y1',geom.H/2-geom.pistes[0]*geom.H*Math.cos(r));
      li.setAttribute('x2',geom.S/2+pl.p.x);
      li.setAttribute('y2',geom.H/2+pl.p.y);
      li.setAttribute('class','trait-lien');
      svg.appendChild(li);
    });
  }
  function creerCarte(l){
    var zone=$('planete-cartes'); if(!zone)return null;
    var b=document.createElement('button');
    b.className='p-carte'; b.setAttribute('data-act','choix'); b.setAttribute('data-id',l.id);
    var nom=document.createElement('span'); nom.className='pc-nom'; nom.textContent=l.nom+(l.ancre?' — l’ancre':'');
    var civ=document.createElement('span'); civ.className='pc-civile mono';
    var det=document.createElement('p');
    b.appendChild(nom); b.appendChild(document.createElement('br')); b.appendChild(civ); b.appendChild(det);
    zone.appendChild(b);
    return {wrap:b,civ:civ,det:det};
  }
  function rendreControles(){
    var zoneAjout=$('planete-ajout'), zoneChips=$('planete-chips');
    if(zoneAjout){
      zoneAjout.innerHTML='';
      LIEUX.forEach(function(l){
        if(l.ancre||ajoutes[l.id])return;
        var b=document.createElement('button');
        b.className='btn-lieu'; b.setAttribute('data-act','ajout'); b.setAttribute('data-id',l.id);
        b.textContent='+ '+l.nom;
        zoneAjout.appendChild(b);
      });
      if(!zoneAjout.children.length)zoneAjout.innerHTML='<span class="petite">Tous les lieux proposés sont déjà sur l’orbite.</span>';
    }
    if(zoneChips){
      zoneChips.innerHTML='';
      LIEUX.forEach(function(l){
        if(!ajoutes[l.id])return;
        var chip=document.createElement('span'); chip.className='chip-lieu';
        var t=document.createElement('span'); t.textContent=l.nom;
        var x=document.createElement('button');
        x.setAttribute('data-act','retrait'); x.setAttribute('data-id',l.id);
        x.setAttribute('aria-label','Retirer '+l.nom); x.textContent='×';
        chip.appendChild(t); chip.appendChild(x);
        zoneChips.appendChild(chip);
      });
    }
    var etat=$('planete-etat');
    if(etat){
      var noms=LIEUX.filter(function(l){return ajoutes[l.id]}).map(function(l){return l.nom});
      etat.textContent='Sur l’orbite en ce moment : l’ancre Sainte-Martine, les 3 satellites de la triangulation (avancée, normale, sidérale)'+(noms.length?' et '+noms.length+' horloge'+(noms.length>1?'s':'')+' de comparaison : '+noms.join(', ')+'.':' — aucune horloge de comparaison pour l’instant ; ajoutez-en une ci-dessus.');
    }
  }
  function ajouter(id){
    var l=lieuParId(id); if(!l||l.ancre||ajoutes[id])return;
    ajoutes[id]=true;
    refs[id]={horloge:creerHorloge(l),carte:creerCarte(l),rep:creerRepere(l)};
    rendreControles(); espacerOrbite(); majPlanete();
  }
  function retirer(id){
    var l=lieuParId(id); if(!l||l.ancre||!ajoutes[id])return;
    delete ajoutes[id];
    var r=refs[id];
    if(r){
      if(r.horloge&&r.horloge.wrap)r.horloge.wrap.remove();
      if(r.carte&&r.carte.wrap)r.carte.wrap.remove();
      if(r.rep)r.rep.remove();
      delete refs[id];
    }
    if(selection===id)selectionner('sainte-martine');
    rendreControles(); espacerOrbite(); majPlanete();
  }
  function majGlobeSelection(){
    var sel=lieuParId(selection); if(!sel)return;
    var p=projection(sel.lat,sel.lon);
    texte('x-globe',p.visible?'Repère visible sur le globe, dans la vue en cours.':'De l’autre côté du globe dans la vue en cours : le repère y est estompé et se dit « autre côté » plutôt que de disparaître.');
  }
  function selectionner(id){
    var l=lieuParId(id); if(!l)return;
    selection=id;
    LIEUX.forEach(function(x){
      var r=refs[x.id];
      if(r&&r.horloge&&r.horloge.wrap)r.horloge.wrap.classList.toggle('choisi',x.id===id);
      if(r&&r.carte&&r.carte.wrap)r.carte.wrap.classList.toggle('choisi',x.id===id);
      if(r&&r.rep)r.rep.classList.toggle('choisi',x.id===id);
    });
    texte('x-nom',l.nom+(l.ancre?' — l’ancre':''));
    texte('x-coords',fmtCoord(l.lat,l.lon));
    majGlobeSelection();
    texte('x-zone',l.zone+(l.ancre?' — le fuseau de référence du système':''));
    texte('x-siderale-detail','GMST + sa longitude ('+fr(l.lon,2).replace('-','−')+'°) — le même polynôme que l’ancre.');
    var btn=$('x-retirer'); if(btn)btn.hidden=!!l.ancre;
    majHistoire(l);
    majMeteoLieu();
    majPlanete();
  }
  function majHistoire(l){
    var h=histoireHeure(l.zone,new Date());
    if(h.change){
      texte('x-regime','Ce lieu change d’heure (heure d’été) : son décalage est de '+fmtUTC(h.jan)+' le 1er janvier et de '+fmtUTC(h.jul)+' le 1er juillet de cette année — calculé à l’instant, dans votre navigateur, par comparaison des décalages.');
    }else{
      texte('x-regime','Heure fixe toute l’année : '+fmtUTC(h.jan)+' le 1er janvier comme le 1er juillet de cette année — calculé à l’instant, dans votre navigateur, par comparaison des décalages.');
    }
    if(h.prochain){
      var d=new Intl.DateTimeFormat('fr-CA',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(h.prochain);
      texte('x-prochain','Prochain changement calculé : le '+d+' (balayage jour par jour des décalages, jusqu’à 400 jours).');
    }else{
      texte('x-prochain','Aucun changement prévu : le balayage des 400 prochains jours ne trouve aucune transition de décalage.');
    }
    texte('x-note',l.note);
  }
  function majPlanete(){
    var now=new Date();
    LIEUX.forEach(function(l){
      if(!l.ancre&&!ajoutes[l.id])return;
      var v=ligneValeurs(l,now), r=refs[l.id];
      if(r&&r.horloge){
        // v19 — correctif : une seule ligne numérique compacte (« 15:32:12 »,
        // comme les mini-pastilles), jamais la ligne « min » rognée de la v18.
        var mc=v.civile.match(/(\d{1,2})\D+(\d{2})\D+(\d{2})/);
        r.horloge.civ.textContent=mc?pad(+mc[1])+':'+mc[2]+':'+mc[3]:v.civile;
        if(r.horloge.sec)r.horloge.sec.textContent='';
      }
      if(r&&r.carte){
        r.carte.civ.textContent=v.civile;
        r.carte.det.textContent='Sidérale '+v.siderale+' · écart '+fmtEcart(v.ecart)+' avec Sainte-Martine · '+(v.jour?'jour':'nuit')+' (heure solaire approx.)';
      }
    });
    var sel=lieuParId(selection);
    if(sel){
      var v2=ligneValeurs(sel,now);
      texte('x-civile',v2.civile);
      texte('x-siderale',hmsLong(lstLieu(now,sel.lon)));
      texte('x-ecart',sel.ancre?'0 h — c’est l’ancre':fmtEcart(v2.ecart)+(v2.ecart>0?' d’avance sur Sainte-Martine':' de retard sur Sainte-Martine'));
      var elev=elevationSoleil(now,sel.lat,sel.lon);
      var etatExpo=elev>=6?'Plein jour là-bas':(elev>=0?'Soleil bas là-bas':(elev>=-6?'Crépuscule là-bas — le Soleil est sous l’horizon, à moins de 6°':'Nuit là-bas'));
      var couchSel=prochainCoucher(now,sel.lat,sel.lon);
      // v19 — la dérive de temps du lieu : sidérale locale − solaire moyenne
      // locale (la même heureSolaireApprox que le panneau), ramenée dans
      // (−12 h, +12 h]. Recalculée à chaque seconde, comme tout le panneau.
      var dH=lstLieu(now,sel.lon)/15-heureSolaireApprox(now,sel.lon);
      while(dH<=-12)dH+=24; while(dH>12)dH-=24;
      texte('x-derive',fmtDerive(dH));
      var avJ=(FACTEUR_SIDERAL-1)*86400;
      texte('x-derive-jour',Math.floor(avJ/60)+' min '+fr(avJ%60,1)+' s');
      texte('x-journuit',etatExpo+' — élévation solaire calculée : '+(elev<0?'−':'+')+fr(Math.abs(elev),1)+'°.'+(couchSel?' Coucher du Soleil calculé : '+fmtHeureZone(couchSel,sel.zone)+' (heure du lieu, dans les prochaines 24 h).':' Aucun coucher du Soleil dans les prochaines 24 h (jour ou nuit polaire, ou période sans transition).'));
    }
    // v19 — météo du lieu sélectionné : relue si le relevé a 10 minutes ou plus.
    var cm=meteoLieuCache[selection];
    if(!cm||(Date.now()-cm.quand)>=600000)majMeteoLieu();
    // Miroir des ancrages — le bord du site
    texte('mir-site-civile',fmtCivil(ZONE_ANCRE).format(now));
    texte('mir-site-siderale',hmsLong(lstLieu(now,LON_ANCRE)));
    if(visiteur.zone)texte('mir-v-civile',fmtCivil(visiteur.zone).format(now));
    if(visiteur.lon!==null&&visiteur.lon!==undefined)texte('mir-v-siderale',hmsLong(lstLieu(now,visiteur.lon)));
    rendreNuit(); rendreExpo();
  }

  // ----- v19 — La météo du lieu sélectionné (grande lecture) -----
  // Source unique : Open-Meteo, interrogé aux coordonnées du lieu (les mêmes
  // que le panneau porte déjà). Relevé sourcé et daté ; cache mémoire de
  // dix minutes par lieu ; échec dit, jamais de valeur inventée ni d’ancienne
  // valeur montrée sans sa date. L’ancre garde sa triangulation complète :
  // l’onglet Météo et la section des sens restent inchangés.
  var meteoLieuCache={}, meteoLieuEnCours=null;
  function majMeteoLieu(){
    var l=lieuParId(selection); if(!l)return;
    if(!isFinite(l.lat)||!isFinite(l.lon)){
      texte('x-meteo','Coordonnées insuffisantes pour sa météo.');
      texte('x-meteo-source','Aucune valeur n’est inventée : ce lieu n’a pas de latitude ni de longitude exploitables dans les données du panneau.');
      return;
    }
    var c=meteoLieuCache[l.id];
    if(c&&(Date.now()-c.quand)<600000){ecrireMeteoLieu(l,c); return}
    if(meteoLieuEnCours===l.id)return;
    meteoLieuEnCours=l.id;
    texte('x-meteo','Météo du lieu : lecture en cours…');
    texte('x-meteo-source','');
    var u='https://api.open-meteo.com/v1/forecast?latitude='+l.lat+'&longitude='+l.lon
      +'&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code'
      +'&daily=sunrise,sunset&forecast_days=1&timeformat=unixtime&timezone='+encodeURIComponent(l.zone);
    fetch(u).then(function(r){if(!r.ok)throw new Error('meteo-lieu'); return r.json()})
    .then(function(d){
      meteoLieuEnCours=null;
      meteoLieuCache[l.id]={quand:Date.now(),d:d};
      if(selection===l.id)ecrireMeteoLieu(l,meteoLieuCache[l.id]);
    })
    .catch(function(){
      meteoLieuEnCours=null;
      delete meteoLieuCache[l.id];
      if(selection===l.id){
        texte('x-meteo','Météo du lieu non rejointe à l’instant.');
        texte('x-meteo-source','Open-Meteo n’a pas répondu depuis votre navigateur : aucune valeur n’est affichée plutôt qu’une valeur inventée. Nouvel essai à la prochaine sélection ou dans dix minutes.');
      }
    });
  }
  function ecrireMeteoLieu(l,c){
    var cur=c.d.current; if(!cur)return;
    var lever='—', coucher='—';
    if(c.d.daily&&c.d.daily.sunrise&&c.d.daily.sunrise[0]!==undefined&&c.d.daily.sunset){
      lever=fmtHeureZone(c.d.daily.sunrise[0]*1000,l.zone);
      coucher=fmtHeureZone(c.d.daily.sunset[0]*1000,l.zone);
    }
    texte('x-meteo',libelleCode(cur.weather_code)+' — '+fr(cur.temperature_2m,1)+' °C (ressenti '+fr(cur.apparent_temperature,1)+' °C) · vent '+Math.round(cur.wind_speed_10m)+' km/h · humidité '+Math.round(cur.relative_humidity_2m)+' % · Soleil du lieu (Open-Meteo, relevé en direct) : lever '+lever+', coucher '+coucher+'.');
    texte('x-meteo-source','Source unique : Open-Meteo, relevé de '+fmtHeureZone(cur.time*1000,l.zone)+' (heure du lieu). Pour les lieux de comparaison, cette lecture tient à une seule source ; l’ancre Sainte-Martine garde sa triangulation complète — onglet Météo et section des sens. Le lever et le coucher du Soleil de l’ancre, calculés par l’algorithme solaire de la NOAA — ceux du panneau Météo — peuvent différer d’une minute de ceux-ci : deux sources distinctes, pas une contradiction.');
  }
  // ----- v19 — La dérive de temps : facteur et format -----
  // Le facteur est celui du panneau (module de triangulation, exposé sur
  // window) ; la constante en repli est la même valeur, écrite.
  var FACTEUR_SIDERAL=(typeof window!=='undefined'&&window.TRIANGULATION_TEMPS&&window.TRIANGULATION_TEMPS.FACTEUR)||1.00273790935;
  function fmtDerive(h){
    var s=Math.round(Math.abs(h)*3600);
    return (h<0?'−':'+')+Math.floor(s/3600)+' h '+pad(Math.floor(s%3600/60))+' min '+pad(s%60)+' s';
  }

  // ----- v18 — Rendu de l’ombre de nuit, exposition de l’ancre, rotation -----
  function rendreNuit(){
    var svg=$('planete-nuit'); if(!svg)return;
    var poly=cheminNuit(new Date());
    var NS='http://www.w3.org/2000/svg';
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    if(!poly.length)return;
    var defs=document.createElementNS(NS,'defs');
    var cp=document.createElementNS(NS,'clipPath');
    cp.setAttribute('id','clip-disque-nuit');
    var ell=document.createElementNS(NS,'ellipse');
    ell.setAttribute('cx',DISQUE.cx); ell.setAttribute('cy',DISQUE.cy);
    ell.setAttribute('rx',DISQUE.rx); ell.setAttribute('ry',DISQUE.ry);
    cp.appendChild(ell); defs.appendChild(cp); svg.appendChild(defs);
    var dAttr='M'+poly.map(function(p){
      return (DISQUE.cx+p[0]*DISQUE.rx).toFixed(2)+' '+(DISQUE.cy-p[1]*DISQUE.ry).toFixed(2);
    }).join(' L')+' Z';
    var path=document.createElementNS(NS,'path');
    path.setAttribute('d',dAttr);
    path.setAttribute('class','nuit-forme');
    path.setAttribute('clip-path','url(#clip-disque-nuit)');
    svg.appendChild(path);
  }
  var expoTexte='';
  function rendreExpo(){
    var el=$('planete-expo'); if(!el)return;
    var now=new Date();
    var pc=prochainCoucher(now,LAT_ANCRE,LON_ANCRE), dc=dernierCoucher(now,LAT_ANCRE,LON_ANCRE);
    var calcMs=pc||dc, t;
    if(!calcMs){
      t='À Sainte-Martine : aucun coucher du Soleil proche n’est calculé (cas polaire) — c’est dit, aucune heure n’est inventée.';
    }else{
      t='À Sainte-Martine, l’ancre est moins exposée au soleil '+(pc?'à partir de':'depuis')+' '+fmtHeureZone(calcMs,ZONE_ANCRE)+' — coucher calculé ici, par les formules solaires du panneau.';
      var st=meteoEtat.mt, metMs=null, bd=Infinity;
      if(st&&st.om&&st.om.daily&&st.om.daily.sunset&&st.om.daily.sunset.length){
        for(var i2=0;i2<st.om.daily.sunset.length;i2++){
          var cand=st.om.daily.sunset[i2]*1000, dd=Math.abs(cand-calcMs);
          if(dd<bd){bd=dd; metMs=cand}
        }
      }
      if(metMs!==null){
        var ecartMin=Math.round(bd/60000);
        t+=' La météo (Open-Meteo) donne '+fmtHeureZone(metMs,ZONE_ANCRE)+' — écart de '+ecartMin+' min entre les deux lectures'+(ecartMin<=5?' : elles se recoupent.':' : les deux sont affichées, aucune n’est choisie.');
      }else{
        t+=' Le coucher de la météo (Open-Meteo, onglet Météo) n’est pas encore lu : seule la valeur calculée est montrée, c’est dit.';
      }
    }
    if(t!==expoTexte){expoTexte=t; el.textContent=t}
  }
  var dernierEspacement=0;
  function appliquerVue(){
    LIEUX.forEach(function(l){
      var r=refs[l.id];
      if(r&&r.rep)placerRepere(r.rep,l);
    });
    rendreNuit();
    var t=Date.now();
    if(t-dernierEspacement>120){dernierEspacement=t; espacerOrbite()}
  }
  // ----- Les sens de l’ancre -----
  var sensEtat={om:null,met:null,kp:null,kpQuand:null,seisme:null,seismeGen:null};
  var visiteur={nom:null,region:null,lat:null,lon:null,zone:null,source:null};
  var ANCRE_SITE={nom:'Sainte-Martine',lat:LAT_METEO_ANCRE,lon:LON_METEO_ANCRE,zone:ZONE_ANCRE};
  function triangulerTemperature(lat,lon){
    var pOM=fetch('https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=temperature_2m&timezone=UTC')
      .then(function(r){if(!r.ok)throw new Error('om'); return r.json()})
      .then(function(j){return {val:j.current.temperature_2m,quand:new Date(j.current.time)}})
      .catch(function(){return null});
    var pMET=fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat='+lat+'&lon='+lon)
      .then(function(r){if(!r.ok)throw new Error('met'); return r.json()})
      .then(function(j){
        var ts=j.properties.timeseries,now=Date.now(),best=null,bd=Infinity,i,t,d;
        for(i=0;i<ts.length;i++){t=new Date(ts[i].time).getTime(); d=Math.abs(t-now); if(d<bd){bd=d;best=ts[i]}}
        return {val:best.data.instant.details.air_temperature,quand:new Date(best.time)};
      })
      .catch(function(){return null});
    return Promise.all([pOM,pMET]).then(function(res){return {om:res[0],met:res[1]}});
  }
  function texteTriangulationCourt(){
    var om=sensEtat.om, met=sensEtat.met;
    if(om&&met){var e=Math.abs(om.val-met.val); return 'Température triangulée : Open-Meteo '+fr(om.val,1)+' °C · MET Norway '+fr(met.val,1)+' °C — écart '+fr(e,1)+' °C, '+(e<=2?'CONCORDENT.':'ÉCART dit.')}
    if(om)return 'Température : Open-Meteo '+fr(om.val,1)+' °C seul — MET Norway injoignable à l’instant, c’est dit.';
    if(met)return 'Température : MET Norway '+fr(met.val,1)+' °C seul — Open-Meteo injoignable à l’instant, c’est dit.';
    return 'Température non lue à l’instant — les deux services sont injoignables, c’est dit.';
  }
  function rendreSens(){
    var om=sensEtat.om, met=sensEtat.met;
    if(om||met){
      var ref=om||met, e=(om&&met)?Math.abs(om.val-met.val):null;
      texte('sens-temp-om',om?fr(om.val,1)+' °C':'injoignable');
      texte('sens-temp-met',met?fr(met.val,1)+' °C':'injoignable');
      texte('sens-temp-verdict',fr(ref.val,1)+' °C — '+(e===null?'source unique, dite comme telle':(e<=2?'CONCORDENT':'ÉCART')));
      var m='';
      if(om)m+='Open-Meteo : relevé de '+fmtHeureZone(om.quand.getTime(),ZONE_ANCRE)+' (heure de l’ancre), '+fmtAge(om.quand)+'. ';
      if(met)m+='MET Norway : données de '+fmtHeureZone(met.quand.getTime(),'UTC')+' UTC, '+fmtAge(met.quand)+'. ';
      if(!om)m+='Open-Meteo injoignable à l’instant : valeur unique de MET Norway, sans maquillage. ';
      if(!met)m+='MET Norway injoignable à l’instant : valeur unique d’Open-Meteo, sans substitution. ';
      if(e!==null)m+='Écart entre les deux services : '+fr(e,1)+' °C.';
      texte('sens-temp-meta',m);
    }else{
      texte('sens-temp-verdict','Lecture impossible à l’instant');
      texte('sens-temp-om','injoignable');
      texte('sens-temp-met','injoignable');
      texte('sens-temp-meta','Les deux services sont injoignables depuis ton navigateur à l’instant. Aucune valeur n’est inventée ni recopiée : la tuile attend le prochain essai, dans dix minutes.');
    }
    texte('mir-site-temp',texteTriangulationCourt());
    // Soleil et Lune — calculés sur place
    var auj=new Date(), s=soleil(auj,LAT_ANCRE,LON_ANCRE);
    if(s){
      var base=Date.UTC(auj.getUTCFullYear(),auj.getUTCMonth(),auj.getUTCDate());
      var leverMs=base+s.lever*3600000, coucherMs=base+s.coucher*3600000;
      texte('sens-sol-lever',fmtHeureZone(leverMs,ZONE_ANCRE));
      texte('sens-sol-coucher',fmtHeureZone(coucherMs,ZONE_ANCRE));
      var dureeH=s.coucher-s.lever, dh=Math.floor(dureeH), dm=Math.round((dureeH-dh)*60);
      if(dm===60){dh++;dm=0}
      texte('sens-sol-duree',dh+' h '+pad(dm));
    }
    texte('sens-lune-age',fr(ageLune(auj),1)+' jours');
    texte('sens-lune-illum',Math.round(illumLune(auj)*100)+' %');
    // Kp
    if(sensEtat.kp!==null&&sensEtat.kp!==undefined){
      texte('sens-kp-valeur',String(sensEtat.kp));
      texte('sens-kp-lecture',sensEtat.kp>=5?'Kp ≥ 5 : le ciel magnétique est actif — des aurores sont possibles à la latitude géomagnétique de Sainte-Martine (~55° N).':'Ciel magnétiquement calme à l’ancre : sous Kp 5, pas d’aurores attendues à cette latitude.');
      texte('sens-kp-meta','Source : NOAA SWPC — relevé de '+fmtHeureZone(sensEtat.kpQuand.getTime(),'UTC')+' UTC, '+fmtAge(sensEtat.kpQuand)+'. Cadran : 0 (très calme) à 9 (tempête extrême).');
    }else{
      texte('sens-kp-valeur','non lu');
      texte('sens-kp-lecture','Le service NOAA SWPC est injoignable depuis ton navigateur à l’instant : l’état magnétique n’est pas lu, et cette tuile le dit plutôt que de deviner.');
    }
    // Séismes
    if(sensEtat.seisme==='erreur'){
      texte('sens-seisme-valeur','Lecture impossible à l’instant');
      texte('sens-seisme-meta','Le catalogue USGS est injoignable depuis ton navigateur à l’instant — rien n’est affirmé sur le secteur.');
    }else if(sensEtat.seisme){
      var f=sensEtat.seisme;
      texte('sens-seisme-valeur','M'+fr(f.mag,1)+' — '+f.place);
      texte('sens-seisme-meta','Source : USGS — le '+new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(f.time))+' (heure de ton appareil), '+fmtAge(new Date(f.time))+'. Génération du catalogue : '+fmtAge(new Date(sensEtat.seismeGen))+'.');
    }else if(sensEtat.seisme===null&&sensEtat.seismeGen){
      texte('sens-seisme-valeur','Aucun — calme sismique local');
      texte('sens-seisme-meta','Source : USGS — catalogue généré '+fmtAge(new Date(sensEtat.seismeGen))+' ; aucun événement M ≥ 1 dans les 300 km et les 48 dernières heures.');
    }
  }
  function chargerSens(){
    triangulerTemperature(LAT_METEO_ANCRE,LON_METEO_ANCRE).then(function(res){
      sensEtat.om=res.om; sensEtat.met=res.met; rendreSens();
    });
    fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json')
      .then(function(r){if(!r.ok)throw new Error('swpc'); return r.json()})
      .then(function(j){
        var last=j[j.length-1];
        sensEtat.kp=(last.kp_index!==undefined&&last.kp_index!==null)?last.kp_index:Math.round(last.estimated_kp);
        sensEtat.kpQuand=new Date(String(last.time_tag).replace(' ','T')+'Z');
        rendreSens();
      })
      .catch(function(){sensEtat.kp=null; rendreSens()});
    var debut=new Date(Date.now()-48*3600000).toISOString();
    fetch('https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime='+encodeURIComponent(debut)+'&latitude='+LAT_ANCRE+'&longitude='+LON_ANCRE+'&maxradiuskm=300&minmagnitude=1&orderby=time')
      .then(function(r){if(!r.ok)throw new Error('usgs'); return r.json()})
      .then(function(j){
        sensEtat.seismeGen=j.metadata.generated;
        if(j.features&&j.features.length){
          var p=j.features[0].properties;
          sensEtat.seisme={mag:p.mag,place:p.place,time:p.time};
        }else sensEtat.seisme=null;
        rendreSens();
      })
      .catch(function(){sensEtat.seisme='erreur'; rendreSens()});
  }
  // ----- L’ancrage du visiteur -----
  function rendreMiroir(){
    var titre=$('mir-v-titre');
    var porte=$('porte-ancrage');
    if(porte)porte.style.display=visiteur.source?'none':'';
    if(!visiteur.source){
      if(titre)titre.textContent='Ton ancrage — à toi de choisir';
      return;
    }
    if(visiteur.source==='appareil'){
      if(titre)titre.textContent='Ton ancrage — position non lue';
      texte('mir-v-civile',fmtCivil(visiteur.zone).format(new Date()));
      texte('mir-v-detail','Position non lue — heure de ton appareil ('+visiteur.zone+'). Les services de géolocalisation n’ont pas répondu : sans longitude, pas d’heure sidérale ni de météo chez toi. Tu peux poser ton ancrage à la main ci-dessous.');
      texte('mir-v-siderale','non calculable — longitude non lue');
      texte('mir-v-temp','');
      texte('mir-distance','Distance entre nos ancrages : non calculable — ta position n’a pas été lue.');
      texte('mv-etat','Ton ancrage n’a pas de coordonnées (position non lue) : la météo en miroir attend que tu poses ton ancrage à la main, dans le panneau Temps.');
      texte('mv-lecture','Je ne lis pas ton ciel : sans coordonnées, raconter ta météo serait l’inventer. Pose ton ancrage dans le panneau Temps, et le miroir se remplit des mêmes sources que le mien.');
      texte('mv-lecture-meta','');
      return;
    }
    var provenance=visiteur.source==='ip'?'d’après ton adresse IP':visiteur.source==='geoloc'?'position partagée par ton appareil':'ancrage posé par toi depuis la liste';
    if(titre)titre.textContent='Ton ancrage — '+visiteur.nom+(visiteur.region?', '+visiteur.region:'')+' ('+provenance+')';
    var off=decalageHeures(visiteur.zone,new Date());
    texte('mir-v-detail','Coordonnées approximatives : '+fmtCoord(visiteur.lat,visiteur.lon)+' · fuseau '+visiteur.zone+' · '+fmtUTC(off)+'.');
    var km=haversine(LAT_ANCRE,LON_ANCRE,visiteur.lat,visiteur.lon);
    texte('mir-distance','Nos ancrages sont à '+(km<100?fr(km,1):Math.round(km).toLocaleString('fr-CA'))+' km l’un de l’autre (distance orthodromique calculée ici) — et pourtant, la même Terre tourne sous les deux.');
    if(visiteur.source==='ip'||visiteur.source==='manuel'||visiteur.source==='geoloc'){
      triangulerTemperature(visiteur.lat,visiteur.lon).then(function(res){
        var om=res.om, met=res.met;
        if(om&&met){var e=Math.abs(om.val-met.val); texte('mir-v-temp','Météo chez toi, triangulée : Open-Meteo '+fr(om.val,1)+' °C · MET Norway '+fr(met.val,1)+' °C — écart '+fr(e,1)+' °C, '+(e<=2?'CONCORDENT.':'ÉCART dit.'))}
        else if(om)texte('mir-v-temp','Météo chez toi : Open-Meteo '+fr(om.val,1)+' °C seul — MET Norway injoignable, c’est dit.');
        else if(met)texte('mir-v-temp','Météo chez toi : MET Norway '+fr(met.val,1)+' °C seul — Open-Meteo injoignable, c’est dit.');
        else texte('mir-v-temp','Météo chez toi non lue à l’instant — les deux services sont injoignables.');
      });
      chargerMeteoPour('mv',{nom:visiteur.nom,lat:visiteur.lat,lon:visiteur.lon,zone:visiteur.zone});
    }
    if(window._triMeteoEnCours&&visiteur.source==='ip'){
      window._triMeteoEnCours=false;
      var st3=$('mt-tri-statut'), b3=$('mt-pres-de-moi');
      if(st3)st3.textContent='La position de l’appareil n’a pas répondu : météo triangulée depuis l’estimation par ton adresse IP ('+visiteur.nom+') — coordonnées approximatives, arrondies dans le bloc de provenance ci-dessous.';
      if(b3)b3.disabled=false;
    }
    majPlanete();
  }
  function poserVisiteur(v){
    visiteur=v; rendreMiroir();
  }
  // ----- v28 — la porte de choix : l’estimation ne part qu’au clic exprès -----
  function estimerAncrage(){
    var st=$('porte-statut'), b=$('porte-estimer');
    if(st)st.textContent='Estimation en cours — la requête part chez ipwho.is (repli : ipapi.co)…';
    if(b)b.disabled=true;
    determinerVisiteur();
  }
  function echecEstimation(){
    var st=$('porte-statut'), b=$('porte-estimer');
    if(st)st.textContent='L’estimation n’a pas répondu : les services de géolocalisation (ipwho.is, puis ipapi.co) sont injoignables depuis ton navigateur à l’instant. Rien n’a été lu. Tu peux réessayer, ou choisir ton lieu dans la liste ci-dessous — aucun appel ne partira.';
    if(b)b.disabled=false;
    if(window._triMeteoEnCours){
      window._triMeteoEnCours=false;
      var st2=$('mt-tri-statut'), b2=$('mt-pres-de-moi');
      if(st2)st2.textContent='Aucun signal n’a répondu — ni la position de l’appareil, ni l’estimation par adresse IP : retour à l’ancre du site. La météo affichée reste celle de Sainte-Martine, et le bloc de provenance ci-dessous le dit.';
      if(b2)b2.disabled=false;
    }
  }
  function determinerVisiteur(){
    fetch('https://ipwho.is/')
      .then(function(r){return r.json()})
      .then(function(j){
        if(j&&j.success&&isFinite(j.latitude)&&isFinite(j.longitude)){
          poserVisiteur({nom:j.city||'Ville lue',region:j.region||'',lat:j.latitude,lon:j.longitude,zone:(j.timezone&&j.timezone.id)||'UTC',source:'ip'});
        }else throw new Error('ipwho');
      })
      .catch(function(){
        fetch('https://ipapi.co/json/')
          .then(function(r){return r.json()})
          .then(function(j){
            if(j&&isFinite(j.latitude)&&isFinite(j.longitude)){
              poserVisiteur({nom:j.city||'Ville lue',region:j.region||'',lat:j.latitude,lon:j.longitude,zone:j.timezone||'UTC',source:'ip'});
            }else throw new Error('ipapi');
          })
          .catch(function(){
            echecEstimation();
          });
      });
  }

  // ----- v53 — Météo triangulée : « Météo près de moi » (à la demande d’Alex, 7 novembre 2026) -----
  // Chaîne, dans l’ordre : (a) la position que l’appareil partage, si le visiteur l’autorise
  // (navigator.geolocation — le navigateur demande sa permission) ; (b) sinon, l’estimation par
  // adresse IP (Porte documentée nº 5 : ipwho.is, repli ipapi.co — le même service que
  // determinerVisiteur) ; (c) sinon, retour à l’ancre, dit au visiteur. Rien ne part avant le
  // geste. Aucune conservation : la position vit en mémoire de page seulement — aucun stockage
  // local ne la reçoit, elle s’efface au rechargement.
  function lieuConnuLePlusProche(lat,lon){
    var best=null,bd=Infinity;
    for(var i=0;i<LIEUX.length;i++){var d=haversine(lat,lon,LIEUX[i].lat,LIEUX[i].lon); if(d<bd){bd=d;best=LIEUX[i]}}
    return {lieu:best,km:bd};
  }
  function triangulerMeteoPresDeMoi(){
    var st=$('mt-tri-statut'), b=$('mt-pres-de-moi');
    if(b)b.disabled=true;
    window._triMeteoEnCours=true;
    if(!('geolocation' in navigator)){
      if(st)st.textContent='Ton navigateur ne propose pas la géolocalisation : passage à l’estimation par adresse IP (Porte nº 5)…';
      determinerVisiteur();
      return;
    }
    if(st)st.textContent='Demande à ton appareil — il va te demander sa permission…';
    navigator.geolocation.getCurrentPosition(function(pos){
      window._triMeteoEnCours=false;
      var lat=pos.coords.latitude, lon=pos.coords.longitude;
      var proche=lieuConnuLePlusProche(lat,lon);
      var zone='UTC';
      try{zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch(e){}
      poserVisiteur({nom:proche.lieu?proche.lieu.nom:'Point partagé',region:'',lat:lat,lon:lon,zone:zone,source:'geoloc',distanceKm:proche.km,lieuProche:proche.lieu?proche.lieu.nom:null});
      if(st)st.textContent='Position partagée par ton appareil : météo triangulée pour le point le plus proche — lieu connu le plus proche : '+(proche.lieu?proche.lieu.nom:'—')+'. Le bloc « Comment cette météo a été obtenue », ci-dessous, montre le relevé complet.';
      if(b)b.disabled=false;
    },function(){
      if(st)st.textContent='Position refusée ou indisponible : passage à l’estimation par adresse IP (Porte nº 5)…';
      determinerVisiteur();
    },{timeout:10000,maximumAge:0});
  }
  var bTriMeteo=$('mt-pres-de-moi');
  if(bTriMeteo)bTriMeteo.addEventListener('click',triangulerMeteoPresDeMoi);
  // ----- v53 — Provenance du relevé météo affiché -----
  function fmtCoordArrondi(lat,lon){
    var la=Math.abs(lat).toFixed(2).replace('.',',')+'° '+(lat>=0?'N':'S');
    var lo=Math.abs(lon).toFixed(2).replace('.',',')+'° '+(lon>=0?'E':'O');
    return la+' · '+lo;
  }
  function rendreProvenanceMeteo(){
    if(!$('mt-provenance'))return;
    var vm=meteoEtat['mv'], am=meteoEtat['mt'];
    var pose=!!(visiteur&&visiteur.source&&visiteur.lat!==null&&visiteur.lat!==undefined);
    var st=(pose&&vm)?vm:am;
    if(!st||!st.ancre)return;
    var sig,lieu,coord;
    if(pose&&vm){
      if(visiteur.source==='geoloc'){
        sig='Position partagée par ton appareil — la géolocalisation de ton navigateur, autorisée par toi pour cette visite.';
        lieu=visiteur.nom+' — le lieu connu du site le plus proche de ta position'+((visiteur.distanceKm!==null&&visiteur.distanceKm!==undefined)?' (à '+(visiteur.distanceKm<100?fr(visiteur.distanceKm,1):Math.round(visiteur.distanceKm))+' km)':'')+' : le nom est calculé ici, aucun service de géocodage inverse n’a été appelé.';
        coord=fmtCoordArrondi(visiteur.lat,visiteur.lon)+' — tes coordonnées, arrondies à deux décimales et affichées comme une approximation.';
      }else if(visiteur.source==='ip'){
        sig='Approximation par ton adresse IP — service ipwho.is (repli : ipapi.co), Porte documentée nº 5.';
        lieu=visiteur.nom+(visiteur.region?', '+visiteur.region:'')+' — la ville approximative lue depuis ton adresse IP.';
        coord=fmtCoordArrondi(visiteur.lat,visiteur.lon)+' — coordonnées approximatives, arrondies à deux décimales : une ville, jamais une adresse.';
      }else{
        sig='Lieu choisi par toi dans la liste des lieux du site.';
        lieu=visiteur.nom+' — ancrage posé par toi.';
        coord=fmtCoord(visiteur.lat,visiteur.lon)+' — les coordonnées du lieu choisi.';
      }
    }else{
      sig='Ancre du site — aucune position de visiteur n’a été posée.';
      lieu='Sainte-Martine — l’ancre du site (ancrage du site : 45,24915° N, 73,7989° O).';
      coord=fmtCoord(st.ancre.lat,st.ancre.lon)+' — le point interrogé pour ce relevé.';
    }
    texte('prov-signal',sig);
    texte('prov-lieu',lieu);
    texte('prov-coord',coord);
    if(st.grille){
      texte('prov-grille','Open-Meteo a répondu pour son point de grille le plus proche : latitude '+String(st.grille.lat).replace('.',',')+' · longitude '+String(st.grille.lon).replace('.',',')+((st.grille.elevation!==null&&st.grille.elevation!==undefined)?' · élévation '+Math.round(st.grille.elevation)+' m':'')+'.');
    }else{
      texte('prov-grille','Point de grille non lu — le service météo n’a pas répondu à l’instant ; aucune valeur n’est inventée.');
    }
    if(st.recuLe){
      texte('prov-heure','Relevé reçu '+fmtHeureZone(st.recuLe.getTime(),st.ancre.zone)+' (heure du lieu) — rafraîchissement automatique toutes les dix minutes quand l’onglet est visible.');
    }else{
      texte('prov-heure','Aucun relevé reçu à l’instant.');
    }
    var om2=st.om, met2=st.met;
    if(om2&&met2){var e2=Math.abs(om2.current.temperature_2m-met2.val); texte('prov-sources','Open-Meteo '+fr(om2.current.temperature_2m,1)+' °C · MET Norway '+fr(met2.val,1)+' °C — écart '+fr(e2,1)+' °C : '+(e2<=2?'CONCORDENT (seuil : 2 °C).':'ÉCART dit (seuil : 2 °C) — les deux valeurs tiennent.'));}
    else if(om2)texte('prov-sources','Open-Meteo seul à l’instant — MET Norway injoignable, c’est dit.');
    else if(met2)texte('prov-sources','MET Norway seul à l’instant — Open-Meteo injoignable, c’est dit.');
    else texte('prov-sources','Aucune source n’a répondu à l’instant — c’est dit, rien n’est inventé.');
  }
  function retenirPointMeteo(){
    var st=meteoEtat['mv']; if(!st||!st.om)return;
    var c=st.om.current;
    window.pointRetenuMeteo={
      valeur:visiteur.nom+' · '+fr(c.temperature_2m,1)+' °C · '+libelleCode(c.weather_code),
      detail:'Point retenu de ta visite — météo triangulée près de toi (Open-Meteo · MET Norway) ; provenance à l’onglet Météo.'
    };
    if(typeof b53AppliquerPointRetenu==='function')b53AppliquerPointRetenu();
  }
  function b53AppliquerPointRetenu(){
    var p=window.pointRetenuMeteo; if(!p)return;
    var val=$('b53-meteo-valeur'), det=$('b53-meteo-detail');
    if(val)val.textContent=p.valeur;
    if(det)det.textContent=p.detail;
  }

  // ----- Onglet Météo -----
  var CODES_METEO={0:['Ciel dégagé','☀'],1:['Plutôt dégagé','🌤'],2:['Partiellement nuageux','⛅'],3:['Couvert','☁'],45:['Brouillard','🌫'],48:['Brouillard givrant','🌫'],51:['Bruine légère','🌦'],53:['Bruine','🌦'],55:['Bruine forte','🌦'],56:['Bruine verglaçante','🌧'],57:['Bruine verglaçante','🌧'],61:['Pluie légère','🌧'],63:['Pluie','🌧'],65:['Pluie forte','🌧'],66:['Pluie verglaçante','🌧'],67:['Pluie verglaçante','🌧'],71:['Neige légère','🌨'],73:['Neige','🌨'],75:['Neige forte','🌨'],77:['Grains de neige','🌨'],80:['Averses légères','🌦'],81:['Averses','🌦'],82:['Averses fortes','🌧'],85:['Averses de neige','🌨'],86:['Averses de neige','🌨'],95:['Orage','⛈'],96:['Orage avec grêle','⛈'],99:['Orage avec grêle','⛈']};
  function libelleCode(code){var c=CODES_METEO[code]; return c?c[0]:'Code météo '+code}
  function iconeCode(code){var c=CODES_METEO[code]; return c?c[1]:'•'}
  function familleCode(code){
    if(code===0||code===1)return 'clair';
    if(code===2||code===3)return 'nuage';
    if(code===45||code===48)return 'brouillard';
    if(code===95||code===96||code===99)return 'orage';
    if(code===71||code===73||code===75||code===77||code===85||code===86)return 'neige';
    return 'pluie';
  }
  var SECTEURS=[['nord','du nord'],['nord-est','du nord-est'],['est','de l’est'],['sud-est','du sud-est'],['sud','du sud'],['sud-ouest','du sud-ouest'],['ouest','de l’ouest'],['nord-ouest','du nord-ouest']];
  function secteurVent(deg){return SECTEURS[Math.round((((deg%360)+360)%360)/45)%8]}
  function forceVent(v){return v<2?'calme':v<12?'léger':v<25?'modéré':v<40?'frais':'fort'}
  function echelleUV(v){return v<3?'faible':v<6?'modéré':v<8?'élevé':v<11?'très élevé':'extrême'}
  var meteoEtat={};
  function indiceHeureCourante(om){
    var t=om.hourly.time, c=om.current.time, i=0;
    for(var k=0;k<t.length;k++){if(t[k]<=c)i=k; else break}
    return i;
  }
  function tendancePression(om){
    var i=indiceHeureCourante(om), p=om.hourly.pressure_msl;
    if(i<3||!p||p[i]===undefined||p[i-3]===undefined)return null;
    return p[i]-p[i-3];
  }
  function probaMaxProchaines(om,n){
    var i=indiceHeureCourante(om), pr=om.hourly.precipitation_probability, mx=null;
    if(!pr)return null;
    for(var k=i;k<Math.min(pr.length,i+n);k++){if(pr[k]!==null&&pr[k]!==undefined&&(mx===null||pr[k]>mx))mx=pr[k]}
    return mx;
  }
  function lectureMeteo(nom,om,met,zone,lat,lon){
    var c=om.current, phr=[];
    phr.push('À '+nom+', il fait '+fr(c.temperature_2m,1)+' °C (ressenti '+fr(c.apparent_temperature,1)+' °C).');
    if(met){
      var e=Math.abs(c.temperature_2m-met.val);
      phr.push(e<=2?'Mes deux sources concordent à '+fr(e,1)+' °C près : la lecture est triangulée.':'Mes deux sources divergent de '+fr(e,1)+' °C : les deux valeurs sont montrées ci-dessous, je n’en choisis aucune.');
    }else{
      phr.push('Une seule source répond à l’instant : cette lecture est dite à une source, et la tuile de température le montre.');
    }
    var fam=familleCode(c.weather_code);
    if(fam==='clair')phr.push('Le ciel est dégagé.');
    else if(fam==='nuage')phr.push('Les nuages couvrent le ciel.');
    else if(fam==='pluie')phr.push('La pluie est de la partie.');
    else if(fam==='neige')phr.push('La neige est de la partie.');
    else if(fam==='brouillard')phr.push('Le brouillard couvre le secteur.');
    else if(fam==='orage')phr.push('L’orage passe, ou menace, sur le secteur.');
    var sec=secteurVent(c.wind_direction_10m);
    phr.push('Le vent souffle '+sec[1]+' à '+Math.round(c.wind_speed_10m)+' km/h — '+forceVent(c.wind_speed_10m)+'.');
    var tp=tendancePression(om);
    if(tp!==null){
      var lib=Math.abs(tp)<1?'stable':(tp>0?'en hausse':'en baisse');
      phr.push('La pression ('+fr(c.pressure_msl,0)+' hPa) est '+lib+' sur trois heures'+(lib==='en baisse'?' — le temps peut se dégrader.':lib==='en hausse'?' — le beau temps se maintient, ou revient.':' — la situation n’évolue guère.'));
    }
    var pm=probaMaxProchaines(om,12);
    if(pm!==null){
      if(pm>=50)phr.push('Les prochaines heures portent jusqu’à '+pm+' % de probabilité de précipitations — à surveiller.');
      else if(pm<20)phr.push('Aucune précipitation sérieuse n’est en vue pour les prochaines heures (probabilité maximale : '+pm+' %).');
    }
    if(typeof lat==='number'&&typeof lon==='number'){
      var sJ=soleil(new Date(),lat,lon);
      if(sJ){
        var aujJ=new Date(), baseJ=Date.UTC(aujJ.getUTCFullYear(),aujJ.getUTCMonth(),aujJ.getUTCDate());
        var levJ=baseJ+sJ.lever*3600000, couJ=baseJ+sJ.coucher*3600000;
        var dh=Math.floor((couJ-levJ)/3600000), dm=Math.round(((couJ-levJ)%3600000)/60000);
        if(dm===60){dh++;dm=0}
        phr.push('Le jour dure '+dh+' h '+pad(dm)+' (lever '+fmtHeureZone(levJ,zone)+', coucher '+fmtHeureZone(couJ,zone)+') — lever et coucher calculés par l’algorithme solaire de la NOAA.');
      }
    }
    return phr.join(' ');
  }
  function chargerMeteoPour(P,ancre){
    if(!ancre||ancre.lat===null||ancre.lat===undefined)return;
    meteoEtat[P]=meteoEtat[P]||{};
    meteoEtat[P].ancre=ancre;
    var u='https://api.open-meteo.com/v1/forecast?latitude='+ancre.lat+'&longitude='+ancre.lon
      +'&current=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,wind_direction_10m,weather_code'
      +'&hourly=temperature_2m,precipitation_probability,weather_code,pressure_msl'
      +'&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,uv_index_max'
      +'&forecast_days=7&timeformat=unixtime&timezone='+encodeURIComponent(ancre.zone);
    var pOM=fetch(u).then(function(r){if(!r.ok)throw new Error('meteo'); return r.json()}).catch(function(){return null});
    Promise.all([pOM,triangulerTemperature(ancre.lat,ancre.lon)]).then(function(res){
      meteoEtat[P].om=res[0];
      meteoEtat[P].met=res[1].met;
      meteoEtat[P].recuLe=new Date();
      meteoEtat[P].grille=res[0]?{lat:res[0].latitude,lon:res[0].longitude,elevation:res[0].elevation}:null;
      rendreMeteo(P);
    });
  }
  function rendreMeteo(P){
    var st=meteoEtat[P]; if(!st)return;
    var om=st.om, met=st.met, ancre=st.ancre;
    var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')};
    if(!om){
      texte(P+'-temp','Lecture impossible à l’instant');
      texte(P+'-temp-detail','Open-Meteo est injoignable depuis ton navigateur. Aucune valeur n’est inventée : nouvel essai au prochain rafraîchissement, dans dix minutes.');
      texte(P+'-lecture','Je ne lis rien pour l’instant : le service météo ne répond pas. Les tuiles le disent, et je ne raconterai pas un ciel que je n’ai pas lu.');
      texte(P+'-lecture-meta','');
      texte(P+'-etat','Échec de lecture à l’instant — état dit honnêtement, nouvel essai dans dix minutes.');
      rendreProvenanceMeteo();
      var zh=$(P+'-heures'); if(zh)zh.innerHTML='<p class="petite">Heures non lues — le service est injoignable.</p>';
      var zj=$(P+'-jours'); if(zj)zj.innerHTML='<p class="petite">Jours non lus — le service est injoignable.</p>';
      return;
    }
    var c=om.current;
    texte(P+'-temp',fr(c.temperature_2m,1)+' °C');
    if(met){
      var e=Math.abs(c.temperature_2m-met.val);
      texte(P+'-temp-detail','Open-Meteo '+fr(c.temperature_2m,1)+' °C · MET Norway '+fr(met.val,1)+' °C — écart '+fr(e,1)+' °C : '+(e<=2?'CONCORDENT.':'ÉCART — les deux valeurs tiennent, aucune n’est choisie.'));
    }else{
      texte(P+'-temp-detail','MET Norway injoignable à l’instant : valeur d’Open-Meteo seule, dite comme telle — aucune substitution.');
    }
    texte(P+'-ressenti',fr(c.apparent_temperature,1)+' °C');
    texte(P+'-humidite','Humidité relative : '+Math.round(c.relative_humidity_2m)+' %.');
    texte(P+'-pression',fr(c.pressure_msl,0)+' hPa');
    var tp=tendancePression(om);
    if(tp===null)texte(P+'-pression-detail','Tendance non calculable à l’instant (série horaire incomplète).');
    else if(Math.abs(tp)<1)texte(P+'-pression-detail','Stable sur trois heures ('+(tp>=0?'+':'−')+fr(Math.abs(tp),1)+' hPa, série horaire du service).');
    else texte(P+'-pression-detail',(tp>0?'En hausse':'En baisse')+' de '+fr(Math.abs(tp),1)+' hPa sur trois heures (série horaire du service).');
    var sec=secteurVent(c.wind_direction_10m);
    texte(P+'-vent',Math.round(c.wind_speed_10m)+' km/h');
    texte(P+'-vent-detail','En provenance '+sec[1]+' ('+Math.round(c.wind_direction_10m)+'°) — '+forceVent(c.wind_speed_10m)+'.');
    texte(P+'-ciel',iconeCode(c.weather_code)+' '+libelleCode(c.weather_code));
    texte(P+'-ciel-detail','Code météo '+c.weather_code+' du service, traduit en français.');
    var uv=om.daily&&om.daily.uv_index_max?om.daily.uv_index_max[0]:null;
    if(uv===null||uv===undefined){texte(P+'-uv','Non fourni'); texte(P+'-uv-detail','Le service ne fournit pas d’indice UV pour ce jour à ces coordonnées.')}
    else{texte(P+'-uv',fr(uv,1)+' — '+echelleUV(uv)); texte(P+'-uv-detail','Indice ultraviolet maximal prévu aujourd’hui (Open-Meteo).')}
    // Bande des 24 prochaines heures
    var zh2=$(P+'-heures');
    if(zh2){
      var i0=indiceHeureCourante(om), html='';
      for(var k=i0;k<Math.min(om.hourly.time.length,i0+24);k++){
        var pr=om.hourly.precipitation_probability?om.hourly.precipitation_probability[k]:null;
        html+='<div class="meteo-heure"><div class="mh-h">'+esc(fmtHeureZone(om.hourly.time[k]*1000,ancre.zone))+'</div><div class="mh-i">'+iconeCode(om.hourly.weather_code[k])+'</div><div class="mh-t">'+Math.round(om.hourly.temperature_2m[k])+' °C</div><div class="mh-p">'+(pr===null||pr===undefined?'—':pr+' %')+'</div></div>';
      }
      zh2.innerHTML=html;
    }
    // Les 7 jours
    var zj2=$(P+'-jours');
    if(zj2&&om.daily){
      var html2='', fmtJour=new Intl.DateTimeFormat('fr-CA',{timeZone:ancre.zone,weekday:'long',day:'numeric',month:'short'});
      for(var d=0;d<om.daily.time.length;d++){
        var ps=om.daily.precipitation_sum?om.daily.precipitation_sum[d]:null;
        var pmx=om.daily.precipitation_probability_max?om.daily.precipitation_probability_max[d]:null;
        var det=libelleCode(om.daily.weather_code[d]);
        if(ps!==null&&ps!==undefined&&ps>0)det+=' · précipitations '+fr(ps,1)+' mm'+(pmx!==null&&pmx!==undefined?' ('+pmx+' %)':'');
        else if(pmx!==null&&pmx!==undefined)det+=' · probabilité de précipitations max. '+pmx+' %';
        html2+='<div class="meteo-jour"><span class="mj-j">'+esc(fmtJour.format(new Date(om.daily.time[d]*1000)))+'</span><span class="mj-i">'+iconeCode(om.daily.weather_code[d])+'</span><span class="mj-l">'+esc(det)+'</span><span class="mj-t"><span class="min">'+Math.round(om.daily.temperature_2m_min[d])+' °</span> / '+Math.round(om.daily.temperature_2m_max[d])+' °C</span></div>';
      }
      zj2.innerHTML=html2;
    }
    texte(P+'-lecture',lectureMeteo(ancre.nom,om,met,ancre.zone,ancre.lat,ancre.lon));
    texte(P+'-lecture-meta','Lu à '+fmtHeureZone(Date.now(),ancre.zone)+' (heure '+(P==='mt'?'de l’ancre':'de ton ancrage')+') — générée par règles, uniquement depuis les valeurs affichées ci-dessous.');
    rendreAgeMeteo(P);
    rendreProvenanceMeteo();
    if(P==='mv')retenirPointMeteo();
  }
  function rendreAgeMeteo(P){
    var st=meteoEtat[P]; if(!st||!st.om)return;
    var quand=new Date(st.om.current.time*1000);
    texte(P+'-etat','Relevé Open-Meteo de '+fmtHeureZone(quand.getTime(),st.ancre.zone)+' (heure '+(P==='mt'?'de l’ancre':'de ton ancrage')+'), '+fmtAge(quand)+' · données reçues '+fmtAge(st.recuLe)+'. Rafraîchissement automatique toutes les 10 minutes quand l’onglet est visible.');
  }
  function rendreAgesMeteo(){rendreAgeMeteo('mt'); rendreAgeMeteo('mv')}
  // ----- Recherche reliée -----
  function motsDe(t){return String(t).split(/[^a-z0-9]+/).filter(function(m){return m.length>0})}
  function correspond(fTexte,jetons){
    var mots=motsDe(fTexte);
    for(var i=0;i<jetons.length;i++){
      var j=jetons[i], ok=false;
      if(j.length<2)continue;
      for(var k=0;k<mots.length;k++){if(mots[k].indexOf(j)===0){ok=true;break}}
      if(!ok)return false;
    }
    return true;
  }
  function rechercherUnites(unites,requete){
    var jetons=motsDe(pliage(requete)).filter(function(j){return j.length>=2});
    var groupes={}, total=0;
    if(!jetons.length)return {jetons:jetons,groupes:groupes,total:0};
    unites.forEach(function(u){
      if(!correspond(u.fTexte,jetons))return;
      var score=1;
      jetons.forEach(function(j){if(correspond(u.fTitre,[j]))score+=3});
      var copie={}; for(var k in u)copie[k]=u[k]; copie._score=score;
      (groupes[u.famille]=groupes[u.famille]||[]).push(copie); total++;
    });
    Object.keys(groupes).forEach(function(f){groupes[f].sort(function(a,b){return b._score-a._score})});
    return {jetons:jetons,groupes:groupes,total:total};
  }
  var relIndex=null, relJournal=null, relMin=null, dernierMot='';
  function pousserUnite(unites,famille,titre,texteBrut,panneau,el,url){
    var t=(texteBrut||'').replace(/\s+/g,' ').trim();
    unites.push({famille:famille,titre:titre||'',texte:t,panneau:panneau,el:el||null,url:url||null,fTitre:pliage(titre||''),fTexte:pliage((titre||'')+' '+t)});
  }
  function construireIndex(){
    var unites=[];
    document.querySelectorAll('#registre-historique .entree').forEach(function(e){
      var h=e.querySelector('h3,h4,b,strong');
      pousserUnite(unites,'Registre',h?h.textContent.trim():'Entrée du registre',e.textContent,'registre',e,null);
    });
    var salle=document.querySelector('.salle-pieces');
    if(salle)pousserUnite(unites,'Registre','La salle des pièces — le Registre propre (508 pièces)',String(salle.textContent).slice(0,2500),'registre',salle,null);
    document.querySelectorAll('#p-articles article.article-carte').forEach(function(a){
      var h=a.querySelector('h3'), lien=a.querySelector('a[href^="http"]');
      pousserUnite(unites,'Articles',h?h.textContent.trim():'Article',a.textContent,'articles',a,lien?lien.href:null);
    });
    document.querySelectorAll('#p-capsules .capsule, #p-capsules .capsule-ext, #p-capsules .capsule-vide').forEach(function(c){
      var h=c.querySelector('h3'), lien=c.querySelector('a[href^="http"]');
      pousserUnite(unites,'Capsules',h?h.textContent.trim():'Capsule',c.textContent,'capsules',c,lien?lien.href:null);
    });
    if(relJournal&&relJournal.length){
      var cibleJ=document.getElementById('journal');
      relJournal.forEach(function(en){
        var txt=(en.points||[]).map(function(p){return p.texte}).join(' ');
        pousserUnite(unites,'Journal',en.titre,(en.date||'')+' '+txt,'accueil',cibleJ,null);
      });
    }else{
      document.querySelectorAll('#journal-liste .journal-entree').forEach(function(a){
        var h=a.querySelector('h3');
        pousserUnite(unites,'Journal',h?h.textContent.trim():'Entrée du journal',a.textContent,'accueil',a,null);
      });
    }
    document.querySelectorAll('section.bloc').forEach(function(s){
      var h=s.querySelector('h2'); if(!h)return;
      var lead=s.querySelector('p.lead'), pan=s.closest('.panneau');
      pousserUnite(unites,'Sections',h.textContent.trim(),lead?lead.textContent:'',pan?pan.id.replace(/^p-/,''):'accueil',s,null);
    });
    return unites;
  }
  function extraitPour(u,jetons){
    function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
    var texte2=u.texte||'';
    if(!texte2)return '';
    var plie=pliage(texte2), re=/[a-z0-9]+/g, m, trouve=null;
    while((m=re.exec(plie))!==null){
      for(var i=0;i<jetons.length;i++){if(m[0].indexOf(jetons[i])===0){trouve={debut:m.index,fin:m.index+m[0].length}; break}}
      if(trouve)break;
    }
    var base=u.titre?(u.titre+' — '):'';
    if(!trouve)return esc((base+texte2).slice(0,150))+((base+texte2).length>150?'…':'');
    var d=Math.max(0,trouve.debut-52), f=Math.min(texte2.length,trouve.fin+72);
    return (d>0?'…':'')+esc(texte2.slice(d,trouve.debut))+'<mark>'+esc(texte2.slice(trouve.debut,trouve.fin))+'</mark>'+esc(texte2.slice(trouve.fin,f))+(f<texte2.length?'…':'');
  }
  function allerA(u){
    if(typeof ouvrirPanneau==='function')ouvrirPanneau(u.panneau);
    else location.hash='#'+u.panneau;
    setTimeout(function(){if(u.el&&u.el.scrollIntoView)u.el.scrollIntoView({behavior:'smooth',block:'start'})},200);
  }
  function lancerRecherche(){
    var q=$('rel-q'); if(!q)return;
    var mot=q.value.trim(); dernierMot=mot;
    var zone=$('rel-resultats'); if(!zone)return;
    if(mot.length<2){
      texte('rel-etat','Tape au moins deux lettres — par exemple « sceau », « sidéral » ou « registre ».');
      zone.innerHTML=''; return;
    }
    if(!relIndex)relIndex=construireIndex();
    var res=rechercherUnites(relIndex,mot);
    zone.innerHTML='';
    if(!res.total){
      texte('rel-etat','Aucun résultat pour « '+mot+' ».');
      var p=document.createElement('p');
      p.textContent='Rien dans le site ne porte ce mot — c’est dit plutôt que rempli. Essaie l’un de ceux-ci, tirés du contenu réel :';
      zone.appendChild(p);
      var rang=document.createElement('div'); rang.className='rel-sugg';
      ['sceau','sidéral','registre','antériorité'].forEach(function(s){
        var b=document.createElement('button'); b.className='btn-lieu'; b.textContent=s;
        b.addEventListener('click',function(){q.value=s; lancerRecherche()});
        rang.appendChild(b);
      });
      zone.appendChild(rang);
      return;
    }
    texte('rel-etat',res.total+' résultat'+(res.total>1?'s':'')+' pour « '+mot+' », groupés par famille — tout est cherché ici, dans ton navigateur.');
    ['Registre','Articles','Capsules','Journal','Sections'].forEach(function(fam){
      var liste=res.groupes[fam]; if(!liste||!liste.length)return;
      var h=document.createElement('p'); h.className='rel-groupe';
      h.textContent=fam+' — '+liste.length+' résultat'+(liste.length>1?'s':'');
      zone.appendChild(h);
      liste.slice(0,6).forEach(function(u){
        var b=document.createElement('button'); b.className='rel-resultat';
        var t=document.createElement('span'); t.className='r-titre'; t.textContent=u.titre||'(sans titre)';
        var ex=document.createElement('span'); ex.className='r-extrait'; ex.innerHTML=extraitPour(u,res.jetons);
        b.appendChild(t); b.appendChild(document.createElement('br')); b.appendChild(ex);
        if(u.url){
          var ru=document.createElement('span'); ru.className='r-url'; ru.textContent=u.url;
          b.appendChild(document.createElement('br')); b.appendChild(ru);
        }
        b.addEventListener('click',function(){allerA(u)});
        zone.appendChild(b);
      });
      if(liste.length>6){
        var plus=document.createElement('p'); plus.className='petite';
        plus.textContent='+ '+(liste.length-6)+' autres résultats dans cette famille — précise ton mot pour les trier.';
        zone.appendChild(plus);
      }
    });
  }
  // ----- Initialisation -----
  if($('p-temps')){
    refs['sainte-martine']={rep:creerRepere(lieuParId('sainte-martine')),carte:creerCarte(lieuParId('sainte-martine'))};
    refs['sainte-martine'].horloge=creerHorloge(lieuParId('sainte-martine'));
    if(refs['sainte-martine'].horloge)refs['sainte-martine'].horloge.wrap.classList.add('ancre');
    selectionner('sainte-martine');
    ['paris','tokyo','sydney'].forEach(ajouter);
    rendreControles();
    rendreSens();
    chargerSens();
    var bEst=$('porte-estimer');
    if(bEst)bEst.addEventListener('click',function(){estimerAncrage()});
    var bCho=$('porte-choisir');
    if(bCho)bCho.addEventListener('click',function(){
      var c=$('v-choix');
      if(c){c.scrollIntoView({block:'center'}); try{c.focus({preventScroll:true})}catch(e){}}
    });
    var selV=$('v-choix');
    if(selV)LIEUX.forEach(function(l){
      var o=document.createElement('option'); o.value=l.id; o.textContent=l.nom; selV.appendChild(o);
    });
    document.addEventListener('click',function(ev){
      if(Date.now()-dernierGlisser<400){ev.stopPropagation(); ev.preventDefault()}
    },true);
    document.addEventListener('click',function(ev){
      var b=ev.target&&ev.target.closest?ev.target.closest('[data-act]'):null;
      if(!b)return;
      var act=b.getAttribute('data-act'), id=b.getAttribute('data-id');
      if(act==='ajout')ajouter(id);
      else if(act==='retrait')retirer(id);
      else if(act==='choix')selectionner(id);
    });
    var btnR=$('x-retirer');
    if(btnR)btnR.addEventListener('click',function(){if(selection!=='sainte-martine')retirer(selection)});
    var btnV=$('v-choix-btn');
    if(btnV)btnV.addEventListener('click',function(){
      if(!selV)return;
      var l=lieuParId(selV.value); if(!l)return;
      poserVisiteur({nom:l.nom,region:'lieu choisi par toi dans la liste',lat:l.lat,lon:l.lon,zone:l.zone,source:'manuel'});
    });
    // ----- v18 — Rotation au doigt / à la souris, recentrage, redimensionnement -----
    var globeEl=document.querySelector('.planete-globe');
    if(globeEl){
      var gliss=null;
      globeEl.addEventListener('pointerdown',function(ev){
        gliss={x:ev.clientX,y:ev.clientY,lon:VUE.lon,lat:VUE.lat,bouge:false};
        try{globeEl.setPointerCapture(ev.pointerId)}catch(e){}
      });
      globeEl.addEventListener('pointermove',function(ev){
        if(!gliss)return;
        var dx=ev.clientX-gliss.x, dy=ev.clientY-gliss.y;
        if(Math.abs(dx)+Math.abs(dy)>6)gliss.bouge=true;
        if(!gliss.bouge)return;
        var k=57.2958/(0.25*geometrieScene().S);
        definirVue(gliss.lon-dx*k,gliss.lat+dy*k);
        appliquerVue();
      });
      var finGliss=function(){
        if(gliss&&gliss.bouge){dernierGlisser=Date.now(); espacerOrbite(); majGlobeSelection()}
        gliss=null;
      };
      globeEl.addEventListener('pointerup',finGliss);
      globeEl.addEventListener('pointercancel',finGliss);
    }
    var btnRec=$('planete-recentrer');
    if(btnRec)btnRec.addEventListener('click',function(){definirVue(-40,25); appliquerVue(); espacerOrbite(); majGlobeSelection()});
    var minuteurVue=null;
    window.addEventListener('resize',function(){
      clearTimeout(minuteurVue);
      minuteurVue=setTimeout(function(){espacerOrbite()},150);
    });
    setInterval(majPlanete,1000); majPlanete();
    setInterval(function(){rendreSens(); rendreAgesMeteo()},30000);
    setInterval(function(){
      chargerSens();
      var s2=lieuParId(selection); if(s2)majHistoire(s2);
      var pm=$('p-meteo');
      if(pm&&pm.classList.contains('actif')){
        chargerMeteoPour('mt',ANCRE_SITE);
        if(visiteur.lat!==null&&visiteur.lat!==undefined)chargerMeteoPour('mv',{nom:visiteur.nom,lat:visiteur.lat,lon:visiteur.lon,zone:visiteur.zone});
      }
    },600000);
  }
  if($('p-meteo'))chargerMeteoPour('mt',ANCRE_SITE);
  if($('rel-q')){
    fetch('assets/journal-mises-a-jour.json')
      .then(function(r){return r.json()})
      .then(function(d){relJournal=(d&&d.entrees)||[]; relIndex=null; if(dernierMot)lancerRecherche()})
      .catch(function(){});
    var rh=$('registre-historique');
    if(rh&&typeof MutationObserver!=='undefined')new MutationObserver(function(){relIndex=null}).observe(rh,{childList:true});
    var qRel=$('rel-q');
    texte('rel-etat','Index prêt — le contenu du site est interrogé ici, dans ton navigateur. Tape un mot.');
    qRel.addEventListener('input',function(){clearTimeout(relMin); relMin=setTimeout(lancerRecherche,200)});
    qRel.addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault(); lancerRecherche()}});
    var bRel=$('rel-btn');
    if(bRel)bRel.addEventListener('click',lancerRecherche);
  }
})();

// Assemble video/film-v3.html : le modèle du 29 octobre (styles, boucle, écran des choix, moteur flèches + point), raccourci
// à une minute avec le script du 30 (phrases courtes), sans aucun cadre, et une scène « sécurité » condensée.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../schemas.html', 'utf8');
const style = src.slice(src.indexOf('<style>'), src.indexOf('</style>') + 8);
// La boucle, selon le gérant (30 octobre) : un fil de flèches continu ; le point passe sur les ronds, qui s'allument au passage
// (une simple surbrillance, rien de plus) ; un arrêt pour marquer l'événement (Évaluation clignote en rouge : l'alerte est prise
// en compte) ; puis le point refait le tour vite sur les ronds déjà verts, et sur Évaluation le contour se rallume : validé. On poursuit.
const geo = require('./s0-geo.cjs'); const s0 = geo.s0;
// L'écran des choix, en trois passages (ordre du gérant, 30 octobre 16 h) : vers la sécurité (éventail complet), retour
// (sécurité prouvée, vers l'espace), dernier (sécurité et espace prouvés, vers la médecine). Le fil arrive de la gauche à la
// hauteur du fil de l'écran précédent (y = 450, 488 px à l'écran) ; dans les retours, il ressort à droite à la même hauteur,
// par le couloir libre, vers l'écran suivant. Le fil vers une pastille s'arrête au bord de la pastille agrandie (x1,35).
const sBgeo = (function () {
  const CX = 800, CY = 450, RB = 96, RX = 560, RY = 310, W = 240, H = 56, Z = 1.35;
  const labels = ['🪐 L\'espace', '🩺 La médecine', 'Un chiffre INSEE', 'Une norme sanitaire', 'Un article de loi', 'Une décision de justice', 'Un appel d\'offres', 'Un rapport annuel', 'Un brevet', '🛡 La sécurité d\'un site', 'Une norme produit', 'Votre métier'];
  const angs = [255, 285, 315, 345, 15, 45, 75, 105, 135, 165, 195, 225];
  const ids = { 0: 'bE', 1: 'bM', 9: 'bS' };
  const f = (v) => Math.round(v * 10) / 10; let k = 0; const out = [];
  const step = (x, pass) => { k += 1; out.push(x.replace('data-k="?"', 'data-k="' + k + '"' + (pass ? ' data-pass="' + pass + '"' : ''))); };
  const chips = angs.map((a, i) => { const t = (a * Math.PI) / 180; return { x: CX + RX * Math.cos(t), y: CY + RY * Math.sin(t), label: labels[i] }; });
  const fil = (i) => {
    const sc = chips[i], dx = sc.x - CX, dy = sc.y - CY, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const inChip = (x, y) => { const qx = Math.max(Math.abs(x - sc.x) - Z * (W / 2 - H / 2), 0), qy = y - sc.y; return Math.hypot(qx, qy) <= Z * H / 2 + 3; };
    let t = RB; while (!inChip(CX + ux * t, CY + uy * t)) t += 0.5;
    return 'M' + f(CX + ux * RB) + ',' + f(CY + uy * RB) + ' L' + f(CX + ux * t) + ',' + f(CY + uy * t);
  };
  const okChip = (i, label) => { const c = chips[i]; return '<rect class="chip ok" x="' + f(c.x - W / 2) + '" y="' + f(c.y - H / 2) + '" width="' + W + '" height="' + H + '" rx="' + H / 2 + '"/><text class="chip-t" x="' + f(c.x) + '" y="' + f(c.y + 7) + '" text-anchor="middle" style="font-size:19px">✔ ' + label + '</text>'; };
  const exit = '<g class="a" data-k="?" data-dur="1000" data-d="1050"><path class="arrow" pathLength="1" d="M' + (CX + RB) + ',' + CY + ' L1633.3,' + CY + '"/></g>';
  step('<g class="a" data-k="?" data-dur="1300" data-d="1400"><path class="arrow" pathLength="1" d="M-33.3,' + CY + ' L' + (CX - RB) + ',' + CY + '"/></g>');
  step('<g class="b" data-k="?" data-d="1600"><circle class="ring lit" cx="' + CX + '" cy="' + CY + '" r="' + RB + '"/><text class="lbl m acc" x="' + CX + '" y="' + (CY - 4) + '" text-anchor="middle">la boucle</text><text class="lbl xs" x="' + CX + '" y="' + (CY + 22) + '" text-anchor="middle">chercher · lire · prouver</text></g>');
  chips.forEach((c, i) => step('<g class="fan" data-k="?" data-d="' + (i === 11 ? 1500 : 380) + '"' + (ids[i] ? ' id="' + ids[i] + '"' : '') + ' style="transform-origin:' + f(c.x) + 'px ' + f(c.y) + 'px;--fx:' + f(CX - c.x) + 'px;--fy:' + f(CY - c.y) + 'px"><rect class="chip next" x="' + f(c.x - W / 2) + '" y="' + f(c.y - H / 2) + '" width="' + W + '" height="' + H + '" rx="' + H / 2 + '"/><text class="chip-t" x="' + f(c.x) + '" y="' + f(c.y + 7) + '" text-anchor="middle" style="font-size:19px">' + c.label + '</text></g>'));
  const base = k;
  // 1er passage : la sécurité d'un site.
  step('<g class="b" data-k="?" data-d="1800"><text class="lbl xs" x="0" y="0"> </text></g>', 'securite');
  step('<g class="a" data-k="?" data-zoom="#bS" data-dur="1000"><path class="arrow" pathLength="1" d="' + fil(9) + '"/></g>', 'securite');
  step('<g class="b" data-k="?" data-d="2400"><text class="lbl amber" x="800" y="70" text-anchor="middle" style="font-size:26px">Premier voyage : la sécurité d\'un site.</text></g>', 'securite');
  // 2e passage : la sécurité prouvée, le fil vers l'espace, puis il ressort à droite.
  step('<g class="b" data-k="?" data-hide="#bS" data-d="1400">' + okChip(9, 'La sécurité · prouvée') + '</g>', 'espace');
  step('<g class="a" data-k="?" data-zoom="#bE" data-dur="1000"><path class="arrow" pathLength="1" d="' + fil(0) + '"/></g>', 'espace');
  step('<g class="b" data-k="?" data-d="2400"><text class="lbl amber" x="800" y="70" text-anchor="middle" style="font-size:26px">Deuxième voyage : l\'espace.</text></g>', 'espace');
  step(exit, 'espace');
  // 3e passage : sécurité et espace prouvés, le fil vers la médecine, puis il ressort à droite.
  step('<g class="b" data-k="?" data-hide="#bS" data-d="700">' + okChip(9, 'La sécurité · prouvée') + '</g>', 'medecine');
  step('<g class="b" data-k="?" data-hide="#bE" data-d="1400">' + okChip(0, 'L\'espace · prouvé') + '</g>', 'medecine');
  step('<g class="a" data-k="?" data-zoom="#bM" data-dur="1000"><path class="arrow" pathLength="1" d="' + fil(1) + '"/></g>', 'medecine');
  step('<g class="b" data-k="?" data-d="2400"><text class="lbl amber" x="800" y="70" text-anchor="middle" style="font-size:26px">Dernier voyage : la médecine.</text></g>', 'medecine');
  step(exit, 'medecine');
  const sec = '  <section class="scene" id="sB">\n    <header><h2>OÙ L\'ENVOYER ?</h2><span class="t">l\'écran des choix</span></header>\n    <svg viewBox="0 0 1600 900" role="img" aria-label="La boucle au centre et, autour, tout ce qu\'on peut lui demander">\n      ' + out.join('\n      ') + '\n    </svg>\n    <div class="caption" id="cB"></div>\n  </section>\n';
  const nulls = (n) => Array(n).fill(null);
  const cap = {
    securite: ['Le point arrive. La boucle attend un objectif.', 'Même boucle, zéro code.', 'L\'espace…', 'la médecine…', 'un chiffre de l\'INSEE…', 'une norme…', 'une loi…', 'une décision de justice…', 'un appel d\'offres…', 'un rapport annuel…', 'un brevet…', 'la sécurité d\'un site…', 'une norme produit…', 'votre métier.', 'Tout vient de données gratuites.', null, '<b>D\'abord, la sécurité d\'un site.</b>'],
    espace: ['Le point revient.', 'La boucle, inchangée.'].concat(nulls(12), ['La sécurité&nbsp;: <b>prouvée</b>.', null, '<b>Deuxième voyage&nbsp;: l\'espace.</b>', null]),
    medecine: ['Le point revient.', 'La boucle, toujours la même.'].concat(nulls(12), [null, 'L\'espace&nbsp;: <b>prouvé</b>.', null, '<b>Dernier voyage&nbsp;: la médecine.</b>', null]),
  };
  Object.keys(cap).forEach((p) => { const n = base + out.filter((x) => x.includes('data-pass="' + p + '"')).length; if (cap[p].length !== n) throw new Error('sB ' + p + ' : ' + n + ' étapes, ' + cap[p].length + ' légendes'); });
  return { sec, cap };
})();

// L'ESPACE (scène sE du 29, légendes du brief) : la même question posée deux fois, le panneau rouge (le modèle seul) et le
// panneau vert (Mission Zero) ; puis la sensation : les étoiles viennent vers vous, le compteur monte, le fil va de boîte en
// boîte (Hercule, la galaxie, le Grand Attracteur) et ressort à droite à y = 450, la hauteur d'entrée de l'écran suivant.
const sEgeo = require('./sE-geo.cjs');

// LA MÉDECINE (scène sM du 29, légendes du brief) : le fil entre à y = 450 et arrive sur le panneau rouge (avant) ; puis il
// devient un électrocardiogramme : trois battements, chaque pointe s'arrête à 10 px de sa boîte ; puis la veille (une courbe,
// son seuil, un point rouge en semaine 38) ; le futur ; et il ressort à droite vers la fin.
const sMgeo = require('./sM-geo.cjs');

// LA FIN (le fil arrive verticalement au bord gauche du zéro, dans le sens du cercle : aucun angle) : le fil entre à la hauteur où la médecine l'a laissé (728 px), dessine le zéro, le point se pose au centre ; silence ;
// coupure au noir ; « WHAT DO YOU NEED ? » blanc plein écran, « CRYPTOR.AGENCY » dessous, « MISSION ZERO » néon en dernier.
const sZgeo = require('./sZ-geo.cjs');
// La sécurité, condensée : la carte du choc, la colonne rouge, la colonne verte, rejeté puis proposé, le regard, le vrai site, MYTHOZOR.
const s1old = `  <section class="scene" id="s1">
    <header><h2>2 · LA SÉCURITÉ D'UN SITE</h2><span class="t">premier voyage</span></header>
    <svg viewBox="0 0 1600 900" role="img" aria-label="La sécurité d'un site : avant, sans Mission Zero ; avec Mission Zero">
      <g class="a" data-k="1" data-d="900"><path class="arrow red" pathLength="1" d="M0 140 L518 140"/></g>
      <g class="b" data-k="2" data-d="2600"><rect class="box red" x="520" y="40" width="560" height="200" rx="16"/><text class="lbl red" x="800" y="110" text-anchor="middle" style="font-size:46px;letter-spacing:.08em">SITE FERMÉ</text><text class="lbl s" x="800" y="152" text-anchor="middle" style="font-size:22px">données clients dans la nature</text><text class="lbl" x="800" y="205" text-anchor="middle" style="font-size:26px">8 sites sur 10 sont exposés</text></g>
      <g class="a" data-k="3" data-d="900"><path class="arrow red" pathLength="1" d="M520 180 L30 180 L30 355 L58 355"/></g>
      <g class="b" data-k="4" data-d="1300"><text class="lbl red" x="310" y="300" text-anchor="middle" style="font-size:22px;letter-spacing:.08em">AVANT, SANS MISSION ZERO</text><rect class="box red" x="60" y="320" width="500" height="70" rx="14"/><text class="lbl m" x="310" y="363" text-anchor="middle">Un scanner trouve 15 failles</text></g>
      <g class="a" data-k="5" data-d="500"><path class="arrow red" pathLength="1" d="M310 392 L310 403"/></g>
      <g class="b" data-k="6" data-d="1600"><rect class="box red" x="60" y="405" width="500" height="70" rx="14"/><text class="lbl m" x="310" y="448" text-anchor="middle">On corrige à la main, en production</text></g>
      <g class="a" data-k="7" data-d="500"><path class="arrow red" pathLength="1" d="M310 477 L310 488"/></g>
      <g class="b" data-k="8" data-d="1300"><rect class="box red" x="60" y="490" width="500" height="70" rx="14"/><text class="lbl m" x="310" y="533" text-anchor="middle">Autre chose casse, personne ne relit</text></g>
      <g class="a" data-k="9" data-d="500"><path class="arrow red" pathLength="1" d="M310 562 L310 573"/></g>
      <g class="b" data-k="10" data-d="1600"><rect class="box red" x="60" y="575" width="500" height="70" rx="14"/><text class="lbl m" x="310" y="618" text-anchor="middle" style="font-weight:800">Site fermé, données dans la nature</text></g>
      <g class="a" data-k="11" data-d="1000"><path class="arrow" pathLength="1" d="M1080 180 L1570 180 L1570 355 L1542 355"/></g>
      <g class="b" data-k="12" data-d="1300"><text class="lbl acc" x="1290" y="300" text-anchor="middle" style="font-size:22px;letter-spacing:.08em">AVEC MISSION ZERO</text><rect class="box ok" x="1040" y="320" width="500" height="70" rx="14"/><text class="lbl m" x="1290" y="363" text-anchor="middle">Le même constat, format générique</text></g>
      <g class="a" data-k="13" data-d="500"><path class="arrow" pathLength="1" d="M1290 392 L1290 403"/></g>
      <g class="b" data-k="14" data-d="1300"><rect class="box ok" x="1040" y="405" width="500" height="70" rx="14"/><text class="lbl m" x="1290" y="448" text-anchor="middle">Correctif cherché, sources citées</text></g>
      <g class="a" data-k="15" data-d="500"><path class="arrow" pathLength="1" d="M1290 477 L1290 488"/></g>
      <g class="b" data-k="16" data-d="1600"><rect class="box ok" x="1040" y="490" width="500" height="70" rx="14"/><text class="lbl m" x="1290" y="533" text-anchor="middle">Patch sur une copie, jamais le site</text></g>
      <g class="a" data-k="17" data-d="500"><path class="arrow" pathLength="1" d="M1290 562 L1290 573"/></g>
      <g class="b" data-k="18" data-d="1300"><rect class="box ok" x="1040" y="575" width="500" height="70" rx="14"/><text class="lbl m" x="1290" y="618" text-anchor="middle">7 parcours rejoués, rescan, regard</text></g>
      <g class="a" data-k="19" data-d="500"><path class="arrow" pathLength="1" d="M1290 647 L1290 658"/></g>
      <g class="b" data-k="20" data-d="1600"><rect class="box ok" x="1040" y="660" width="500" height="70" rx="14"/><text class="lbl m" x="1290" y="703" text-anchor="middle" style="font-weight:800">Un humain applique</text></g>
      <g class="a" data-k="21" data-d="900"><path class="arrow red" pathLength="1" d="M560 525 L585 525 L585 585 L608 585"/></g>
      <g class="b" data-k="22" data-d="2200" data-blink="rejc"><rect class="chip ko" id="rejc" x="610" y="560" width="180" height="50" rx="25"/><text class="chip-t" x="700" y="593" text-anchor="middle" style="font-weight:700">REJETÉ</text></g>
      <g class="a" data-k="23" data-d="500"><path class="arrow" pathLength="1" d="M792 585 L808 585"/></g>
      <g class="b" data-k="24" data-d="2000"><rect class="chip ok" x="810" y="560" width="180" height="50" rx="25"/><text class="chip-t" x="900" y="593" text-anchor="middle" style="font-weight:700">PROPOSÉ</text></g>
      <g class="a" data-k="25" data-d="700"><path class="arrow" pathLength="1" d="M900 558 L900 542"/></g>
      <g class="b" data-k="26" data-d="1800"><rect class="box" x="610" y="290" width="380" height="250" rx="14"/><text class="lbl m" x="630" y="322">Paiement</text><text class="lbl xs" x="630" y="356">Numéro de carte</text><rect class="field" id="f1" x="790" y="340" width="180" height="24" rx="4"/><text class="lbl xs" x="630" y="392">Expiration</text><rect class="field" id="f2" x="790" y="376" width="180" height="24" rx="4"/><text class="lbl xs" x="630" y="428">Cryptogramme</text><rect class="field" id="f3" x="790" y="412" width="180" height="24" rx="4"/><text class="lbl xs" x="630" y="464">Nom</text><rect class="field" x="790" y="448" width="180" height="24" rx="4"/><text class="lbl xs" x="630" y="500">E-mail</text><rect class="field" x="790" y="484" width="180" height="24" rx="4"/><text class="lbl xs okt" x="800" y="530" text-anchor="middle" id="formt">tests HTTP : 7 parcours verts</text></g>
      <g class="b" data-k="27" data-d="2600" data-gone="f1,f2,f3" data-hide="#formt" data-blink="lookt"><text class="lbl red" id="lookt" x="800" y="530" text-anchor="middle" style="font-size:17px;font-weight:700">il a regardé la page · 5 champs avant, 2 après · REFUSÉ</text></g>
      <g class="a" data-k="28" data-d="600"><path class="arrow" pathLength="1" d="M900 612 L900 623"/></g>
      <g class="b" data-k="29" data-d="3200"><rect class="box amber" x="610" y="625" width="380" height="110" rx="14"/><text class="lbl xs amber" x="800" y="652" text-anchor="middle" style="letter-spacing:.08em">UN VRAI SITE · 6STEM.COM · LU PAR ARGUS</text><text class="lbl" x="700" y="704" text-anchor="middle" style="font-size:40px">7</text><text class="lbl acc" x="800" y="704" text-anchor="middle" style="font-size:40px">5</text><text class="lbl red" x="900" y="704" text-anchor="middle" style="font-size:40px">2</text><text class="lbl xs" x="700" y="726" text-anchor="middle">constats</text><text class="lbl xs" x="800" y="726" text-anchor="middle">réparés, prouvés</text><text class="lbl xs" x="900" y="726" text-anchor="middle">non certifiés</text></g>
      <g class="a" data-k="30" data-d="600"><path class="arrow" pathLength="1" d="M1290 732 L1290 758"/></g>
      <g class="b" data-k="31" data-d="3200"><rect class="box ok" x="60" y="760" width="1480" height="62" rx="14"/><text class="lbl acc" x="300" y="800" text-anchor="middle" style="letter-spacing:.1em">MYTHOZOR</text><text class="lbl m" x="640" y="800" text-anchor="middle">ARGUS surveille</text><text class="lbl m acc" x="920" y="800" text-anchor="middle">Mission Zero répare</text><text class="lbl m" x="1250" y="800" text-anchor="middle" style="font-weight:800">vous validez</text></g>
    </svg>
    <div class="caption" id="c1"></div>
  </section>
`;
// La correction (AVEC MISSION ZERO), redessinée au millimètre : chaque fil part du bord d'un élément et arrive au bord du
// suivant, chaque texte est centré sur sa boîte ou son rond, aucun fil ne traverse un rond, une boîte ou un texte.
const s2geo = require('./s2-geo.cjs');
// La boutique : les tuiles un peu plus basses pour libérer une ligne sous l'en-tête ; chaque alerte posée dans un espace libre,
// alignée sur ce qu'elle désigne (en-tête, prix du Ficus, bouton Payer, ligne jQuery, « Mon compte »).
const fixS1 = (x) => {
  const r = (a, b) => { if (!x.includes(a)) throw new Error('s1 : ' + a.slice(0, 60)); x = x.split(a).join(b); };
  r('y="150" width="320" height="220"', 'y="168" width="320" height="180"');
  r('cy="230" rx="90" ry="52"', 'cy="222" rx="80" ry="38"');
  r('y="318" text-anchor="middle">', 'y="298" text-anchor="middle">'); r('y="348" text-anchor="middle">', 'y="328" text-anchor="middle">');
  r('<rect class="badge" x="700" y="128" width="430" height="36" rx="18"/><text class="badge-t" x="915" y="153"', '<rect class="badge" x="560" y="73" width="300" height="36" rx="18"/><text class="badge-t" x="710" y="98"');
  r('<rect class="badge ok" x="700" y="128" width="430" height="36" rx="18"/><text class="badge-t ok" x="915" y="153"', '<rect class="badge ok" x="560" y="73" width="300" height="36" rx="18"/><text class="badge-t ok" x="710" y="98"');
  r('<rect class="badge" x="470" y="250" width="300" height="36" rx="18"/><text class="badge-t" x="620" y="275"', '<rect class="badge" x="470" y="354" width="300" height="36" rx="18"/><text class="badge-t" x="620" y="379"');
  r('<rect class="badge ok" x="470" y="250" width="300" height="36" rx="18"/><text class="badge-t ok" x="620" y="275"', '<rect class="badge ok" x="470" y="354" width="300" height="36" rx="18"/><text class="badge-t ok" x="620" y="379"');
  r('<rect class="badge" x="600" y="412" width="380" height="36" rx="18"/><text class="badge-t" x="790" y="437"', '<rect class="badge" x="890" y="466" width="300" height="36" rx="18"/><text class="badge-t" x="1040" y="491"');
  r('<rect class="badge" x="730" y="600" width="420" height="36" rx="18"/><text class="badge-t" x="940" y="625"', '<rect class="badge" x="740" y="582" width="420" height="36" rx="18"/><text class="badge-t" x="950" y="607"');
  r('<rect class="badge" x="100" y="128" width="400" height="36" rx="18"/><text class="badge-t" x="300" y="153"', '<rect class="badge" x="840" y="128" width="320" height="30" rx="15"/><text class="badge-t" x="1000" y="149"');
  // L'équipe n'est plus un encadré : la silhouette du personnage et ses deux lignes dessous (gérant 30 octobre, 16 h).
  r('<rect class="box" x="1250" y="180" width="310" height="300" rx="18"/><text class="lbl" x="1405" y="260" text-anchor="middle" style="font-size:54px">👩‍💻</text><text class="lbl m" x="1405" y="312" text-anchor="middle">L\'équipe</text><text class="lbl xs" x="1405" y="342" text-anchor="middle">une personne, souvent</text><text class="lbl xs" x="1405" y="366" text-anchor="middle">le site, les clients, la sécurité</text>', '<text class="lbl" x="1405" y="290" text-anchor="middle" style="font-size:96px">👩‍💻</text><text class="lbl s" x="1405" y="340" text-anchor="middle" style="fill:var(--fg)">une personne, souvent</text><text class="lbl xs" x="1405" y="368" text-anchor="middle">le site, les clients, la sécurité</text>');
  return x;
};
// ARGUS : pastilles dans le cadre, ⚠ sur la pastille rouge, boîtes allégées (une ligne lisible par boîte), le mode automatique
// annoncé « à venir » (aujourd'hui un humain applique, comme dans la correction), retour en U qui aboutit sur la boîte du site.
const fixS3 = (x) => {
  const r = (a, b) => { if (!x.includes(a)) throw new Error('s3 : ' + a.slice(0, 60)); x = x.split(a).join(b); };
  const grp = (k, b) => { const i = x.indexOf('<g class="b" data-k="' + k + '"'); const j = x.indexOf('</g>', i) + 4; if (i < 0) throw new Error('s3 k' + k); x = x.slice(0, i) + b + x.slice(j); };
  r('x="20" y="', 'x="48" y="'); r('width="150" height="40" rx="20"', 'width="124" height="40" rx="20"'); r('<text class="chip-t" x="95"', '<text class="chip-t" x="110"');
  r('✔ HTTPS, certificat', '✔ HTTPS'); r('✔ mentions légales', '✔ mentions'); r('✔ scripts, robots', '✔ scripts');
  r('<text class="chip-t" x="110" y="534" text-anchor="middle">✔ en-têtes</text>', '<text class="chip-t" id="ch5t" x="110" y="534" text-anchor="middle">✔ en-têtes</text>');
  r('data-hide="#badok1" data-chip="ch5:ko" id="badko" data-d="1700">', 'data-hide="#badok1,#ch5t" data-chip="ch5:ko" id="badko" data-d="1700"><text class="chip-t" x="110" y="534" text-anchor="middle" style="fill:#ffd2ce;font-weight:700">⚠ en-têtes</text>');
  r('data-hide="#badko" data-chip="ch5:ok" data-d="1500">', 'data-hide="#badko" data-chip="ch5:ok" data-d="1500"><text class="chip-t" x="110" y="534" text-anchor="middle">✔ en-têtes</text>');
  r('vos serveurs ou votre cloud · modèle en poids ouverts · secrets masqués · rien ne sort', 'sur vos serveurs · rien ne sort');
  r('<text class="lbl xs" x="350" y="520" text-anchor="middle">✔ commandes · comptes</text><text class="lbl xs" x="350" y="570" text-anchor="middle">en ligne, tous les jours</text>', '<text class="lbl xs" x="350" y="540" text-anchor="middle">✔ commandes · comptes</text>');
  r('x="350" y="640"', 'x="330" y="640"');
  r('<text class="lbl xs" x="1300" y="514" text-anchor="middle">appliqué tout seul', '<text class="lbl xs" x="1300" y="514" text-anchor="middle" style="font-size:12.5px">appliqué tout seul'); r('en-têtes : la politique de sécurité a sauté', 'en-têtes : protection sautée');
  r('d="M1300 602 L1300 735 L350 735 L350 602"', 'd="M1300 602 L1300 735 L490 735 L490 602"');
  grp(13, '<g class="b" data-k="13"><rect class="box gold" x="600" y="290" width="400" height="310" rx="18"/><text class="lbl acc" x="800" y="340" text-anchor="middle" style="font-size:28px">Mission Zero, branché</text><rect class="mini" x="625" y="380" width="100" height="50" rx="10"/><text class="lbl xs" x="675" y="411" text-anchor="middle" style="fill:var(--fg)">copie du site</text><path class="arrow" d="M727 405 L752 405" style="stroke-dasharray:none;stroke-dashoffset:0;stroke-width:3"/><rect class="mini" x="756" y="380" width="100" height="50" rx="10"/><text class="lbl xs" x="806" y="411" text-anchor="middle" style="fill:var(--fg)">correctif</text><path class="arrow" d="M858 405 L883 405" style="stroke-dasharray:none;stroke-dashoffset:0;stroke-width:3"/><circle class="ring lit" cx="905" cy="405" r="12"/><circle class="ring lit" cx="933" cy="405" r="12"/><circle class="ring lit" cx="961" cy="405" r="12"/><text class="lbl s okt" x="800" y="510" text-anchor="middle">✔ correctif confirmé, sur une copie</text></g>');
  // Le bloc « Vous validez · ou automatique » du 29 reste tel quel (les deux modes, décision du gérant du 30 octobre, 16 h).
  return x;
};
// ARGUS : le fil ressort de « Vous validez » vers la droite, à la hauteur d'entrée de l'écran des choix (488 px à l'écran).
const addExit3 = (x) => { const i = x.lastIndexOf('\n    </svg>'); return x.slice(0, i) + '\n      <g class="a" data-k="19" data-dur="900" data-d="950"><path class="arrow" pathLength="1" d="M1520,425.3 L1642.2,425.3"/></g>' + x.slice(i); };
const pick = (id, next) => { let x = src.slice(src.indexOf('<section class="scene" id="' + id + '">'), src.indexOf('<section class="scene" id="' + next + '">')); var i = x.indexOf("<div class=\"bar\">"); if (i >= 0) { var j = x.indexOf("</div>", i) + 7; x = x.slice(0, i) + x.slice(j); } return x; };
const marks = (sec, n) => { var o = sec.indexOf('<svg viewBox="0 0 1600 900"'); var oe = sec.indexOf('>', o) + 1; var dots = ''; for (var i = 0; i < 6; i++) dots += '<circle class="mark' + (i < n ? ' done' : i === n ? ' now' : '') + '" cx="' + (1420 + i * 26) + '" cy="38" r="6"/>'; return sec.slice(0, oe) + '<g class="marks">' + dots + '</g>' + sec.slice(oe); };
const titled = (sec, label, cls, sub) => { var o = sec.indexOf('<svg viewBox="0 0 1600 900"'); var oe = sec.indexOf('>', o) + 1; var ce = sec.indexOf('</svg>', oe); var head = '<text class="lbl ' + cls + '" x="800" y="40" text-anchor="middle" style="font-size:26px;letter-spacing:.2em;font-weight:700">' + label + '</text>' + (sub ? '<text class="lbl s" x="800" y="70" text-anchor="middle" style="font-size:20px;letter-spacing:.08em">' + sub + '</text>' : ''); return sec.slice(0, oe) + head + '<g transform="translate(' + (sub ? '40,84) scale(0.95)' : '32,56) scale(0.96)') + '">' + sec.slice(oe, ce) + '</g>' + sec.slice(ce); };
const sB = titled(sBgeo.sec, 'OÙ L’ENVOYER ?', 'amber'), sE = titled(sEgeo.sec, 'L’ESPACE · AVEC MISSION ZERO', 'acc'), sM = titled(sMgeo.sec, 'LA MÉDECINE · AVEC MISSION ZERO', 'acc'), sZ = sZgeo.sec;
const s1 = titled(fixS1(pick('s1', 's2')), 'SANS MISSION ZERO', 'red'), s2 = titled(s2geo.sec, 'AVEC MISSION ZERO', 'acc'), s3 = titled((function (x) { var i = x.indexOf('<g class="b" data-k="19"><text class="lbl acc" x="800" y="822"'); if (i < 0) return x; var j = x.indexOf('</g>', i) + 4; return x.slice(0, i) + x.slice(j); })(addExit3(fixS3(pick('s3', 'sE')))), 'EXEMPLE D’UTILISATION AVEC MISSION ZERO', 'acc', 'MYTHOZOR ARGUS · surveillance cybersécurité');
const S0 = marks(s0, 0), S1 = marks(s1, 1), S2 = marks(s2, 2), S3 = marks(s3, 3), SE = marks(sE, 4), SM = marks(sM, 5);
const CAP = {
  s0: geo.cap,
  sB: sBgeo.cap.securite, sB2: sBgeo.cap.espace, sB3: sBgeo.cap.medecine,
  s1: ['Une boutique en ligne. Elle tourne.', 'Les commandes tombent.', null, 'Tout va bien.', 'Conforme. Aujourd’hui.', 'Une équipe : une personne, souvent.', 'Une faille : aucun en-tête de sécurité.', 'Rouge.', 'Elle corrige à la main.', 'Corrigé.', 'Vert.', 'Une autre : le prix changé par le client.', 'Rouge.', 'Elle corrige, le soir.', 'Corrigé.', 'Vert.', 'Deux de plus : la carte bancaire en clair…', '…et une bibliothèque de 2012.', 'Rouge.', 'Pas le temps. Pas le budget.', 'Une cinquième. Elle restera ouverte.', 'Rouge.', '<b>8 sites sur 10 restent exposés.</b> La seule question, c’est quand.'],
  s2: s2geo.cap,
  s3: ['Chez vous. Rien ne sort.', 'Votre site, sur votre serveur.', '<b>MYTHOZOR ARGUS</b> surveille, jour et nuit.', null, null, null, null, null, null, 'Tout est vert.', 'Une nouvelle faille. ARGUS la voit. Rouge.', null, '<b>Mission Zero</b> la prend. Copie, correctif, cinq contrôles, patch.', null, 'Vous validez d’un clic. Ou en automatique.', null, 'ARGUS vérifie à nouveau.', 'Rouge repassé au vert. Sans vous réveiller.'],
};
CAP.s3 = CAP.s3.concat([null]); CAP.sE = sEgeo.cap; CAP.sM = sMgeo.cap; CAP.sZ = sZgeo.cap;
// Apostrophes typographiques dans tout le texte affiché (jamais dans le code ni les attributs).
const typo = (h) => h.replace(/>([^<]+)</g, (m, t) => '>' + t.replace(/'/g, '’') + '<');
// Le moteur : celui du 30 (fil et point ensemble, zooms, alerte, éventail), plus les passages de l'écran des choix, les
// étoiles et le compteur de l'espace, un arrondi réglable par fil (data-round, pointes du cœur), une classe posée sur la page
// (data-cls, le noir de la fin).
const script = `<script>
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var CAP = ${JSON.stringify(CAP).replace(/'/g, '’')};
  var timers = {}, pass = {}, SPEED = {};
  function speedOf(el) { var sc = el.closest('.scene'); return (sc && SPEED[sc.id]) || 1; }
  function steps(id) { var p = pass[id] || 'all'; return Array.prototype.slice.call(document.querySelectorAll('#' + id + ' [data-k]')).filter(function (s) { return !s.dataset.pass || p === 'all' || s.dataset.pass === p; }); }
  function capId(id) { return 'c' + id.slice(1); }
  function roundPath(d, maxR) {
    var t = d.trim(); if (t.charAt(0) !== 'M' || /[ACQSTHVZacqsthvz]/.test(t.slice(1))) return d;
    var nums = t.replace(/[ML]/g, ' ').split(/[ ,]+/).filter(Boolean).map(Number); var pts = []; for (var j = 0; j + 1 < nums.length; j += 2) pts.push([nums[j], nums[j + 1]]);
    if (pts.length < 3) return d;
    var out = 'M' + pts[0][0] + ',' + pts[0][1];
    for (var i = 1; i < pts.length - 1; i++) {
      var p = pts[i - 1], c = pts[i], n2 = pts[i + 1];
      var l1 = Math.hypot(c[0] - p[0], c[1] - p[1]), l2 = Math.hypot(n2[0] - c[0], n2[1] - c[1]), rr = Math.min(maxR || 48, l1 / 2, l2 / 2);
      var a = [c[0] - (c[0] - p[0]) / l1 * rr, c[1] - (c[1] - p[1]) / l1 * rr], bq = [c[0] + (n2[0] - c[0]) / l2 * rr, c[1] + (n2[1] - c[1]) / l2 * rr];
      out += ' L' + a[0].toFixed(1) + ',' + a[1].toFixed(1) + ' Q' + c[0] + ',' + c[1] + ' ' + bq[0].toFixed(1) + ',' + bq[1].toFixed(1);
    }
    var last = pts[pts.length - 1]; return out + ' L' + last[0] + ',' + last[1];
  }
  document.querySelectorAll('.arrow').forEach(function (p) { p.setAttribute('d', roundPath(p.getAttribute('d'), Number(p.dataset.round) || 0)); });
  var n = 0, gen = 0;
  document.querySelectorAll('.a .arrow').forEach(function (p) {
    n += 1; p.id = p.id || 'p' + n;
    var dur = Math.round((Number(p.parentNode.dataset.dur) || 1000) * speedOf(p));
    var c = document.createElementNS(SVGNS, 'circle'); c.setAttribute('r', '8'); c.setAttribute('class', 'runner'); c.dataset.for = p.id;
    p.parentNode.appendChild(c); p.style.transition = 'none'; p.parentNode.dataset.dur = dur;
  });
  function draw(step) {
    var dur = Number(step.dataset.dur) || 1000, my = gen, t0 = performance.now();
    var list = Array.prototype.map.call(step.querySelectorAll('.arrow'), function (p) { return { p: p, L: p.getTotalLength(), c: step.querySelector('.runner[data-for="' + p.id + '"]') }; });
    function frame(now) {
      if (my !== gen) return;
      var t = Math.min(1, Math.max(0, (now - t0) / dur));
      list.forEach(function (o) { o.p.style.strokeDashoffset = String(1 - t); var q = o.p.getPointAtLength(o.L * t); if (o.c) { o.c.setAttribute('cx', q.x); o.c.setAttribute('cy', q.y); } });
      if (t < 1) requestAnimationFrame(frame); else { list.forEach(function (o) { o.p.style.strokeDashoffset = ''; if (o.c) o.c.classList.remove('go'); }); step.classList.add('drawn'); }
    }
    list.forEach(function (o) { o.p.style.strokeDashoffset = '1'; var q = o.p.getPointAtLength(0); if (o.c) { o.c.setAttribute('cx', q.x); o.c.setAttribute('cy', q.y); o.c.classList.add('go'); } });
    requestAnimationFrame(frame);
    (step.dataset.pulses || '').split(',').filter(Boolean).forEach(function (r) { var m = r.split('@'), f = m[1].split(':'); setTimeout(function () { if (my === gen) pulse(m[0], f[1] === 'strong'); }, Math.round(Number(f[0]) * dur)); });
  }
  function pulse(id, strong) { var el = document.getElementById(id); if (!el) return; el.classList.remove('pulse', 'strong'); void el.getBBox(); el.classList.add('pulse'); if (strong) el.classList.add('strong'); setTimeout(function () { el.classList.remove('pulse', 'strong'); }, strong ? 1300 : 700); }
  // Le compteur de vitesse de l'espace : il monte, il ne redescend jamais. Le ciel d'étoiles vient vers vous, comme par le pare-brise.
  var speedTimer = null, starSpeed = 0.03, starsOn = false, stars = [], starEls = [], lastT = 0;
  function tweenSpeed(to) {
    var el = document.getElementById('speed'); if (!el) return; var from = Number(el.textContent) || 0, t0 = Date.now(); clearInterval(speedTimer);
    speedTimer = setInterval(function () { var k = Math.min(1, (Date.now() - t0) / 900); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k >= 1) clearInterval(speedTimer); }, 40);
    starSpeed = 0.04 + to / 1600;
  }
  function initStars() {
    var g = document.getElementById('stars'); if (!g || starEls.length) return;
    for (var i = 0; i < 140; i++) { var c = document.createElementNS(SVGNS, 'circle'); c.setAttribute('fill', '#fff'); g.appendChild(c); starEls.push(c); stars.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() }); }
  }
  function tickStars(t) {
    if (!starsOn) return; var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
    stars.forEach(function (s, i) {
      s.z -= starSpeed * dt; if (s.z <= 0.03) { s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; s.z = 1; }
      var sx = 800 + s.x / s.z * 700, sy = 450 + s.y / s.z * 420;
      if (sx < -20 || sx > 1620 || sy < -20 || sy > 920) { s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; s.z = 1; return; }
      var e = starEls[i]; e.setAttribute('cx', sx.toFixed(1)); e.setAttribute('cy', sy.toFixed(1)); e.setAttribute('r', ((1 - s.z) * 3 + 0.4).toFixed(2)); e.setAttribute('opacity', ((1 - s.z) * 0.8 + 0.1).toFixed(2));
    });
    requestAnimationFrame(tickStars);
  }
  function startStars() { initStars(); if (!starsOn) { starsOn = true; lastT = 0; requestAnimationFrame(tickStars); } }
  function stopStars() { starsOn = false; starSpeed = 0.03; }
  function act(step) {
    (step.dataset.hide || '').split(',').filter(Boolean).forEach(function (h) { document.querySelector(h).classList.add('hidden'); });
    (step.dataset.ring || '').split(',').filter(Boolean).forEach(function (r) { var id = r.split(':')[0], mode = r.split(':')[1] || 'lit'; var el = document.getElementById(id); el.classList.remove('lit', 'bad'); if (mode !== 'off') el.classList.add(mode); });
    if (step.dataset.shrink) { var sh = document.getElementById(step.dataset.shrink); if (sh) sh.classList.add('shrink'); }
    if (step.dataset.zoom2) { var zz = document.getElementById(step.dataset.zoom2); if (zz) { zz.parentNode.appendChild(zz); void zz.getBoundingClientRect(); zz.classList.add('zoomx'); zz.parentNode.classList.add('zooming'); } }
    if (step.dataset.unzoom) { var uz = document.getElementById(step.dataset.unzoom); if (uz) { uz.classList.remove('zoomx'); uz.parentNode.classList.remove('zooming'); } }
    (step.dataset.chip || '').split(',').filter(Boolean).forEach(function (r) { var id = r.split(':')[0], mode = r.split(':')[1] || 'ok'; var el = document.getElementById(id); if (el) { el.classList.remove('ok', 'ko'); el.classList.add(mode); } });
    (step.dataset.gone || '').split(',').filter(Boolean).forEach(function (id) { document.getElementById(id).classList.add('gone'); });
    (step.dataset.pulse || '').split(',').filter(Boolean).forEach(function (r) { pulse(r.split(':')[0], r.split(':')[1] === 'strong'); });
    (step.dataset.blink || '').split(',').filter(Boolean).forEach(function (id) { var el = document.getElementById(id); if (!el) return; el.classList.remove('blink'); void el.getBBox(); el.classList.add('blink'); setTimeout(function () { el.classList.remove('blink'); }, 3600); });
    if (step.dataset.speed) tweenSpeed(Number(step.dataset.speed));
    if (step.dataset.stars) startStars();
    if (step.dataset.rush) starSpeed = 1.3;
    (step.dataset.write || '').split(',').filter(Boolean).forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.add('on'); });
    if (step.dataset.cls) document.body.classList.add(step.dataset.cls);
    if (step.dataset.zoom) { var z = document.querySelector(step.dataset.zoom); if (z) setTimeout(function () { z.classList.add('zoom'); }, 900); }
  }
  function fire(step) {
    step.classList.add('on'); act(step);
    if (step.classList.contains('a')) draw(step);
  }
  function reset(id) {
    gen += 1; Array.prototype.slice.call(document.querySelectorAll('#' + id + ' [data-k]')).forEach(function (s) { s.classList.remove('on', 'drawn', 'focus', 'hidden', 'zoom'); if (s.dataset.cls) document.body.classList.remove(s.dataset.cls); });
    document.querySelectorAll('#' + id + ' .zooming').forEach(function (z) { z.classList.remove('zooming'); });
    document.querySelectorAll('#' + id + ' .zoomx').forEach(function (z) { z.classList.remove('zoomx'); });
    document.querySelectorAll('#' + id + ' .arrow').forEach(function (p) { p.style.strokeDashoffset = ''; });
    document.querySelectorAll('#' + id + ' .zoom').forEach(function (z) { z.classList.remove('zoom'); });
    document.querySelectorAll('#' + id + ' .hidden').forEach(function (z) { z.classList.remove('hidden'); });
    document.querySelectorAll('#' + id + ' .hand').forEach(function (z) { z.classList.remove('on'); });
    document.querySelectorAll('#' + id + ' .ring').forEach(function (r) { if (r.id) r.classList.remove('lit', 'bad'); });
    document.querySelectorAll('#' + id + ' .field').forEach(function (r) { r.classList.remove('gone'); });
    document.querySelectorAll('#' + id + ' .chip').forEach(function (r) { if (r.id) r.classList.remove('ok', 'ko'); });
    document.querySelectorAll('#' + id + ' .runner').forEach(function (c) { c.classList.remove('go'); });
    document.querySelectorAll('#' + id + ' .shrink').forEach(function (c) { c.classList.remove('shrink'); });
    document.querySelectorAll('#' + id + ' .pulse, #' + id + ' .blink').forEach(function (c) { c.classList.remove('pulse', 'strong', 'blink'); });
    if (id === 'sE') { stopStars(); clearInterval(speedTimer); var sp = document.getElementById('speed'); if (sp) sp.textContent = '0'; }
    document.getElementById(capId(id)).innerHTML = '';
  }
  function caps(id) { if (id !== 'sB') return CAP[id]; return pass[id] === 'espace' ? CAP.sB2 : pass[id] === 'medecine' ? CAP.sB3 : CAP.sB; }
  function caption(id, k) { var t = caps(id)[k - 1]; if (t) document.getElementById(capId(id)).innerHTML = t; }
  // Un passage « retour » sur l'écran des choix : le fil arrive à sa vitesse, puis la boucle et l'éventail reviennent vite.
  function play(id, done, p) {
    clearTimeout(timers[id]); pass[id] = p || pass[id] || 'all'; reset(id);
    var list = steps(id), k = 0, quick = (id === 'sB' && pass[id] !== 'securite' && pass[id] !== 'all');
    void document.getElementById(id).getBoundingClientRect();
    (function next() { if (k >= list.length) { if (done) timers[id] = setTimeout(done, list[list.length - 1].classList.contains('a') ? 0 : 1800); return; } var s = list[k]; k += 1; fire(s); caption(id, k); var d = Math.round((Number(s.dataset.d) || (s.classList.contains('a') ? 1100 : 1300)) * speedOf(s)); if (quick && !s.dataset.pass && !s.classList.contains('a')) d = Math.min(d, 220); if (s.classList.contains('a')) d = Math.max(d, (Number(s.dataset.dur) || 0) + 60); timers[id] = setTimeout(next, d); })();
  }
  function all(id) { clearTimeout(timers[id]); pass[id] = id === 'sB' ? 'medecine' : 'all'; reset(id); var list = steps(id); list.forEach(function (s) { s.classList.add('on', 'drawn'); act(s); }); document.querySelectorAll('#' + id + ' .shrink').forEach(function (c) { c.classList.remove('shrink'); }); document.body.classList.remove('black'); caption(id, list.length); }
  function show(id) { document.querySelectorAll('.scene').forEach(function (s) { s.classList.toggle('active', s.id === id); }); }
  var t0 = 0, clock = document.getElementById('clock');
  function tick() { if (t0) clock.textContent = Math.round((Date.now() - t0) / 100) / 10 + ' s'; }
  setInterval(tick, 200);
  // Le film complet : la boucle, les choix, la sécurité (boutique, correction, ARGUS), les choix, l'espace, les choix, la médecine, la fin.
  var CHAIN = [['s0'], ['sB', 'securite'], ['s1'], ['s2'], ['s3'], ['sB', 'espace'], ['sE'], ['sB', 'medecine'], ['sM'], ['sZ']];
  var IDS = ['s0', 'sB', 's1', 's2', 's3', 'sE', 'sM', 'sZ'];
  function stopAll() { IDS.forEach(function (id) { clearTimeout(timers[id]); }); stopStars(); document.body.classList.remove('black'); }
  function film(from) {
    stopAll(); t0 = Date.now(); document.body.classList.add('film');
    var i = from || 0; (function step() { if (i >= CHAIN.length) { clock.textContent = 'fin · ' + Math.round((Date.now() - t0) / 100) / 10 + ' s'; t0 = 0; return; } var c = CHAIN[i]; i += 1; show(c[0]); play(c[0], step, c[1] || 'all'); })();
  }
  document.getElementById('go').addEventListener('click', function () { film(0); });
  document.querySelectorAll('[data-ch]').forEach(function (b) { b.addEventListener('click', function () { stopAll(); document.body.classList.add('film'); show(b.dataset.ch); play(b.dataset.ch, null, b.dataset.pass || 'all'); }); });
  document.getElementById('grid').addEventListener('click', function () { stopAll(); document.body.classList.remove('film'); IDS.forEach(all); });
  window.MZF = { film: film, play: play, CHAIN: CHAIN, CAP: CAP, steps: steps, pass: pass };
  var q = new URLSearchParams(location.search);
  if (q.get('record')) document.documentElement.classList.add('record');
  if (q.get('auto')) film(0); else { document.body.classList.add('film'); show('s0'); }
})();
</script>`;
// Les styles propres au moteur du 30 (surbrillance, alerte, zoom, éventail, rétrécissement), puis ceux de la fin (zéro, noir, néon).
const extra = `<style>
.film .scene { display:none; } .film .scene.active { display:grid; } .film .scene header { display:none; }
.field { fill:#fff; stroke:#999; stroke-width:1.5; } .field.gone { fill:none; stroke:var(--red); stroke-dasharray:5 4; }
/* Surbrillance au passage du point : une pulsation du contour, rien de plus. Forte quand on revalide. */
.ring.pulse { animation: ringpulse .6s ease-out; } .ring.pulse.strong { animation: ringpulse-strong 1.2s ease-out; }
.mark { fill:none; stroke:var(--mut); stroke-width:2; } .mark.done { fill:var(--acc2); stroke:var(--acc2); } .mark.now { fill:var(--acc); stroke:#fff; stroke-width:2.5; }
/* Plein cadre (gérant, 30 octobre 20 h 10) : le dessin remplit 1280 × 720, la légende est posée dessus, en bas. */
.record .scene { padding:0 !important; position:relative; } .record .scene svg { max-height:none !important; width:1280px; height:720px; display:block; margin:0 !important; }
.record .caption { position:absolute; left:0; right:0; bottom:12px; min-height:0 !important; font-size:1.45rem !important; text-align:center; padding:0 24px !important; text-shadow:0 2px 10px #000, 0 0 2px #000; }
.record .wrap { gap:0 !important; }
.lbl.xs { font-size:18px; } .lbl.s { font-size:21px; } .chip-t { font-size:17px; }
.box.pulse { animation: ringpulse .6s ease-out; } .box.pulse.strong { animation: ringpulse-strong 1.2s ease-out; }
@keyframes ringpulse { 0% { stroke-width:3; filter:none; } 30% { stroke-width:7; filter:drop-shadow(0 0 10px rgba(46,230,160,.9)); } 100% { stroke-width:3; filter:none; } }
@keyframes ringpulse-strong { 0% { stroke-width:3; filter:none; } 25% { stroke-width:9; filter:drop-shadow(0 0 18px rgba(46,230,160,1)); } 100% { stroke-width:3; filter:drop-shadow(0 0 6px rgba(46,230,160,.6)); } }
/* L'alerte prise en compte : le rond rouge clignote. */
.chip.ko.blink, .lbl.red.blink { animation: blink .5s steps(2, start) 5; }
/* L'alerte : le contour du rond clignote en rouge vif, épais, avec un halo rouge. */
.ring.bad.blink { animation: alarm .5s ease-in-out 7; }
@keyframes alarm { 0%, 100% { stroke:rgba(255,107,97,.85); stroke-width:3; filter:none; } 50% { stroke:#ff3b30; stroke-width:11; filter:drop-shadow(0 0 16px rgba(255,59,48,1)); } }
.caption .r { color:var(--red); font-weight:700; }
@keyframes blink { to { opacity:.25; } }
.arrow.ghost { stroke:none; }
.rg { opacity:0; transition: opacity .35s, transform .5s cubic-bezier(.2,.8,.2,1); transform-box: view-box; } .rg.on { opacity:1; }
.rg.zoomx { transform: translate(var(--zx), var(--zy)) scale(3.4); }
.rg.zoomx .ring { fill:#0f2b2c; stroke-width:2; filter: drop-shadow(0 0 4px rgba(46,230,160,.9)); } .rg.zoomx .arrow { stroke-width:2; }
/* Un rond en alerte : le fil vert posé sur son contour s'efface, pour que le rouge se voie. */
.rg:has(.ring.bad) .arrow.split { opacity:0; }
/* Pendant le zoom, tout le reste de la boucle s'efface : rien sous le rond, rien autour. */
#loop > :not(.rg) { transition: opacity .4s; } #loop.zooming > .on:not(.zoomx), #loop.zooming > .a:not(.zoomx) { opacity:0 !important; }
.a.drawn .arrow.split { marker-end:none; }
.fan { opacity:0; transform: translate(var(--fx), var(--fy)) scale(.2); transform-box: view-box; transition: transform .55s cubic-bezier(.2,.8,.2,1), opacity .3s; }
.fan.on { opacity:1; transform: none; } .fan.zoom { transform: none; }
/* La boucle entière rétrécit jusqu'au point blanc. */
#loop { transform-box: view-box; transform-origin: 800px 420px; transition: transform 1s cubic-bezier(.4,0,.2,1), opacity 1s; }
#loop.shrink { transform: scale(0.01); opacity: 0; }
/* Le point blanc naît pendant le rétrécissement, au centre : aucun écran vide entre la boucle et le point. */
#dotc.on { animation-delay: .25s; }
/* La fin : le zéro tracé par le fil, la coupure au noir, le néon qui s'allume en dernier (un seul allumage, pas de boucle). */
.arrow.zero { stroke:var(--acc); stroke-width:7; }
body.black { background:#000; } body.black .scene { background:#000; } body.black .caption { visibility:hidden; }
.neon { fill:#39ffb0; filter: drop-shadow(0 0 6px #2ee6a0) drop-shadow(0 0 18px rgba(46,230,160,.8)); }
.b.on .neon { animation: neon 1.6s linear both; }
/* Le point écrit : chaque lettre se trace à son tour (contour), puis se remplit. */
.hand tspan { fill: transparent; stroke: #fff; stroke-width: 2; stroke-dasharray: 700; stroke-dashoffset: 700; transition: stroke-dashoffset .45s linear, fill .35s linear; }
.hand.on tspan { stroke-dashoffset: 0; fill: #fff; }
.hand.neonw tspan { stroke: #39ffb0; } .hand.neonw.on tspan { fill: #39ffb0; }
.hand.neonw.on { filter: drop-shadow(0 0 6px #2ee6a0) drop-shadow(0 0 18px rgba(46,230,160,.8)); }
.arrow.ghost { stroke: none; } .a.drawn .arrow.ghost { marker-end: none; }
@keyframes neon { 0% { opacity:0; } 12% { opacity:1; } 18% { opacity:.15; } 30% { opacity:1; } 36% { opacity:.3; } 50%, 100% { opacity:1; } }
</style>`;
let html = `<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<title>Mission Zero · le film</title>
${style}
${extra}
<div class="wrap">
  <h1>Mission Zero, le film · une minute <small>Le modèle du 29 octobre, raccourci : des phrases courtes, les flèches qui se dessinent, le point qui court devant, chaque élément qui apparaît et reste. Voix française (le fondateur), sous-titres anglais incrustés au montage.</small></h1>
  <div class="filmbar"><button class="big" id="go">▶ Lancer le film</button><button data-ch="s0">1 · La boucle</button><button data-ch="sB" data-pass="securite">· Où l'envoyer ?</button><button data-ch="s1">2 · Constat</button><button data-ch="s2">3 · Correction</button><button data-ch="s3">4 · MYTHOZOR ARGUS</button><button data-ch="sB" data-pass="espace">· Choix : l'espace</button><button data-ch="sE">5 · L'espace</button><button data-ch="sB" data-pass="medecine">· Choix : la médecine</button><button data-ch="sM">6 · La médecine</button><button data-ch="sZ">· Fin</button><button id="grid">Voir tous les schémas</button><span id="clock" style="color:var(--mut)"></span></div>
${typo(S0)}
${typo(sB)}
${typo(S1)}
${typo(S2)}
${typo(S3)}
${typo(SE)}
${typo(SM)}
${typo(sZ)}
</div>
${script}
</html>
`;
// Textes courts, partout (gérant, 30 octobre 18 h 50) : chaque mot compte, on enlève le surplus. Appliqués sur le film assemblé,
// textes du dessin (entre > et <) et légendes (entre guillemets du JSON).
const COURT = [
  ['Premier voyage : la sécurité d’un site.', '1 · La sécurité d’un site.'], ['Deuxième voyage : l’espace.', '2 · L’espace.'], ['Dernier voyage : la médecine.', '3 · La médecine.'], ['🛡 La sécurité d’un site', '🛡 La sécurité'],
  ['🌿 Maison Verde · boutique en ligne', '🌿 Maison Verde · boutique'], ['une personne, souvent', 'souvent seule'], ['le site, les clients, la sécurité', 'site · clients · sécurité'],
  ['⚠ aucun en-tête de sécurité', '⚠ en-têtes absents'], ['quand elle a le temps', 'quand elle peut'], ['le soir, après les commandes', 'le soir'], ['⚠ carte bancaire en clair', '⚠ carte en clair'],
  ['⚠ jQuery 2012 · 4 failles connues', '⚠ jQuery 2012'], ['pas les compétences, pas le budget', 'ni budget, ni compétence'], ['⚠ mot de passe faible accepté', '⚠ mot de passe faible'],
  ['sur 26 sites d’entreprises scannés par MYTHOZOR ARGUS, 81 % sans protection contre l’injection de code', '26 sites scannés par MYTHOZOR ARGUS · 81 % sans protection'],
  ['Ça arrive. C’est certain. La seule question, c’est quand.', ' '],
  ['sur vos serveurs · rien ne sort', 'vos serveurs · rien ne sort'], ['🌿 votre site · votre serveur', '🌿 votre site'], ['35 contrôles, en continu, jour et nuit', '35 contrôles · jour et nuit'],
  ['⚠ nouvelle faille, en direct', '⚠ nouvelle faille'], ['en-têtes : protection sautée', 'en-têtes sautés'], ['Mission Zero, branché', 'Mission Zero'], ['✔ correctif confirmé, sur une copie', '✔ confirmé sur une copie'],
  ['mode manuel : un clic par correctif, dans votre espace', 'manuel : un clic, dans votre espace'], ['appliqué tout seul, vous êtes prévenu, vous pouvez revenir en arrière', 'tout seul · prévenu · retour possible'],
  ['les deux existent : c’est vous qui choisissez', 'vous choisissez'], ['et MYTHOZOR ARGUS vérifie à nouveau', 'ARGUS revérifie'], ['✔ corrigé, tout est vert', '✔ tout est vert'], ['le rouge est repassé au vert', ' '],
  ['« On va quelque part ? » Posée deux fois.', '« On va quelque part ? » · deux fois'], ['Sans Mission Zero · le modèle seul', 'SANS MISSION ZERO'], ['Avec Mission Zero', 'AVEC MISSION ZERO'],
  ['4 sources sur 5 : personne ne peut les ouvrir', '4 sources sur 5 · introuvables'], ['4 chiffres · 1 dollar · chacun avec sa page', '4 chiffres · 1 dollar · chacun sa page'], ['ce qu’il n’a pas pu lire, il le dit', 'pas lu ? il le dit'],
  ['km/s · et vous ne sentez rien', 'km/s'], ['Hercule, 19,7 km/s · manuel de 1981', 'Hercule, 19,7 km/s · 1981'], ['Trois vitesses au centième · 2010', '3 vitesses au centième · 2010'],
  ['Rayon et vitesse de la galaxie · 2014', 'la galaxie · 2014'], ['Le fond du ciel au centième · 2020', 'le fond du ciel · 2020'], ['Hercule, 20 km/s · Univ. du Maryland', 'Hercule, 20 km/s · Maryland'],
  ['230 km/s · NASA, mot pour mot', '230 km/s · NASA'], ['Univ. du Maryland · vérifié ✔', 'Maryland · vérifié ✔'], ['NASA, mot pour mot · vérifié ✔', 'NASA · vérifié ✔'], ['Tully et al., Nature 2014 · vérifié ✔', 'Nature 2014 · vérifié ✔'],
  ['pas le temps de les lire', 'pas le temps'], ['il analyse les chiffres, les affiche, et ils sont vrais', 'les chiffres, affichés, vrais'], ['vérifié ✔ · OMS, Global TB Report 2024', 'vérifié ✔ · OMS 2024'],
  ['la veille · grippe, Sentinelles, pour 100 000', 'la veille · grippe · Sentinelles'], ['3 sources citées · aucun commentaire publié, il le dit', '3 sources · aucun commentaire, il le dit'],
];
const COURT_CAP = [
  ['Une faille : aucun en-tête de sécurité.', 'Une faille : en-têtes absents.'], ['Une autre : le prix changé par le client.', 'Une autre : le prix modifiable.'],
  ['<b>8 sites sur 10 restent exposés.</b> La seule question, c’est quand.', '<b>8 sites sur 10 exposés.</b> La seule question : quand.'],
  ['<b>Mission Zero</b> la prend. Copie, correctif, cinq contrôles, patch.', '<b>Mission Zero</b> la prend. Copie, correctif, cinq contrôles.'],
];
const court = (h) => {
  const both = (t) => [t, t.replace(/’/g, "'")];
  COURT.forEach(([o, n]) => both(o).forEach((x) => { h = h.split('>' + x + '<').join('>' + n + '<'); }));
  COURT_CAP.forEach(([o, n]) => both(o).forEach((x) => { h = h.split('"' + x + '"').join('"' + n + '"'); }));
  return h;
};
html = court(html);
const DEV = process.argv.includes('--dev');
if (DEV) html = html.replace('<title>Mission Zero · le film</title>', '<title>Mission Zero · le film · DEV</title>').replace('Mission Zero, le film · une minute <small>', 'Mission Zero, le film · VERSION DE DEV <small>');
if (require.main === module) {
  fs.writeFileSync(__dirname + (DEV ? '/../film-v4-dev.html' : '/../film-v4.html'), html);
  console.log('film-v4.html', html.length, 'octets; s0 steps:', (s0.match(/data-k=/g) || []).length, 'sB steps:', (sB.match(/data-k=/g) || []).length, 's1 steps:', (s1.match(/data-k=/g) || []).length);
}
// Source unique du film (décision du gérant, 30 octobre) : build-v4.cjs → film-v4.html.
module.exports = { src, style, extra, s0, sB, s1, s2, s3, sE, sM, sZ, CAP, titled, typo };

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
  const labels = ['🪐 L\'espace', '🩺 La médecine', '🔎 La recherche web', '💬 Les assistants IA', '📚 L\'encyclopédie', '📰 La presse', '🛒 Le commerce en ligne', '🏦 La banque', '⚖️ Le droit', '🛡 La cybersécurité', '🎓 L\'université', '🏛 L\'État'];
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
  step('<g class="b" data-k="?" data-d="1600"><circle class="ring lit" cx="' + CX + '" cy="' + CY + '" r="' + RB + '"/><text class="lbl m acc" x="' + CX + '" y="' + (CY - 4) + '" text-anchor="middle">la boucle</text><text class="lbl xs" x="' + CX + '" y="' + (CY + 22) + '" text-anchor="middle">chercher · lire · vérifier</text></g>');
  chips.forEach((c, i) => step('<g class="fan" data-k="?" data-d="' + (i === 11 ? 1500 : 380) + '"' + (ids[i] ? ' id="' + ids[i] + '"' : '') + ' style="transform-origin:' + f(c.x) + 'px ' + f(c.y) + 'px;--fx:' + f(CX - c.x) + 'px;--fy:' + f(CY - c.y) + 'px"><rect class="chip next" x="' + f(c.x - W / 2) + '" y="' + f(c.y - H / 2) + '" width="' + W + '" height="' + H + '" rx="' + H / 2 + '"/><text class="chip-t" x="' + f(c.x) + '" y="' + f(c.y + 7) + '" text-anchor="middle" style="font-size:19px">' + c.label + '</text></g>'));
  const base = k;
  // 1er passage : la sécurité d'un site.
  step('<g class="b" data-k="?" data-d="1800"><text class="lbl xs" x="0" y="0"> </text></g>', 'securite');
  step('<g class="a" data-k="?" data-zoom="#bS" data-dur="1000"><path class="arrow" pathLength="1" d="' + fil(9) + '"/></g>', 'securite');
  step('<g class="b" data-k="?" data-d="2400"><text class="lbl amber" x="800" y="70" text-anchor="middle" style="font-size:26px">Premier voyage : la cybersécurité.</text></g>', 'securite');
  step(exit, 'securite');
  // 2e passage : la sécurité prouvée, le fil vers l'espace, puis il ressort à droite.
  step('<g class="b" data-k="?" data-hide="#bS" data-d="1400">' + okChip(9, 'La cybersécurité · VERIFIED') + '</g>', 'espace');
  step('<g class="a" data-k="?" data-zoom="#bE" data-dur="1000"><path class="arrow" pathLength="1" d="' + fil(0) + '"/></g>', 'espace');
  step('<g class="b" data-k="?" data-d="2400"><text class="lbl amber" x="800" y="70" text-anchor="middle" style="font-size:26px">Deuxième voyage : l\'espace.</text></g>', 'espace');
  step(exit, 'espace');
  // 3e passage : sécurité et espace prouvés, le fil vers la médecine, puis il ressort à droite.
  step('<g class="b" data-k="?" data-hide="#bS" data-d="700">' + okChip(9, 'La cybersécurité · VERIFIED') + '</g>', 'medecine');
  step('<g class="b" data-k="?" data-hide="#bE" data-d="1400">' + okChip(0, 'L\'espace · VERIFIED') + '</g>', 'medecine');
  step('<g class="a" data-k="?" data-zoom="#bM" data-dur="1000"><path class="arrow" pathLength="1" d="' + fil(1) + '"/></g>', 'medecine');
  step('<g class="b" data-k="?" data-d="2400"><text class="lbl amber" x="800" y="70" text-anchor="middle" style="font-size:26px">Dernier voyage : la médecine.</text></g>', 'medecine');
  step(exit, 'medecine');
  const sec = '  <section class="scene" id="sB">\n    <header><h2>OÙ L\'ENVOYER ?</h2><span class="t">l\'écran des choix</span></header>\n    <svg viewBox="0 0 1600 900" role="img" aria-label="La boucle au centre et, autour, tout ce qu\'on peut lui demander">\n      ' + out.join('\n      ') + '\n    </svg>\n    <div class="caption" id="cB"></div>\n  </section>\n';
  const nulls = (n) => Array(n).fill(null);
  const cap = {
    securite: ['Le point arrive. La boucle attend un objectif.', 'Même boucle, zéro code.', 'L\'espace…', 'la médecine…', 'la recherche web…', 'les assistants IA…', 'l\'encyclopédie…', 'la presse…', 'le commerce en ligne…', 'la banque…', 'le droit…', 'la cybersécurité…', 'l\'université…', 'l\'État.', 'Partout où l\'on cherche, Mission Zero s\'installe.', null, '<b>D\'abord, la cybersécurité.</b>', null],
    espace: ['Le point revient.', 'La boucle, inchangée.'].concat(nulls(12), ['La cybersécurité&nbsp;: <b>VERIFIED</b>.', null, '<b>Deuxième voyage&nbsp;: l\'espace.</b>', null]),
    medecine: ['Le point revient.', 'La boucle, toujours la même.'].concat(nulls(12), [null, 'L\'espace&nbsp;: <b>VERIFIED</b>.', null, '<b>Dernier voyage&nbsp;: la médecine.</b>', null]),
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
      <g class="b" data-k="27" data-d="2600" data-gone="f1,f2,f3" data-hide="#formt" data-blink="lookt"><text class="lbl red" id="lookt" x="800" y="530" text-anchor="middle" style="font-size:17px;font-weight:700">il a regardé la page · 5 champs avant, 2 après · NOT VERIFIED</text></g>
      <g class="a" data-k="28" data-d="600"><path class="arrow" pathLength="1" d="M900 612 L900 623"/></g>
      <g class="b" data-k="29" data-d="3200"><rect class="box amber" x="610" y="625" width="380" height="110" rx="14"/><text class="lbl xs amber" x="800" y="652" text-anchor="middle" style="letter-spacing:.08em">UN VRAI SITE · 6STEM.COM · LU PAR ARGUS</text><text class="lbl" x="700" y="704" text-anchor="middle" style="font-size:40px">7</text><text class="lbl acc" x="800" y="704" text-anchor="middle" style="font-size:40px">5</text><text class="lbl red" x="900" y="704" text-anchor="middle" style="font-size:40px">2</text><text class="lbl xs" x="700" y="726" text-anchor="middle">constats</text><text class="lbl xs" x="800" y="726" text-anchor="middle">réparés · VERIFIED</text><text class="lbl xs" x="900" y="726" text-anchor="middle">non certifiés</text></g>
      <g class="a" data-k="30" data-d="600"><path class="arrow" pathLength="1" d="M1290 732 L1290 758"/></g>
      <g class="b" data-k="31" data-d="3200"><rect class="box ok" x="60" y="760" width="1480" height="62" rx="14"/><text class="lbl acc" x="300" y="800" text-anchor="middle" style="letter-spacing:.1em">MYTHOZOR</text><text class="lbl m" x="640" y="800" text-anchor="middle">ARGUS surveille</text><text class="lbl m acc" x="920" y="800" text-anchor="middle">Mission Zero répare</text><text class="lbl m" x="1250" y="800" text-anchor="middle" style="font-weight:800">vous validez</text></g>
    </svg>
    <div class="caption" id="c1"></div>
  </section>
`;
// La correction (AVEC MISSION ZERO), redessinée au millimètre : chaque fil part du bord d'un élément et arrive au bord du
// suivant, chaque texte est centré sur sa boîte ou son rond, aucun fil ne traverse un rond, une boîte ou un texte.
const s2geo = require('./s2-geo.cjs');
// La bille 3D qui court devant le fil et passe d'un écran à l'autre (gérant, 31 octobre).
const bille = require('./bille-3d.cjs');
// La boutique : les tuiles un peu plus basses pour libérer une ligne sous l'en-tête ; chaque alerte posée dans un espace libre,
// alignée sur ce qu'elle désigne (en-tête, prix du Ficus, bouton Payer, ligne jQuery, « Mon compte »).
const fixS1 = (x) => {
  const r = (a, b) => { if (!x.includes(a)) throw new Error('s1 : ' + a.slice(0, 60)); x = x.split(a).join(b); };
  // Gérant, 31 octobre : qu'on sache que c'est un site web, et que la personne est l'admin web.
  r('<g class="b" data-k="1" data-d="900">', '<g class="b shoutlabel" data-k="0" data-d="2600"><text class="lbl" x="620" y="40" text-anchor="middle" style="font-size:24px;font-weight:700;letter-spacing:.16em">VOTRE SITE WEB E-COMMERCE</text></g><g class="b" data-k="1" data-d="900">');
  r('<rect class="box" x="1250" y="180" width="310" height="300" rx="18"/>', '<text class="lbl" x="1405" y="168" text-anchor="middle" style="font-size:22px;font-weight:700;letter-spacing:.14em">VOTRE ADMIN WEB</text><rect class="box" x="1250" y="180" width="310" height="300" rx="18"/>');
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
  r('<rect class="box" x="1250" y="180" width="310" height="300" rx="18"/><text class="lbl" x="1405" y="260" text-anchor="middle" style="font-size:54px">👩‍💻</text><text class="lbl m" x="1405" y="312" text-anchor="middle">L\'équipe</text><text class="lbl xs" x="1405" y="342" text-anchor="middle">une personne, souvent</text><text class="lbl xs" x="1405" y="366" text-anchor="middle">le site, les clients, la sécurité</text>', '<text class="lbl" x="1405" y="290" text-anchor="middle" style="font-size:96px">👩‍💻</text><text class="lbl" x="1405" y="346" text-anchor="middle" style="font-size:32px">une personne, souvent</text><text class="lbl s" x="1405" y="380" text-anchor="middle" style="font-size:24px">le site, les clients, la sécurité</text>');
  // « Pas le temps » : en grand, et il bondit au premier plan quand il apparaît (gérant, 31 octobre : trop petit, sois plus expressif).
  r('<g class="b" data-k="20" id="h3" data-d="1600"><text class="lbl xs amber" x="1405" y="420" text-anchor="middle">⏳ pas le temps</text><text class="lbl xs" x="1405" y="446" text-anchor="middle">pas les compétences, pas le budget</text>', '<g class="b shout" data-k="20" id="h3" data-d="1600" style="transform-box:view-box;transform-origin:1405px 440px"><text class="lbl amber" x="1405" y="432" text-anchor="middle" style="font-size:34px">⏳ pas le temps</text><text class="lbl s" x="1405" y="466" text-anchor="middle" style="font-size:24px">pas les compétences, pas le budget</text>');
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
  grp(13, '<g class="b" data-k="13"><rect class="box gold" x="600" y="290" width="400" height="310" rx="18"/><text class="lbl acc" x="800" y="340" text-anchor="middle" style="font-size:28px">Mission Zero, branché</text><rect class="mini" x="625" y="380" width="100" height="50" rx="10"/><text class="lbl xs" x="675" y="411" text-anchor="middle" style="fill:var(--fg)">copie du site</text><path class="arrow" d="M727 405 L752 405" style="stroke-dasharray:none;stroke-dashoffset:0;stroke-width:3"/><rect class="mini" x="756" y="380" width="100" height="50" rx="10"/><text class="lbl xs" x="806" y="411" text-anchor="middle" style="fill:var(--fg)">correctif</text><path class="arrow" d="M858 405 L883 405" style="stroke-dasharray:none;stroke-dashoffset:0;stroke-width:3"/><circle class="ring lit" cx="905" cy="405" r="12"/><circle class="ring lit" cx="933" cy="405" r="12"/><circle class="ring lit" cx="961" cy="405" r="12"/><text class="lbl s okt" x="800" y="510" text-anchor="middle">VERIFIED · correctif, sur une copie</text></g>');
  // Le bloc « Vous validez · ou automatique » du 29 reste tel quel (les deux modes, décision du gérant du 30 octobre, 16 h).
  return x;
};
// ARGUS : le fil ressort de « Vous validez » vers la droite, à la hauteur d'entrée de l'écran des choix (488 px à l'écran).
const addExit3 = (x) => { const i = x.lastIndexOf('\n    </svg>'); return x.slice(0, i) + '\n      <g class="a" data-k="19" data-dur="900" data-d="950"><path class="arrow" pathLength="1" d="M1520,425.3 L1642.2,425.3"/></g>' + x.slice(i); };
const pick = (id, next) => { let x = src.slice(src.indexOf('<section class="scene" id="' + id + '">'), src.indexOf('<section class="scene" id="' + next + '">')); var i = x.indexOf("<div class=\"bar\">"); if (i >= 0) { var j = x.indexOf("</div>", i) + 7; x = x.slice(0, i) + x.slice(j); } return x; };
const marks = (sec, n) => { var o = sec.indexOf('<svg viewBox="0 0 1600 900"'); var oe = sec.indexOf('>', o) + 1; var dots = ''; for (var i = 0; i < 5; i++) dots += '<circle class="mark' + (i < n ? ' done' : i === n ? ' now' : '') + '" cx="' + (1446 + i * 26) + '" cy="38" r="6"/>'; return sec.slice(0, oe) + '<g class="marks">' + dots + '</g>' + sec.slice(oe); };
const titled = (sec, label, cls, sub) => { var o = sec.indexOf('<svg viewBox="0 0 1600 900"'); var oe = sec.indexOf('>', o) + 1; var ce = sec.indexOf('</svg>', oe); var head = '<text class="lbl ' + cls + '" x="800" y="40" text-anchor="middle" style="font-size:26px;letter-spacing:.2em;font-weight:700">' + label + '</text>' + (sub ? '<text class="lbl s" x="800" y="70" text-anchor="middle" style="font-size:20px;letter-spacing:.08em">' + sub + '</text>' : ''); return sec.slice(0, oe) + head + '<g transform="translate(' + (sub ? '40,84) scale(0.95)' : '32,56) scale(0.96)') + '">' + sec.slice(oe, ce) + '</g>' + sec.slice(ce); };
const sB = titled(sBgeo.sec, 'OÙ L’ENVOYER ?', 'amber'), sE = titled(sEgeo.sec, 'L’ESPACE · AVEC MISSION ZERO', 'acc'), sM = titled(sMgeo.sec, 'LA MÉDECINE · AVEC MISSION ZERO', 'acc'), sZ = sZgeo.sec;
const s1 = titled(fixS1(pick('s1', 's2')), 'SANS MISSION ZERO', 'red'), s2 = titled(s2geo.sec, 'AVEC MISSION ZERO', 'acc'), s3 = titled((function (x) { var i = x.indexOf('<g class="b" data-k="19"><text class="lbl acc" x="800" y="822"'); if (i < 0) return x; var j = x.indexOf('</g>', i) + 4; return x.slice(0, i) + x.slice(j); })(addExit3(fixS3(pick('s3', 'sE')))), 'EXEMPLE D’UTILISATION AVEC MISSION ZERO', 'acc', 'MYTHOZOR ARGUS · surveillance cybersécurité');
const S0 = marks(s0, 0), S1 = marks(s1, 1), S2 = marks(s2, 2), SE = marks(sE, 3), SM = marks(sM, 4);
const CAP = {
  s0: geo.cap, sDe: [null], sDm: [null],
  sB: sBgeo.cap.securite, sB2: sBgeo.cap.espace, sB3: sBgeo.cap.medecine,
  s1: [null, 'Une boutique en ligne. Elle tourne.', 'Les commandes tombent.', null, 'Tout va bien.', 'Conforme. Aujourd’hui.', 'Une équipe : une personne, souvent.', 'Une faille : aucun en-tête de sécurité.', 'Rouge.', 'Elle corrige à la main.', 'Corrigé.', 'Vert.', 'Une autre : le prix changé par le client.', 'Rouge.', 'Elle corrige, le soir.', 'Corrigé.', 'Vert.', 'Deux de plus : la carte bancaire en clair…', '…et une bibliothèque de 2012.', 'Rouge.', 'Pas le temps. Pas le budget.', 'Une cinquième. Elle restera ouverte.', 'Rouge.', '<b>8 sites sur 10 restent exposés.</b> La seule question, c’est quand.'],
  s2: s2geo.cap,
  s3: ['Chez vous, sur votre machine. Aucun serveur à nous.', 'Votre site, sur votre serveur.', '<b>MYTHOZOR ARGUS</b> surveille, jour et nuit.', null, null, null, null, null, null, 'Tout est vert.', 'Une nouvelle faille. ARGUS la voit. Rouge.', null, '<b>Mission Zero</b> la prend. Copie, correctif, cinq contrôles, patch.', null, 'Vous validez d’un clic. Ou en automatique.', null, 'ARGUS vérifie à nouveau.', 'Rouge repassé au vert. Sans vous réveiller.'],
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
  var RATE = 1;
  function speedOf(el) { var sc = el.closest('.scene'); return ((sc && SPEED[sc.id]) || 1) * RATE; }
  // Vitesses de lecture (gérant, 31 octobre : ajouter ×4, ×5, ×6 et ×10) : un clic passe à la suivante, puis revient à ×1.
  var SPEEDS = [1, 2, 3, 4, 5, 6, 10], SPEED_I = 0;
  document.getElementById('x2').addEventListener('click', function () { SPEED_I = (SPEED_I + 1) % SPEEDS.length; RATE = 1 / SPEEDS[SPEED_I]; this.textContent = '×' + SPEEDS[SPEED_I]; this.classList.toggle('big', SPEED_I !== 0); });
  var ORD = 0; document.querySelectorAll('[data-k]').forEach(function (el) { el._ord = ORD++; });
  // La place d'origine de chaque rond (gérant, 1er novembre : « quand on remet à lire, les ronds disparaissent ») : reset la leur rend.
  var HOMES = []; document.querySelectorAll('.rg').forEach(function (rg) { var hp = rg.parentNode; if (HOMES.indexOf(hp) < 0) { HOMES.push(hp); hp._kids = Array.prototype.slice.call(hp.children); } });
  var SEEK = false;
  var DEMO = { el: null, t0: 0, off: 0, raf: 0 };
  function demoPost(el, t) { try { el.contentWindow.postMessage({ mzSeek: t }, '*'); } catch (e) { /* rien */ } }
  function demoStop() { if (DEMO.raf) cancelAnimationFrame(DEMO.raf); DEMO.raf = 0; DEMO.el = null; }
  function demoStart(el, off) { demoStop(); DEMO.el = el; DEMO.off = off || 0; DEMO.t0 = performance.now(); (function f(now) { if (DEMO.el !== el) return; demoPost(el, DEMO.off + (now - DEMO.t0) / 1000 / RATE); DEMO.raf = requestAnimationFrame(f); })(performance.now()); }
  function fitDemos() { document.querySelectorAll('.demoBox').forEach(function (b) { var f = b.querySelector('iframe'); if (f && b.clientWidth) f.style.transform = 'scale(' + (b.clientWidth / 1280) + ')'; }); }
  window.addEventListener('resize', fitDemos);
  function steps(id) { var p = pass[id] || 'all'; return Array.prototype.slice.call(document.querySelectorAll('#' + id + ' [data-k]')).filter(function (s) { return !s.dataset.pass || p === 'all' || s.dataset.pass === p; }).sort(function (a, b) { return a._ord - b._ord; }); }
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
    try { var q0 = p.getPointAtLength(0); c.setAttribute('cx', q0.x); c.setAttribute('cy', q0.y); } catch (e) { /* rien */ }
    p.parentNode.appendChild(c); p.style.transition = 'none'; p.parentNode.dataset.dur = dur; p.parentNode.dataset.dur0 = dur;
  });
  function draw(step) {
    var dur = Math.round((Number(step.dataset.dur0) || Number(step.dataset.dur) || 1000) * RATE), my = gen, t0 = performance.now();
    var list = Array.prototype.map.call(step.querySelectorAll('.arrow'), function (p) { return { p: p, L: p.getTotalLength(), c: step.querySelector('.runner[data-for="' + p.id + '"]') }; });
    function frame(now) {
      if (my !== gen) return;
      var t = Math.min(1, Math.max(0, (now - t0) / dur));
      list.forEach(function (o) { o.p.style.strokeDashoffset = String(1 - t); var q = o.p.getPointAtLength(o.L * t); if (o.c) { o.c.setAttribute('cx', q.x); o.c.setAttribute('cy', q.y); } });
      if (window.MZORB && window.MZORB.sync) window.MZORB.sync();
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
  // Le tampon plein écran (gérant, 31 octobre) : il claque sur toute la scène, se lit, puis s'efface.
  function stampIt(spec) {
    var sc = document.querySelector('.scene.active'); if (!sc) return; var m = spec.split(':'), kind = m[0], txt = m.slice(1).join(':');
    var old = sc.querySelector('.bigstamp'); if (old) old.remove();
    var d = document.createElement('div'); d.className = 'bigstamp ' + kind; var w = sc.getBoundingClientRect().width || 1280;
    d.innerHTML = '<span style="font-size:' + Math.round(w * 0.05) + 'px;border-width:' + Math.round(w * 0.005) + 'px">' + txt + '</span>';
    sc.appendChild(d); var my = gen; setTimeout(function () { if (my === gen) d.classList.add('out'); }, 2300); setTimeout(function () { d.remove(); }, 2900);
  }
  function act(step) {
    if (step.dataset.stamp && !SEEK) stampIt(step.dataset.stamp);
    if (step.dataset.demo && !SEEK) { var de = document.getElementById(step.dataset.demo); if (de) { if (PL.playing) { if (!PL.off) demoStart(de, 0); } else { demoStop(); demoPost(de, 0); } } }
    if (step.dataset.video && !SEEK) { var vv = document.getElementById(step.dataset.video); if (vv) { try { vv.currentTime = 0; var pr = vv.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) { /* rien */ } } }
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
  // Le contour tracé (gérant, 31 octobre) : un chemin qui suit le bord de la forme, deux traits qui partent du même point.
  function outline(el) {
    var n = function (a) { return Number(el.getAttribute(a)) || 0; };
    if (el.tagName === 'circle') { var cx = n('cx'), cy = n('cy'), r = n('r'); return 'M' + cx + ',' + (cy - r) + ' A' + r + ',' + r + ' 0 1,1 ' + cx + ',' + (cy + r) + ' A' + r + ',' + r + ' 0 1,1 ' + cx + ',' + (cy - r) + ' Z'; }
    var x = n('x'), y = n('y'), w = n('width'), h = n('height'), rx = Math.min(n('rx') || n('ry'), w / 2, h / 2);
    return 'M' + (x + rx) + ',' + y + ' H' + (x + w - rx) + ' A' + rx + ',' + rx + ' 0 0,1 ' + (x + w) + ',' + (y + rx) + ' V' + (y + h - rx) + ' A' + rx + ',' + rx + ' 0 0,1 ' + (x + w - rx) + ',' + (y + h) + ' H' + (x + rx) + ' A' + rx + ',' + rx + ' 0 0,1 ' + x + ',' + (y + h - rx) + ' V' + (y + rx) + ' A' + rx + ',' + rx + ' 0 0,1 ' + (x + rx) + ',' + y + ' Z';
  }
  function contour(step) {
    var shapes = Array.prototype.filter.call(step.querySelectorAll('rect, circle'), function (el) {
      if (el.classList.contains('runner') || el.classList.contains('mark') || el.closest('.rg') || el.closest('.fan')) return false;
      var cs = getComputedStyle(el); if (!cs.stroke || cs.stroke === 'none' || cs.strokeOpacity === '0' || parseFloat(cs.strokeWidth) === 0) return false;
      var b = el.getBBox(); return b.width > 6 && b.height > 6;
    });
    if (!shapes.length) return;
    var my = gen, dur = 650, orb = window.MZORB && window.MZORB.where ? window.MZORB.where() : null;
    var jobs = shapes.map(function (el, i) {
      var cs = getComputedStyle(el), p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', outline(el)); p.setAttribute('class', 'ctr');
      p.style.fill = 'none'; p.style.stroke = cs.stroke; p.style.strokeWidth = cs.strokeWidth; p.style.strokeLinecap = 'round';
      var svg = el.ownerSVGElement, M = svg.getScreenCTM().inverse().multiply(el.getScreenCTM()), tf = 'matrix(' + [M.a, M.b, M.c, M.d, M.e, M.f].join(',') + ')';
      p.setAttribute('transform', tf); svg.appendChild(p);
      var q = p.cloneNode(); svg.appendChild(q);
      var L = p.getTotalLength(), s0 = 0;
      // le départ : le point du bord le plus proche de la bille (là où le fil arrive), sinon le haut
      if (orb && i === 0) { try { var m = p.getScreenCTM(), best = 1e9; for (var k = 0; k < 96; k++) { var pt = p.getPointAtLength(L * k / 96), sx = m.a * pt.x + m.c * pt.y + m.e, sy = m.b * pt.x + m.d * pt.y + m.f, d = Math.hypot(sx - orb.x, sy - orb.y); if (d < best) { best = d; s0 = L * k / 96; } } } catch (e) { /* rien */ } }
      var r1 = document.createElementNS(SVGNS, 'circle'); r1.setAttribute('r', '8'); r1.setAttribute('class', 'runner' + (i === 0 ? ' go' : '')); r1.dataset.ctr = '1';
      var r2 = document.createElementNS(SVGNS, 'circle'); r2.setAttribute('r', '4'); r2.setAttribute('class', 'ctr-dot');
      r1.setAttribute('transform', tf); r2.setAttribute('transform', tf); svg.appendChild(r1); svg.appendChild(r2);
      el.style.strokeOpacity = '0';
      return { el: el, svg: svg, p: p, q: q, L: L, s0: s0, r1: r1, r2: r2, lead: i === 0 };
    });
    var t0 = performance.now();
    function put(c, pth, at) { var pt = pth.getPointAtLength(((at % pth._L) + pth._L) % pth._L); c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); }
    jobs.forEach(function (j) { j.p._L = j.L; });
    function frame(now) {
      if (my !== gen) return;
      var t = Math.min(1, (now - t0) / dur), seg;
      jobs.forEach(function (j) {
        // le cadre arrive avec un rebond d'échelle : le tracé suit sa position à chaque image
        try { var M = j.svg.getScreenCTM().inverse().multiply(j.el.getScreenCTM()), tf = 'matrix(' + [M.a, M.b, M.c, M.d, M.e, M.f].join(',') + ')'; j.p.setAttribute('transform', tf); j.q.setAttribute('transform', tf); j.r1.setAttribute('transform', tf); j.r2.setAttribute('transform', tf); } catch (e) { /* rien */ }
        seg = t * j.L / 2;
        j.p.style.strokeDasharray = seg + ' ' + (j.L - seg); j.p.style.strokeDashoffset = String(-j.s0);
        j.q.style.strokeDasharray = seg + ' ' + (j.L - seg); j.q.style.strokeDashoffset = String(-(j.s0 - seg));
        if (j.lead) { put(j.r1, j.p, j.s0 + seg); put(j.r2, j.p, j.s0 - seg); } else { j.r1.style.display = 'none'; put(j.r2, j.p, j.s0 + seg); }
      });
      if (window.MZORB && window.MZORB.sync) window.MZORB.sync();
      if (t < 1) { requestAnimationFrame(frame); return; }
      jobs.forEach(function (j) { j.el.style.strokeOpacity = ''; j.p.remove(); j.q.remove(); j.r2.remove(); if (j.lead) j.r1.classList.remove('go'); else j.r1.remove(); });
    }
    requestAnimationFrame(frame);
  }
  function fire(step) {
    step.classList.add('on'); act(step);
    if (step.classList.contains('a')) draw(step); else contour(step);
  }
  function reset(id) {
    HOMES.forEach(function (hp) { if (hp.closest('#' + id)) hp._kids.forEach(function (c) { hp.appendChild(c); }); });
    document.querySelectorAll('#' + id + ' .bigstamp').forEach(function (n) { n.remove(); });
    document.querySelectorAll('#' + id + ' .ctr, #' + id + ' .ctr-dot, #' + id + ' [data-ctr]').forEach(function (n) { n.remove(); });
    document.querySelectorAll('#' + id + ' rect, #' + id + ' circle').forEach(function (n) { if (n.style.strokeOpacity === '0') n.style.strokeOpacity = ''; });
    document.querySelectorAll('#' + id + ' video').forEach(function (v) { try { v.pause(); v.currentTime = 0; } catch (e) { /* rien */ } });
    gen += 1; Array.prototype.slice.call(document.querySelectorAll('#' + id + ' [data-k]')).forEach(function (s) { s.classList.remove('on', 'drawn', 'focus', 'hidden', 'zoom', 'seeked'); if (s.dataset.cls) document.body.classList.remove(s.dataset.cls); });
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
  // Le lecteur (gérant, 1er novembre) : pages numérotées, lecture / pause, avance / recul de 5 s ou d'une page, curseur.
  // Le temps du curseur est celui du film à ×1 ; chaque pas a sa place sur la ligne du temps.
  var PL = { ci: 0, id: null, k: 0, list: [], playing: false, done: null, quick: false, off: 0, t0: 0, w0: 0, end: 0 };
  function isQuick(id) { return id === 'sB' && pass[id] !== 'securite' && pass[id] !== 'all'; }
  function base(s) { return Number(s.dataset.d) || (s.classList.contains('a') ? 1100 : 1300); }
  function delayOf(s, quick, real) { var d = real ? Math.round(base(s) * speedOf(s)) : base(s); if (quick && !s.dataset.pass && !s.classList.contains('a')) d = Math.min(d, 220); if (s.classList.contains('a')) d = Math.max(d, Math.round((Number(s.dataset.dur0) || Number(s.dataset.dur) || 0) * (real ? RATE : 1)) + 60); return d; }
  function tail(list) { return list.length && list[list.length - 1].classList.contains('a') ? 0 : 1800; }
  function show(id) { document.querySelectorAll('.scene').forEach(function (s) { s.classList.toggle('active', s.id === id); }); fitDemos(); }
  var t0 = 0, clock = document.getElementById('clock');
  function tick() { if (t0) clock.textContent = Math.round((Date.now() - t0) / 100) / 10 + ' s'; }
  setInterval(tick, 200);
  // Le film complet : la boucle, les choix, la sécurité (boutique, correction), les choix, l'espace, les choix, la médecine, la fin.
  var CHAIN = [['s0'], ['sB', 'securite'], ['s1'], ['s2'], ['sB', 'espace'], ['sDe'], ['sB', 'medecine'], ['sDm'], ['sZ']];
  var NAMES = ['La boucle', 'Où l’envoyer ?', 'Constat · sans Mission Zero', 'Correction · avec Mission Zero', 'Choix : l’espace', 'Démo : l’espace', 'Choix : la médecine', 'Démo : le labo de Fleming', 'La fin'];
  var IDS = ['s0', 'sB', 's1', 's2', 'sE', 'sDe', 'sDm', 'sZ'];
  var TL = [], TOTAL = 0;
  CHAIN.forEach(function (c, i) { var keep = pass[c[0]]; pass[c[0]] = c[1] || 'all'; var list = steps(c[0]), q = isQuick(c[0]), t = 0, st = []; list.forEach(function (s) { st.push(t); t += delayOf(s, q, false); }); t += tail(list); pass[c[0]] = keep; TL.push({ id: c[0], p: c[1] || 'all', start: TOTAL, starts: st, len: t, name: NAMES[i] }); TOTAL += t; });
  function stopAll() { demoStop(); IDS.forEach(function (id) { clearTimeout(timers[id]); }); document.querySelectorAll('video').forEach(function (v) { try { v.pause(); } catch (e) { /* rien */ } }); stopStars(); document.body.classList.remove('black'); }
  function stepStart(k) { var e = TL[PL.ci]; if (!e) return TOTAL; return e.start + (k < e.starts.length ? e.starts[k] : e.len); }
  function pos() { if (PL.end) return TOTAL; if (!PL.playing) return PL.t0; return Math.max(PL.t0, Math.min(TOTAL - 1, PL.t0 + (Date.now() - PL.w0) / RATE, stepStart(PL.k) - 1)); }
  // Le sous-titre en cours : le dernier non vide jusqu'à l'étape montrée (un saut ne doit pas l'effacer).
  function lastCap(id, k) { var c = caps(id) || [], el = document.getElementById(capId(id)); el.innerHTML = ''; for (var j = k; j >= 1; j--) if (c[j - 1]) { el.innerHTML = c[j - 1]; return; } }
  function play(id, done, p, fromK, offMs) {
    clearTimeout(timers[id]); pass[id] = p || pass[id] || 'all'; reset(id);
    var list = steps(id); PL.id = id; PL.list = list; PL.done = done; PL.k = 0; PL.quick = isQuick(id); PL.off = offMs || 0;
    void document.getElementById(id).getBoundingClientRect();
    var upto = fromK || 0; if (!PL.playing && upto < list.length) upto += 1; // à l'arrêt, on montre aussi le pas en cours
    if (upto) { SEEK = true; for (var j = 0; j < upto && j < list.length; j++) { list[j].classList.add('on', 'drawn', 'seeked'); act(list[j]); } SEEK = false; lastCap(id, Math.min(upto, list.length)); }
    PL.k = Math.min(fromK || 0, list.length); PL.shown = Math.min(upto, list.length); PL.t0 = stepStart(PL.k) + PL.off; PL.w0 = Date.now();
    var cur = list[PL.k]; if (!PL.playing && cur && cur.dataset.demo) { demoStop(); demoPost(document.getElementById(cur.dataset.demo), PL.off / 1000); }
    if (!PL.playing && cur && cur.dataset.video) { var vv = document.getElementById(cur.dataset.video); if (vv) { try { vv.currentTime = PL.off / 1000; } catch (e) { /* rien */ } } }
    if (PL.playing) next();
  }
  function next() {
    var id = PL.id, list = PL.list;
    if (PL.k >= list.length) { if (PL.done) timers[id] = setTimeout(PL.done, tail(list)); return; }
    var s = list[PL.k]; PL.t0 = stepStart(PL.k) + PL.off; PL.w0 = Date.now(); PL.k += 1; PL.shown = PL.k; fire(s); caption(id, PL.k);
    var d = delayOf(s, PL.quick, true);
    if (PL.off && s.dataset.video) { var vv = document.getElementById(s.dataset.video); if (vv) { try { vv.currentTime = PL.off / 1000; } catch (e) { /* rien */ } } d = Math.max(200, d - PL.off); }
    if (PL.off && s.dataset.demo) { var de2 = document.getElementById(s.dataset.demo); if (de2) demoStart(de2, PL.off / 1000); d = Math.max(200, d - Math.round(PL.off * RATE)); }
    PL.off = 0; timers[id] = setTimeout(next, d);
  }
  function goPage(ci, k, off) {
    stopAll(); PL.end = 0; document.body.classList.add('film');
    if (ci >= TL.length) { PL.playing = false; PL.end = 1; PL.ci = TL.length - 1; if (t0) { clock.textContent = 'fin · ' + Math.round((Date.now() - t0) / 100) / 10 + ' s'; t0 = 0; } ui(); return; }
    PL.ci = ci; var e = TL[ci]; show(e.id);
    play(e.id, function () { goPage(ci + 1, 0, 0); }, e.p, k || 0, off || 0); ui();
  }
  function seek(ms) {
    ms = Math.max(0, Math.min(TOTAL - 1, ms)); var ci = 0; while (ci < TL.length - 1 && TL[ci + 1].start <= ms) ci++;
    var e = TL[ci], rel = ms - e.start, k = 0; while (k < e.starts.length - 1 && e.starts[k + 1] <= rel) k++;
    if (!e.starts.length) { goPage(ci, 0, 0); return; }
    var off = rel - e.starts[k], st = document.querySelectorAll('#' + e.id + ' [data-k]'); var isVid = false; st.forEach(function (x) { if (x.dataset.video || x.dataset.demo) isVid = true; });
    goPage(ci, k, isVid ? off : 0);
  }
  function stepF() {
    if (PL.playing) { var at = pos(); PL.playing = false; stopAll(); PL.t0 = at; }
    if (PL.end) return; var list = PL.list;
    if (PL.shown < list.length) { clearTimeout(timers[PL.id]); var st = list[PL.shown]; PL.k = PL.shown; PL.t0 = stepStart(PL.k); PL.k += 1; PL.shown = PL.k; fire(st); lastCap(PL.id, PL.shown); ui(); return; }
    if (PL.ci < TL.length - 1) { goPage(PL.ci + 1, 0, 0); }
  }
  function stepB() {
    if (PL.playing) { PL.playing = false; stopAll(); }
    if (PL.shown > 1) { goPage(PL.ci, PL.shown - 2, 0); return; }
    if (PL.ci > 0) { var e = TL[PL.ci - 1]; goPage(PL.ci - 1, Math.max(0, e.starts.length - 1), 0); }
  }
  function film(from) { PL.playing = true; t0 = Date.now(); goPage(from || 0, 0, 0); }
  function toggle() { if (PL.playing) { var at = pos(); PL.playing = false; stopAll(); PL.t0 = at; ui(); } else { var at2 = pos(); PL.playing = true; if (!t0) t0 = Date.now(); seek(PL.end || at2 >= TOTAL - 1 ? 0 : at2); } }
  // La barre de lecture, en bas : numéros de page cliquables au-dessus du curseur.
  var bar = document.getElementById('cBar'), ticks = document.getElementById('cTicks'), dragging = false, wasPlaying = false;
  bar.max = String(TOTAL);
  TL.forEach(function (e, i) { var t = document.createElement('button'); t.className = 'tick'; t.textContent = String(i + 1); t.title = 'Page ' + (i + 1) + ' · ' + e.name; t.style.left = (e.start / TOTAL * 100) + '%'; t.addEventListener('click', function () { if (!t0 && PL.playing) t0 = Date.now(); goPage(i, 0, 0); }); ticks.appendChild(t); });
  function mmss(ms) { var x = Math.round(ms / 1000); return Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); }
  function ui() {
    var at = pos(); if (!dragging) bar.value = String(at);
    document.getElementById('cTime').textContent = mmss(at) + ' / ' + mmss(TOTAL);
    var lab = 'Page ' + (PL.ci + 1) + ' / ' + TL.length + ' · ' + TL[PL.ci].name + ' · étape ' + (PL.shown || 0) + ' / ' + (PL.list ? PL.list.length : 0);
    document.getElementById('cPage').textContent = lab; document.getElementById('cBadge').textContent = (PL.ci + 1) + ' / ' + TL.length;
    document.getElementById('cPlay').textContent = PL.playing ? '⏸' : '▶';
    ticks.querySelectorAll('.tick').forEach(function (t, i) { t.classList.toggle('now', i === PL.ci); });
  }
  setInterval(ui, 200);
  bar.addEventListener('pointerdown', function () { dragging = true; wasPlaying = PL.playing; PL.playing = false; });
  bar.addEventListener('input', function () { PL.playing = false; seek(Number(bar.value)); });
  bar.addEventListener('change', function () { dragging = false; if (wasPlaying) { PL.playing = true; seek(Number(bar.value)); } wasPlaying = false; ui(); });
  document.getElementById('cPlay').addEventListener('click', toggle);
  (function () { var row = document.querySelector('.ctl-row'), tm = document.getElementById('cTime'); var g = document.getElementById('grid'), x = document.getElementById('x2'); g.textContent = 'Schémas'; row.insertBefore(x, tm); row.insertBefore(g, tm); })();
  document.getElementById('grid').addEventListener('click', function () { document.querySelector('.filmbar').style.display = ''; });
  document.getElementById('cStepB').addEventListener('click', stepB);
  document.getElementById('cStepF').addEventListener('click', stepF);
  document.getElementById('cBack').addEventListener('click', function () { seek(pos() - 5000); });
  document.getElementById('cFwd').addEventListener('click', function () { seek(pos() + 5000); });
  document.getElementById('cPrevP').addEventListener('click', function () { var e = TL[PL.ci]; goPage(pos() - e.start > 1500 || PL.ci === 0 ? PL.ci : PL.ci - 1, 0, 0); });
  document.getElementById('cNextP').addEventListener('click', function () { if (PL.ci < TL.length - 1) goPage(PL.ci + 1, 0, 0); });
  document.querySelectorAll('.ctl button, .filmbar button').forEach(function (bt) { bt.addEventListener('keyup', function (ev) { if (ev.key === ' ') ev.preventDefault(); }); bt.addEventListener('mouseup', function () { bt.blur(); }); });
  document.addEventListener('keydown', function (ev) {
    if (ev.target && ev.target.tagName === 'INPUT' && ev.key !== ' ') return;
    if (ev.key === ' ') { ev.preventDefault(); toggle(); } else if (ev.key === 'ArrowLeft' && ev.shiftKey) stepB(); else if (ev.key === 'ArrowRight' && ev.shiftKey) stepF(); else if (ev.key === 'ArrowLeft') seek(pos() - 5000); else if (ev.key === 'ArrowRight') seek(pos() + 5000);
    else if (ev.key === 'PageUp') document.getElementById('cPrevP').click(); else if (ev.key === 'PageDown') document.getElementById('cNextP').click();
  });
  document.getElementById('go').addEventListener('click', function () { film(0); });
  document.querySelectorAll('[data-ch]').forEach(function (b) { b.addEventListener('click', function () { var i = -1; TL.forEach(function (e, j) { if (i < 0 && e.id === b.dataset.ch && (!b.dataset.pass || e.p === b.dataset.pass)) i = j; }); if (i < 0) return; PL.playing = true; if (!t0) t0 = Date.now(); goPage(i, 0, 0); }); });
  document.getElementById('grid').addEventListener('click', function () { PL.playing = false; stopAll(); document.body.classList.remove('film'); IDS.forEach(all); ui(); });
  function all(id) { clearTimeout(timers[id]); pass[id] = id === 'sB' ? 'medecine' : 'all'; reset(id); var list = steps(id); SEEK = true; list.forEach(function (s) { s.classList.add('on', 'drawn'); act(s); }); SEEK = false; document.querySelectorAll('#' + id + ' .shrink').forEach(function (c) { c.classList.remove('shrink'); }); document.body.classList.remove('black'); caption(id, list.length); }
  window.MZF = { stepF: stepF, stepB: stepB, film: film, play: play, seek: seek, goPage: goPage, toggle: toggle, pos: pos, TL: TL, TOTAL: TOTAL, CHAIN: CHAIN, CAP: CAP, steps: steps, pass: pass, PL: PL };
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
.scene video { display:block; width:100%; max-width:1280px; aspect-ratio:16/9; background:#000; border-radius:12px; margin:0 auto; }
.record .scene video { width:1280px; height:720px; border-radius:0; margin:0; }
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
/* La barre de lecture (gérant, 1er novembre), en bas, et le numéro de page posé sur l'image. Masquées à l'enregistrement. */
body { padding-bottom:120px; }
html:not(.record) body.film .scene svg { max-height:calc(100vh - 210px) !important; }
html:not(.record) body.film .scene video { width:min(100%, calc((100vh - 210px) * 16 / 9)); height:auto; }
html:not(.record) body.film .wrap > h1, html:not(.record) body.film .filmbar { display:none; }
.b.shoutlabel.on.seeked, .b.shout.on.seeked { animation:none !important; }
.tick { font-size:14px !important; padding:3px 8px !important; } .ctl-row button { min-height:40px; }
.demoBox { position:relative; width:min(100%, 1280px); aspect-ratio:16/9; margin:0 auto; overflow:hidden; border-radius:12px; background:#0d1526; }
.demoBox iframe { position:absolute; left:0; top:0; width:1280px; height:720px; border:0; transform-origin:0 0; }
html:not(.record) body.film .demoBox { width:min(100%, calc((100vh - 210px) * 16 / 9)); }
.record .demoBox { width:1280px; height:720px; border-radius:0; }
.ctl { position:fixed; left:0; right:0; bottom:0; z-index:100; background:rgba(8,14,28,.94); border-top:1px solid rgba(255,255,255,.15); padding:8px 18px 12px; font:15px system-ui,sans-serif; color:#fff; }
.ctl-row { display:flex; align-items:center; gap:8px; } .ctl-row button { background:#14233f; color:#fff; border:1px solid rgba(255,255,255,.25); border-radius:8px; padding:6px 12px; font-size:16px; cursor:pointer; } .ctl-row button:hover { background:#1d3560; }
#cPlay { min-width:56px; font-size:20px; background:#1a6b52; } #cTime { margin-left:10px; font-variant-numeric:tabular-nums; color:#cfe; } #cPage { margin-left:auto; font-weight:700; color:#2ee6a0; }
.ctl-track { position:relative; padding-top:26px; } #cBar { width:100%; accent-color:#2ee6a0; cursor:pointer; } #cTicks { position:absolute; left:0; right:0; top:0; height:24px; }
.tick { position:absolute; transform:translateX(-1px); background:#14233f; color:#fff; border:1px solid rgba(255,255,255,.3); border-radius:5px; font-size:12px; padding:1px 6px; cursor:pointer; } .tick.now { background:#2ee6a0; color:#06121f; font-weight:800; }
#cBadge { position:fixed; top:10px; right:14px; z-index:100; background:rgba(8,14,28,.85); color:#2ee6a0; border:1px solid #2ee6a0; border-radius:10px; padding:4px 12px; font:800 20px system-ui,sans-serif; }
.record .ctl, .record #cBadge { display:none !important; } html.record body { padding-bottom:0; }
/* Le tampon plein écran : grand, incliné, double liseré, il claque (×2,6 → ×1), se lit, s'efface. */
.scene { position:relative; }
.bigstamp { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:40; }
.bigstamp span { display:inline-block; border-style:solid; border-radius:18px; padding:.12em .38em; font-weight:900; letter-spacing:.12em; line-height:1; white-space:nowrap; font-family:"Segoe UI Black","Segoe UI",system-ui,sans-serif; background:rgba(13,21,38,.80); box-shadow: inset 0 0 0 4px rgba(13,21,38,.9), inset 0 0 0 6px currentColor; animation: stampin .32s cubic-bezier(.2,.9,.25,1.2) both; }
.bigstamp.ko span { color:#ff4b3e; border-color:#ff4b3e; } .bigstamp.ok span { color:#2ee6a0; border-color:#2ee6a0; }
.bigstamp.out span { opacity:0; transform: rotate(-12deg) scale(1.04); transition: opacity .5s, transform .5s; }
@keyframes stampin { 0% { opacity:0; transform: rotate(-12deg) scale(2.6); } 60% { opacity:1; transform: rotate(-12deg) scale(.96); } 100% { opacity:1; transform: rotate(-12deg) scale(1); } }
/* Le contour tracé : le petit point blanc du second côté (la bille 3D suit l'autre). */
.ctr-dot { fill:#fff; filter: drop-shadow(0 0 4px rgba(46,230,160,.9)); }
/* Le titre d'un écran qui arrive en GROS au centre, se lit, puis revient à sa place en haut (gérant, 31 octobre : « votre site web e-commerce »). */
.b.shoutlabel { transform-box: view-box; transform-origin: 620px 40px; }
.b.shoutlabel.on { animation: shoutlabel 2.5s cubic-bezier(.2,.8,.2,1) forwards; }
@keyframes shoutlabel { 0% { opacity:0; transform: translate(180px, 410px) scale(2.2); } 12% { opacity:1; transform: translate(180px, 410px) scale(2.6); } 64% { opacity:1; transform: translate(180px, 410px) scale(2.6); } 100% { opacity:1; transform: none; } }
/* Un texte qui bondit : il arrive en grand au premier plan, on le lit, puis il se pose à sa taille (boutique : « pas le temps »). */
.b.shout.on { animation: shout 1.6s cubic-bezier(.2,.8,.2,1) forwards; }
@keyframes shout { 0% { opacity:0; transform: scale(.6); } 18% { opacity:1; transform: scale(1.28); } 62% { opacity:1; transform: scale(1.28); } 100% { opacity:1; transform: none; } }
@keyframes neon { 0% { opacity:0; } 12% { opacity:1; } 18% { opacity:.15; } 30% { opacity:1; } 36% { opacity:.3; } 50%, 100% { opacity:1; } }
</style>`;
// Les démos « avant / install / après » (video/demo/demo.html, tournées par video/build/demo-record.cjs) : deux scènes vidéo,
// en WebM (le Chromium d'enregistrement ne lit pas le H.264). Un seul pas, long comme la vidéo.
const demoScene = (id, title, sub, ex, ms) => `  <section class="scene" id="${id}">
    <header><h2>${title}</h2><span class="t">${sub}</span></header>
    <div class="demoBox"><iframe id="v${id}" src="demo/demo.html?ex=${ex}&amp;lang=fr" title="${title}" scrolling="no"></iframe></div>
    <div class="b" data-k="1" data-demo="v${id}" data-d="${ms}" style="display:none"></div>
    <div class="caption" id="c${id.slice(1)}"></div>
  </section>
`;
// Durées des démos (demo.html, zoom du 1er novembre compris) : espace 60,23 s, labo 59,96 s ; vérifiées par le banc de recette.
const videoScene = (id, title, sub, file, ms) => `  <section class="scene" id="${id}">
    <header><h2>${title}</h2><span class="t">${sub}</span></header>
    <video id="v${id}" src="demo/out/${file}" muted playsinline preload="auto" width="1280" height="720"></video>
    <div class="b" data-k="1" data-video="v${id}" data-d="${ms}" style="display:none"></div>
    <div class="caption" id="c${id.slice(1)}"></div>
  </section>
`;
const sDe = demoScene('sDe', 'DÉMO · L’ESPACE', 'avant, on installe Mission Zero, après', 'espace', 60400);
const sDm = demoScene('sDm', 'DÉMO · LA MÉDECINE', 'le labo de Fleming, en réseau mondial : avant, on installe Mission Zero, après', 'labo', 60100);
let html = `<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<title>Mission Zero · le film</title>
${style}
${extra}
${bille.style}
<div class="wrap">
  <h1>Mission Zero, le film · une minute <small>Le modèle du 29 octobre, raccourci : des phrases courtes, les flèches qui se dessinent, le point qui court devant, chaque élément qui apparaît et reste. Voix française (le fondateur), sous-titres anglais incrustés au montage.</small></h1>
  <div class="filmbar"><button class="big" id="go">▶ Lancer le film</button><button data-ch="s0">1 · La boucle</button><button data-ch="sB" data-pass="securite">2 · Où l'envoyer ?</button><button data-ch="s1">3 · Constat</button><button data-ch="s2">4 · Correction</button><button data-ch="sB" data-pass="espace">5 · Choix : l'espace</button><button data-ch="sDe">6 · Démo : l'espace</button><button data-ch="sB" data-pass="medecine">7 · Choix : la médecine</button><button data-ch="sDm">8 · Démo : Fleming</button><button data-ch="sZ">9 · La fin</button><button id="grid">Voir tous les schémas</button><button id="x2" title="Vitesse de lecture : ×1, ×2, ×3, ×4, ×5, ×6, ×10">×1</button><span id="clock" style="color:var(--mut)"></span></div>
  <div id="cBadge">1 / 9</div>
  <div class="ctl"><div class="ctl-row"><button id="cPrevP" title="Page précédente (Page ↑)">⏮</button><button id="cBack" title="Reculer de 5 s (←)">⏪ 5 s</button><button id="cStepB" title="Étape précédente (Maj + ←)">◀ étape</button><button id="cPlay" title="Lecture / pause (espace)">▶</button><button id="cStepF" title="Étape suivante (Maj + →)">étape ▶</button><button id="cFwd" title="Avancer de 5 s (→)">5 s ⏩</button><button id="cNextP" title="Page suivante (Page ↓)">⏭</button><span id="cTime">0:00</span><span id="cPage"></span></div><div class="ctl-track"><div id="cTicks"></div><input type="range" id="cBar" min="0" max="1" step="100" value="0" aria-label="Position dans le film"></div></div>
${typo(S0)}
${typo(sB)}
${typo(S1)}
${typo(S2)}
${typo(SE)}
${sDe}
${sDm}
${typo(sZ)}
</div>
${bille.script}
${script}
</html>
`;
// Textes courts, partout (gérant, 30 octobre 18 h 50) : chaque mot compte, on enlève le surplus. Appliqués sur le film assemblé,
// textes du dessin (entre > et <) et légendes (entre guillemets du JSON).
const COURT = [
  ['Premier voyage : la cybersécurité.', '1 · La cybersécurité.'], ['Deuxième voyage : l’espace.', '2 · L’espace.'], ['Dernier voyage : la médecine.', '3 · La médecine.'], ['🛡 La sécurité d’un site', '🛡 La cybersécurité'],
  ['🌿 Maison Verde · boutique en ligne', '🌿 Maison Verde · boutique'], ['une personne, souvent', 'souvent seule'], ['le site, les clients, la sécurité', 'site · clients · sécurité'],
  ['⚠ aucun en-tête de sécurité', '⚠ en-têtes absents'], ['quand elle a le temps', 'quand elle peut'], ['le soir, après les commandes', 'le soir'], ['⚠ carte bancaire en clair', '⚠ carte en clair'],
  ['⚠ jQuery 2012 · 4 failles connues', '⚠ jQuery 2012'], ['pas les compétences, pas le budget', 'ni budget, ni compétence'], ['⚠ mot de passe faible accepté', '⚠ mot de passe faible'],
  ['sur 26 sites d’entreprises scannés par MYTHOZOR ARGUS, 81 % sans protection contre l’injection de code', '26 sites lus par MYTHOZOR ARGUS · octobre 2026 · 81 % sans CSP'], ['8 sites sur 10 restent exposés', '8 sites sur 10 sans protection CSP'],
  ['Ça arrive. C’est certain. La seule question, c’est quand.', ' '],
  ['sur vos serveurs · rien ne sort', 'sur votre machine · aucun serveur à nous'], ['🌿 votre site · votre serveur', '🌿 votre site'], ['35 contrôles, en continu, jour et nuit', '35 contrôles · jour et nuit'],
  ['⚠ nouvelle faille, en direct', '⚠ nouvelle faille'], ['en-têtes : protection sautée', 'en-têtes sautés'], ['Mission Zero, branché', 'Mission Zero'], ['VERIFIED · correctif, sur une copie', 'VERIFIED · sur une copie'],
  ['mode manuel : un clic par correctif, dans votre espace', 'manuel : un clic, dans votre espace'], ['appliqué tout seul, vous êtes prévenu, vous pouvez revenir en arrière', 'tout seul · prévenu · retour possible'],
  ['les deux existent : c’est vous qui choisissez', 'vous choisissez'], ['et MYTHOZOR ARGUS vérifie à nouveau', 'ARGUS revérifie'], ['✔ corrigé, tout est vert', '✔ tout est vert'], ['le rouge est repassé au vert', ' '],
  ['« On va quelque part ? » Posée deux fois.', '« On va quelque part ? » · deux fois'], ['Sans Mission Zero · le modèle seul', 'SANS MISSION ZERO'], ['Avec Mission Zero', 'AVEC MISSION ZERO'],
  ['4 sources sur 5 : personne ne peut les ouvrir', '4 sources sur 5 · introuvables'], ['4 chiffres · 1 dollar · chacun avec sa page', '4 chiffres · 1 dollar · chacun sa page'], ['ce qu’il n’a pas pu lire, il le dit', 'pas lu ? il le dit'],
  ['km/s · et vous ne sentez rien', 'km/s'], ['Hercule, 19,7 km/s · manuel de 1981', 'Hercule, 19,7 km/s · 1981'], ['Trois vitesses au centième · 2010', '3 vitesses au centième · 2010'],
  ['Rayon et vitesse de la galaxie · 2014', 'la galaxie · 2014'], ['Le fond du ciel au centième · 2020', 'le fond du ciel · 2020'], ['Hercule, 20 km/s · Univ. du Maryland', 'Hercule, 20 km/s · Maryland'],
  ['230 km/s · NASA, mot pour mot', '230 km/s · NASA'], ['Univ. du Maryland · VERIFIED', 'Maryland · VERIFIED'], ['NASA, mot pour mot · VERIFIED', 'NASA · VERIFIED'], ['Tully et al., Nature 2014 · VERIFIED', 'Nature 2014 · VERIFIED'],
  ['pas le temps de les lire', 'pas le temps'], ['il analyse les chiffres, les affiche, et ils sont vrais', 'les chiffres, affichés, vrais'], ['VERIFIED · OMS, Global TB Report 2024', 'VERIFIED · OMS 2024'],
  ['la veille · grippe, Sentinelles, pour 100 000', 'la veille · grippe · Sentinelles'], ['3 sources citées · aucun commentaire publié, il le dit', '3 sources · aucun commentaire, il le dit'],
];
const COURT_CAP = [
  ['Une faille : aucun en-tête de sécurité.', 'Une faille : en-têtes absents.'], ['Une autre : le prix changé par le client.', 'Une autre : le prix modifiable.'],
  ['<b>8 sites sur 10 restent exposés.</b> La seule question, c’est quand.', '<b>8 sites sur 10 sans protection CSP.</b> 26 sites lus par ARGUS.'],
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
  // Les tampons des verdicts (gérant, 31 octobre : « toujours, partout »).
  // Gérant, 1er novembre : n° 1, 4, 5, 7 et 9 enlevés ; « NOT SECURE » à la fin de la page 3 (le constat). Les démos portent les leurs.
  // 1er novembre (2) : le n° 1 (NOT VERIFIED de la boucle) enlevé à son tour.
  const STAMPS = [['s0', 43, 'ok:VERIFIED'], ['s1', 23, 'ko:NOT SECURE'], ['s2', 16, 'ko:NOT VERIFIED'], ['s2', '#okpatch', 'ok:VERIFIED']];
  const ORDRE = ['s0', 's1', 's2'];
  const kDe = ([id, k]) => { if (typeof k !== 'string') return k; const a = html.indexOf('<section class="scene" id="' + id + '">'); const i = html.indexOf('id="' + k.slice(1) + '"', a); const t = html.slice(html.lastIndexOf('<', i), i); const m = t.match(/data-k="(\d+)"/); return m ? Number(m[1]) : 999; };
  const joues = STAMPS.filter((x) => ORDRE.includes(x[0])).sort((x, y) => ORDRE.indexOf(x[0]) - ORDRE.indexOf(y[0]) || kDe(x) - kDe(y));
  if (DEV) joues.forEach((x, i) => { x[2] = x[2] + ' · n°' + (i + 1); });
  console.log('tampons joués :', joues.map((x) => x[2] + ' (' + x[0] + ' ' + x[1] + ')').join(' | '));
  STAMPS.forEach(([id, k, spec]) => {
    const a = html.indexOf('<section class="scene" id="' + id + '">'), b = html.indexOf('</section>', a); if (a < 0) throw new Error('tampon : scène ' + id);
    const sec = html.slice(a, b), key = typeof k === 'string' ? 'id="' + k.slice(1) + '"' : 'data-k="' + k + '"'; if (!sec.includes(key)) throw new Error('tampon : ' + id + ' pas ' + k);
    html = html.slice(0, a) + sec.replace(key, key + ' data-stamp="' + spec + '"') + html.slice(b);
  });
  fs.writeFileSync(__dirname + (DEV ? '/../film-v4-dev.html' : '/../film-v4.html'), html);
  console.log('film-v4.html', html.length, 'octets; s0 steps:', (s0.match(/data-k=/g) || []).length, 'sB steps:', (sB.match(/data-k=/g) || []).length, 's1 steps:', (s1.match(/data-k=/g) || []).length);
}
// Source unique du film (décision du gérant, 30 octobre) : build-v4.cjs → film-v4.html.
module.exports = { src, style, extra, s0, sB, s1, s2, s3, sE, sM, sZ, CAP, titled, typo };

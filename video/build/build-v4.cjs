// Assemble video/film-v3.html : le modèle du 29 octobre (styles, boucle, écran des choix, moteur flèches + point), raccourci
// à une minute avec le script du 30 (phrases courtes), sans aucun cadre, et une scène « sécurité » condensée.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../schemas.html', 'utf8');
const style = src.slice(src.indexOf('<style>'), src.indexOf('</style>') + 8);
// La boucle, selon le gérant (30 octobre) : un fil de flèches continu ; le point passe sur les ronds, qui s'allument au passage
// (une simple surbrillance, rien de plus) ; un arrêt pour marquer l'événement (Évaluation clignote en rouge : l'alerte est prise
// en compte) ; puis le point refait le tour vite sur les ronds déjà verts, et sur Évaluation le contour se rallume : validé. On poursuit.
const geo = require('./s0-geo.cjs'); const s0 = geo.s0;
// L'écran des choix (corrections GUIDOR du 30) : le fil arrive de la boucle sans coupure (même hauteur à l'écran), file droit
// vers le rond « la boucle » ; les douze pastilles sortent du centre une à une, en éventail, sur une ellipse symétrique ; un
// couloir libre de chaque côté (à gauche pour l'entrée du fil) ; le dernier fil mène à « La sécurité d'un site ».
const sBgeo = (function () {
  const CX = 800, CY = 450, RB = 96, RX = 560, RY = 310, W = 240, H = 56;
  const labels = ['🪐 L\'espace', '🩺 La médecine', 'Un chiffre INSEE', 'Une norme sanitaire', 'Un article de loi', 'Une décision de justice', 'Un appel d\'offres', 'Un rapport annuel', 'Un brevet', '🛡 La sécurité d\'un site', 'Une norme produit', 'Votre métier'];
  const angs = [255, 285, 315, 345, 15, 45, 75, 105, 135, 165, 195, 225];
  const f = (v) => Math.round(v * 10) / 10; let k = 0; const out = [];
  const step = (x) => { k += 1; out.push(x.replace('data-k="?"', 'data-k="' + k + '"')); };
  step('<g class="a" data-k="?" data-dur="1300" data-d="1400"><path class="arrow" pathLength="1" d="M-33.3,' + CY + ' L' + (CX - RB) + ',' + CY + '"/></g>');
  step('<g class="b" data-k="?" data-d="1600"><circle class="ring lit" cx="' + CX + '" cy="' + CY + '" r="' + RB + '"/><text class="lbl m acc" x="' + CX + '" y="' + (CY - 4) + '" text-anchor="middle">la boucle</text><text class="lbl xs" x="' + CX + '" y="' + (CY + 22) + '" text-anchor="middle">chercher · lire · prouver</text></g>');
  const chips = angs.map((a, i) => { const t = (a * Math.PI) / 180; return { x: CX + RX * Math.cos(t), y: CY + RY * Math.sin(t), label: labels[i] }; });
  chips.forEach((c, i) => step('<g class="fan" data-k="?" data-d="' + (i === 11 ? 1500 : 380) + '"' + (i === 9 ? ' id="bS"' : '') + ' style="transform-origin:' + f(c.x) + 'px ' + f(c.y) + 'px;--fx:' + f(CX - c.x) + 'px;--fy:' + f(CY - c.y) + 'px"><rect class="chip next" x="' + f(c.x - W / 2) + '" y="' + f(c.y - H / 2) + '" width="' + W + '" height="' + H + '" rx="' + H / 2 + '"/><text class="chip-t" x="' + f(c.x) + '" y="' + f(c.y + 7) + '" text-anchor="middle" style="font-size:19px">' + c.label + '</text></g>'));
  step('<g class="b" data-k="?" data-d="1800"><text class="lbl s" x="800" y="836" text-anchor="middle" style="font-size:20px">Tout vient de données gratuites.</text></g>');
  // Le dernier fil : du bord du rond, droit vers la pastille de la sécurité, arrêté à son contour (pastille = deux demi-cercles).
  const sc = chips[9], dx = sc.x - CX, dy = sc.y - CY, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const inChip = (x, y) => { const qx = Math.max(Math.abs(x - sc.x) - (W / 2 - H / 2), 0), qy = y - sc.y; return Math.hypot(qx, qy) <= H / 2; };
  let t = RB; while (!inChip(CX + ux * t, CY + uy * t)) t += 0.5;
  step('<g class="a" data-k="?" data-zoom="#bS" data-dur="1000"><path class="arrow" pathLength="1" d="M' + f(CX + ux * RB) + ',' + f(CY + uy * RB) + ' L' + f(CX + ux * t) + ',' + f(CY + uy * t) + '"/></g>');
  step('<g class="b" data-k="?" data-d="2400"><text class="lbl amber" x="800" y="70" text-anchor="middle" style="font-size:26px">Premier voyage : la sécurité d\'un site.</text></g>');
  return '  <section class="scene" id="sB">\n    <header><h2>OÙ L\'ENVOYER ?</h2><span class="t">l\'écran des choix</span></header>\n    <svg viewBox="0 0 1600 900" role="img" aria-label="La boucle au centre et, autour, tout ce qu\'on peut lui demander">\n      ' + out.join('\n      ') + '\n    </svg>\n    <div class="caption" id="cB"></div>\n  </section>\n';
})();
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
const s2geo = (function () {
  const RY = 430, RR = 70, X = [410, 640, 870, 1100, 1330];
  let k = 0; const g = [];
  const step = (s) => { k += 1; g.push(s.replace('data-k="?"', `data-k="${k}"`)); };
  const ring = (n, attrs, top, name, d) => step(`<g class="b" data-k="?" ${attrs} data-d="${d || 1100}"><circle class="ring" id="r${n}" cx="${X[n - 1]}" cy="${RY}" r="${RR}"/><text class="lbl m" x="${X[n - 1]}" y="${RY - 7}" text-anchor="middle">${n}</text><text class="lbl s" x="${X[n - 1]}" y="${RY + 23}" text-anchor="middle" style="fill:var(--fg)">${name}</text><text class="lbl s" x="${X[n - 1]}" y="${RY - RR - 25}" text-anchor="middle">${top}</text></g>`);
  const arrow = (d, attrs, cls) => step(`<g class="a" data-k="?" ${attrs || ''}><path class="arrow${cls ? ' ' + cls : ''}" pathLength="1" d="${d}"/></g>`);
  // Le site, le scanner, Mission Zero : trois boîtes sur une ligne, le fil d'un bord à l'autre.
  step(`<g class="b" data-k="?" data-d="1500"><rect class="box red" x="40" y="40" width="300" height="190" rx="16"/><text class="lbl m red" x="190" y="76" text-anchor="middle">Votre site · 5 failles</text><rect class="tile" x="70" y="96" width="60" height="44" rx="6"/><rect class="tile" x="140" y="96" width="60" height="44" rx="6"/><rect class="tile" x="210" y="96" width="60" height="44" rx="6"/><rect class="tile" x="70" y="150" width="200" height="24" rx="6"/><text class="lbl xs" x="190" y="210" text-anchor="middle">tel qu'il est, en ligne</text></g>`);
  arrow('M340,135 L420,135');
  step(`<g class="b" data-k="?" data-d="1600"><rect class="box" x="420" y="40" width="360" height="190" rx="16"/><text class="lbl m" x="600" y="76" text-anchor="middle">Un scanner, n'importe lequel</text><text class="lbl s red" x="600" y="150" text-anchor="middle">⚠ 5 failles listées</text></g>`);
  arrow('M780,135 L860,135');
  step(`<g class="b" data-k="?" data-d="2600"><rect class="box gold" x="860" y="40" width="700" height="190" rx="16"/><text class="lbl acc" x="1210" y="82" text-anchor="middle" style="font-size:30px">Mission Zero part de zéro</text><text class="lbl s" x="1210" y="160" text-anchor="middle" style="font-size:20px">une copie du site, aucun plan, l'ordre de prouver</text></g>`);
  // De Mission Zero au correctif : une seule courbe douce, au-dessus des légendes des contrôles.
  arrow('M1210,230 C1210,268 1170,278 1100,278 L330,278 C220,278 155,290 155,355', 'data-dur="1300" data-d="1400"');
  step(`<g class="b" data-k="?" id="fix1" data-d="1500"><rect class="box gold" x="40" y="355" width="230" height="150" rx="16"/><text class="lbl acc" x="155" y="422" text-anchor="middle">Correctif n°1</text><text class="lbl s" x="155" y="456" text-anchor="middle">appliqué sur la copie</text></g>`);
  arrow(`M270,${RY} L340,${RY}`);
  ring(1, 'data-ring="r1"', 'les tests du client', 'Parcours', 1500);
  arrow(`M480,${RY} L570,${RY}`);
  ring(2, 'data-ring="r2"', 'la faille a disparu ?', 'Rescan', 1500);
  arrow(`M710,${RY} L800,${RY}`);
  // Le contrôle 3 : le rond apparaît, il regarde la page… puis son contour passe au rouge et clignote : l'alerte.
  ring(3, '', 'Muse Spark + SAM', 'Regard', 1500);
  step(`<g class="b" data-k="?" data-ring="r3:bad" data-blink="r3" data-d="1500"><text class="lbl xs" x="0" y="0"> </text></g>`);
  arrow(`M870,${RY + RR} L870,532`, 'id="red0" data-dur="500" data-d="600"', 'red');
  step(`<g class="b" data-k="?" id="red1" data-d="4200"><text class="lbl red" x="870" y="560" text-anchor="middle" style="font-size:22px;font-weight:700">✖ le correctif a altéré le HTML de la page de paiement :</text><text class="lbl red" x="870" y="592" text-anchor="middle" style="font-size:24px;font-weight:800">il faut le refaire</text><text class="lbl s" x="870" y="622" text-anchor="middle">le formulaire : 5 champs avant, 2 après</text></g>`);
  arrow('M870,640 C870,690 760,690 560,690', 'id="red2" data-dur="900" data-d="1000"', 'red');
  step(`<g class="b" data-k="?" id="red3" data-d="1900"><rect class="box red" x="300" y="645" width="260" height="90" rx="16"/><text class="lbl red" x="430" y="682" text-anchor="middle">Refusé</text><text class="lbl s" x="430" y="715" text-anchor="middle">par lui-même</text></g>`);
  arrow('M300,690 C200,690 155,660 155,505', 'id="red4" data-dur="900" data-d="1000"', 'red');
  step(`<g class="b" data-k="?" data-hide="#fix1,#red0,#red1,#red2,#red3,#red4" data-ring="r3:off" data-d="1900"><rect class="box gold" x="40" y="355" width="230" height="150" rx="16"/><text class="lbl acc" x="155" y="422" text-anchor="middle">Correctif n°2</text><text class="lbl s" x="155" y="456" text-anchor="middle">refait, sur une copie neuve</text></g>`);
  // Les contrôles 1 et 2 rejoués : le point repasse sur le fil et sur le haut de chaque rond, qui pulse à son passage.
  const L1 = 70, A = Math.PI * RR, L2 = 90, L3 = 90; const tot = L1 + A + L2 + A + L3;
  const p1 = ((L1 + A / 2) / tot).toFixed(3), p2 = ((L1 + A + L2 + A / 2) / tot).toFixed(3);
  arrow(`M270,${RY} L340,${RY} A${RR},${RR} 0 0,1 480,${RY} L570,${RY} A${RR},${RR} 0 0,1 710,${RY} L800,${RY}`, `data-dur="1500" data-d="1600" data-pulses="r1@${p1}:strong,r2@${p2}:strong"`, 'ghost');
  step(`<g class="b" data-k="?" data-d="1200"><text class="lbl xs" x="525" y="${RY + RR + 32}" text-anchor="middle">1 et 2 rejoués, toujours verts</text></g>`);
  step(`<g class="b" data-k="?" data-ring="r3" data-pulse="r3:strong" data-d="1600"><text class="lbl xs okt" x="870" y="${RY + RR + 32}" text-anchor="middle">page intacte : 5 champs sur 5</text></g>`);
  arrow(`M940,${RY} L1030,${RY}`);
  ring(4, 'data-ring="r4"', 'cause ou symptôme ?', 'Relecture', 1500);
  arrow(`M1170,${RY} L1260,${RY}`);
  ring(5, 'data-ring="r5"', 'écrites, jamais cachées', 'Réserves', 1500);
  arrow(`M1330,${RY + RR} L1330,600`);
  step(`<g class="b" data-k="?" data-d="3600"><rect class="box ok" x="1070" y="600" width="520" height="130" rx="16"/><text class="lbl acc" x="1330" y="642" text-anchor="middle">Confirmé · patch + preuves</text><text class="lbl s" x="1330" y="690" text-anchor="middle" style="fill:var(--fg)">un humain applique, d'un clic</text></g>`);
  step(`<g class="b" data-k="?" data-d="2400"><text class="lbl xs" x="0" y="0"> </text></g>`);
  const cap = ['Le même site, ses cinq failles.', null, 'Un scanner les liste. N’importe lequel.', null,
    '<b>Mission Zero part de zéro.</b> Une copie du site et l’ordre de prouver.', null, 'Un premier correctif, sur une copie.', null,
    'Contrôle 1&nbsp;: les tests du client. Vert.', null, 'Contrôle 2&nbsp;: le scanner. Vert.', null,
    'Contrôle 3&nbsp;: il regarde la page…', '<b class="r">Rouge.</b>', null,
    'Le correctif a altéré le HTML de la page de paiement&nbsp;: <b class="r">il faut le refaire.</b>', null,
    '<b class="r">Refusé</b>, par lui-même.', null, '<b>Correctif n°2</b>, sur une copie neuve.',
    'Contrôles 1 et 2 rejoués&nbsp;: toujours verts.', null, 'Contrôle 3&nbsp;: la page est intacte. Vert.', null,
    'Contrôle 4&nbsp;: la relecture. La cause, pas le symptôme. Vert.', null, 'Contrôle 5&nbsp;: les réserves, écrites. Vert.', null,
    'Cinq verts&nbsp;: <b>confirmé</b>. Un humain applique, d’un clic.', 'Il part de zéro, se refuse et confirme. Seul.'];
  if (cap.length !== k) throw new Error('s2 : ' + k + ' étapes, ' + cap.length + ' légendes');
  const sec = `  <section class="scene" id="s2">
    <header><h2>3 · CORRECTION AVEC MISSION ZERO</h2><span class="t">correction</span></header>
    <svg viewBox="0 0 1600 900" role="img" aria-label="Le site et ses failles, un scanner, Mission Zero qui part de zéro, cinq contrôles, un rouge : le correctif a altéré la page de paiement, il le refait, confirmé">
      ${g.join('\n      ')}
    </svg>
    <div class="caption" id="c2"></div>
  </section>
`;
  return { sec, cap };
})();
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
  r('x="350" y="640"', 'x="330" y="640"'); r('en-têtes : la politique de sécurité a sauté', 'en-têtes : protection sautée');
  r('d="M1300 602 L1300 735 L350 735 L350 602"', 'd="M1300 602 L1300 735 L490 735 L490 602"');
  grp(13, '<g class="b" data-k="13"><rect class="box gold" x="600" y="290" width="400" height="310" rx="18"/><text class="lbl acc" x="800" y="340" text-anchor="middle" style="font-size:28px">Mission Zero, branché</text><rect class="mini" x="625" y="380" width="100" height="50" rx="10"/><text class="lbl xs" x="675" y="411" text-anchor="middle" style="fill:var(--fg)">copie du site</text><path class="arrow" d="M727 405 L752 405" style="stroke-dasharray:none;stroke-dashoffset:0;stroke-width:3"/><rect class="mini" x="756" y="380" width="100" height="50" rx="10"/><text class="lbl xs" x="806" y="411" text-anchor="middle" style="fill:var(--fg)">correctif</text><path class="arrow" d="M858 405 L883 405" style="stroke-dasharray:none;stroke-dashoffset:0;stroke-width:3"/><circle class="ring lit" cx="905" cy="405" r="12"/><circle class="ring lit" cx="933" cy="405" r="12"/><circle class="ring lit" cx="961" cy="405" r="12"/><text class="lbl s okt" x="800" y="510" text-anchor="middle">✔ correctif confirmé, sur une copie</text></g>');
  grp(15, '<g class="b" data-k="15"><rect class="box ok" x="1080" y="290" width="440" height="310" rx="18"/><text class="lbl" x="1300" y="340" text-anchor="middle" style="font-size:28px">Vous validez</text><rect class="tile" x="1100" y="380" width="400" height="44" rx="8"/><text class="lbl xs" x="1115" y="408">en-têtes CSP · confirmé</text><rect x="1392" y="388" width="98" height="28" rx="7" fill="rgba(46,230,160,.18)" stroke="rgba(46,230,160,.7)" stroke-width="1.5"/><text class="lbl xs acc" x="1441" y="407" text-anchor="middle" style="font-weight:600">Appliquer</text><text class="lbl s" x="1300" y="490" text-anchor="middle" style="fill:var(--fg)">aujourd\'hui : un humain applique, d\'un clic</text><text class="lbl xs" x="1300" y="540" text-anchor="middle">mode automatique : à venir</text></g>');
  return x;
};
const pick = (id, next) => { let x = src.slice(src.indexOf('<section class="scene" id="' + id + '">'), src.indexOf('<section class="scene" id="' + next + '">')); var i = x.indexOf("<div class=\"bar\">"); if (i >= 0) { var j = x.indexOf("</div>", i) + 7; x = x.slice(0, i) + x.slice(j); } return x; };
const titled = (sec, label, cls, sub) => { var o = sec.indexOf('<svg viewBox="0 0 1600 900"'); var oe = sec.indexOf('>', o) + 1; var ce = sec.indexOf('</svg>', oe); var head = '<text class="lbl ' + cls + '" x="800" y="40" text-anchor="middle" style="font-size:26px;letter-spacing:.2em;font-weight:700">' + label + '</text>' + (sub ? '<text class="lbl s" x="800" y="70" text-anchor="middle" style="font-size:20px;letter-spacing:.08em">' + sub + '</text>' : ''); return sec.slice(0, oe) + head + '<g transform="translate(' + (sub ? '40,84) scale(0.95)' : '32,56) scale(0.96)') + '">' + sec.slice(oe, ce) + '</g>' + sec.slice(ce); };
const sB = titled(sBgeo, 'OÙ L’ENVOYER ?', 'amber');
const s1 = titled(fixS1(pick('s1', 's2')), 'SANS MISSION ZERO', 'red'), s2 = titled(s2geo.sec, 'AVEC MISSION ZERO', 'acc'), s3 = titled((function (x) { var i = x.indexOf('<g class="b" data-k="19"><text class="lbl acc" x="800" y="822"'); if (i < 0) return x; var j = x.indexOf('</g>', i) + 4; return x.slice(0, i) + x.slice(j); })(fixS3(pick('s3', 'sE'))), 'EXEMPLE D’UTILISATION AVEC MISSION ZERO', 'acc', 'MYTHOZOR ARGUS · surveillance cybersécurité');
const CAP = {
  s0: geo.cap,
  sB: ['Le point arrive. La boucle attend un objectif.', 'Même boucle, zéro code.', 'L\'espace…', 'la médecine…', 'un chiffre de l\'INSEE…', 'une norme…', 'une loi…', 'une décision de justice…', 'un appel d\'offres…', 'un rapport annuel…', 'un brevet…', 'la sécurité d\'un site…', 'une norme produit…', 'votre métier.', 'Tout vient de données gratuites.', null, '<b>D\'abord, la sécurité d\'un site.</b>'],
  s1: ['Une boutique en ligne. Elle tourne.', 'Les commandes tombent.', null, 'Tout va bien.', 'Conforme. Aujourd’hui.', 'Une équipe : une personne, souvent.', 'Une faille : aucun en-tête de sécurité.', 'Rouge.', 'Elle corrige à la main.', 'Corrigé.', 'Vert.', 'Une autre : le prix changé par le client.', 'Rouge.', 'Elle corrige, le soir.', 'Corrigé.', 'Vert.', 'Deux de plus : la carte bancaire en clair…', '…et une bibliothèque de 2012.', 'Rouge.', 'Pas le temps. Pas le budget.', 'Une cinquième. Elle restera ouverte.', 'Rouge.', '<b>8 sites sur 10 restent exposés.</b> La seule question, c’est quand.'],
  s2: s2geo.cap,
  s3: ['Chez vous. Rien ne sort.', 'Votre site, sur votre serveur.', '<b>MYTHOZOR ARGUS</b> surveille, jour et nuit.', null, null, null, null, null, null, 'Tout est vert.', 'Une nouvelle faille. ARGUS la voit. Rouge.', null, '<b>Mission Zero</b> la prend. Copie, correctif, cinq contrôles, patch.', null, 'Vous validez d’un clic. Le mode automatique est à venir.', null, 'ARGUS vérifie à nouveau.', 'Le rouge repasse au vert.'],
};
// Apostrophes typographiques dans tout le texte affiché (jamais dans le code ni les attributs).
const typo = (h) => h.replace(/>([^<]+)</g, (m, t) => '>' + t.replace(/'/g, '’') + '<');
const script = `<script>
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg', XLINK = 'http://www.w3.org/1999/xlink';
  var CAP = ${JSON.stringify(CAP).replace(/'/g, '’')};
  var timers = {}, SPEED = {};
  function speedOf(el) { var sc = el.closest('.scene'); return (sc && SPEED[sc.id]) || 1; }
  function steps(id) { return Array.prototype.slice.call(document.querySelectorAll('#' + id + ' [data-k]')); }
  function capId(id) { return 'c' + id.slice(1); }
  function roundPath(d) {
    var t = d.trim(); if (t.charAt(0) !== 'M' || /[ACQSTHVZacqsthvz]/.test(t.slice(1))) return d;
    var nums = t.replace(/[ML]/g, ' ').split(/[ ,]+/).filter(Boolean).map(Number); var pts = []; for (var j = 0; j + 1 < nums.length; j += 2) pts.push([nums[j], nums[j + 1]]);
    if (pts.length < 3) return d;
    var out = 'M' + pts[0][0] + ',' + pts[0][1];
    for (var i = 1; i < pts.length - 1; i++) {
      var p = pts[i - 1], c = pts[i], n2 = pts[i + 1];
      var l1 = Math.hypot(c[0] - p[0], c[1] - p[1]), l2 = Math.hypot(n2[0] - c[0], n2[1] - c[1]), rr = Math.min(48, l1 / 2, l2 / 2);
      var a = [c[0] - (c[0] - p[0]) / l1 * rr, c[1] - (c[1] - p[1]) / l1 * rr], bq = [c[0] + (n2[0] - c[0]) / l2 * rr, c[1] + (n2[1] - c[1]) / l2 * rr];
      out += ' L' + a[0].toFixed(1) + ',' + a[1].toFixed(1) + ' Q' + c[0] + ',' + c[1] + ' ' + bq[0].toFixed(1) + ',' + bq[1].toFixed(1);
    }
    var last = pts[pts.length - 1]; return out + ' L' + last[0] + ',' + last[1];
  }
  document.querySelectorAll('.arrow').forEach(function (p) { p.setAttribute('d', roundPath(p.getAttribute('d'))); });
  var n = 0, gen = 0;
  document.querySelectorAll('.a .arrow').forEach(function (p) {
    n += 1; p.id = p.id || 'p' + n;
    var orbit = p.classList.contains('orbit'), dur = Math.round((Number(p.parentNode.dataset.dur) || (orbit ? 4000 : 1000)) * speedOf(p));
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
    // Les surbrillances au passage du point : data-pulses="id@fraction[:strong]".
    (step.dataset.pulses || '').split(',').filter(Boolean).forEach(function (r) { var m = r.split('@'), f = m[1].split(':'); setTimeout(function () { if (my === gen) pulse(m[0], f[1] === 'strong'); }, Math.round(Number(f[0]) * dur)); });
  }
  function pulse(id, strong) { var el = document.getElementById(id); if (!el) return; el.classList.remove('pulse', 'strong'); void el.getBBox(); el.classList.add('pulse'); if (strong) el.classList.add('strong'); setTimeout(function () { el.classList.remove('pulse', 'strong'); }, strong ? 1300 : 700); }
  function act(step) {
    (step.dataset.hide || '').split(',').filter(Boolean).forEach(function (h) { document.querySelector(h).classList.add('hidden'); });
    (step.dataset.ring || '').split(',').filter(Boolean).forEach(function (r) { var id = r.split(':')[0], mode = r.split(':')[1] || 'lit'; var el = document.getElementById(id); el.classList.remove('lit', 'bad'); if (mode !== 'off') el.classList.add(mode); });
    if (step.dataset.shrink) { var sh = document.getElementById(step.dataset.shrink); if (sh) sh.classList.add('shrink'); }
    if (step.dataset.zoom2) { var zz = document.getElementById(step.dataset.zoom2); if (zz) { zz.parentNode.appendChild(zz); void zz.getBoundingClientRect(); zz.classList.add('zoomx'); zz.parentNode.classList.add('zooming'); } }
    if (step.dataset.unzoom) { var uz = document.getElementById(step.dataset.unzoom); if (uz) { uz.classList.remove('zoomx'); uz.parentNode.classList.remove('zooming'); } }
    (step.dataset.chip || '').split(',').filter(Boolean).forEach(function (r) { var id = r.split(':')[0], mode = r.split(':')[1] || 'ok'; var el = document.getElementById(id); if (el) { el.classList.remove('ok', 'ko'); el.classList.add(mode); } });
    (step.dataset.gone || '').split(',').filter(Boolean).forEach(function (id) { document.getElementById(id).classList.add('gone'); });
    // Surbrillance au passage (pulse, ou pulse:strong pour une revalidation) ; clignotement d'une alerte prise en compte.
    (step.dataset.pulse || '').split(',').filter(Boolean).forEach(function (r) { pulse(r.split(':')[0], r.split(':')[1] === 'strong'); });
    (step.dataset.blink || '').split(',').filter(Boolean).forEach(function (id) { var el = document.getElementById(id); if (!el) return; el.classList.remove('blink'); void el.getBBox(); el.classList.add('blink'); setTimeout(function () { el.classList.remove('blink'); }, 3600); });
    if (step.dataset.zoom) { var z = document.querySelector(step.dataset.zoom); if (z) setTimeout(function () { z.classList.add('zoom'); }, 900); }
  }
  function fire(step) {
    step.classList.add('on'); act(step);
    if (step.classList.contains('a')) draw(step);
  }
  function reset(id) {
    gen += 1; steps(id).forEach(function (s) { s.classList.remove('on', 'drawn', 'focus', 'hidden', 'zoom'); });
    document.querySelectorAll('#' + id + ' .zooming').forEach(function (z) { z.classList.remove('zooming'); });
    document.querySelectorAll('#' + id + ' .zoomx').forEach(function (z) { z.classList.remove('zoomx'); });
    document.querySelectorAll('#' + id + ' .arrow').forEach(function (p) { p.style.strokeDashoffset = ''; });
    document.querySelectorAll('#' + id + ' .zoom').forEach(function (z) { z.classList.remove('zoom'); });
    document.querySelectorAll('#' + id + ' .hidden').forEach(function (z) { z.classList.remove('hidden'); });
    document.querySelectorAll('#' + id + ' .ring').forEach(function (r) { if (r.id) r.classList.remove('lit', 'bad'); });
    document.querySelectorAll('#' + id + ' .field').forEach(function (r) { r.classList.remove('gone'); });
    document.querySelectorAll('#' + id + ' .chip').forEach(function (r) { if (r.id) r.classList.remove('ok', 'ko'); });
    document.querySelectorAll('#' + id + ' .runner').forEach(function (c) { c.classList.remove('go'); });
    document.querySelectorAll('#' + id + ' .shrink').forEach(function (c) { c.classList.remove('shrink'); });
    document.querySelectorAll('#' + id + ' .pulse, #' + id + ' .blink').forEach(function (c) { c.classList.remove('pulse', 'strong', 'blink'); });
    document.getElementById(capId(id)).innerHTML = '';
  }
  function caption(id, k) { var t = CAP[id][k - 1]; if (t) document.getElementById(capId(id)).innerHTML = t; }
  function play(id, done) {
    clearTimeout(timers[id]); reset(id);
    var list = steps(id), k = 0;
    void document.getElementById(id).getBoundingClientRect();
    (function next() { if (k >= list.length) { if (done) timers[id] = setTimeout(done, list[list.length - 1].classList.contains('a') ? 0 : 1800); return; } var s = list[k]; k += 1; fire(s); caption(id, k); var d = Math.round((Number(s.dataset.d) || (s.classList.contains('a') ? 1100 : 1300)) * speedOf(s)); if (s.classList.contains('a')) d = Math.max(d, (Number(s.dataset.dur) || 0) + 60); timers[id] = setTimeout(next, d); })();
  }
  function all(id) { clearTimeout(timers[id]); reset(id); var list = steps(id); list.forEach(function (s) { s.classList.add('on', 'drawn'); act(s); if (s.querySelector('.orbit')) fire(s); }); document.querySelectorAll('#' + id + ' .shrink').forEach(function (c) { c.classList.remove('shrink'); }); caption(id, list.length); }
  function show(id) { document.querySelectorAll('.scene').forEach(function (s) { s.classList.toggle('active', s.id === id); }); }
  var t0 = 0, clock = document.getElementById('clock');
  function tick() { if (t0) clock.textContent = Math.round((Date.now() - t0) / 100) / 10 + ' s'; }
  setInterval(tick, 200);
  // Le film d'une minute : la boucle, l'écran des choix, la sécurité. Le fil ne casse pas.
  function film() {
    t0 = Date.now(); document.body.classList.add('film');
    var chain = ['s0', 'sB', 's1', 's2', 's3'], i = 0; (function step() { if (i >= chain.length) { clock.textContent = 'fin · ' + Math.round((Date.now() - t0) / 100) / 10 + ' s'; t0 = 0; return; } var id = chain[i]; i += 1; show(id); play(id, step); })();
  }
  document.getElementById('go').addEventListener('click', film);
  document.querySelectorAll('[data-ch]').forEach(function (b) { b.addEventListener('click', function () { document.body.classList.add('film'); show(b.dataset.ch); play(b.dataset.ch); }); });
  document.getElementById('grid').addEventListener('click', function () { document.body.classList.remove('film'); ['s0', 'sB', 's1', 's2', 's3'].forEach(all); });
  var q = new URLSearchParams(location.search);
  if (q.get('record')) document.documentElement.classList.add('record');
  if (q.get('auto')) film(); else { document.body.classList.add('film'); show('s0'); }
})();
</script>`;
const html = `<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<title>Mission Zero film · une minute</title>
${style}
<style>
.film .scene { display:none; } .film .scene.active { display:grid; } .film .scene header { display:none; }
.field { fill:#fff; stroke:#999; stroke-width:1.5; } .field.gone { fill:none; stroke:var(--red); stroke-dasharray:5 4; }
/* Surbrillance au passage du point : une pulsation du contour, rien de plus. Forte quand on revalide. */
.ring.pulse { animation: ringpulse .6s ease-out; } .ring.pulse.strong { animation: ringpulse-strong 1.2s ease-out; }
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
</style>
<div class="wrap">
  <h1>Mission Zero, le film · une minute <small>Le modèle du 29 octobre, raccourci : des phrases courtes, les flèches qui se dessinent, le point qui court devant, chaque élément qui apparaît et reste. Voix française (le fondateur), sous-titres anglais incrustés au montage.</small></h1>
  <div class="filmbar"><button class="big" id="go">▶ Lancer le film</button><button data-ch="s0">1 · La boucle</button><button data-ch="sB">· Où l'envoyer ?</button><button data-ch="s1">2 · Constat</button><button data-ch="s2">3 · Correction</button><button data-ch="s3">4 · MYTHOZOR ARGUS</button><button id="grid">Voir tous les schémas</button><span id="clock" style="color:var(--mut)"></span></div>
${typo(s0)}
${typo(sB)}
${typo(s1)}
${typo(s2)}
${typo(s3)}
</div>
${script}
</html>
`;
fs.writeFileSync(__dirname + '/../film-v4.html', html);
console.log('film-v4.html', html.length, 'octets; s0 steps:', (s0.match(/data-k=/g) || []).length, 'sB steps:', (sB.match(/data-k=/g) || []).length, 's1 steps:', (s1.match(/data-k=/g) || []).length);

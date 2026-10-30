// La correction (AVEC MISSION ZERO), disposition validée sur l'image annotée du gérant (30 octobre, 18 h 35) :
// Mission Zero → Correctif (sous Mission Zero) → contrôles 1 · 2 · 3 · 4 · 5 lus de droite à gauche (Réserves, Relecture,
// Regard, Rescan, Parcours) → Confirmé (en bas à gauche) → Votre site. Une seule boucle, le fil ne se croise jamais.
// Textes courts (gérant, 18 h 50 : « FAILLE SCAN », enlever le surplus, équilibrer les textes et les cases).
module.exports = (function () {
  const RY = 470, RR = 70, X = [410, 640, 870, 1100, 1330];
  let k = 0; const g = [], cap = [];
  const step = (s, c) => { k += 1; g.push(s.replace('data-k="?"', `data-k="${k}"`)); cap.push(c === undefined ? null : c); };
  const arrow = (d, attrs, cls, c) => step(`<g class="a" data-k="?" ${attrs || ''}><path class="arrow${cls ? ' ' + cls : ''}" pathLength="1" d="${d}"/></g>`, c);
  // Rond n à la position i (0 = gauche) : numéro, nom, et sa légende (au-dessus, ou en deux lignes à droite).
  const ring = (i, n, name, top, attrs, d, c) => step(`<g class="b" data-k="?" ${attrs || ''} data-d="${d || 1500}"><circle class="ring" id="r${n}" cx="${X[i]}" cy="${RY}" r="${RR}"/><text class="lbl m" x="${X[i]}" y="${RY - 7}" text-anchor="middle">${n}</text><text class="lbl s" x="${X[i]}" y="${RY + 23}" text-anchor="middle" style="fill:var(--fg)">${name}</text>` +
    (Array.isArray(top) ? top.map((t, j) => `<text class="lbl s" x="${X[i] + RR + 14}" y="${RY + 6 + (j - (top.length - 1) / 2) * 24}">${t}</text>`).join('') : `<text class="lbl s" x="${X[i]}" y="${RY - RR - 25}" text-anchor="middle">${top}</text>`) + '</g>', c);
  const fixBox = (id, title, sub) => `<rect class="box gold" id="${id}" x="1200" y="262" width="260" height="96" rx="16"/><text class="lbl acc" x="1330" y="298" text-anchor="middle">${title}</text><text class="lbl s" x="1330" y="332" text-anchor="middle">${sub}</text>`;

  // Ligne du haut : le site, FAILLE SCAN, Mission Zero.
  step(`<g class="b" data-k="?" data-d="1500"><rect class="box red" id="siteBox" x="40" y="40" width="300" height="190" rx="16"/><text class="lbl m red" id="siteT" x="190" y="76" text-anchor="middle">VOTRE SITE · 5 failles</text><rect class="tile" x="70" y="96" width="60" height="44" rx="6"/><rect class="tile" x="140" y="96" width="60" height="44" rx="6"/><rect class="tile" x="210" y="96" width="60" height="44" rx="6"/><rect class="tile" x="70" y="150" width="200" height="24" rx="6"/><text class="lbl xs" x="190" y="210" text-anchor="middle">en ligne</text></g>`, 'Le même site. Cinq failles.');
  arrow('M340,135 L420,135');
  step(`<g class="b" data-k="?" data-d="1600"><rect class="box" x="420" y="40" width="360" height="190" rx="16"/><text class="lbl m" x="600" y="90" text-anchor="middle" style="letter-spacing:.12em;font-weight:800">FAILLE SCAN</text><text class="lbl s red" id="scan5" x="600" y="160" text-anchor="middle" style="font-size:22px;font-weight:700">⚠ 5 failles</text></g>`, 'FAILLE SCAN&nbsp;: cinq failles.');
  arrow('M780,135 L860,135');
  step(`<g class="b" data-k="?" data-d="2600"><rect class="box gold" id="mzBox" x="860" y="40" width="700" height="190" rx="16"/><text class="lbl acc" x="1210" y="104" text-anchor="middle" style="font-size:30px">Mission Zero part de zéro</text><text class="lbl s" x="1210" y="170" text-anchor="middle" style="font-size:20px">une copie · aucun plan · l’ordre de prouver</text></g>`, '<b>Mission Zero part de zéro.</b> Une copie, l’ordre de prouver.');
  // Mission Zero → Correctif n°1, juste dessous.
  arrow('M1330,230 L1330,262');
  step(`<g class="b" data-k="?" id="fix1" data-d="1500">${fixBox('fix1b', 'Correctif n°1', 'sur la copie')}</g>`, 'Correctif n°1, sur la copie.');
  arrow(`M1330,358 L1330,${RY - RR}`);
  ring(4, 1, 'Réserves', ['écrites'], 'data-ring="r1"', 1500, 'Contrôle 1&nbsp;: les réserves, écrites. Vert.');
  arrow(`M${X[4] - RR},${RY} L${X[3] + RR},${RY}`);
  ring(3, 2, 'Relecture', 'cause ou symptôme ?', 'data-ring="r2"', 1500, 'Contrôle 2&nbsp;: la relecture. Vert.');
  arrow(`M${X[3] - RR},${RY} L${X[2] + RR},${RY}`);
  // Contrôle 3 : il regarde la page… le contour passe au rouge et clignote.
  ring(2, 3, 'Regard', 'Muse Spark + SAM', '', 1500, 'Contrôle 3&nbsp;: il regarde la page…');
  step(`<g class="b" data-k="?" data-ring="r3:bad" data-blink="r3" data-d="1500"><text class="lbl xs" x="0" y="0"> </text></g>`, '<b class="r">Rouge.</b>');
  arrow(`M870,${RY + RR} L870,575`, 'id="red0" data-dur="500" data-d="600"', 'red');
  step(`<g class="b" data-k="?" id="red1" data-d="3600"><text class="lbl red" x="870" y="604" text-anchor="middle" style="font-size:22px;font-weight:700">✖ page de paiement altérée</text><text class="lbl red" x="870" y="636" text-anchor="middle" style="font-size:24px;font-weight:800">à refaire</text><text class="lbl s" x="870" y="664" text-anchor="middle">5 champs avant · 2 après</text></g>`, 'La page de paiement est altérée&nbsp;: <b class="r">à refaire.</b>');
  arrow('M870,680 L870,712 L1090,712', 'id="red2" data-dur="900" data-d="1000" data-round="24"', 'red');
  step(`<g class="b" data-k="?" id="red3" data-d="1900"><rect class="box red" x="1090" y="667" width="240" height="90" rx="16"/><text class="lbl red" x="1210" y="704" text-anchor="middle">Refusé</text><text class="lbl s" x="1210" y="737" text-anchor="middle">par lui-même</text></g>`, '<b class="r">Refusé</b>, par lui-même.');
  // Retour au correctif par le couloir de droite, sans rien croiser.
  arrow('M1330,712 L1500,712 L1500,310 L1460,310', 'id="red4" data-dur="1300" data-d="1400" data-round="40"', 'red');
  step(`<g class="b" data-k="?" data-hide="#fix1,#red0,#red1,#red2,#red3,#red4" data-ring="r3:off" data-d="1900">${fixBox('fix2', 'Correctif n°2', 'copie neuve')}</g>`, '<b>Correctif n°2</b>, copie neuve.');
  // Contrôles 1 et 2 rejoués : le point repasse sur le fil, par le haut de chaque rond, qui pulse à son passage.
  const L1 = RY - RR - 358, Q = Math.PI * RR / 2, L2 = X[4] - X[3] - 2 * RR, Hh = Math.PI * RR, L3 = X[3] - X[2] - 2 * RR; const tot = L1 + Q + L2 + Hh + L3;
  const p1 = ((L1 + Q / 2) / tot).toFixed(3), p2 = ((L1 + Q + L2 + Hh / 2) / tot).toFixed(3);
  arrow(`M1330,358 L1330,${RY - RR} A${RR},${RR} 0 0,0 ${X[4] - RR},${RY} L${X[3] + RR},${RY} A${RR},${RR} 0 0,0 ${X[3] - RR},${RY} L${X[2] + RR},${RY}`, `data-dur="1500" data-d="1600" data-pulses="r1@${p1}:strong,r2@${p2}:strong"`, 'ghost', 'Contrôles 1 et 2 rejoués&nbsp;: verts.');
  step(`<g class="b" data-k="?" data-d="1200"><text class="lbl xs" x="${(X[4] + X[3]) / 2}" y="${RY + RR + 32}" text-anchor="middle">1 et 2 rejoués · verts</text></g>`);
  step(`<g class="b" data-k="?" data-ring="r3" data-pulse="r3:strong" data-d="1600"><text class="lbl xs okt" x="870" y="${RY + RR + 32}" text-anchor="middle">page intacte · 5 champs sur 5</text></g>`, 'Contrôle 3&nbsp;: page intacte. Vert.');
  arrow(`M${X[2] - RR},${RY} L${X[1] + RR},${RY}`);
  ring(1, 4, 'Rescan', 'faille disparue ?', 'data-ring="r4"', 1500, 'Contrôle 4&nbsp;: la faille a disparu. Vert.');
  arrow(`M${X[1] - RR},${RY} L${X[0] + RR},${RY}`);
  ring(0, 5, 'Parcours', 'tests client', 'data-ring="r5"', 1500, 'Contrôle 5&nbsp;: les tests du client. Vert.');
  // Contrôle 5 → Confirmé, en bas à gauche.
  arrow(`M${X[0]},${RY + RR} L${X[0]},600`);
  step(`<g class="b" data-k="?" data-d="3200"><rect class="box ok" x="60" y="600" width="520" height="130" rx="16"/><text class="lbl acc" x="320" y="642" text-anchor="middle">Confirmé · patch + preuves</text><text class="lbl s" x="320" y="690" text-anchor="middle" style="fill:var(--fg)">un humain, ou l’automatique</text></g>`, 'Cinq verts&nbsp;: <b>confirmé</b>. Un humain, ou l’automatique.');
  // Confirmé → Votre site, tout droit : le site passe au vert, puis FAILLE SCAN ne voit plus rien.
  arrow('M130,600 L130,230', 'data-dur="900" data-d="1000"');
  step(`<g class="b" data-k="?" data-hide="#siteBox,#siteT" data-d="2200"><rect class="box ok" x="40" y="40" width="300" height="190" rx="16" style="filter:drop-shadow(0 0 12px rgba(46,230,160,.7))"/><text class="lbl m acc" x="190" y="76" text-anchor="middle">VOTRE SITE · 0 faille</text><rect class="chip ok" x="70" y="146" width="240" height="32" rx="16"/><text class="chip-t" x="190" y="167" text-anchor="middle" style="font-size:15px;font-weight:700">✔ corrigée · en live</text></g>`, '<b>Corrigée, en live.</b>');
  arrow('M340,135 L420,135', 'data-dur="500" data-d="600"', 'ghost');
  step(`<g class="b" data-k="?" data-hide="#scan5" data-d="2600"><text class="lbl s okt" x="600" y="160" text-anchor="middle" style="font-size:22px;font-weight:700">✔ 0 faille</text></g>`, 'FAILLE SCAN&nbsp;: zéro. Tout est vert.');
  step(`<g class="b" data-k="?" data-d="1800"><text class="lbl xs" x="0" y="0"> </text></g>`);
  arrow('M1560,135 L1633.3,135', 'data-dur="700" data-d="750"');

  const sec = `  <section class="scene" id="s2">
    <header><h2>3 · CORRECTION AVEC MISSION ZERO</h2><span class="t">correction</span></header>
    <svg viewBox="0 0 1600 900" role="img" aria-label="Le site et ses failles, FAILLE SCAN, Mission Zero qui part de zéro, un correctif, cinq contrôles, un rouge : la page de paiement altérée, refusé, correctif n°2, confirmé, le site corrigé">
      ${g.join('\n      ')}
    </svg>
    <div class="caption" id="c2"></div>
  </section>
`;
  return { sec, cap };
})();

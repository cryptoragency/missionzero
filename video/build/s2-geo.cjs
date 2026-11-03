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
  step(`<g class="b" data-k="?" data-d="1500"><rect class="box red" id="siteBox" x="40" y="40" width="300" height="190" rx="16"/><text class="lbl m red" id="siteT" x="190" y="76" text-anchor="middle">VOTRE SITE · 15 failles</text><rect class="tile" x="70" y="96" width="60" height="44" rx="6"/><rect class="tile" x="140" y="96" width="60" height="44" rx="6"/><rect class="tile" x="210" y="96" width="60" height="44" rx="6"/><rect class="tile" x="70" y="150" width="200" height="24" rx="6"/><text class="lbl xs" x="190" y="210" text-anchor="middle">en ligne</text></g>`, 'Le même site. Cinq failles.');
  arrow('M340,135 L420,135');
  step(`<g class="b" data-k="?" data-d="1600"><rect class="box" x="420" y="40" width="360" height="190" rx="16"/><text class="lbl m" x="600" y="90" text-anchor="middle" style="letter-spacing:.12em;font-weight:800">FAILLE SCAN</text><text class="lbl s red" id="scan5" x="600" y="160" text-anchor="middle" style="font-size:22px;font-weight:700">⚠ 15 failles</text></g>`, 'FAILLE SCAN&nbsp;: cinq failles.');
  arrow('M780,135 L860,135');
  step(`<g class="b" data-k="?" data-d="2600"><path id="mzFrame" d="M868,22 L1556,22 A28,28 0 0 1 1584,50 L1584,804 A28,28 0 0 1 1556,832 L346,832 A28,28 0 0 1 318,804 L318,274 A28,28 0 0 1 346,246 L812,246 A28,28 0 0 0 840,218 L840,50 A28,28 0 0 1 868,22 Z" fill="rgba(63,242,176,.045)" stroke="rgba(110,250,200,.6)" stroke-width="2.5" stroke-dasharray="10 8"/><text class="lbl acc" x="348" y="292" style="font-size:26px;letter-spacing:.14em;font-weight:800">MISSION ZERO</text><text class="lbl s" x="348" y="322">tout se passe ici, sur une copie</text><rect class="box gold" id="mzBox" x="860" y="40" width="700" height="190" rx="16"/><text class="lbl acc" x="1210" y="104" text-anchor="middle" style="font-size:30px">Départ à zéro</text><text class="lbl s" x="1210" y="170" text-anchor="middle" style="font-size:20px">une copie · aucun plan · tout doit être VERIFIED</text></g>`, '<b>Mission Zero part de zéro.</b> Une copie, tout doit être VERIFIED.');
  // Mission Zero → Correctif n°1, juste dessous.
  arrow('M1330,230 L1330,262');
  step(`<g class="b" data-k="?" id="fix1" data-d="1500">${fixBox('fix1b', 'Correctif n°1', 'sur la copie')}<rect class="box gold" x="930" y="272" width="220" height="76" rx="14"/><text class="lbl acc" x="1040" y="306" text-anchor="middle" style="font-size:23px">Muse Spark</text><text class="lbl s" x="1040" y="334" text-anchor="middle">écrit la correction</text><path d="M1150,310 L1200,310" stroke="#2ee6a0" stroke-width="3" stroke-dasharray="6 5" fill="none"/></g>`, 'Correctif n°1, sur la copie.');
  arrow(`M1330,358 L1330,${RY - RR}`);
  ring(4, 1, 'Parcours', ['tests client'], 'data-ring="r1"', 1500, 'Contrôle 1&nbsp;: les réserves, écrites. Vert.');
  arrow(`M${X[4] - RR},${RY} L${X[3] + RR},${RY}`);
  ring(3, 2, 'Rescan', 'faille disparue ?', 'data-ring="r2"', 1500, 'Contrôle 2&nbsp;: la relecture. Vert.');
  arrow(`M${X[3] - RR},${RY} L${X[2] + RR},${RY}`);
  // Contrôle 3 : il regarde la page… le contour passe au rouge et clignote.
  ring(2, 3, 'Regard', 'Muse Spark regarde', '', 1500, 'Contrôle 3&nbsp;: Muse Spark regarde la page, SAM compte les champs.');
  step(`<g class="b" data-k="?" data-ring="r3:bad" data-blink="r3" data-d="1500"><text class="lbl xs" x="0" y="0"> </text></g>`, '<b class="r">Rouge.</b>');
  arrow(`M870,${RY + RR} L870,575`, 'id="red0" data-dur="500" data-d="600"', 'red');
  step(`<g class="b" data-k="?" id="red1" data-d="200"><text class="lbl xs" x="0" y="0"> </text></g>`);
  arrow('M870,575 L870,712 L1030,712', 'id="red2" data-dur="700" data-d="760" data-round="24"', 'red');
  step(`<g class="b" data-k="?" id="red3" data-d="3400"><rect class="box red" x="1030" y="606" width="420" height="200" rx="18"/><text class="lbl red" x="1240" y="648" text-anchor="middle" style="font-size:27px;font-weight:800">le contrôle 3 refuse</text><text class="lbl red" x="1240" y="694" text-anchor="middle" style="font-size:20px;font-weight:700">✖ page de paiement · formulaire disparu</text><text class="lbl red" x="1240" y="730" text-anchor="middle" style="font-size:25px;font-weight:800">à refaire</text><text class="lbl s" x="1240" y="770" text-anchor="middle">vu par Muse Spark sur la page</text></g>`, '<b>Le contrôle 3</b> refuse le correctif n°1&nbsp;: <span class="r">formulaire de paiement disparu.</span>');
  // Retour au correctif par le couloir de droite, sans rien croiser.
  arrow('M1450,706 L1510,706 L1510,310 L1460,310', 'id="red4" data-dur="1200" data-d="1300" data-round="40"', 'red');
  step(`<g class="b" data-k="?" data-hide="#fix1,#red0,#red1,#red2,#red3,#red4" data-ring="r3:off" data-d="1900">${fixBox('fix2', 'Correctif n°2', 'copie neuve')}<rect class="box gold" id="iaFix" x="930" y="272" width="220" height="76" rx="14"/><text class="lbl acc" x="1040" y="306" text-anchor="middle" style="font-size:23px">Muse Spark</text><text class="lbl s" x="1040" y="334" text-anchor="middle">écrit la correction</text><path d="M1150,310 L1200,310" stroke="#2ee6a0" stroke-width="3" stroke-dasharray="6 5" fill="none"/></g>`, '<b>Mission Zero</b> écrit le <b>correctif n°2</b>, sur une copie neuve.');
  // Contrôles 1 et 2 rejoués : le point repasse sur le fil, par le haut de chaque rond, qui pulse à son passage.
  const L1 = RY - RR - 358, Q = Math.PI * RR / 2, L2 = X[4] - X[3] - 2 * RR, Hh = Math.PI * RR, L3 = X[3] - X[2] - 2 * RR; const tot = L1 + Q + L2 + Hh + L3;
  const p1 = ((L1 + Q / 2) / tot).toFixed(3), p2 = ((L1 + Q + L2 + Hh / 2) / tot).toFixed(3);
  arrow(`M1330,358 L1330,${RY - RR} A${RR},${RR} 0 0,0 ${X[4] - RR},${RY} L${X[3] + RR},${RY} A${RR},${RR} 0 0,0 ${X[3] - RR},${RY} L${X[2] + RR},${RY}`, `data-dur="1500" data-d="1600" data-pulses="r1@${p1}:strong,r2@${p2}:strong"`, 'ghost', 'Contrôles 1 et 2 rejoués&nbsp;: verts.');
  step(`<g class="b" data-k="?" data-d="1200"><text class="lbl xs" x="${(X[4] + X[3]) / 2}" y="${RY + RR + 32}" text-anchor="middle">1 et 2 rejoués · verts</text></g>`);
  step(`<g class="b" data-k="?" data-ring="r3" data-pulse="r3:strong" data-d="1600"><text class="lbl xs okt" x="870" y="${RY + RR + 32}" text-anchor="middle">page revue · aucun problème</text></g>`, 'Contrôle 3&nbsp;: Muse Spark revoit la page, aucun problème. Vert.');
  arrow(`M${X[2] - RR},${RY} L${X[1] + RR},${RY}`);
  ring(1, 4, 'Relecture', 'cause ou symptôme ?', 'data-ring="r4"', 1500, 'Contrôle 4&nbsp;: la faille a disparu. Vert.');
  arrow(`M${X[1] - RR},${RY} L${X[0] + RR},${RY}`);
  ring(0, 5, 'Réserves', 'écrites', 'data-ring="r5"', 1500, 'Contrôle 5&nbsp;: les tests du client. Vert.');
  // Contrôle 5 → Confirmé, en bas à gauche.
  arrow(`M${X[0]},${RY + RR} L${X[0]},665 L300,665`);
  step(`<g class="b" data-k="?" id="okpatch" data-d="3200"><rect class="box ok" x="30" y="600" width="270" height="140" rx="16"/><text class="lbl acc" x="165" y="640" text-anchor="middle">patch prêt</text><text class="lbl s" x="165" y="672" text-anchor="middle">une réserve écrite</text><text class="lbl s" x="165" y="712" text-anchor="middle" style="fill:var(--fg);font-weight:700">un humain valide</text></g>`, 'Cinq verts&nbsp;: <b>VERIFIED</b>. Une réserve écrite&nbsp;: relire les sources. Un humain valide le patch.');
  // Confirmé → Votre site, tout droit : le site passe au vert, puis FAILLE SCAN ne voit plus rien.
  arrow('M130,600 L130,230', 'data-dur="900" data-d="1000"');
  step(`<g class="b" data-k="?" id="siteOk" data-hide="#siteBox,#siteT" data-d="2600"><rect class="box ok" x="40" y="40" width="300" height="190" rx="16" style="filter:drop-shadow(0 0 12px rgba(46,230,160,.7))"/><text class="lbl m acc" x="190" y="76" text-anchor="middle">VOTRE SITE</text><rect class="chip ok" x="70" y="146" width="240" height="32" rx="16"/><text class="chip-t" x="190" y="167" text-anchor="middle" style="font-size:15px;font-weight:700">✔ correctifs prêts</text></g>`, '<b>Corrigée, en live.</b>');
  arrow('M340,135 L420,135', 'data-dur="500" data-d="600"', 'ghost');
  step(`<g class="b" data-k="?" data-hide="#scan5" data-d="2600"><text class="lbl s okt" x="600" y="160" text-anchor="middle" style="font-size:22px;font-weight:700">✔ 14 sur 15, sur la copie</text></g>`, 'FAILLE SCAN&nbsp;: zéro. Tout est vert.');
  step(`<g class="b" data-k="?" data-d="1800"><text class="lbl xs" x="0" y="0"> </text></g>`);
  arrow('M1560,135 L1633.3,135', 'data-dur="700" data-d="750"');

  // Rythme resserré (gérant, 1er novembre) : la page passe d'environ 51 s à 37 s.
  const tighten = (x) => { const i = x.indexOf('>'); let head = x.slice(0, i); const rest = x.slice(i);
    const num = (n) => { const m = head.match(new RegExp(' ' + n + '="(\\d+)"')); return m ? Number(m[1]) : null; };
    const set = (n, v) => { head = num(n) === null ? head + ' ' + n + '="' + v + '"' : head.replace(new RegExp(' ' + n + '="\\d+"'), ' ' + n + '="' + v + '"'); };
    if (/^<g class="a"/.test(head)) { const d = num('data-d'), du = num('data-dur'); if (d === null && du === null) { set('data-dur', 600); set('data-d', 650); } else { if (du !== null) set('data-dur', Math.round(du * 0.7)); if (d !== null) set('data-d', Math.round(d * 0.7)); } }
    else if (/^<g class="b/.test(head)) { const d = num('data-d'); if (d !== null && d > 300) set('data-d', Math.max(900, Math.round(d * 0.72))); }
    return head + rest; };
  for (let i = 0; i < g.length; i++) g[i] = tighten(g[i]);
  const sec = `  <section class="scene" id="s2">
    <header><h2>3 · CORRECTION AVEC MISSION ZERO</h2><span class="t">correction</span></header>
    <svg viewBox="0 0 1600 900" role="img" aria-label="Le site et ses failles, FAILLE SCAN, Mission Zero qui part de zéro, un correctif, cinq contrôles, un rouge : la page de paiement altérée, NOT VERIFIED, correctif n°2, VERIFIED, le site corrigé">
      ${g.join('\n      ')}
    </svg>
    <div class="caption" id="c2"></div>
  </section>
`;
  return { sec, cap };
})();

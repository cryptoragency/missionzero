// LA MÉDECINE, monde entier (gérant, 30 octobre, 20 h 05 : « on est mondial »). La veille au centre, équilibrée :
// le graphique à gauche, ce qu'il fait à droite, les six régions du monde en bas. Données réelles : OMS FluNet (GISRS),
// détections de grippe déclarées chaque semaine par ~190 pays, lues sur l'API publique le 30 octobre 2026 et rejouées par le
// mode veille (seuil 10 %) : C:\gui\mission-zero\watch\flunet-grippe-monde\report-2026-W*.md. Le fil dessine la courbe
// relevé après relevé ; seules les variations signalées par le rapport sont écrites (S36 +13 %, S40 +17 %) ; S42 : la
// Méditerranée orientale chute de 70 %, et 19 pays de moins ont déclaré : il le dit, il ne tranche pas. Un humain décide.
module.exports = (function () {
  let k = 0; const g = [], cap = [];
  const step = (s, c) => { k += 1; g.push(s.replace('data-k="?"', 'data-k="' + k + '"')); cap.push(c === undefined ? null : c); };
  const arrow = (d, attrs, c) => step('<g class="a" data-k="?" ' + (attrs || '') + '><path class="arrow" pathLength="1" d="' + d + '"/></g>', c);
  const nf = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  // Semaine, total monde, variation signalée par le rapport (seuil 10 %).
  const weeks = [[34, 9298, null], [35, 9959, null], [36, 11268, '+13 %'], [37, 12277, null], [38, 12562, null], [39, 13028, null], [40, 15201, '+17 %'], [41, 15860, null], [42, 15963, null]];
  const X = (i) => 150 + i * 100, Y = (v) => Math.round(500 - ((v - 8000) / 9000) * 300);
  const pt = (i) => { const [w, v, var_] = weeks[i]; const hot = !!var_; return '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="' + (hot ? 8 : 5) + '" fill="' + (hot ? 'rgba(255,210,122,.35)' : '#fff') + '"' + (hot ? ' stroke="var(--amber)" stroke-width="3" style="filter:drop-shadow(0 0 8px rgba(255,210,122,.9))"' : '') + '/><text class="lbl xs" x="' + X(i) + '" y="' + (Y(v) - 18) + '" text-anchor="middle" style="fill:var(--fg);font-size:19px;font-weight:600">' + nf(v) + '</text>' + (var_ ? '<text class="lbl amber" x="' + X(i) + '" y="' + (Y(v) - 46) + '" text-anchor="middle" style="font-size:28px;font-weight:700">' + var_ + '</text>' : ''); };
  const line = (x, y, txt, cls, size, anchor) => '<text class="lbl ' + (cls || 's') + '" x="' + x + '" y="' + y + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + ' style="font-size:' + (size || 17) + 'px">' + txt + '</text>';

  // Le fil entre à la hauteur du premier relevé et arrive au bord du graphique.
  arrow('M-33.3,' + Y(9298) + ' L60,' + Y(9298), 'data-dur="700" data-d="800"');
  step('<g class="b" data-k="?" data-d="3200"><rect class="box" x="60" y="120" width="980" height="440" rx="16"/><text class="lbl" x="550" y="162" text-anchor="middle" style="font-size:27px">Veille · grippe · OMS FluNet · monde</text><text class="lbl s" x="550" y="194" text-anchor="middle" style="font-size:20px">détections positives par semaine · 190 pays</text>' + weeks.map(([w], i) => '<text class="lbl xs" x="' + X(i) + '" y="540" text-anchor="middle" style="font-size:18px">S' + w + '</text>').join('') + '</g>', 'Chaque semaine, Mission Zero lit les relevés de l’OMS. La grippe, dans le monde, cent quatre-vingt-dix pays.');
  arrow('M60,' + Y(9298) + ' L' + X(0) + ',' + Y(9298), 'data-dur="500" data-d="550"');
  step('<g class="b" data-k="?" data-d="1800">' + pt(0) + '</g>', 'Semaine 34&nbsp;: neuf mille trois cents détections.');
  const caps = { 35: 'Il compare à la semaine d’avant. Rien d’assez grand&nbsp;: il se tait.', 36: 'Semaine 36&nbsp;: <b>plus treize pour cent.</b> Il le signale.', 40: 'Semaine 40&nbsp;: <b>plus dix-sept.</b> Il le signale.', 42: 'Semaine 42&nbsp;: le monde ne bouge plus. Mais les régions, si.' };
  for (let i = 1; i < weeks.length; i++) {
    const [w, v, var_] = weeks[i], [, pv] = weeks[i - 1];
    arrow('M' + X(i - 1) + ',' + Y(pv) + ' L' + X(i) + ',' + Y(v), 'data-dur="' + (var_ || caps[w] ? 700 : 400) + '" data-d="' + (var_ || caps[w] ? 750 : 450) + '"');
    step('<g class="b" data-k="?" data-d="' + (var_ ? 2600 : caps[w] ? 2200 : 500) + '">' + pt(i) + '</g>', caps[w]);
  }
  // À droite : ce qu'il fait, tel que le rapport l'écrit.
  arrow('M' + X(8) + ',' + Y(15963) + ' L1080,' + Y(15963), 'data-dur="500" data-d="550"');
  step('<g class="b" data-k="?" data-d="4200"><rect class="box gold" x="1080" y="120" width="460" height="440" rx="16"/><text class="lbl acc" x="1310" y="166" text-anchor="middle" style="font-size:26px">chaque semaine, il</text>' + line(1110, 236, 'lit la source · 190 pays', 'okt', 24) + line(1110, 290, 'compare à la semaine d’avant', 'okt', 24) + line(1110, 344, 'signale ce qui bouge', 'okt', 24) + line(1110, 398, 'n’invente rien · pas lu ? il le dit', 's', 22) + '<text class="lbl" x="1310" y="500" text-anchor="middle" style="font-size:30px;font-weight:700">un humain décide</text></g>', 'Il lit, il compare, il signale. Il ne tranche pas&nbsp;: <b>un humain décide.</b>');
  // En bas : la même semaine, par région du monde (rapport S42), avec la réserve sur les pays déclarants.
  arrow('M1310,560 L1310,610', 'data-dur="500" data-d="550"');
  const reg = [['Europe', '2 830 → 3 494', '+24 %', 'ok'], ['Amériques', '6 039 → 6 426', '+6 %', ''], ['Pacifique ouest', '5 027 → 5 105', '+2 %', ''], ['Asie du Sud-Est', '458 → 400', '−13 %', 'ok'], ['Afrique', '210 → 143', '−32 %', 'ok'], ['Médit. orientale', '1 296 → 395', '−70 %', 'ko']];
  const RX = (i) => 60 + i * 246;
  step('<g class="b" data-k="?" data-d="4600"><rect class="box" x="60" y="610" width="1480" height="200" rx="16"/><text class="lbl" x="800" y="648" text-anchor="middle" style="font-size:25px">S42 · la même semaine, par région du monde</text>' + reg.map(([name, v, pct, cls], i) => '<rect class="chip ' + cls + '" x="' + (RX(i) + 10) + '" y="668" width="226" height="86" rx="14"/><text class="lbl xs" x="' + (RX(i) + 123) + '" y="694" text-anchor="middle" style="fill:var(--fg);font-weight:700;font-size:20px">' + name + '</text><text class="lbl xs" x="' + (RX(i) + 123) + '" y="718" text-anchor="middle" style="font-size:18px">' + v + '</text><text class="lbl ' + (cls === 'ko' ? 'red' : cls === 'ok' ? 'amber' : 'xs') + '" x="' + (RX(i) + 123) + '" y="748" text-anchor="middle" style="font-size:25px;font-weight:700">' + pct + '</text>').join('') + line(800, 792, '⚠ 176 → 157 pays déclarants · la chute de −70 % n’est pas tranchée : il le dit', 'amber', 21, 'middle') + '</g>', 'Les régions, la même semaine. La Méditerranée orientale chute de <b class="r">70 %</b>&nbsp;? Dix-neuf pays n’ont pas encore déclaré. <b>Il le dit, il ne tranche pas.</b>');
  step('<g class="b" data-k="?" data-d="2600"><text class="lbl xs" x="0" y="0"> </text></g>', '<b>On sait soigner. Reste à chercher.</b>');
  arrow('M1540,700 L1633.3,700', 'data-dur="800" data-d="850"');
  const sec = '  <section class="scene" id="sM">\n    <header><h2>LA MÉDECINE</h2><span class="t">une vraie mission de Mission Zero</span></header>\n    <svg viewBox="0 0 1600 900" role="img" aria-label="La veille mondiale : le fil dessine neuf semaines de grippe dans le monde (OMS FluNet), signale ce qui bouge, puis les six régions du monde la même semaine">\n      ' + g.join('\n      ') + '\n    </svg>\n    <div class="caption" id="cM"></div>\n  </section>\n';
  return { sec, cap };
})();

// LA MÉDECINE, refaite selon l'image annotée du gérant (30 octobre, 19 h 38) : plus de chiffres OMS ni d'électrocardiogramme,
// la veille au centre, en grand. Le fil dessine lui-même la courbe, relevé après relevé : neuf semaines de grippe (réseau
// Sentinelles, France, cas pour 100 000), comparées chacune à la précédente ; seules les variations de 20 % et plus sont
// signalées (S36, S37, S38 : trois hausses d'affilée, puis plus rien). À droite : pourquoi (la méthode lue, aucun commentaire
// publié, il le dit, cinq centimes, un humain décide), puis la confrontation avec les régions la même semaine.
// Chiffres : C:\gui\mission-zero\examples\watch-sentinelles-2026-10-30 et watch-sentinelles-regions-2026-10-30 (rejoués de l'historique public).
module.exports = (function () {
  let k = 0; const g = [], cap = [];
  const step = (s, c) => { k += 1; g.push(s.replace('data-k="?"', 'data-k="' + k + '"')); cap.push(c === undefined ? null : c); };
  const arrow = (d, attrs, c) => step('<g class="a" data-k="?" ' + (attrs || '') + '><path class="arrow" pathLength="1" d="' + d + '"/></g>', c);
  const weeks = [[35, 27, null], [36, 38, '+41 %'], [37, 55, '+45 %'], [38, 77, '+40 %'], [39, 88, null], [40, 94, null], [41, 92, null], [42, 85, null], [43, 94, null]];
  const X = (i) => 420 + i * 95, Y = (v) => Math.round(540 - v * 3.4);
  const pt = (i) => { const [w, v, var_] = weeks[i]; const red = w === 38; return '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="' + (red ? 9 : 5) + '" fill="' + (red ? 'rgba(255,59,48,.35)' : '#fff') + '"' + (red ? ' stroke="#ff3b30" stroke-width="3" style="filter:drop-shadow(0 0 8px rgba(255,59,48,1))"' : '') + '/><text class="lbl xs" x="' + X(i) + '" y="' + (Y(v) - 16) + '" text-anchor="middle" style="fill:var(--fg);font-size:15px">' + v + '</text>' + (var_ ? '<text class="lbl ' + (red ? 'red' : 'amber') + '" x="' + X(i) + '" y="' + (Y(v) - 40) + '" text-anchor="middle" style="font-size:' + (red ? 22 : 18) + 'px;font-weight:700">' + var_ + '</text>' : ''); };
  const line = (x, y, txt, cls, size) => '<text class="lbl ' + (cls || 's') + '" x="' + x + '" y="' + y + '" style="font-size:' + (size || 17) + 'px">' + txt + '</text>';

  // Le fil entre à la hauteur du premier relevé et arrive au bord du graphique.
  arrow('M-33.3,' + Y(27) + ' L330,' + Y(27), 'data-dur="900" data-d="1000"');
  step('<g class="b" data-k="?" data-d="3000"><rect class="box" x="330" y="120" width="940" height="480" rx="16"/><text class="lbl m" x="800" y="158" text-anchor="middle">Veille · grippe · Sentinelles (Inserm) · France</text><text class="lbl xs" x="800" y="184" text-anchor="middle">cas pour 100 000 · une semaine après l’autre</text>' + weeks.map(([w], i) => '<text class="lbl xs" x="' + X(i) + '" y="574" text-anchor="middle" style="font-size:14px">S' + w + '</text>').join('') + '</g>', 'Chaque semaine, Mission Zero lit les relevés. La grippe, réseau Sentinelles.');
  arrow('M330,' + Y(27) + ' L' + X(0) + ',' + Y(27), 'data-dur="500" data-d="550"');
  step('<g class="b" data-k="?" data-d="1800">' + pt(0) + '</g>', 'Semaine 35&nbsp;: vingt-sept cas pour cent mille.');
  const caps = { 36: 'Semaine 36&nbsp;: <b>plus quarante pour cent.</b> Il compare, il le signale.', 37: 'Semaine 37&nbsp;: encore plus quarante-cinq.', 38: 'Semaine 38&nbsp;: <b class="r">plus quarante pour cent.</b> Trois hausses d’affilée.', 39: 'Ensuite, ça ne bouge plus. Il se tait.' };
  for (let i = 1; i < weeks.length; i++) {
    const [w, v] = weeks[i], [, pv] = weeks[i - 1];
    arrow('M' + X(i - 1) + ',' + Y(pv) + ' L' + X(i) + ',' + Y(v), 'data-dur="' + (w <= 39 ? 700 : 400) + '" data-d="' + (w <= 39 ? 750 : 450) + '"');
    step('<g class="b" data-k="?" data-d="' + (w <= 38 ? 2600 : w === 39 ? 2200 : 500) + '">' + pt(i) + '</g>', caps[w]);
  }
  // Pourquoi : la méthode lue, aucun commentaire publié, il le dit ; cinq centimes ; un humain décide.
  arrow('M' + X(8) + ',' + Y(94) + ' L1290,' + Y(94), 'data-dur="600" data-d="650"');
  step('<g class="b" data-k="?" data-d="4200"><rect class="box gold" x="1285" y="120" width="300" height="300" rx="16"/><text class="lbl acc" x="1435" y="158" text-anchor="middle" style="font-size:21px">S38 · +40 % · pourquoi ?</text>' + line(1305, 206, '✔ méthode lue · 3 sources citées', 'okt') + line(1305, 244, '✔ commentaire publié : aucun', 'okt') + line(1305, 272, 'il le dit, il n’invente pas', 's') + line(1305, 318, '0,05 $ · note 9/10', 's') + '<text class="lbl" x="1435" y="380" text-anchor="middle" style="font-size:21px;font-weight:700">un humain décide</text></g>', 'Pourquoi&nbsp;? Il cite la méthode. Aucun commentaire publié&nbsp;: <b>il le dit.</b> Un humain décide.');
  // Confrontation : les régions, la même semaine.
  arrow('M1435,420 L1435,458', 'data-dur="500" data-d="550"');
  step('<g class="b" data-k="?" data-d="4200"><rect class="box ok" x="1285" y="460" width="300" height="310" rx="16"/><text class="lbl acc" x="1435" y="498" text-anchor="middle" style="font-size:21px">S38 · les régions</text>' + line(1305, 536, '8 régions en hausse, même semaine', 'xs', 16) + line(1305, 576, 'Grand Est · 18 → 50 · +178 %', 's', 15) + line(1305, 606, 'Pays de la Loire · 25 → 59 · +136 %', 's', 15) + line(1305, 636, 'Normandie · 42 → 78 · +86 %', 's', 15) + line(1305, 666, 'Auvergne-Rhône-Alpes · 37 → 68 · +84 %', 's', 15) + line(1305, 708, 'Sentinelles régions · vérifié ✔', 'okt', 15) + '<text class="lbl amber" x="1435" y="748" text-anchor="middle" style="font-size:18px;font-weight:700">la hausse est confirmée</text></g>', 'Les régions confirment&nbsp;: huit en hausse, la même semaine.');
  step('<g class="b" data-k="?" data-d="3000"><text class="lbl amber" x="800" y="700" text-anchor="middle" style="font-size:30px">On sait soigner. Reste à chercher.</text></g>', '<b>On sait soigner. Reste à chercher.</b>');
  arrow('M1435,770 L1435,810 L1633.3,810', 'data-dur="900" data-d="950" data-round="30"');
  const sec = '  <section class="scene" id="sM">\n    <header><h2>LA MÉDECINE</h2><span class="t">une vraie mission de Mission Zero</span></header>\n    <svg viewBox="0 0 1600 900" role="img" aria-label="La veille : le fil dessine neuf semaines de grippe, signale trois hausses, explique pourquoi, confronte aux régions">\n      ' + g.join('\n      ') + '\n    </svg>\n    <div class="caption" id="cM"></div>\n  </section>\n';
  return { sec, cap };
})();

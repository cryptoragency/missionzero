// LA MÉDECINE, en deux temps (gérant, 31 octobre : « pas un graphique, montrer que ça aide les chercheurs à prouver des
// métriques et des variations selon des facteurs »).
// 1. La veille (raccourcie de moitié) : Mission Zero valide les données du web. Données réelles : OMS FluNet (GISRS),
//    détections de grippe déclarées chaque semaine par ~190 pays, lues sur l'API publique le 30 octobre 2026 et rejouées par
//    le mode veille (seuil 10 %) : C:\gui\mission-zero\watch\flunet-grippe-monde\report-2026-W*.md.
// 2. La preuve par facteur : « le stress fait-il varier le cancer ? ». Un facteur par ligne, sa variation mesurée, sa page.
//    Chiffres lus sur les pages le 31 octobre 2026, rien d'autre :
//    - stress au travail : BMJ 2013 (Heikkilä et al.), 116 056 Européens, suivi médian 12 ans, 5 700 cancers, HR 0,97
//      (0,90 à 1,04) : aucun lien ; https://www.bmj.com/content/346/bmj.f165
//    - stress psychologique : Nat Clin Pract Oncol 2008 (Chida et al.), 165 études : incidence plus élevée (P = 0,005),
//      330 études : survie moins bonne, 53 études : mortalité plus élevée ; « evidence of publication bias, results should be
//      interpreted with caution » ; https://pubmed.ncbi.nlm.nih.gov/18493231/
//    - hormones du stress : Cancer Cell 2024 (He, Egeblad et al., CSHL, 22 février 2024), souris, glucocorticoïdes →
//      neutrophiles → NETs, « up to a fourfold increase in metastasis » ; https://www.cshl.edu/?p=68688
//    - couper le facteur : Clin Cancer Res 2020 (Hiller et al.), 60 patientes, propranolol 7 jours avant l'opération,
//      gènes mésenchymateux (pro-métastase) en baisse (P = 0,002), « phase III nécessaire » ; doi 10.1158/1078-0432.CCR-19-2641
module.exports = (function () {
  let k = 0; const g = [], cap = [];
  const step = (s, c) => { k += 1; g.push(s.replace('data-k="?"', 'data-k="' + k + '"')); cap.push(c === undefined ? null : c); };
  const arrow = (d, attrs, c) => step('<g class="a" data-k="?" ' + (attrs || '') + '><path class="arrow" pathLength="1" d="' + d + '"/></g>', c);
  const ghost = (d, attrs, c) => step('<g class="a" data-k="?" ' + (attrs || '') + '><path class="arrow ghost" pathLength="1" d="' + d + '"/></g>', c);
  const line = (x, y, txt, cls, size, anchor, extra) => '<text class="lbl ' + (cls || 's') + '" x="' + x + '" y="' + y + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + ' style="font-size:' + (size || 17) + 'px' + (extra || '') + '">' + txt + '</text>';

  // ── 1. La veille, raccourcie : le fil dessine la courbe, seules les variations signalées s'écrivent. ──
  const weeks = [[34, 9298, null], [35, 9959, null], [36, 11268, '+13 %'], [37, 12277, null], [38, 12562, null], [39, 13028, null], [40, 15201, '+17 %'], [41, 15860, null], [42, 15963, null]];
  const X = (i) => 150 + i * 100, Y = (v) => Math.round(500 - ((v - 8000) / 9000) * 300);
  const pt = (i) => { const [w, v, var_] = weeks[i]; const hot = !!var_; return '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="' + (hot ? 8 : 5) + '" fill="' + (hot ? 'rgba(255,59,48,.35)' : '#fff') + '"' + (hot ? ' stroke="#ff3b30" stroke-width="3" style="filter:drop-shadow(0 0 8px rgba(255,59,48,.9))"' : '') + '/>' + (hot ? line(X(i), Y(v) - 22, var_, 'red', 24, 'middle', ';font-weight:700') : ''); };
  g.push('<g id="flu">');
  arrow('M-33.3,' + Y(9298) + ' L60,' + Y(9298), 'data-dur="700" data-d="800"');
  step('<g class="b" data-k="?" data-d="2600"><rect class="box" x="60" y="120" width="980" height="440" rx="16"/><text class="lbl" x="550" y="162" text-anchor="middle" style="font-size:27px">Veille · grippe · OMS FluNet · monde</text><text class="lbl s" x="550" y="194" text-anchor="middle" style="font-size:20px">détections positives par semaine · 190 pays</text>' + weeks.map(([w], i) => '<text class="lbl xs" x="' + X(i) + '" y="540" text-anchor="middle" style="font-size:18px">S' + w + '</text>').join('') + '</g>', 'Chaque semaine, Mission Zero lit les relevés de l’OMS. La grippe, dans le monde, cent quatre-vingt-dix pays.');
  arrow('M60,' + Y(9298) + ' L' + X(0) + ',' + Y(9298), 'data-dur="500" data-d="550"');
  step('<g class="b" data-k="?" data-d="1400">' + pt(0) + '</g>', 'Semaine 34&nbsp;: le premier relevé.');
  const caps = { 35: 'Il compare à la semaine d’avant. Rien d’assez grand&nbsp;: il se tait.', 36: 'Semaine 36&nbsp;: <b>plus treize pour cent.</b> Il le signale.', 40: 'Semaine 40&nbsp;: <b>plus dix-sept.</b> Il le signale.' };
  for (let i = 1; i < weeks.length; i++) {
    const [w, v, var_] = weeks[i], [, pv] = weeks[i - 1];
    arrow('M' + X(i - 1) + ',' + Y(pv) + ' L' + X(i) + ',' + Y(v), 'data-dur="' + (var_ || caps[w] ? 600 : 350) + '" data-d="' + (var_ || caps[w] ? 650 : 400) + '"');
    step('<g class="b" data-k="?" data-d="' + (var_ ? 2000 : caps[w] ? 1600 : 350) + '">' + pt(i) + '</g>', caps[w]);
  }
  // À droite : ce qu'il fait, tel que le rapport l'écrit.
  arrow('M' + X(8) + ',' + Y(15963) + ' L1080,' + Y(15963), 'data-dur="500" data-d="550"');
  step('<g class="b" data-k="?" data-d="3000"><rect class="box gold" x="1080" y="120" width="460" height="440" rx="16"/><text class="lbl acc" x="1310" y="166" text-anchor="middle" style="font-size:26px">chaque semaine, il</text>' + line(1110, 236, 'lit la source · 190 pays', 'okt', 24) + line(1110, 290, 'compare à la semaine d’avant', 'okt', 24) + line(1110, 344, 'signale ce qui bouge', 'okt', 24) + line(1110, 398, 'n’invente rien · pas lu ? il le dit', 's', 22) + '<text class="lbl" x="1310" y="500" text-anchor="middle" style="font-size:30px;font-weight:700">un humain décide</text></g>', 'Il lit, il compare, il signale. Il ne tranche pas&nbsp;: <b>un humain décide.</b>');
  step('<g class="b" data-k="?" data-d="2600"><text class="lbl xs" x="0" y="0"> </text></g>', '<b>Valider le web, c’est le premier pas.</b> Le chercheur veut plus&nbsp;: prouver qu’une métrique varie selon des facteurs.');
  g.push('</g>');

  // ── 2. La preuve par facteur : la veille s'efface, le fil descend le long des lignes, une par facteur. ──
  const SX = 40, TOP = 150;
  ghost('M1080,' + Y(15963) + ' Q560,' + (Y(15963) - 40) + ' ' + SX + ',' + TOP, 'data-dur="1100" data-d="1200" data-hide="#flu"', '<b>Nouvelle mission.</b> Le stress fait-il varier le cancer&nbsp;?');
  step('<g class="b" data-k="?" data-d="2600">' + line(800, 128, 'Le chercheur demande : le stress fait-il varier le cancer ?', 'fg', 30, 'middle', ';font-weight:700;fill:var(--fg)') + line(800, 164, 'Mission Zero lit les études. Un facteur par ligne : sa variation mesurée, la page qui le prouve.', 's', 20, 'middle') + '</g>', 'Un facteur par ligne&nbsp;: sa variation mesurée, et la page qui le prouve.');
  const rows = [
    { f: 'Stress au travail', sub: '116 056 Européens · 12 ans · 5 700 cancers', v: 'risque 0,97 · aucun lien', vc: 'ok', src: 'BMJ 2013',
      c1: 'Stress au travail&nbsp;: 116 000 Européens, douze ans. Risque 0,97&nbsp;: aucun lien. <b>Il écarte le facteur.</b>' },
    { f: 'Stress psychologique', sub: 'détresse, dépression · 165 études, 330 sur la survie', v: 'hausse mesurée · biais de publication', vc: 'next', src: 'Nat Clin Pract Oncol 2008',
      c1: 'Stress psychologique&nbsp;: des centaines d’études mesurent une hausse. La page dit «&nbsp;biais de publication, prudence&nbsp;»&nbsp;: <b>il le recopie, il ne gonfle rien.</b>' },
    { f: 'Hormones du stress', sub: 'souris · glucocorticoïdes · neutrophiles', v: 'métastases jusqu’à ×4', vc: 'ko', src: 'Cancer Cell 2024',
      c1: 'Les hormones du stress&nbsp;: chez la souris, jusqu’à <b class="r">quatre fois plus</b> de métastases. <b>Le mécanisme est prouvé.</b>' },
    { f: '« Un vaccin contre le stress ? »', sub: 'propranolol 7 jours avant l’opération · 60 patientes', v: 'marqueurs de métastase en baisse', vc: 'ok', src: 'Clin Cancer Res 2020',
      c1: '«&nbsp;Un vaccin contre le stress&nbsp;?&nbsp;» Il cherche ce qui coupe le facteur&nbsp;: un bêta-bloquant, sept jours avant l’opération. <b>Les marqueurs de métastase baissent.</b>',
      c2: 'Prouvé sur des marqueurs, pas encore sur la survie&nbsp;: <b>il demande un essai de phase III.</b> Il ne tranche pas.' },
  ];
  const RY = (i) => 215 + i * 130, H = 118;
  let prevY = TOP;
  rows.forEach((r, i) => {
    const y = RY(i), m = y + 59;
    arrow('M' + SX + ',' + prevY + ' L' + SX + ',' + m, 'data-dur="450" data-d="500"'); prevY = m;
    arrow('M' + SX + ',' + m + ' L70,' + m, 'data-dur="300" data-d="350"');
    step('<g class="b" data-k="?" data-d="1500"><rect class="box" x="70" y="' + y + '" width="1470" height="' + H + '" rx="16"/>' + line(100, y + 50, r.f, 'fg', 27, null, ';font-weight:700;fill:var(--fg)') + line(100, y + 83, r.sub, 's', 19) + '</g>');
    arrow('M640,' + m + ' L690,' + m, 'data-dur="300" data-d="350"');
    step('<g class="b" data-k="?" data-d="' + (r.c2 ? 3600 : 3400) + '"><rect class="chip ' + r.vc + '" x="690" y="' + (m - 25) + '" width="400" height="50" rx="25"/>' + line(890, m + 8, r.v, 'fg', 21, 'middle', ';font-weight:700;fill:var(--fg)') + '</g>', r.c1);
    arrow('M1090,' + m + ' L1120,' + m, 'data-dur="250" data-d="300"');
    step('<g class="b" data-k="?" data-d="' + (r.c2 ? 3000 : 1300) + '"><rect class="chip" x="1120" y="' + (m - 25) + '" width="390" height="50" rx="25"/>' + line(1315, m + 7, r.src, 'okt', 18, 'middle') + '</g>', r.c2);
  });
  step('<g class="b" data-k="?" data-d="3400">' + line(800, 772, 'un facteur écarté · un facteur mesuré · un mécanisme prouvé · une piste prouvée', 'acc', 27, 'middle', ';font-weight:700') + line(800, 806, 'chaque chiffre a sa page · un humain décide', 's', 20, 'middle') + '</g>', '<b>Un facteur écarté, un facteur mesuré, une piste prouvée.</b> Chaque chiffre a sa page.');
  arrow('M1510,' + (RY(3) + 59) + ' L1560,' + (RY(3) + 59) + ' L1560,700 L1633.3,700', 'data-dur="800" data-d="850"');
  const sec = '  <section class="scene" id="sM">\n    <header><h2>LA MÉDECINE</h2><span class="t">une vraie mission de Mission Zero</span></header>\n    <svg viewBox="0 0 1600 900" role="img" aria-label="La médecine : la veille mondiale de la grippe (OMS FluNet) validée semaine après semaine, puis la preuve par facteur : le stress fait-il varier le cancer ? un facteur par ligne, sa variation mesurée, sa page vérifiée">\n      ' + g.join('\n      ') + '\n    </svg>\n    <div class="caption" id="cM"></div>\n  </section>\n';
  return { sec, cap };
})();

// La boucle selon le gérant (30 octobre, 3e version) :
// 1. la flèche va de rond en rond sur un cercle parfait, sans jamais traverser un rond ; à chaque rond : il apparaît, la
//    flèche se divise et finit le rond, zoom pour lire, retour à la normale, la flèche repart ;
// 2. après Leçons, la flèche revient sur Objectif : le tour est complet, « Preuve » au centre, puis « OBJECTIF VALIDÉ » ;
// 3. une nouvelle boucle, rien au milieu ; Évaluation devient rouge : à ce moment seulement, la preuve est rayée d'une
//    croix rouge, « preuve refusée » ;
// 4. on applique les corrections : le point repasse vite sur les ronds déjà verts (ils se revalident), Évaluation
//    redevient vert, et « OBJECTIF PROUVÉ » ;
// 5. toute la boucle rétrécit jusqu'à ne laisser qu'un point blanc, qui repart vers l'écran suivant.
const CX = 800, CY = 420, R = 190, r = 58;
const names = ['Objectif', 'Hypothèses', 'Actions', 'Évaluation', 'Leçons'];
const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / 5;
const delta = Math.acos(1 - (r * r) / (2 * R * R));
const P = (a, rad = R) => ({ x: CX + rad * Math.cos(a), y: CY + rad * Math.sin(a) });
const f = (v) => Math.round(v * 100) / 100;
const pt = (p) => `${f(p.x)},${f(p.y)}`;
const centers = names.map((_, i) => P(ang(i)));
const arrive = (i) => P(ang(i) - delta), leave = (i) => P(ang(i) + delta);
// Les deux arcs autour d'un rond, de l'arrivée à la sortie : exactement le rond (extérieur puis intérieur).
const split = (a, b) => [`M${pt(a)} A${r},${r} 0 1,1 ${pt(b)}`, `M${pt(a)} A${r},${r} 0 0,0 ${pt(b)}`];
let k = 0, g = [];
const step = (s) => { k += 1; g.push(s.replace('data-k="?"', `data-k="${k}"`)); return k; };
const blank = (attrs, d) => step(`<g class="b" data-k="?" ${attrs} data-d="${d}"><text class="lbl xs" x="0" y="0"> </text></g>`);

step(`<g class="b" data-k="?" data-d="2800"><text class="lbl acc" x="800" y="80" text-anchor="middle" style="font-size:56px;letter-spacing:.04em">MISSION ZERO</text><text class="lbl s" x="800" y="118" text-anchor="middle" style="font-size:22px">un objectif, aucun plan, et l'ordre de prouver</text></g>`);
g.push('<g id="loop">');
// 1. Du titre au sommet d'Objectif, puis rond par rond.
step(`<g class="a" data-k="?" data-d="900" data-dur="800"><path class="arrow" pathLength="1" d="M800,150 L800,${f(centers[0].y - r)}"/></g>`);
for (let i = 0; i < 5; i++) {
  const c = centers[i], a = i === 0 ? { x: c.x, y: c.y - r } : arrive(i), b = leave(i);
  const [s1, s2] = i === 0 ? [`M${pt(a)} A${r},${r} 0 0,1 ${pt(b)}`, `M${pt(a)} A${r},${r} 0 1,0 ${pt(b)}`] : split(a, b);
  step(`<g class="rg" data-k="?" id="g${i + 1}" data-ring="o${i + 1}" data-d="450" style="transform-origin:${f(c.x)}px ${f(c.y)}px"><circle class="ring" id="o${i + 1}" cx="${f(c.x)}" cy="${f(c.y)}" r="${r}"/><text class="lbl m" x="${f(c.x)}" y="${f(c.y + 7)}" text-anchor="middle">${names[i]}</text><g class="a" data-k="${k + 1}" data-d="750" data-dur="650"><path class="arrow split" pathLength="1" d="${s1}"/><path class="arrow split" pathLength="1" d="${s2}"/></g></g>`); k += 1;
  blank(`data-zoom2="g${i + 1}"`, 1400);
  blank(`data-unzoom="g${i + 1}"`, 400);
  const next = i < 4 ? arrive(i + 1) : arrive(0);
  step(`<g class="a" data-k="?" data-d="900" data-dur="800"><path class="arrow" pathLength="1" d="M${pt(b)} A${R},${R} 0 0,1 ${pt(next)}"/></g>`);
}
// 2. Retour sur Objectif : le tour est complet. « Preuve » au centre, puis OBJECTIF VALIDÉ.
blank(`data-pulse="o1:strong"`, 900);
step(`<g class="rg" data-k="?" id="gp" data-d="1600" style="transform-origin:800px 420px"><text class="lbl m acc" x="800" y="430" text-anchor="middle" style="font-size:30px">Preuve</text></g>`);
step(`<g class="rg" data-k="?" id="gv" data-hide="#gp" data-d="2400" style="transform-origin:800px 420px"><text class="lbl acc" x="800" y="412" text-anchor="middle" style="font-size:34px;letter-spacing:.06em">OBJECTIF</text><text class="lbl acc" x="800" y="452" text-anchor="middle" style="font-size:34px;letter-spacing:.06em">VALIDÉ</text></g>`);
// 3. Une nouvelle boucle, rien au milieu. Évaluation devient rouge : la preuve est rayée, « preuve refusée ».
blank(`data-hide="#gv"`, 300);
step(`<g class="a" data-k="?" data-d="60" data-dur="2400"><path class="arrow orbit ghost" pathLength="1" d="M${pt(centers[0])} A${R},${R} 0 1,1 ${pt(P(Math.PI / 2))} A${R},${R} 0 1,1 ${pt(centers[0])}"/></g>`);
blank(`data-pulse="o1"`, 480); blank(`data-pulse="o2"`, 480); blank(`data-pulse="o3"`, 480);
step(`<g class="b" data-k="?" id="rf" data-ring="o4:bad" data-blink="o4" data-d="1500"><text class="lbl red" x="688" y="662" text-anchor="middle" style="font-size:20px">un contrôle échoue</text></g>`);
step(`<g class="rg" data-k="?" id="gx" data-d="2400" style="transform-origin:800px 420px"><text class="lbl m" x="800" y="430" text-anchor="middle" style="font-size:30px;fill:#8c95a8">Preuve</text><line x1="748" y1="404" x2="852" y2="438" stroke="#ff6b61" stroke-width="7" stroke-linecap="round"/><line x1="852" y1="404" x2="748" y2="438" stroke="#ff6b61" stroke-width="7" stroke-linecap="round"/><text class="lbl red" x="800" y="478" text-anchor="middle" style="font-size:22px;font-weight:700">preuve refusée</text></g>`);
// 4. On applique les corrections : le point repasse vite sur les ronds verts, qui se revalident ; Évaluation redevient vert ; OBJECTIF PROUVÉ.
step(`<g class="a" data-k="?" data-d="60" data-dur="2600"><path class="arrow orbit ghost" pathLength="1" d="M${pt(centers[0])} A${R},${R} 0 1,1 ${pt(P(Math.PI / 2))} A${R},${R} 0 1,1 ${pt(centers[0])}"/></g>`);
blank(`data-pulse="o1" data-hide="#rf"`, 520); blank(`data-pulse="o2"`, 520); blank(`data-pulse="o3"`, 520);
step(`<g class="b" data-k="?" data-ring="o4:lit" data-pulse="o4:strong" data-d="700"><text class="lbl okt" x="688" y="662" text-anchor="middle" style="font-size:20px">corrigé</text></g>`);
blank(`data-pulse="o5"`, 520);
step(`<g class="rg" data-k="?" id="gv2" data-hide="#gx" data-pulse="o1:strong" data-d="2600" style="transform-origin:800px 420px"><text class="lbl acc" x="800" y="412" text-anchor="middle" style="font-size:34px;letter-spacing:.06em">OBJECTIF</text><text class="lbl acc" x="800" y="452" text-anchor="middle" style="font-size:34px;letter-spacing:.06em">PROUVÉ</text></g>`);
g.push('</g>');
// 5. La boucle rétrécit jusqu'au point blanc, qui repart vers l'écran suivant.
blank(`data-shrink="loop"`, 1100);
step(`<g class="b" data-k="?" id="dotc" data-d="500"><circle cx="800" cy="420" r="9" fill="#fff" style="filter:drop-shadow(0 0 8px rgba(46,230,160,.9))"/></g>`);
step(`<g class="a" data-k="?" data-d="1300" data-dur="1200" data-hide="#dotc"><path class="arrow" pathLength="1" d="M800,420 C800,600 880,735 1150,735"/></g>`);
step(`<g class="b" data-k="?" data-d="2000"><text class="lbl amber" x="1175" y="745" style="font-size:30px">Où l'envoyer ?</text></g>`);
step(`<g class="a" data-k="?" data-d="900" data-dur="800"><path class="arrow" pathLength="1" d="M1395,760 C1470,768 1540,770 1600,770"/></g>`);

const s0 = `  <section class="scene" id="s0">
    <header><h2>1 · LA BOUCLE</h2><span class="t">ouverture</span></header>
    <svg viewBox="0 0 1600 900" role="img" aria-label="La boucle de Mission Zero">
      ${g.join('\n      ')}
    </svg>
    <div class="caption" id="c0"></div>
  </section>
`;
const cap = ['<b>Mission Zero.</b> Un objectif, et l’ordre de prouver.', null];
['Objectif.', 'Hypothèses.', 'Actions.', 'Évaluation.', 'Leçons.'].forEach(function (w) { cap.push(null, null, w, null, null); });
cap.push('Le tour est complet.', 'La <b>preuve</b>&nbsp;: la citation exacte, sur la page.', '<b>Objectif validé.</b>',
  'Une nouvelle mission.', null, null, null, null, 'Un contrôle échoue&nbsp;: pas de preuve.', '<b>Preuve refusée.</b> Il se refuse lui-même.',
  '<b>Il applique les corrections</b>, et repasse sur chaque contrôle.', null, null, null, 'Évaluation&nbsp;: corrigé.', null, '<b>Objectif prouvé.</b>',
  null, null, null, '<b>Où l’envoyer&nbsp;?</b>', null);
module.exports = { s0, cap, steps: k };
if (require.main === module) console.log('steps', k, 'captions', cap.length);

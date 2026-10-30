// La boucle selon le gérant (30 octobre, 3e version) :
// 1. la flèche va de rond en rond sur un cercle parfait, sans jamais traverser un rond ; à chaque rond : il apparaît, la
//    flèche se divise et finit le rond, zoom pour lire, retour à la normale, la flèche repart ;
// 2. après Leçons, la flèche revient sur Objectif : le tour est complet, « Preuve » au centre, puis « OBJECTIF VALIDÉ » ;
// 3. une nouvelle boucle, rien au milieu ; Évaluation devient rouge : à ce moment seulement, la preuve est rayée d'une
//    croix rouge, « preuve refusée » ;
// 4. on applique les corrections : le point repasse vite sur les ronds déjà verts (ils se revalident), Évaluation
//    redevient vert, et « OBJECTIF PROUVÉ » ;
// 5. toute la boucle rétrécit jusqu'à ne laisser qu'un point blanc, qui repart vers l'écran suivant.
const CX = 800, CY = 420, R = 190, r = 64;
const names = ['Objectif', 'Hypothèses', 'Action', 'Observation', 'Évaluation'];
const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / 5;
const P = (a, rad = R) => ({ x: CX + rad * Math.cos(a), y: CY + rad * Math.sin(a) });
const f = (v) => Math.round(v * 100) / 100;
const pt = (p) => `${f(p.x)},${f(p.y)}`;
const centers = names.map((_, i) => P(ang(i)));
// Le fil va au plus court : d'un rond au suivant, sur la ligne des centres, du bord au bord (rien entre deux ronds voisins).
const edge = (i, j) => { const c = centers[i], d = centers[(j + 5) % 5], L = Math.hypot(d.x - c.x, d.y - c.y); return { x: c.x + (r * (d.x - c.x)) / L, y: c.y + (r * (d.y - c.y)) / L }; };
const th = (i, p) => Math.atan2(p.y - centers[i].y, p.x - centers[i].x);
const norm = (v) => ((v % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
// Les deux arcs autour d'un rond, de l'arrivée à la sortie : le fil se divise et fait le tour complet du rond.
const split = (i, a, b) => { const d = norm(th(i, b) - th(i, a)); return [`M${pt(a)} A${r},${r} 0 ${d > Math.PI ? 1 : 0},1 ${pt(b)}`, `M${pt(a)} A${r},${r} 0 ${2 * Math.PI - d > Math.PI ? 1 : 0},0 ${pt(b)}`]; };
// Le petit arc (côté intérieur) d'un rond : le chemin du point quand il repasse vite sur les ronds déjà verts.
const shortArc = (i, a, b) => { const d = norm(th(i, b) - th(i, a)); return d <= Math.PI ? { d: `A${r},${r} 0 0,1 ${pt(b)}`, len: r * d } : { d: `A${r},${r} 0 0,0 ${pt(b)}`, len: r * (2 * Math.PI - d) }; };
// Un passage rapide sur le fil déjà tracé : arcs et cordes enchaînés, avec l'instant (fraction du trajet) où le point est
// au milieu de chaque rond, pour que la surbrillance tombe pile à son passage.
const pass = (rings, last) => {
  let d = '', len = 0; const at = [];
  rings.forEach((i, n) => {
    const a = edge(i, i - 1), b = edge(i, i + 1);
    if (n === 0) d += `M${pt(a)}`;
    const s = shortArc(i, a, b); at.push([i, len + s.len / 2]); d += ' ' + s.d; len += s.len;
    const nx = n < rings.length - 1 ? rings[n + 1] : last; const e = edge(nx, i);
    d += ` L${pt(e)}`; len += Math.hypot(e.x - b.x, e.y - b.y);
  });
  return { d, at: at.map(([i, l]) => [i, l / len]) };
};
const pulses = (list) => list.map(([i, t]) => `o${i + 1}@${t.toFixed(3)}`).join(',');
let k = 0, g = [];
const step = (s) => { k += 1; g.push(s.replace('data-k="?"', `data-k="${k}"`)); return k; };
const blank = (attrs, d) => step(`<g class="b" data-k="?" ${attrs} data-d="${d}"><text class="lbl xs" x="0" y="0"> </text></g>`);

step(`<g class="b" data-k="?" data-d="2800"><text class="lbl acc" x="800" y="80" text-anchor="middle" style="font-size:56px;letter-spacing:.04em">MISSION ZERO</text><text class="lbl s" x="800" y="118" text-anchor="middle" style="font-size:22px">un objectif, aucun plan et l'ordre de prouver</text></g>`);
g.push('<g id="loop">');
// 1. Du titre au sommet d'Objectif, puis rond par rond.
step(`<g class="a" data-k="?" data-d="900" data-dur="800"><path class="arrow" pathLength="1" d="M800,140 L800,${f(centers[0].y - r)}"/></g>`);
for (let i = 0; i < 5; i++) {
  const c = centers[i], a = i === 0 ? { x: c.x, y: c.y - r } : edge(i, i - 1), b = edge(i, i + 1);
  const [s1, s2] = split(i, a, b);
  // Le zoom : le rond vient au centre, x3,4, au premier plan (il passe en dernier dans le dessin), le reste s'efface.
  const zx = f(CX - c.x), zy = f(CY - c.y);
  step(`<g class="rg" data-k="?" id="g${i + 1}" data-ring="o${i + 1}" data-d="450" style="transform-origin:${f(c.x)}px ${f(c.y)}px;--zx:${zx}px;--zy:${zy}px"><circle class="ring" id="o${i + 1}" cx="${f(c.x)}" cy="${f(c.y)}" r="${r}"/><text class="lbl m" x="${f(c.x)}" y="${f(c.y + 6)}" text-anchor="middle" style="font-size:18px">${names[i]}</text><g class="a" data-k="${k + 1}" data-d="420" data-dur="360"><path class="arrow split" pathLength="1" d="${s1}"/><path class="arrow split" pathLength="1" d="${s2}"/></g></g>`); k += 1;
  blank(`data-zoom2="g${i + 1}"`, 2400);
  blank(`data-unzoom="g${i + 1}"`, 550);
  const j = (i + 1) % 5, e = edge(j, i);
  step(`<g class="a" data-k="?" data-d="900" data-dur="800"><path class="arrow" pathLength="1" d="M${pt(b)} L${pt(e)}"/></g>`);
}
// 2. Retour sur Objectif : le tour est complet. « Preuve » au centre, puis OBJECTIF VALIDÉ.
blank(`data-pulse="o1:strong"`, 900);
step(`<g class="rg" data-k="?" id="gp" data-d="1600" style="transform-origin:800px 420px"><text class="lbl m acc" x="800" y="430" text-anchor="middle" style="font-size:30px">Preuve</text></g>`);
step(`<g class="rg" data-k="?" id="gv" data-hide="#gp" data-d="2400" style="transform-origin:800px 420px"><text class="lbl acc" x="800" y="412" text-anchor="middle" style="font-size:34px;letter-spacing:.06em">OBJECTIF</text><text class="lbl acc" x="800" y="452" text-anchor="middle" style="font-size:34px;letter-spacing:.06em">VALIDÉ</text></g>`);
// 3. Une nouvelle boucle, rien au milieu. Le point repasse sur le fil déjà tracé ; Évaluation devient rouge, son contour
//    clignote (l'alerte) ; à ce moment seulement, la preuve est rayée, « preuve refusée ».
const A = pass([0, 1, 2], 3), B = pass([3, 4], 0);
const below = `x="${f(centers[3].x)}" y="${f(centers[3].y + r + 32)}"`;
blank(`data-hide="#gv"`, 400);
step(`<g class="a" data-k="?" data-d="1900" data-dur="1800" data-pulses="${pulses(A.at)}"><path class="arrow ghost" pathLength="1" d="${A.d}"/></g>`);
step(`<g class="a" data-k="?" data-d="1300" data-dur="1200" data-pulses="${pulses(B.at)}"><path class="arrow ghost" pathLength="1" d="${B.d}"/></g>`);
step(`<g class="rg" data-k="?" id="gx" data-blink="gxt" data-d="2800" style="transform-origin:800px 420px"><text class="lbl m" x="800" y="406" text-anchor="middle" style="font-size:30px;fill:#8c95a8">Preuve</text><line x1="748" y1="380" x2="852" y2="414" stroke="#ff6b61" stroke-width="7" stroke-linecap="round"/><line x1="852" y1="380" x2="748" y2="414" stroke="#ff6b61" stroke-width="7" stroke-linecap="round"/><text class="lbl red" id="gxt" x="800" y="450" text-anchor="middle" style="font-size:24px;font-weight:700">preuve refusée</text><text class="lbl red" id="gxs" x="800" y="478" text-anchor="middle" style="font-size:19px">une citation ne tient pas</text></g>`);
// 4. On applique les corrections : le point repasse vite sur les ronds verts, qui se revalident ; Évaluation redevient vert ; OBJECTIF PROUVÉ.
step(`<g class="a" data-k="?" data-d="1500" data-dur="1400" data-pulses="${pulses(A.at)}"><path class="arrow ghost" pathLength="1" d="${A.d}"/></g>`);
step(`<g class="b" data-k="?" id="rc" data-hide="#gxs" data-d="1600"><text class="lbl okt" x="800" y="478" text-anchor="middle" style="font-size:22px">il relit la page, réécrit dans ses mots</text></g>`);
step(`<g class="a" data-k="?" data-d="1100" data-dur="1000" data-pulses="${pulses(B.at)}"><path class="arrow ghost" pathLength="1" d="${B.d}"/></g>`);
step(`<g class="rg" data-k="?" id="gv2" data-hide="#gx,#rc" data-pulse="o1:strong" data-d="2600" style="transform-origin:800px 420px"><text class="lbl acc" x="800" y="412" text-anchor="middle" style="font-size:34px;letter-spacing:.06em">OBJECTIF</text><text class="lbl acc" x="800" y="452" text-anchor="middle" style="font-size:34px;letter-spacing:.06em">PROUVÉ</text></g>`);
g.push('</g>');
// 5. La boucle rétrécit jusqu'au point blanc, qui repart vers l'écran suivant.
step(`<g class="b" data-k="?" id="dotc" data-shrink="loop" data-d="1100"><circle cx="800" cy="420" r="9" fill="#fff" style="filter:drop-shadow(0 0 8px rgba(46,230,160,.9))"/></g>`);
blank(``, 500);
step(`<g class="a" data-k="?" data-d="1300" data-dur="1200" data-hide="#dotc"><path class="arrow" pathLength="1" d="M800,420 C960,420 1040,488 1160,488"/></g>`);
step(`<g class="b" data-k="?" data-d="2000"><text class="lbl amber" x="1175" y="498" style="font-size:30px">Où l'envoyer ?</text></g>`);
step(`<g class="a" data-k="?" data-d="900" data-dur="800"><path class="arrow" pathLength="1" d="M1395,488 L1600,488"/></g>`);

const s0 = `  <section class="scene" id="s0">
    <header><h2>1 · LA BOUCLE</h2><span class="t">ouverture</span></header>
    <svg viewBox="0 0 1600 900" role="img" aria-label="La boucle de Mission Zero">
      ${g.join('\n      ')}
    </svg>
    <div class="caption" id="c0"></div>
  </section>
`;
const cap = ['<b>Mission Zero.</b> Un objectif et l’ordre de prouver.', null];
['Un objectif. Aucun plan.', 'Des hypothèses.', 'Une action&nbsp;: chercher, lire une page entière.', 'Ce qu’il observe.', 'Il s’évalue&nbsp;: une note, une leçon, un pivot.'].forEach(function (w) { cap.push(null, null, w, null, null); });
cap.push('Il tourne jusqu’à atteindre l’objectif.', 'La <b>preuve</b>&nbsp;: chaque page citée est relue, citation exacte exigée.', '<b>Objectif validé.</b>',
  'Une nouvelle mission.', null, null, '<b class="r">Preuve refusée.</b> Une citation ne tient pas. Il se refuse lui-même.',
  '<b>Il relit la page</b> et réécrit dans ses mots, ou retire.', 'La preuve tient.', null, '<b>Objectif prouvé.</b> Jugé, le meilleur survit.',
  null, null, null, '<b>Où l’envoyer&nbsp;?</b>', null);
module.exports = { s0, cap, steps: k };
if (require.main === module) console.log('steps', k, 'captions', cap.length);

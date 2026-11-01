// Ouvre le film de dev sur un écran noir plein cadre (gérant 31/10 : l'intro 3D finit sur 1 s de noir, le film commence
// sur le même noir, puis la première scène apparaît). Sur une COPIE : video/film-v4-dev-noir.html.
// Ne touche ni build-v4.cjs ni film-v4-dev.html (une autre session les tient). Intégration dans build-v4.cjs quand elle a
// fini : la ligne de style, le <div id="noir"> avant .wrap, et le voile au lancement de film().
//   node video/build/noir.cjs
const fs = require('fs');
const src = __dirname + '/../film-v4-dev.html', out = __dirname + '/../film-v4-dev-noir.html';
let h = fs.readFileSync(src, 'utf8');
const r = (a, b) => { if (!h.includes(a)) throw new Error('ancrage absent : ' + a.slice(0, 70)); h = h.replace(a, b); };
// 1. Le voile noir : au-dessus de tout, plein écran, dès le chargement.
r('</style>', '#noir { position:fixed; inset:0; background:#000; z-index:9999; opacity:1; pointer-events:none; transition: opacity 1.2s ease; } #noir.leve { opacity:0; }\n</style>');
r('<div class="wrap">', '<div id="noir"></div>\n<div class="wrap">');
// 2. Au lancement du film (auto=1 ou clic sur « lancer ») : 1 s de noir, puis le voile se lève sur la première scène.
r('  function film(from) {\n    stopAll(); t0 = Date.now();', "  function film(from) {\n    var voile = document.getElementById('noir'); if (voile) { voile.classList.remove('leve'); setTimeout(function () { voile.classList.add('leve'); }, 1000); }\n    stopAll(); t0 = Date.now();");
// 3. À l'ouverture, le film DÉMARRE tout seul (gérant 31/10 : « c'est noir et tu commences ») : 1 s de noir, puis le voile se lève sur la première scène.
r("  if (q.get('auto')) film(0); else { document.body.classList.add('film'); show('s0'); }", "  film(0);");
r('<title>Mission Zero · le film · DEV</title>', '<title>Mission Zero · le film · DEV · ouverture sur le noir</title>');
fs.writeFileSync(out, h);
console.log(out, h.length, 'octets');

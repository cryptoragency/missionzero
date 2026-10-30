// Assemble video/film-v3.html : le modèle du 29 octobre (styles, boucle, écran des choix, moteur flèches + point), raccourci
// à une minute avec le script du 30 (phrases courtes), sans aucun cadre, et une scène « sécurité » condensée.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../schemas.html', 'utf8');
const style = src.slice(src.indexOf('<style>'), src.indexOf('</style>') + 8);
// La boucle, selon le gérant (30 octobre) : un fil de flèches continu ; le point passe sur les ronds, qui s'allument au passage
// (une simple surbrillance, rien de plus) ; un arrêt pour marquer l'événement (Évaluation clignote en rouge : l'alerte est prise
// en compte) ; puis le point refait le tour vite sur les ronds déjà verts, et sur Évaluation le contour se rallume : validé. On poursuit.
const geo = require('./s0-geo.cjs'); const s0 = geo.s0;
// L'écran des choix : les douze bulles, puis la flèche vers la sécurité (premier voyage).
let sB = src.slice(src.indexOf('<section class="scene" id="sB">'), src.indexOf('<section class="scene" id="sM">'));
sB = sB.replace('d="M0 882 L660 882 L660 600 L734 518"', 'd="M0,880 C420,880 640,760 640,548"');
sB = sB.replace(/\s*<g class="(a|b)" data-k="\d+" data-pass="[^"]+"[^]*?<\/g>(?=\n)/g, '');
sB = sB.replace('<g class="b" data-k="15" data-d="2600"><text class="lbl s" x="800" y="836" text-anchor="middle" style="font-size:20px">Tout vient de données accessibles gratuitement. Une source payante ? Il demande, vous fixez le budget, il la paie et la cite.</text></g>',
  '<g class="b" data-k="15" data-d="1800"><text class="lbl s" x="800" y="836" text-anchor="middle" style="font-size:20px">Tout vient de données gratuites.</text></g>\n      <g class="a" data-k="16" data-zoom="#bS"><path class="arrow" pathLength="1" d="M702 450 L372 450"/></g>\n      <g class="b" data-k="17" data-d="2400"><text class="lbl amber" x="800" y="70" text-anchor="middle" style="font-size:26px">Premier voyage : la sécurité d\'un site.</text></g>');
sB = sB.replace('<div class="bar"><button data-play="sB">▶ Rejouer</button><button data-all="sB">Tout afficher</button></div>', '');
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
const pick = (id, next) => { let x = src.slice(src.indexOf('<section class="scene" id="' + id + '">'), src.indexOf('<section class="scene" id="' + next + '">')); var i = x.indexOf("<div class=\"bar\">"); if (i >= 0) { var j = x.indexOf("</div>", i) + 7; x = x.slice(0, i) + x.slice(j); } return x; };
const titled = (sec, label, cls, sub) => { var o = sec.indexOf('<svg viewBox="0 0 1600 900"'); var oe = sec.indexOf('>', o) + 1; var ce = sec.indexOf('</svg>', oe); var head = '<text class="lbl ' + cls + '" x="800" y="40" text-anchor="middle" style="font-size:26px;letter-spacing:.2em;font-weight:700">' + label + '</text>' + (sub ? '<text class="lbl s" x="800" y="70" text-anchor="middle" style="font-size:20px;letter-spacing:.08em">' + sub + '</text>' : ''); return sec.slice(0, oe) + head + '<g transform="translate(' + (sub ? '40,84) scale(0.95)' : '32,56) scale(0.96)') + '">' + sec.slice(oe, ce) + '</g>' + sec.slice(ce); };
const s1 = titled(pick('s1', 's2'), 'SANS MISSION ZERO', 'red'), s2 = titled(pick('s2', 's3'), 'AVEC MISSION ZERO', 'acc'), s3 = titled((function (x) { var i = x.indexOf('<g class="b" data-k="19"><text class="lbl acc" x="800" y="822"'); if (i < 0) return x; var j = x.indexOf('</g>', i) + 4; return x.slice(0, i) + x.slice(j); })(pick('s3', 'sE')), 'EXEMPLE D’UTILISATION AVEC MISSION ZERO', 'acc', 'MYTHOZOR ARGUS · surveillance cybersécurité');
const CAP = {
  s0: geo.cap,
  sB: ['Le point arrive. La boucle attend un objectif.', 'Même boucle, zéro code.', 'L\'espace…', 'la médecine…', 'un chiffre de l\'INSEE…', 'une norme…', 'une loi…', 'une décision de justice…', 'un appel d\'offres…', 'un rapport annuel…', 'un brevet…', 'la sécurité d\'un site…', 'une norme produit…', 'votre métier.', 'Tout vient de données gratuites.', null, '<b>D\'abord, la sécurité d\'un site.</b>'],
  s1: ['Une boutique en ligne. Elle tourne.', 'Les commandes tombent.', null, 'Tout va bien.', 'Conforme. Aujourd’hui.', 'Une équipe : une personne, souvent.', 'Une faille : aucun en-tête de sécurité.', 'Rouge.', 'Elle corrige à la main.', 'Corrigé.', 'Vert.', 'Une autre : le prix changé par le client.', 'Rouge.', 'Elle corrige, le soir.', 'Corrigé.', 'Vert.', 'Deux de plus : la carte bancaire en clair…', '…et une bibliothèque de 2012.', 'Rouge.', 'Pas le temps. Pas le budget.', 'Une cinquième. Elle restera ouverte.', 'Rouge.', '<b>8 sites sur 10 restent exposés.</b> La seule question, c’est quand.'],
  s2: ['Le même site, ses cinq failles.', null, 'Un scanner les liste. N’importe lequel.', null, '<b>Mission Zero part de zéro.</b> Une copie du site, et l’ordre de prouver.', null, 'Un premier correctif, sur une copie.', null, 'Contrôle 1 : les tests du client. Vert.', null, 'Contrôle 2 : le scanner. Vert.', null, 'Contrôle 3 : il regarde la page…', '…le formulaire a perdu ses champs. <b>Rouge.</b>', null, '<b>Refusé</b>, par lui-même.', null, 'Un second correctif. Le rouge disparaît.', 'Contrôles 1 et 2 : toujours verts.', null, 'Regard : vert.', null, 'Relecture : la cause, pas le symptôme. Vert.', null, 'Réserves : rien à cacher. Vert.', null, 'Cinq verts : <b>confirmé</b>. Patch, preuves, journal haché. Un humain applique.', 'Il part de zéro, se refuse, et confirme. Seul.'],
  s3: ['Chez vous. Rien ne sort.', 'Votre site, sur votre serveur.', '<b>MYTHOZOR ARGUS</b> surveille, jour et nuit.', null, null, null, null, null, null, 'Tout est vert.', 'Une nouvelle faille. ARGUS la voit. Rouge.', null, '<b>Mission Zero</b> la prend. Copie, correctif, cinq contrôles, patch.', null, 'Vous validez d’un clic. Ou en automatique.', null, 'ARGUS vérifie à nouveau.', 'Rouge repassé au vert. Sans vous réveiller.'],
};
const script = `<script>
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg', XLINK = 'http://www.w3.org/1999/xlink';
  var CAP = ${JSON.stringify(CAP)};
  var timers = {}, SPEED = { s1: 0.65, s2: 0.65, s3: 0.65 };
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
  var n = 0;
  document.querySelectorAll('.a .arrow').forEach(function (p) {
    n += 1; p.id = p.id || 'p' + n;
    var orbit = p.classList.contains('orbit'), dur = Math.round((Number(p.parentNode.dataset.dur) || (orbit ? 4000 : 1000)) * speedOf(p));
    var c = document.createElementNS(SVGNS, 'circle'); c.setAttribute('r', '8'); c.setAttribute('class', 'runner');
    var m = document.createElementNS(SVGNS, 'animateMotion'); m.setAttribute('dur', dur + 'ms'); m.setAttribute('begin', 'indefinite'); m.setAttribute('fill', 'freeze');
    var mp = document.createElementNS(SVGNS, 'mpath'); mp.setAttributeNS(XLINK, 'xlink:href', '#' + p.id); mp.setAttribute('href', '#' + p.id);
    m.appendChild(mp); c.appendChild(m); p.parentNode.appendChild(c);
    p.style.transitionDuration = dur + 'ms'; p.parentNode.dataset.dur = dur;
  });
  function act(step) {
    (step.dataset.hide || '').split(',').filter(Boolean).forEach(function (h) { document.querySelector(h).classList.add('hidden'); });
    (step.dataset.ring || '').split(',').filter(Boolean).forEach(function (r) { var id = r.split(':')[0], mode = r.split(':')[1] || 'lit'; var el = document.getElementById(id); el.classList.remove('lit', 'bad'); if (mode !== 'off') el.classList.add(mode); });
    if (step.dataset.shrink) { var sh = document.getElementById(step.dataset.shrink); if (sh) sh.classList.add('shrink'); }
    if (step.dataset.zoom2) { var zz = document.getElementById(step.dataset.zoom2); if (zz) zz.classList.add('zoom'); }
    if (step.dataset.unzoom) { var uz = document.getElementById(step.dataset.unzoom); if (uz) uz.classList.remove('zoom'); }
    (step.dataset.chip || '').split(',').filter(Boolean).forEach(function (r) { var id = r.split(':')[0], mode = r.split(':')[1] || 'ok'; var el = document.getElementById(id); if (el) { el.classList.remove('ok', 'ko'); el.classList.add(mode); } });
    (step.dataset.gone || '').split(',').filter(Boolean).forEach(function (id) { document.getElementById(id).classList.add('gone'); });
    // Surbrillance au passage (pulse, ou pulse:strong pour une revalidation) ; clignotement d'une alerte prise en compte.
    (step.dataset.pulse || '').split(',').filter(Boolean).forEach(function (r) { var id = r.split(':')[0], strong = r.split(':')[1] === 'strong'; var el = document.getElementById(id); if (!el) return; el.classList.remove('pulse', 'strong'); void el.getBBox(); el.classList.add('pulse'); if (strong) el.classList.add('strong'); setTimeout(function () { el.classList.remove('pulse', 'strong'); }, strong ? 1300 : 700); });
    (step.dataset.blink || '').split(',').filter(Boolean).forEach(function (id) { var el = document.getElementById(id); if (!el) return; el.classList.remove('blink'); void el.getBBox(); el.classList.add('blink'); setTimeout(function () { el.classList.remove('blink'); }, 2600); });
    if (step.dataset.zoom) { var z = document.querySelector(step.dataset.zoom); if (z) setTimeout(function () { z.classList.add('zoom'); }, 900); }
  }
  function fire(step) {
    if (step.classList.contains('a')) { step.querySelectorAll('.arrow').forEach(function (p) { p.style.transition = 'none'; p.style.strokeDashoffset = '1'; void p.getBoundingClientRect(); p.style.transition = ''; p.style.strokeDashoffset = ''; }); void step.getBoundingClientRect(); }
    step.classList.add('on'); act(step);
    if (step.classList.contains('a')) {
      var dur = Number(step.dataset.dur) || 1000;
      step.querySelectorAll('.runner').forEach(function (c) { c.classList.add('go'); var m = c.querySelector('animateMotion'); try { m.beginElement(); } catch (e) {} setTimeout(function () { c.classList.remove('go'); }, dur + 50); });
      setTimeout(function () { step.classList.add('drawn'); }, dur);
    }
  }
  function reset(id) {
    steps(id).forEach(function (s) { s.classList.remove('on', 'drawn', 'focus', 'hidden', 'zoom'); });
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
    (function next() { if (k >= list.length) { if (done) timers[id] = setTimeout(done, 1800); return; } var s = list[k]; k += 1; fire(s); caption(id, k); var d = Math.round((Number(s.dataset.d) || (s.classList.contains('a') ? 1100 : 1300)) * speedOf(s)); timers[id] = setTimeout(next, d); })();
  }
  function all(id) { clearTimeout(timers[id]); reset(id); var list = steps(id); list.forEach(function (s) { s.classList.add('on', 'drawn'); act(s); if (s.querySelector('.orbit')) fire(s); }); caption(id, list.length); }
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
.ring.bad.blink, .chip.ko.blink, .lbl.red.blink { animation: blink .5s steps(2, start) 5; }
@keyframes blink { to { opacity:.25; } }
.arrow.ghost { stroke:none; }
.rg { opacity:0; transition: opacity .35s, transform .3s; transform-box: view-box; } .rg.on { opacity:1; }
.rg.zoom { transform: scale(1.28); } .rg.zoom .ring { stroke-width:5; filter: drop-shadow(0 0 12px rgba(46,230,160,.9)); }
.a.drawn .arrow.split { marker-end:none; }
/* La boucle entière rétrécit jusqu'au point blanc. */
#loop { transform-box: view-box; transform-origin: 800px 420px; transition: transform 1s cubic-bezier(.4,0,.2,1), opacity 1s; }
#loop.shrink { transform: scale(0.01); opacity: 0; }
</style>
<div class="wrap">
  <h1>Mission Zero, le film · une minute <small>Le modèle du 29 octobre, raccourci : des phrases courtes, les flèches qui se dessinent, le point qui court devant, chaque élément qui apparaît et reste. Voix française (le fondateur), sous-titres anglais incrustés au montage.</small></h1>
  <div class="filmbar"><button class="big" id="go">▶ Lancer le film</button><button data-ch="s0">1 · La boucle</button><button data-ch="sB">· Où l'envoyer ?</button><button data-ch="s1">2 · Constat</button><button data-ch="s2">3 · Correction</button><button data-ch="s3">4 · MYTHOZOR ARGUS</button><button id="grid">Voir tous les schémas</button><span id="clock" style="color:var(--mut)"></span></div>
${s0}
${sB}
${s1}
${s2}
${s3}
</div>
${script}
</html>
`;
fs.writeFileSync(__dirname + '/../film-v4.html', html);
console.log('film-v4.html', html.length, 'octets; s0 steps:', (s0.match(/data-k=/g) || []).length, 'sB steps:', (sB.match(/data-k=/g) || []).length, 's1 steps:', (s1.match(/data-k=/g) || []).length);

// L'ESPACE, selon l'image annotée du gérant (30 octobre, 20 h 07) : tout l'espace du cadre. Le titre de fin en haut à gauche
// (il remplace le compteur, un seul bloc), Hercule en bas à gauche, la galaxie au centre, le Grand Attracteur en haut à
// droite : un escalier qui monte vers la droite. Grandes écritures, aucune donnée de validation (pas de « vérifié ✔ ») :
// la source seule, en toutes lettres. Le fil ne revient jamais en arrière.
module.exports = (function () {
  let k = 0; const g = [], cap = [];
  const step = (s, c) => { k += 1; g.push(s.replace('data-k="?"', 'data-k="' + k + '"')); cap.push(c === undefined ? null : c); };
  const arrow = (d, attrs, c) => step('<g class="a" data-k="?" ' + (attrs || '') + '><path class="arrow" pathLength="1" d="' + d + '"/></g>', c);
  const row = (x, y, txt, ok, label) => '<text class="lbl" x="' + x + '" y="' + y + '" style="font-size:23px;font-weight:400">' + txt + '</text><rect class="chip ' + (ok ? 'ok' : 'ko') + '" x="' + (x + 470) + '" y="' + (y - 25) + '" width="180" height="38" rx="19"/><text class="chip-t" x="' + (x + 560) + '" y="' + (y + 2) + '" text-anchor="middle" style="font-size:19px">' + label + '</text>';
  g.push('<g id="stars"></g>');
  step('<g class="b" data-k="?" id="q0" data-stars="1" data-d="2600"><text class="lbl acc" x="800" y="96" text-anchor="middle" style="font-size:36px">« On va quelque part ? » · deux fois</text></g>', 'On va quelque part&nbsp;? Posée deux fois.');
  g.push('<g id="vs">');
  arrow('M-33.3,450 L58,450', 'data-dur="900" data-d="1000"');
  step('<g class="b" data-k="?" data-d="3400"><rect class="box red" x="60" y="150" width="700" height="500" rx="16"/><text class="lbl red" x="410" y="200" text-anchor="middle" style="font-size:28px;letter-spacing:.08em">SANS MISSION ZERO</text><text class="lbl s" x="410" y="238" text-anchor="middle" style="font-size:22px">12 chiffres · 1 centime · 20 secondes</text>'
    + row(90, 304, 'Hercule, 19,7 km/s · 1981', false, 'sans adresse') + row(90, 364, '3 vitesses au centième · 2010', false, 'injoignable')
    + row(90, 424, 'la galaxie · 2014', true, 'lisible') + row(90, 484, '600 km/s, Grand Attracteur', false, 'injoignable')
    + row(90, 544, 'le fond du ciel · 2020', false, 'injoignable') + '</g>', 'Le modèle seul&nbsp;: <span class="r">douze chiffres, un centime.</span>');
  step('<g class="b" data-k="?" data-d="3000"><text class="lbl amber" x="410" y="616" text-anchor="middle" style="font-size:24px">4 sources sur 5 · introuvables</text></g>', 'Quatre sources sur cinq, introuvables.');
  arrow('M760,450 L838,450', 'data-dur="700" data-d="800"');
  step('<g class="b" data-k="?" data-d="3800"><rect class="box ok" x="840" y="150" width="700" height="500" rx="16"/><text class="lbl acc" x="1190" y="200" text-anchor="middle" style="font-size:28px;letter-spacing:.08em">AVEC MISSION ZERO</text><text class="lbl s" x="1190" y="238" text-anchor="middle" style="font-size:22px">4 chiffres · 1 dollar · chacun sa page</text>'
    + row(870, 304, 'Hercule, 20 km/s · Maryland', true, 'lisible') + row(870, 364, '230 km/s · NASA', true, 'lisible')
    + row(870, 424, '369 km/s · Cambridge', true, 'lisible') + row(870, 484, '631 km/s · Nature, 2014', true, 'lisible')
    + '<text class="lbl okt" x="1190" y="616" text-anchor="middle" style="font-size:24px">pas lu ? il le dit</text></g>', '<b>Mission Zero</b>&nbsp;: quatre chiffres, un dollar. Chacun avec sa page.');
  g.push('</g>');
  // Les panneaux s'effacent ; le fil descend de là où il est, puis file vers Hercule, en bas à gauche.
  arrow('M838,450 L838,605 L480,605', 'data-hide="#vs,#q0" data-dur="1300" data-d="1400" data-round="40"');
  const box = (x, y, title, speed, src) => '<rect class="box gold" x="' + x + '" y="' + y + '" width="420" height="170" rx="16"/><text class="lbl acc" x="' + (x + 210) + '" y="' + (y + 46) + '" text-anchor="middle" style="font-size:23px">' + title + '</text><text class="lbl" x="' + (x + 210) + '" y="' + (y + 104) + '" text-anchor="middle" style="font-size:44px;font-weight:700">' + speed + '</text><text class="lbl okt" x="' + (x + 210) + '" y="' + (y + 146) + '" text-anchor="middle" style="font-size:20px">' + src + '</text>';
  step('<g class="b" data-k="?" data-speed="20" data-d="3800"><g id="spd"><text class="lbl s" x="60" y="100" style="font-size:22px">déplacement du système solaire</text><text class="lbl" x="60" y="178" style="font-size:72px;font-weight:800" id="speed">0</text><text class="lbl s" x="60" y="214" style="font-size:22px">km/s</text></g>' + box(60, 520, 'Le système solaire va vers Hercule', '20 km/s', 'Université du Maryland') + '</g>', '<b>Le système solaire se déplace.</b> Vingt kilomètres par seconde vers Hercule.');
  arrow('M270,520 L270,365 L560,365', 'data-dur="1100" data-d="1150" data-round="40"');
  step('<g class="b" data-k="?" data-speed="230" data-d="3800">' + box(560, 280, 'Il tourne autour de la galaxie', '230 km/s', 'NASA, mot pour mot') + '</g>', 'Il tourne autour de la galaxie&nbsp;: deux cent trente. La NASA, mot pour mot.');
  arrow('M770,280 L770,195 L1100,195', 'data-dur="1100" data-d="1150" data-round="40"');
  step('<g class="b" data-k="?" data-speed="631" data-d="3400">' + box(1100, 110, 'Vers le Grand Attracteur', '631 km/s', 'Nature, 2014') + '</g>', 'Avec la galaxie, six cent trente et un vers le Grand Attracteur.');
  step('<g class="b" data-k="?" data-d="3400"><text class="lbl amber" x="1310" y="330" text-anchor="middle" style="font-size:26px">caché derrière notre galaxie</text><text class="lbl s" x="1310" y="364" text-anchor="middle" style="font-size:21px">on y va, on ne le voit pas</text></g>', 'Caché derrière notre galaxie. On y va. On ne le voit pas.');
  step('<g class="b" data-k="?" data-d="3000"><text class="lbl xs" x="0" y="0"> </text></g>', 'Mesuré, pas vu, pas tranché. <b>Il n’invente pas la suite.</b>');
  // Un seul bloc de fin, en haut à gauche : le compteur s'efface, le titre porte le chiffre.
  step('<g class="b" data-k="?" data-rush="1" data-hide="#spd" data-d="4600"><text class="lbl acc" x="60" y="120" style="font-size:36px;font-weight:700">Le système solaire se déplace</text><text class="lbl" x="60" y="168" style="font-size:26px">vers quelque chose que personne n’a vu</text></g>', 'Vous allez à <b>six cent trente et un kilomètres par seconde</b> vers quelque chose que personne n’a vu.');
  arrow('M1520,195 L1560,195 L1560,450 L1633.3,450', 'data-dur="1000" data-d="1050" data-round="40"');
  const sec = '  <section class="scene" id="sE">\n    <header><h2>L’ESPACE</h2><span class="t">une vraie mission de Mission Zero</span></header>\n    <svg viewBox="0 0 1600 900" role="img" aria-label="La même question posée deux fois, puis un ciel d’étoiles, un compteur qui monte, un fil qui va de boîte en boîte : le système solaire vers Hercule, autour de la galaxie, vers le Grand Attracteur ; chaque chiffre avec sa page">\n      ' + g.join('\n      ') + '\n    </svg>\n    <div class="caption" id="cE"></div>\n  </section>\n';
  return { sec, cap };
})();

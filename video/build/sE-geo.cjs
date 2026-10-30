// L'ESPACE, selon les images annotées du gérant (30 octobre, 19 h 34 et 19 h 36) : plus de fil qui repart en arrière vers
// Hercule (le fil descend tout droit de là où il est), et un seul bloc de fin : le compteur et le titre fusionnés en haut
// (« 631 km/s » n'est plus écrit deux fois). Même question posée deux fois, panneau rouge, panneau vert, puis les étoiles,
// le compteur, les trois boîtes (Hercule, la galaxie, le Grand Attracteur) en escalier vers la droite, sortie à droite à y = 450.
module.exports = (function () {
  let k = 0; const g = [], cap = [];
  const step = (s, c) => { k += 1; g.push(s.replace('data-k="?"', 'data-k="' + k + '"')); cap.push(c === undefined ? null : c); };
  const arrow = (d, attrs, c) => step('<g class="a" data-k="?" ' + (attrs || '') + '><path class="arrow" pathLength="1" d="' + d + '"/></g>', c);
  const row = (x, y, txt, ok, label) => '<text class="lbl" x="' + x + '" y="' + y + '" style="font-size:20px;font-weight:400">' + txt + '</text><rect class="chip ' + (ok ? 'ok' : 'ko') + '" x="' + (x + 470) + '" y="' + (y - 23) + '" width="160" height="34" rx="17"/><text class="chip-t" x="' + (x + 550) + '" y="' + (y + 1) + '" text-anchor="middle" style="font-size:17px">' + label + '</text>';
  g.push('<g id="stars"></g>');
  step('<g class="b" data-k="?" id="q0" data-stars="1" data-d="2600"><text class="lbl acc" x="800" y="80" text-anchor="middle" style="font-size:34px">« On va quelque part ? » · deux fois</text></g>', 'On va quelque part&nbsp;? Posée deux fois.');
  g.push('<g id="vs">');
  arrow('M-33.3,450 L58,450', 'data-dur="900" data-d="1000"');
  step('<g class="b" data-k="?" data-d="3400"><rect class="box red" x="60" y="150" width="700" height="500" rx="16"/><text class="lbl m red" x="410" y="196" text-anchor="middle">SANS MISSION ZERO</text><text class="lbl s" x="410" y="230" text-anchor="middle" style="font-size:20px">12 chiffres · 1 centime · 20 secondes</text>'
    + row(90, 300, 'Hercule, 19,7 km/s · 1981', false, 'sans adresse') + row(90, 360, '3 vitesses au centième · 2010', false, 'injoignable')
    + row(90, 420, 'la galaxie · 2014', true, 'vérifié ✔') + row(90, 480, '600 km/s vers le Grand Attracteur', false, 'injoignable')
    + row(90, 540, 'le fond du ciel · 2020', false, 'injoignable') + '</g>', 'Le modèle seul&nbsp;: <span class="r">douze chiffres, un centime.</span>');
  step('<g class="b" data-k="?" data-d="3000"><text class="lbl amber" x="410" y="612" text-anchor="middle" style="font-size:22px">4 sources sur 5 · introuvables</text></g>', 'Quatre sources sur cinq, introuvables.');
  arrow('M760,450 L838,450', 'data-dur="700" data-d="800"');
  step('<g class="b" data-k="?" data-d="3800"><rect class="box ok" x="840" y="150" width="700" height="500" rx="16"/><text class="lbl m acc" x="1190" y="196" text-anchor="middle">AVEC MISSION ZERO</text><text class="lbl s" x="1190" y="230" text-anchor="middle" style="font-size:20px">4 chiffres · 1 dollar · chacun sa page</text>'
    + row(870, 300, 'Hercule, 20 km/s · Maryland', true, 'vérifié ✔') + row(870, 360, '230 km/s · NASA', true, 'vérifié ✔')
    + row(870, 420, '369 km/s · Cambridge', true, 'vérifié ✔') + row(870, 480, '631 km/s · Tully, 2014', true, 'vérifié ✔')
    + '<text class="lbl okt" x="1190" y="612" text-anchor="middle" style="font-size:22px">pas lu ? il le dit</text></g>', '<b>Mission Zero</b>&nbsp;: quatre chiffres, un dollar. Chacun avec sa page.');
  g.push('</g>');
  // Les panneaux s'effacent ; le fil descend tout droit, de là où il est, sur la boîte Hercule.
  arrow('M838,450 L838,598', 'data-hide="#vs,#q0" data-dur="900" data-d="1000"');
  const box = (x, y, title, speed, q1, src) => '<rect class="box gold" x="' + x + '" y="' + y + '" width="400" height="150" rx="16"/><text class="lbl acc" x="' + (x + 200) + '" y="' + (y + 36) + '" text-anchor="middle" style="font-size:19px">' + title + '</text><text class="lbl" x="' + (x + 200) + '" y="' + (y + 74) + '" text-anchor="middle" style="font-size:30px">' + speed + '</text><text class="lbl xs" x="' + (x + 200) + '" y="' + (y + 104) + '" text-anchor="middle">' + q1 + '</text><text class="lbl xs okt" x="' + (x + 200) + '" y="' + (y + 132) + '" text-anchor="middle">' + src + '</text>';
  step('<g class="b" data-k="?" data-speed="20" data-d="3800"><g id="spd"><text class="lbl s" x="60" y="170" style="font-size:20px">déplacement du système solaire</text><text class="lbl" x="60" y="240" style="font-size:64px;font-weight:800" id="speed">0</text><text class="lbl s" x="60" y="276" style="font-size:20px">km/s</text></g>' + box(640, 600, 'Le système solaire va vers Hercule', '20 km/s', '« toward which the Sun is moving »', 'Maryland · vérifié ✔') + '</g>', '<b>Le système solaire se déplace.</b> Vingt kilomètres par seconde vers Hercule.');
  arrow('M1040,675 L1180,675 L1180,572', 'data-dur="1000" data-d="1050" data-round="40"');
  step('<g class="b" data-k="?" data-speed="230" data-d="3800">' + box(1100, 420, 'Il tourne autour de la galaxie', '230 km/s', '« an average velocity of 828,000 km/hr »', 'NASA · vérifié ✔') + '</g>', 'Il tourne autour de la galaxie&nbsp;: deux cent trente. La NASA, mot pour mot.');
  arrow('M1300,420 L1300,362', 'data-dur="700" data-d="750"');
  step('<g class="b" data-k="?" data-speed="631" data-d="3400">' + box(1100, 210, 'Avec la galaxie, vers le Grand Attracteur', '631 km/s', '« motion of the Local Group of 631 km/s »', 'Nature 2014 · vérifié ✔') + '</g>', 'Avec la galaxie, six cent trente et un vers le Grand Attracteur.');
  step('<g class="b" data-k="?" data-d="3400"><text class="lbl amber" x="1070" y="280" text-anchor="end" style="font-size:22px">caché derrière notre galaxie</text><text class="lbl xs" x="1070" y="308" text-anchor="end">on y va, on ne le voit pas</text></g>', 'Caché derrière notre galaxie. On y va. On ne le voit pas.');
  step('<g class="b" data-k="?" data-d="3000"><text class="lbl" x="800" y="860" text-anchor="middle" style="font-size:26px">Mesuré, pas vu, pas tranché.</text></g>', 'Mesuré, pas vu, pas tranché. <b>Il n’invente pas la suite.</b>');
  // Un seul bloc de fin, en haut : le compteur s'efface, le titre porte le chiffre.
  step('<g class="b" data-k="?" data-rush="1" data-hide="#spd" data-d="4600"><text class="lbl acc" x="800" y="66" text-anchor="middle" style="font-size:34px;font-weight:700">Le système solaire se déplace</text><text class="lbl" x="800" y="132" text-anchor="middle" style="font-size:60px;font-weight:800">631 km/s</text><text class="lbl" x="800" y="174" text-anchor="middle" style="font-size:24px">vers quelque chose que personne n’a vu</text></g>', 'Vous allez à <b>six cent trente et un kilomètres par seconde</b> vers quelque chose que personne n’a vu.');
  arrow('M1500,285 L1560,285 L1560,450 L1633.3,450', 'data-dur="1000" data-d="1050" data-round="40"');
  const sec = '  <section class="scene" id="sE">\n    <header><h2>L’ESPACE</h2><span class="t">une vraie mission de Mission Zero</span></header>\n    <svg viewBox="0 0 1600 900" role="img" aria-label="La même question posée deux fois, puis un ciel d’étoiles, un compteur qui monte, un fil qui va de boîte en boîte : le système solaire vers Hercule, autour de la galaxie, vers le Grand Attracteur ; chaque chiffre avec sa page">\n      ' + g.join('\n      ') + '\n    </svg>\n    <div class="caption" id="cE"></div>\n  </section>\n';
  return { sec, cap };
})();

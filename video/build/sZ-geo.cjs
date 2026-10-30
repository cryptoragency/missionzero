// LA FIN, selon l'image annotée du gérant (30 octobre, 19 h 31) : « MISSION ZERO » passe en haut. Le fil entre à la hauteur
// où la médecine l'a laissé, dessine le zéro, le point se pose au centre ; silence ; noir ; le point écrit
// « WHAT DO YOU NEED ? », puis « CRYPTOR.AGENCY », puis remonte écrire « MISSION ZERO » en néon, en dernier.
module.exports = (function () {
  let k = 0; const g = [], cap = [];
  const step = (s) => { k += 1; g.push(s.replace('data-k="?"', 'data-k="' + k + '"')); cap.push(null); };
  const hand = (id, y, size, weight, spacing, cls, txt, delay) => '<text id="' + id + '" class="hand' + (cls ? ' ' + cls : '') + '" x="800" y="' + y + '" text-anchor="middle" style="font-size:' + size + 'px;font-weight:' + weight + ';letter-spacing:' + spacing + '">' + txt.split('').map((ch, i) => '<tspan style="transition-delay:' + (i * delay).toFixed(2) + 's">' + (ch === ' ' ? ' ' : ch) + '</tspan>').join('') + '</text>';
  step('<g class="a" data-k="?" id="zin" data-dur="1300" data-d="1400"><path class="arrow" pathLength="1" d="M0,700 C380,700 690,640 690,400"/></g>');
  step('<g class="a" data-k="?" id="zz" data-dur="2200" data-d="2400"><path class="arrow zero" pathLength="1" d="M690,400 A110,110 0 1,1 910,400 A110,110 0 1,1 690,400"/></g>');
  step('<g class="b" data-k="?" id="zdot" data-d="2000"><circle cx="800" cy="400" r="11" fill="#fff" style="filter:drop-shadow(0 0 8px rgba(46,230,160,.9))"/></g>');
  step('<g class="b" data-k="?" data-cls="black" data-hide="#zin,#zz,#zdot" data-d="700"><text class="lbl xs" x="0" y="0"> </text></g>');
  g.push(hand('w3', 300, 58, 800, '.35em', 'neonw', 'MISSION ZERO', 0.14));
  g.push(hand('w1', 470, 120, 900, '.02em', '', 'WHAT DO YOU NEED ?', 0.11));
  g.push(hand('w2', 570, 40, 600, '.3em', '', 'CRYPTOR.AGENCY', 0.09));
  step('<g class="a" data-k="?" data-dur="2100" data-d="2500" data-write="w1"><path class="arrow ghost" pathLength="1" d="M150,478 L1450,478"/></g>');
  step('<g class="a" data-k="?" data-dur="800" data-d="850"><path class="arrow ghost" pathLength="1" d="M1450,478 L1450,530 L560,530 L560,578"/></g>');
  step('<g class="a" data-k="?" data-dur="1300" data-d="1600" data-write="w2"><path class="arrow ghost" pathLength="1" d="M560,578 L1040,578"/></g>');
  step('<g class="a" data-k="?" data-dur="900" data-d="950"><path class="arrow ghost" pathLength="1" d="M1040,578 L1500,578 L1500,308 L450,308"/></g>');
  step('<g class="a" data-k="?" data-dur="1800" data-d="4800" data-write="w3"><path class="arrow ghost" pathLength="1" d="M450,308 L1150,308"/></g>');
  const sec = '  <section class="scene" id="sZ">\n    <header><h2>LA FIN</h2><span class="t">le zéro</span></header>\n    <svg viewBox="0 0 1600 900" role="img" aria-label="Le fil dessine un zéro, puis le point écrit : WHAT DO YOU NEED ? CRYPTOR.AGENCY, et MISSION ZERO en haut.">\n      ' + g.join('\n      ') + '\n    </svg>\n    <div class="caption" id="cZ"></div>\n  </section>\n';
  return { sec, cap };
})();

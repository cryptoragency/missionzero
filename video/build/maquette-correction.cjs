// Maquette FIXE de l'écran « AVEC MISSION ZERO » (correction), selon l'image annotée du gérant (30 octobre, 18 h 35) :
// Correctif n°2 passe sous Mission Zero, au-dessus du contrôle 1 ; les contrôles se lisent 5 · 4 · 3 · 2 · 1 de gauche à droite
// (Parcours, Rescan, Regard, Relecture, Réserves) ; Confirmé passe en bas à gauche ; le fil fait une seule boucle sans se croiser :
// Mission Zero → Correctif n°2 → 1 → 2 → 3 → 4 → 5 → Confirmé → Votre site. Rien n'est touché dans film-v4.html.
// Sortie : C:\gui\mission-zero\video\maquette-correction.html + capture C:\Users\GAME\Desktop\mission-zero-correction-maquette.png
const fs = require('fs'); const path = require('path');
const film = fs.readFileSync(path.join(__dirname, '..', 'film-v4.html'), 'utf8');
const styles = []; let i = 0; while ((i = film.indexOf('<style>', i)) >= 0) { const j = film.indexOf('</style>', i) + 8; styles.push(film.slice(i, j)); i = j; }
const head = '<meta charset="utf-8">' + styles.join(String.fromCharCode(10));
const RY = 470, RR = 70, X = [410, 640, 870, 1100, 1330];
const g = [];
const box = (s) => g.push(`<g class="b">${s}</g>`);
const arrow = (d) => g.push(`<g class="a"><path class="arrow" pathLength="1" d="${d}"/></g>`);
// Rond n à la position i (0 = gauche) : numéro, nom, et sa légende (au-dessus par défaut, ou deux lignes à droite).
const ring = (i, n, name, top, right) => box(`<circle class="ring lit" cx="${X[i]}" cy="${RY}" r="${RR}"/><text class="lbl m" x="${X[i]}" y="${RY - 7}" text-anchor="middle">${n}</text><text class="lbl s" x="${X[i]}" y="${RY + 23}" text-anchor="middle" style="fill:var(--fg)">${name}</text>` +
  (right ? `<text class="lbl s" x="${X[i] + RR + 14}" y="${RY - 6}">${right[0]}</text><text class="lbl s" x="${X[i] + RR + 14}" y="${RY + 18}">${right[1]}</text>` : `<text class="lbl s" x="${X[i]}" y="${RY - RR - 25}" text-anchor="middle">${top}</text>`));
// Ligne du haut : le site (vert, corrigé), le scanner (0 faille), Mission Zero.
box(`<rect class="box ok" x="40" y="40" width="300" height="190" rx="16" style="filter:drop-shadow(0 0 12px rgba(46,230,160,.7))"/><text class="lbl m acc" x="190" y="76" text-anchor="middle">Votre site · 0 faille</text><rect class="tile" x="70" y="96" width="60" height="44" rx="6"/><rect class="tile" x="140" y="96" width="60" height="44" rx="6"/><rect class="tile" x="210" y="96" width="60" height="44" rx="6"/><rect class="chip ok" x="46" y="146" width="288" height="32" rx="16"/><text class="chip-t" x="190" y="167" text-anchor="middle" style="font-size:14.5px;font-weight:700">✔ faille corrigée · en live · automatique</text><text class="lbl xs" x="190" y="210" text-anchor="middle">tel qu'il est, en ligne</text>`);
arrow('M340,135 L420,135');
box(`<rect class="box" x="420" y="40" width="360" height="190" rx="16"/><text class="lbl m" x="600" y="76" text-anchor="middle">Un scanner, n'importe lequel</text><text class="lbl s okt" x="600" y="132" text-anchor="middle">✔ 0 faille</text><text class="lbl xs" x="600" y="190" text-anchor="middle">MYTHOZOR ARGUS, CVE, dépendances : même liste</text>`);
arrow('M780,135 L860,135');
box(`<rect class="box gold" x="860" y="40" width="700" height="190" rx="16"/><text class="lbl acc" x="1210" y="82" text-anchor="middle" style="font-size:30px">Mission Zero part de zéro</text><text class="lbl s" x="1210" y="160" text-anchor="middle" style="font-size:20px">une copie du site, aucun plan, l'ordre de prouver</text>`);
// Mission Zero → Correctif n°2 (sous Mission Zero, au-dessus du contrôle 1) → contrôle 1.
arrow('M1330,230 L1330,262');
box(`<rect class="box gold" x="1200" y="262" width="260" height="96" rx="16"/><text class="lbl acc" x="1330" y="298" text-anchor="middle">Correctif n°2</text><text class="lbl s" x="1330" y="332" text-anchor="middle">refait, sur une copie neuve</text>`);
arrow(`M1330,358 L1330,${RY - RR}`);
// Les cinq contrôles, de droite à gauche : 1 Réserves, 2 Relecture, 3 Regard, 4 Rescan, 5 Parcours.
ring(4, 1, 'Réserves', '', ['écrites,', 'jamais cachées']);
arrow(`M${X[4] - RR},${RY} L${X[3] + RR},${RY}`);
ring(3, 2, 'Relecture', 'cause ou symptôme ?');
arrow(`M${X[3] - RR},${RY} L${X[2] + RR},${RY}`);
ring(2, 3, 'Regard', 'Muse Spark + SAM');
arrow(`M${X[2] - RR},${RY} L${X[1] + RR},${RY}`);
ring(1, 4, 'Rescan', 'la faille a disparu ?');
arrow(`M${X[1] - RR},${RY} L${X[0] + RR},${RY}`);
ring(0, 5, 'Parcours', 'les tests du client');
box(`<text class="lbl xs" x="1215" y="${RY + RR + 32}" text-anchor="middle">1 et 2 rejoués, toujours verts</text>`);
box(`<text class="lbl xs okt" x="870" y="${RY + RR + 32}" text-anchor="middle">page intacte : 5 champs sur 5</text>`);
// Contrôle 5 → Confirmé (en bas à gauche) → Votre site, tout droit, sans rien croiser.
arrow(`M${X[0]},${RY + RR} L${X[0]},600`);
box(`<rect class="box ok" x="60" y="600" width="520" height="130" rx="16"/><text class="lbl acc" x="320" y="642" text-anchor="middle">Confirmé · patch + preuves</text><text class="lbl s" x="320" y="690" text-anchor="middle" style="fill:var(--fg)">un humain applique, ou l'automatique</text>`);
arrow('M130,600 L130,230');

const html = `<!doctype html>
<html lang="fr"><head>${head}
<style>
body { background:var(--bg); margin:0; }
.scene { display:grid !important; border:none; border-radius:0; padding:6px 10px 0; background:transparent; }
.scene header { display:none !important; }
.scene svg { max-height:680px; margin:0 auto; }
.b { opacity:1 !important; animation:none !important; }
.arrow { stroke-dashoffset:0 !important; transition:none !important; }
.caption { min-height:0; text-align:center; }
</style></head>
<body>
  <section class="scene active" id="s2">
    <header><h2>3 · CORRECTION AVEC MISSION ZERO</h2></header>
    <svg viewBox="0 0 1600 900" role="img" aria-label="Maquette fixe de l'écran correction, avec Mission Zero">
      <text class="lbl acc" x="800" y="40" text-anchor="middle" style="font-size:26px;letter-spacing:.2em;font-weight:700">AVEC MISSION ZERO</text>
      <g transform="translate(32,56) scale(0.96)">
      ${g.join('\n      ')}
      </g>
    </svg>
    <div class="caption" id="c2"><b>La faille est corrigée, en live, en automatique.</b> Tout est vert.</div>
  </section>
</body></html>
`;
const out = path.join(__dirname, '..', 'maquette-correction.html');
fs.writeFileSync(out, html);
console.log('écrit', out);

if (process.argv.includes('--png')) {
  const pw = require('C:/gui/cryptor.agency/agence/node_modules/playwright');
  (async () => {
    const b = await pw.chromium.launch({ headless: true }); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    await p.goto('file:///' + out.split(path.sep).join('/')); await p.waitForTimeout(600);
    const png = 'C:/Users/GAME/Desktop/mission-zero-correction-maquette.png';
    await p.locator('#s2').screenshot({ path: png });
    await b.close(); console.log('capture', png);
  })();
}

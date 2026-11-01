// La bille 3D (gérant, 31 octobre) : le point blanc qui court devant le fil devient une vraie bille en relief (three.js, WebGL),
// propre et bien visible, qui roule le long du fil et passe d'un écran au suivant sans jamais disparaître (elle glisse de sa
// dernière position vers le départ du fil suivant). Sans WebGL ou sans réseau, le point blanc en 2D du moteur reste tel quel.
// Inclus par build-v4.cjs avant le moteur du film, pour que three.js soit chargé quand le film démarre (?auto=1).
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

const style = `<style>
/* La bille 3D : une toile WebGL posée par-dessus la page, transparente, qui ne gêne aucun clic. Quand elle tourne, le point 2D s'efface. */
#orb3d { position:fixed; inset:0; width:100%; height:100%; pointer-events:none; z-index:50; }
.orb3d .runner.go { opacity:0 !important; } .orb3d .runner.go ~ .runner.go { opacity:1 !important; r:4px; fill:#fff; } /* le second côté d'un rond : un petit point blanc (gérant, 31 octobre) */ .orb3d #dotc circle { opacity:0; }
</style>`;

const script = `<script src="${THREE_URL}"></script>
<script>
(function () {
  if (!window.THREE || !window.WebGLRenderingContext) return;
  var R_UNITS = 5;             // rayon de la bille dans le repère du dessin (1600 × 900) : réduite de moitié (gérant, 31 octobre : « la mine d'un crayon »)
  var canvas = document.createElement('canvas'); canvas.id = 'orb3d';
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, premultipliedAlpha: true }); } catch (e) { return; }
  renderer.setClearColor(0x000000, 0);
  document.body.appendChild(canvas);
  document.documentElement.classList.add('orb3d');
  var scene = new THREE.Scene();
  var camera = new THREE.OrthographicCamera(0, 1, 0, -1, -2000, 2000); camera.position.z = 1000;
  // La couche 3D prend SA taille affichée, pas celle de la fenêtre : avec une barre de défilement, la fenêtre est plus large
  // que la couche et la bille glissait à gauche du trait (gérant, 31 octobre : « toujours dans l'axe du trait »).
  var cw = 0, ch = 0, cl = 0, ct = 0;
  function size() {
    var rb = canvas.getBoundingClientRect(), W = Math.max(1, rb.width), H = Math.max(1, rb.height); cw = W; ch = H; cl = rb.left; ct = rb.top;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(W, H, false);
    camera.left = 0; camera.right = W; camera.top = 0; camera.bottom = -H; camera.updateProjectionMatrix();
  }
  size(); window.addEventListener('resize', size);
  // La lumière : un jour franc en haut à gauche, un fond doux, un reflet menthe par l'arrière-droite (le rebord s'allume).
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  var sun = new THREE.DirectionalLight(0xffffff, 1.15); sun.position.set(0, 0, 1); scene.add(sun); // de face (gérant, 31 octobre : la bille en plein milieu du trait, rien de décalé)
  var rim = new THREE.PointLight(0x2ee6a0, 1.1, 0, 2); scene.add(rim);
  // La matière : une bille blanche, nacrée, parcourue d'arcs menthe et d'un fil bleu nuit, pour qu'on la voie rouler.
  function skin() {
    var c = document.createElement('canvas'); c.width = 512; c.height = 256; var g = c.getContext('2d');
    g.fillStyle = '#f6f8ff'; g.fillRect(0, 0, 512, 256);
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(46,230,160,.85)'; g.lineWidth = 22;
    g.beginPath(); g.moveTo(-20, 150); g.bezierCurveTo(120, 30, 260, 240, 540, 90); g.stroke();
    g.strokeStyle = 'rgba(46,230,160,.45)'; g.lineWidth = 12;
    g.beginPath(); g.moveTo(-20, 60); g.bezierCurveTo(160, 160, 300, 20, 540, 200); g.stroke();
    g.strokeStyle = 'rgba(45,85,212,.75)'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(-20, 200); g.bezierCurveTo(200, 230, 320, 110, 540, 150); g.stroke();
    var t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t;
  }
  var mat = new THREE.MeshStandardMaterial({ map: skin(), roughness: 0.28, metalness: 0.08, emissive: 0x0f4a36, emissiveIntensity: 0.22, transparent: true, opacity: 0 });
  var ball = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), mat); scene.add(ball);
  // Le halo : un disque menthe dégradé derrière la bille, en lumière additive, comme le halo du point 2D.
  function haloTex() {
    var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d');
    var r = g.createRadialGradient(64, 64, 10, 64, 64, 64); r.addColorStop(0, 'rgba(46,230,160,.5)'); r.addColorStop(0.45, 'rgba(46,230,160,.16)'); r.addColorStop(1, 'rgba(46,230,160,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  }
  var haloMat = new THREE.SpriteMaterial({ map: haloTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
  var halo = new THREE.Sprite(haloMat); scene.add(halo);
  // L'ombre portée : une tache sombre et floue sous la bille, pour qu'elle se détache de la page.
  function shadowTex() {
    var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d');
    var r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  }
  var shadowMat = new THREE.SpriteMaterial({ map: shadowTex(), depthWrite: false, transparent: true, opacity: 0 });
  var shadow = new THREE.Sprite(shadowMat); scene.add(shadow);

  var pos = null, last = null, vis = 0, lastT = 0, idle = 0, radius = 5, dir = { x: 1, y: 0 }; // dir : le sens de la course, pour poser la bille juste devant le trait
  function center(el) { var b = el.getBoundingClientRect(); if (!b.width && !b.height) return null; return { x: b.left + b.width / 2 - cl, y: b.top + b.height / 2 - ct }; }
  function scaleOf(el) { var svg = el.closest('svg'); var b = svg ? svg.getBoundingClientRect() : null; return b && b.width ? b.width / 1600 : 0.8; }
  // Qui suivre : le point 2D qui court (.runner.go) ; sinon le point au centre de la boucle rétrécie ; sinon le dernier suivi.
  function target() {
    var act = document.querySelector('.scene.active');
    if (!act) return null;
    var r = act.querySelector('.runner.go'); if (r) return r;
    var d = act.querySelector('#dotc.on:not(.hidden) circle'); if (d) return d;
    if (last && act.contains(last)) return last;
    return act.querySelector('.runner'); // rien n'a encore couru sur cet écran : le départ de son premier fil
  }
  function fin0() { return !!document.querySelector('.scene.active#sZ'); }
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
    var rb0 = canvas.getBoundingClientRect(); if (Math.abs(rb0.width - cw) > 0.5 || Math.abs(rb0.height - ch) > 0.5 || rb0.left !== cl || rb0.top !== ct) size();
    var body = document.body;
    var want = body.classList.contains('film');
    var el = want ? target() : null; if (el && !el.classList.contains('go') && fin0()) el = null;
    // Jamais éteinte (gérant, 31 octobre). Pendant un zoom elle suit le point 2D du rond agrandi : elle attend sur son bord,
    // au point de sortie, prête à repartir. Quand un fil démarre loin d'elle (l'alerte : d'Observation à Objectif ; un nouvel
    // écran), elle saute directement au départ : pas de glissade à travers l'image, pas de disparition.
    var veiled = false;
    if (el) { last = el; var c = center(el); if (c) { if (!pos || vis < 0.05) pos = { x: c.x, y: c.y };
      if (el.classList.contains('go') && Math.hypot(c.x - pos.x, c.y - pos.y) > 80) pos = { x: c.x, y: c.y };
      // Quand le point court, la bille est exactement dessus : le trait n'est jamais devant elle. Au repos ou d'un écran à l'autre, elle glisse.
      var k = el.classList.contains('go') ? 1 : 1 - Math.exp(-dt * 16); var dx = (c.x - pos.x) * k, dy = (c.y - pos.y) * k; pos.x += dx; pos.y += dy;
      // La bille roule : l'angle vaut le chemin parcouru divisé par le rayon, autour de l'axe perpendiculaire au déplacement.
      var L = Math.hypot(dx, dy); if (L > 0.01) { dir = { x: dx / L, y: dy / L }; var ax = new THREE.Vector3(-dy / L, dx / L, 0); ball.rotateOnWorldAxis(ax, L / radius); idle = 0; } else idle += dt;
      radius = R_UNITS * scaleOf(el); } }
    else idle += dt;
    // Sur un écran sans fil (les démos vidéo), elle se range en bas à droite et attend, visible.
    var actP = document.querySelector('.scene.active'); var sansFil = want && (!actP || !actP.querySelector('.runner'));
    if (sansFil) { var park = { x: cw - 44, y: ch - 44 }; if (!pos) pos = { x: park.x, y: park.y }; var kp = 1 - Math.exp(-dt * 6); pos.x += (park.x - pos.x) * kp; pos.y += (park.y - pos.y) * kp; }
    // Au repos, elle tourne doucement sur elle-même et respire : on sait qu'elle attend, qu'elle va repartir.
    if (idle > 0.1) ball.rotateOnWorldAxis(new THREE.Vector3(0.3, 1, 0.2).normalize(), dt * 0.9);
    var breathe = 1 + Math.sin(now / 420) * 0.02;
    // Sur l'écran de fin, elle s'efface vite après le dernier mot écrit ; ailleurs elle attend jusqu'à 6 s, le temps d'une lecture.
    var fin = document.querySelector('.scene.active#sZ');
    var shown = want && pos && !veiled; // visible du premier au dernier instant
    vis += ((shown ? 1 : 0) - vis) * (1 - Math.exp(-dt * 10));
    if (pos) place(breathe);
    mat.opacity = vis; haloMat.opacity = vis * 0.6; shadowMat.opacity = 0; // pas d'ombre (gérant, 31 octobre)
    if (vis > 0.01 || renderer._dirty) { renderer.render(scene, camera); renderer._dirty = vis > 0.01; }
  }
  // Comme la mine d'un crayon (gérant, 31 octobre) : le centre de la bille EST le bout du trait, dans son axe, toujours.
  function place(breathe) {
      var bx = pos.x, by = pos.y;
      ball.position.set(bx, -by, 0); ball.scale.setScalar(radius * breathe);
      halo.position.set(bx, -by, -5); halo.scale.setScalar(radius * 3.4);
      shadow.position.set(bx, -by, -10); shadow.scale.set(radius * 2.6, radius * 2.6, 1);
      rim.position.set(bx, -by, -radius * 3);
  }
  requestAnimationFrame(frame);
  // Appelé par le moteur juste après avoir avancé le point qui trace : la bille est recalée dans la MÊME image (sinon elle
  // traînait une image derrière le bout du trait, ~9 px à la vitesse du fil).
  function sync() {
    if (!document.body.classList.contains('film')) return; var el = target(); if (!el || !el.classList.contains('go')) return;
    var c = center(el); if (!c) return; last = el; pos = { x: c.x, y: c.y }; radius = R_UNITS * scaleOf(el); place(1); if (vis > 0.01) renderer.render(scene, camera);
  }
  window.MZORB = { ball: ball, renderer: renderer, where: function () { return pos; }, sync: sync };
})();
</script>`;

module.exports = { style, script, THREE_URL };

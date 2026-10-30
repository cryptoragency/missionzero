const pw = require('C:/gui/cryptor.agency/agence/node_modules/playwright'); const path = require('path');
(async () => {
  const b = await pw.chromium.launch({ headless: true }); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('file:///' + path.resolve('video/film-v4.html').split(path.sep).join('/') + '?record=1'); await p.addStyleTag({ content: '.scene header{display:none!important}' });
  await p.evaluate(() => { document.getElementById('grid').click(); });
  await p.waitForTimeout(800);
  await p.locator('#s0').screenshot({ path: 'C:/Users/GAME/Desktop/mission-zero-boucle-maquette.png' });
  await b.close(); console.log('still ok');
})();

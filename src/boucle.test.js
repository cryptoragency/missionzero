import test from 'node:test';
import assert from 'node:assert/strict';
import { lancer, lireJson } from './boucle.js';

const scenario = (reponses) => { let i = 0; return async () => ({ texte: reponses[i++] ?? '{}' }); };

test('lireJson tolère du texte autour', () => {
  assert.deepEqual(lireJson('voici {"a":1} fin'), { a: 1 });
  assert.equal(lireJson('rien'), null);
});

test('échoue, apprend, pivote puis atteint l\'objectif', async () => {
  const demander = scenario([
    '{"hypotheses":["A"],"action":{"type":"page","detail":"x","coutUsd":0,"reel":false},"attendu":"clics"}',
    '{"score":2,"atteint":false,"leçon":"personne ne clique","incertitudes":[],"pivot":"B"}',
    '{"hypotheses":["B"],"action":{"type":"sondage","detail":"y","coutUsd":0,"reel":false},"attendu":"réponses"}',
    '{"score":8,"atteint":true,"leçon":"ça marche","incertitudes":["petit échantillon"],"pivot":""}',
  ]);
  const r = await lancer({ objectif: 'test', demander, executer: async () => ({ ok: true }) });
  assert.equal(r.atteint, true);
  assert.equal(r.tours, 2);
  assert.ok(r.preuves.some((p) => p.etape === 'evaluation' && p.score === 2));
});

test('une action payante sans validation n\'est jamais exécutée', async () => {
  let execute = 0;
  const demander = scenario(['{"hypotheses":[],"action":{"type":"pub","detail":"z","coutUsd":20,"reel":true},"attendu":"?"}']);
  const r = await lancer({ objectif: 't', maxTours: 1, demander, executer: async () => { execute += 1; return {}; }, valider: async () => false });
  assert.equal(execute, 0);
  assert.equal(r.atteint, false);
});

test('la synthèse rejette une source inventée', async () => {
  const { synthetiser } = await import('./synthese.js');
  const preuves = [{ etape: 'observation', obs: { resultats: [{ url: 'https://vrai.fr/a', titre: 'A', extrait: 'x' }] } }];
  const demander = async () => ({ texte: '{"reponse":"ok","sources":[{"url":"https://vrai.fr/a","apport":"1"},{"url":"https://invente.fr/z","apport":"2"}],"confiance":7,"incertitudes":[]}' });
  const r = await synthetiser({ objectif: 'o', preuves, demander });
  assert.equal(r.sources.length, 1);
  assert.equal(r.sourcesRejetees, 1);
});

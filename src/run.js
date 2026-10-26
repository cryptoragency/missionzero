// Lance Mission Zero sur un objectif : node --env-file=.env src/run.js "objectif" [maxTours]
import { mkdirSync, writeFileSync } from 'node:fs';
import { creerClient } from './meta.js';
import { lancer } from './boucle.js';
import { creerExecuteur } from './outils.js';

const objectif = process.argv[2];
if (!objectif) { console.error('Usage : node --env-file=.env src/run.js "objectif" [maxTours]'); process.exit(1); }
const maxTours = Number(process.argv[3]) || 3;
const dossier = 'preuves/' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
mkdirSync(dossier, { recursive: true });

const client = creerClient();
const demander = (messages, opts) => client.demander(messages, { ...opts, max_tokens: 6000 });
const resultat = await lancer({
  objectif,
  contraintes: ['sources publiques uniquement', 'aucune dépense', 'aucun contact avec des tiers'],
  budgetUsd: 1,
  maxTours,
  demander,
  executer: creerExecuteur({ dossier }),
  valider: async () => false, // aucune action réelle ni payante sans humain
  memoireChemin: dossier + '/memoire.json',
  journalChemin: dossier + '/journal.jsonl',
});
const bilan = { objectif, atteint: resultat.atteint, tours: resultat.tours, meilleur: resultat.meilleur, cout: client.compteur };
writeFileSync(dossier + '/bilan.json', JSON.stringify(bilan, null, 2));
console.log(JSON.stringify(bilan, null, 2));
console.log('Dossier de preuves :', dossier);

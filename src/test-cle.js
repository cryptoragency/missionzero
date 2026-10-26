import { creerClient } from './meta.js';
const c = creerClient();
const r = await c.demander([{ role: 'user', content: 'Réponds par un seul mot : prêt.' }], { max_tokens: 20 });
console.log('Réponse :', r.texte.trim());
console.log('Jetons :', r.usage, '· coût estimé :', r.compteur.usd.toFixed(5), '$ · modèle :', c.modele);

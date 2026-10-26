// Réponse finale : le modèle rédige, mais chaque source citée est VÉRIFIÉE contre ce que Mission Zero Zero a réellement vu.
import { lireJson } from './boucle.js';

export function adressesVues(preuves) {
  const vues = new Map();
  for (const p of preuves) {
    if (p.etape !== 'observation') continue;
    for (const r of p.obs?.resultats || []) if (r.url) vues.set(r.url, r);
  }
  return vues;
}

export async function synthetiser({ objectif, preuves, demander }) {
  const vues = adressesVues(preuves);
  const sources = [...vues.values()].map((r) => ({ url: r.url, titre: r.titre, extrait: r.extrait }));
  const r = await demander([
    { role: 'system', content: 'Tu rédiges la réponse finale. Cite UNIQUEMENT des adresses de la liste fournie, recopiées exactement. Réponds en JSON : {"reponse":"","sources":[{"url":"","apport":""}],"confiance":0-10,"incertitudes":[""]}.' },
    { role: 'user', content: JSON.stringify({ objectif, sourcesVues: sources, apprentissages: preuves.filter((p) => p.etape === 'evaluation').map((p) => p['leçon']) }) },
  ], { max_tokens: 6000 });
  const j = lireJson(r.texte) || { reponse: '', sources: [], confiance: 0, incertitudes: ['synthèse illisible'] };
  const citees = Array.isArray(j.sources) ? j.sources : [];
  const verifiees = citees.filter((s) => vues.has(s.url));
  return { ...j, sources: verifiees, sourcesRejetees: citees.length - verifiees.length, sourcesVues: sources.length };
}

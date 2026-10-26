// Client Meta Model API (compatible OpenAI) avec compteur de coût et plafond dur.
// Tarifs en dollars par million de jetons : à confirmer sur dev.meta.ai (muse-spark-1.1 : 1,25 / 4,25).
const BASE = 'https://api.meta.ai/v1';
const TARIF = { entree: 1.25, sortie: 4.25 };

export function creerClient({ cle = process.env.MODEL_API_KEY, modele = process.env.MZ_MODELE || 'muse-spark-1.3', plafondUsd = Number(process.env.MZ_PLAFOND_USD) || 100, fetchFn = fetch } = {}) {
  if (!cle) throw new Error('MODEL_API_KEY manquante (fichier .env)');
  const compteur = { appels: 0, entree: 0, sortie: 0, usd: 0, msTotal: 0 };
  async function demander(messages, { max_tokens = 1500, temperature = 0.7 } = {}) {
    if (compteur.usd >= plafondUsd) throw new Error(`Plafond de ${plafondUsd} $ atteint : validation humaine requise`);
    const t0 = Date.now();
    const r = await fetchFn(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${cle}` },
      body: JSON.stringify({ model: modele, messages, max_tokens, temperature }),
    });
    const corps = await r.text();
    if (!r.ok) throw new Error(`Meta ${r.status} : ${corps.slice(0, 300)}`);
    const j = JSON.parse(corps);
    const u = j.usage || {};
    compteur.appels += 1;
    compteur.entree += u.prompt_tokens || 0;
    compteur.sortie += u.completion_tokens || 0;
    compteur.msTotal += Date.now() - t0;
    compteur.usd = (compteur.entree * TARIF.entree + compteur.sortie * TARIF.sortie) / 1e6;
    return { texte: j.choices?.[0]?.message?.content ?? '', usage: u, compteur: { ...compteur } };
  }
  return { demander, compteur, modele };
}

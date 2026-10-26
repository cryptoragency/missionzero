// Boucle d'expérimentation : objectif -> hypothèses -> actions -> observations -> évaluation -> nouvelle stratégie.
// Le modèle et les actions sont injectés : la boucle se teste sans réseau.
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';

const JSON_RE = /\{[\s\S]*\}/;
export function lireJson(texte) {
  const m = String(texte || '').match(JSON_RE);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

export function chargerMemoire(chemin) {
  if (!chemin || !existsSync(chemin)) return [];
  try { return JSON.parse(readFileSync(chemin, 'utf8')); } catch { return []; }
}

export async function lancer({ objectif, contraintes = [], budgetUsd = 100, maxTours = 6, demander, executer, valider, aide = null, memoireChemin = null, journalChemin = null }) {
  const memoire = chargerMemoire(memoireChemin);
  const preuves = [];
  const noter = (e) => { const l = { t: new Date().toISOString(), ...e }; preuves.push(l); if (journalChemin) appendFileSync(journalChemin, JSON.stringify(l) + '\n'); };
  let meilleur = { score: 0 };

  for (let tour = 1; tour <= maxTours; tour += 1) {
    // 1. Hypothèses et plan d'action, en tenant compte des échecs déjà vus.
    let plan;
    try {
      const r = await demander([
        { role: 'system', content: 'Tu es Mission Zero. Tu atteins un objectif par essais successifs. Actions possibles, et seulement elles : {"type":"recherche_web","requete":"3 à 8 mots-clés, pas une phrase"} ou {"type":"creer_page","nom":"","contenu":"HTML complet"}. Pas de coût, aucune action réelle (coutUsd 0, reel false) sauf si indispensable. Après une recherche vide, change les mots-clés. Réponds UNIQUEMENT en JSON : {"hypotheses":[""],"action":{"type":"","requete":"","nom":"","contenu":"","coutUsd":0,"reel":false},"attendu":""}.' },
        { role: 'user', content: JSON.stringify({ objectif, contraintes, budgetUsd, echecs: memoire.filter((m) => !m.ok).slice(-8), preuvesRecentes: preuves.slice(-4) }) },
      ], { max_tokens: 2500 });
      plan = lireJson(r.texte);
    } catch (e) { noter({ tour, etape: 'erreur-modele', message: e.message }); break; }
    if (!plan || !plan.action) { noter({ tour, etape: 'plan-illisible' }); continue; }
    noter({ tour, etape: 'plan', hypotheses: plan.hypotheses, action: plan.action });

    // 2. Garde-fou : une action réelle ou payante demande la validation humaine.
    if (plan.action.reel || Number(plan.action.coutUsd) > 0) {
      const ok = valider ? await valider(plan.action) : false;
      noter({ tour, etape: 'validation', ok: !!ok });
      if (!ok) { memoire.push({ tour, action: plan.action, ok: false, motif: 'refusée' }); continue; }
    }

    // 3. Action, puis observation.
    let obs;
    try { obs = await executer(plan.action); } catch (e) { obs = { ok: false, erreur: e.message }; }
    noter({ tour, etape: 'observation', obs });

    // 4. Évaluation par rapport à l'objectif initial.
    let eva = null;
    try {
      const r = await demander([
        { role: 'system', content: 'Évalue honnêtement. JSON : {"score":0-10,"atteint":false,"leçon":"","incertitudes":[""],"pivot":""}.' },
        { role: 'user', content: JSON.stringify({ objectif, action: plan.action, attendu: plan.attendu, observation: obs }) },
      ], { max_tokens: 2000 });
      eva = lireJson(r.texte);
    } catch (e) { noter({ tour, etape: 'erreur-evaluation', message: e.message }); }
    if (!eva) eva = { score: 0, atteint: false, leçon: 'évaluation illisible', incertitudes: [], pivot: '' };
    noter({ tour, etape: 'evaluation', ...eva });

    memoire.push({ tour, action: plan.action, ok: Number(eva.score) >= 6, leçon: eva.leçon });
    if (memoireChemin) writeFileSync(memoireChemin, JSON.stringify(memoire, null, 2));
    if (Number(eva.score) > meilleur.score) meilleur = { score: Number(eva.score), tour, action: plan.action };
    if (eva.atteint) return { atteint: true, tours: tour, meilleur, preuves };
    if (aide && Number(eva.score) <= 2) { const conseil = await aide({ objectif, preuves: preuves.slice(-6) }); noter({ tour, etape: 'aide', conseil }); }
  }
  return { atteint: false, tours: preuves.filter((p) => p.etape === 'plan').length, meilleur, preuves };
}

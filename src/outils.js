// Actions que Mission Zero Zero peut exécuter lui-même. Aucune n'a d'effet dans le monde réel :
// lecture de pages publiques et création de fichiers dans preuves/. Le reste demande une validation humaine.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const decoder = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

export async function rechercheWeb(requete, { fetchFn = fetch, max = 8 } = {}) {
  const r = await fetchFn('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(requete), { headers: { 'user-agent': 'Mozilla/5.0 (compatible; MissionZeroZero/0.1)' } });
  if (!r.ok) return { ok: false, erreur: 'recherche ' + r.status };
  const html = await r.text();
  const blocs = html.split('class="result results_links').slice(1, max + 1);
  const resultats = blocs.map((b) => ({
    titre: decoder((b.match(/result__a[^>]*>([\s\S]*?)<\/a>/) || [])[1] || ''),
    extrait: decoder((b.match(/result__snippet[^>]*>([\s\S]*?)<\/a>/) || [])[1] || ''),
    url: decodeURIComponent(((b.match(/uddg=([^"&]+)/) || [])[1]) || ''),
  })).filter((x) => x.titre);
  return { ok: resultats.length > 0, requete, resultats };
}

export function creerPage(nom, html, dossier = 'preuves') {
  mkdirSync(dossier, { recursive: true });
  const fichier = join(dossier, String(nom).replace(/[^a-z0-9_-]/gi, '_') + '.html');
  writeFileSync(fichier, String(html));
  return { ok: true, fichier, octets: Buffer.byteLength(String(html)) };
}

export function creerExecuteur({ dossier = 'preuves', fetchFn = fetch } = {}) {
  return async (action) => {
    const t = String(action.type || '').toLowerCase();
    if (t.includes('recherche')) return rechercheWeb(action.requete || action.detail, { fetchFn });
    if (t.includes('page') || t.includes('prototype')) return creerPage(action.nom || 'prototype', action.contenu || action.detail, dossier);
    return { ok: false, erreur: 'action inconnue : ' + action.type + ' (types permis : recherche_web, creer_page)' };
  };
}

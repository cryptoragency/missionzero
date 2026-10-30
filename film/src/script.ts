// The film, shot by shot, from the script document of 30 October (gérant): the voice says only the essentials, in short
// spaced sentences; while a sentence plays, the element it names is framed and everything else is still; the dot moves
// only in the silences. `seconds` is the length of the shot (voice + silence); the voice track replaces it when recorded.
export type Shot = { id: string; frame: string; fr: string; en: string; seconds: number };
export type Scene = { id: string; title: string; shots: Shot[] };

export const FPS = 30;

export const scenes: Scene[] = [
  {
    id: 'loop', title: 'La boucle', shots: [
      { id: 'title', frame: 'title', fr: 'Mission Zero. Un objectif, et l’ordre de prouver.', en: 'Mission Zero. A goal, and an order: prove it.', seconds: 5 },
      { id: 'rings', frame: 'rings', fr: 'Objectif. Hypothèses. Actions. Évaluation. Leçon. Et il recommence.', en: 'Goal. Hypotheses. Actions. Evaluation. Lesson. And again.', seconds: 7 },
      { id: 'proof', frame: 'proof', fr: 'Jusqu’à la preuve : la citation exacte, sur la page.', en: 'Until the proof: the exact quote, on the page.', seconds: 4 },
      { id: 'refuse', frame: 'evaluation', fr: 'Et il se refuse lui-même.', en: 'And it says no to itself.', seconds: 4 },
    ],
  },
  {
    id: 'choose', title: 'Où l’envoyer ?', shots: [
      { id: 'three', frame: 'three', fr: 'Même boucle, zéro code. Trois voyages.', en: 'Same loop, no code. Three journeys.', seconds: 3.5 },
      { id: 'security', frame: 'security', fr: 'D’abord, la sécurité d’un site.', en: 'First, a website’s security.', seconds: 2.5 },
    ],
  },
  {
    id: 'security', title: 'La sécurité d’un site', shots: [
      { id: 'closed', frame: 'closed', fr: 'Une faille. Un site fermé. Huit sites sur dix sont exposés.', en: 'One flaw. A site shut down. Eight sites out of ten are exposed.', seconds: 7 },
      { id: 'production', frame: 'production', fr: 'Quinze failles. D’habitude, on corrige en production. Et on casse autre chose.', en: 'Fifteen flaws. Usually you fix them in production. And break something else.', seconds: 7 },
      { id: 'copy', frame: 'copy', fr: 'Mission Zero cherche le correctif, le pose sur une copie, rejoue vos parcours, relance le scanner.', en: 'Mission Zero finds the fix, applies it on a copy, replays your journeys, rescans.', seconds: 8 },
      { id: 'rejected', frame: 'rejected', fr: 'Il casse « suivre ma commande ». Il se refuse. Il en propose une autre, qui passe.', en: 'It breaks “follow my order”. It refuses itself. It proposes another one, which passes.', seconds: 7 },
      { id: 'look', frame: 'look', fr: 'Les tests disaient oui. Il a regardé la page : refusé.', en: 'The tests said yes. It looked at the page: rejected.', seconds: 6 },
      { id: 'real', frame: 'real', fr: 'Sur notre vrai site : sept constats. Cinq réparés avec preuves. Deux qu’il refuse de certifier.', en: 'On our real site: seven findings. Five repaired with proof. Two it refuses to certify.', seconds: 8 },
      { id: 'approve', frame: 'approve', fr: 'Chez vous. ARGUS surveille, Mission Zero répare, vous validez.', en: 'On your premises. ARGUS watches, Mission Zero repairs, you approve.', seconds: 7 },
    ],
  },
];

export const sceneFrames = (s: Scene) => Math.round(s.shots.reduce((a, x) => a + x.seconds, 0) * FPS);
export const totalFrames = () => scenes.reduce((a, s) => a + sceneFrames(s), 0);

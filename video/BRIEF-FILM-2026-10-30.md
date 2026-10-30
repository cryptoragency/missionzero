# Brief du film Mission Zero · règles du gérant (30 octobre 2026)

Fichier à produire : `video/film-v4.html` (assemblé par un script, mais le livrable est le HTML final). Modèle de
référence : le storyboard du 29 (`video/schemas.html`) : nuit, menthe, bleu ; boîtes et ronds qui apparaissent une fois
et restent ; légende sous le dessin. Rendu vidéo : `?record=1&auto=1`, 1280 × 720, capture headless (voir
`video/shots.cjs` et le script d'enregistrement du 30 : Playwright, `recordVideo`, puis ffmpeg).

## Le fil (la flèche), règle absolue
1. Un seul fil continu mène le regard : le trait se dessine EN MÊME TEMPS que le point blanc qui court devant lui.
   Rien n'est jamais tracé avant le passage du point (ni trait, ni pointillé, ni orbite).
2. Le fil va toujours au plus court, à vol d'oiseau, d'un élément au suivant. S'il y a un obstacle (un rond, une boîte,
   un texte), il le contourne en courbe. Il ne traverse jamais un rond, une boîte ou un texte.
3. Aucun angle : tout coin est arrondi, les courbes sont douces et s'adaptent.
4. Le fil nous emmène vers ce qu'on veut montrer : l'élément apparaît quand le fil l'atteint, jamais avant.
5. Un arrêt par événement à retenir : on montre, on lit, on repart. Jamais de temps mort, jamais de précipitation.

## La boucle (écran 1)
1. Titre MISSION ZERO en haut, puis le fil part vers Objectif.
2. Cinq ronds sur un cercle parfait : Objectif, Hypothèses, Actions, Évaluation, Leçons. Le fil arrive au bord du rond,
   le rond apparaît, le fil se divise en deux et fait le tour complet du rond (le contour s'illumine), puis le rond et
   son texte zooment FORT (x3 à x4), au premier plan, rien dessous, pour qu'on lise ; temps d'arrêt d'une seconde ;
   retour à la taille normale ; le fil repart du bord opposé vers le rond suivant.
3. Après Leçons, le fil revient sur Objectif : le tour est complet. Au centre : « Preuve » (texte seul, pas de rond),
   puis un gros « OBJECTIF VALIDÉ ».
4. Nouvelle boucle, rien au milieu. Évaluation devient ROUGE : le CONTOUR clignote en rouge, c'est une alerte, on doit
   le voir. À ce moment seulement : « Preuve » rayé d'une croix rouge + « preuve refusée ».
5. On applique les corrections : le fil repasse vite sur les ronds déjà verts, mais il y repasse bien (chacun se
   revalide par une surbrillance), Évaluation redevient vert, puis un gros « OBJECTIF PROUVÉ ».
6. Toute la boucle rétrécit jusqu'à ne laisser qu'un point blanc, qui repart vers l'écran suivant.
Pas de cadre autour des éléments. La surbrillance d'un rond au passage = pulsation du contour, rien de plus.

## Titres d'écran
Chaque écran porte en haut un titre pour savoir où on en est : « SANS MISSION ZERO » (la boutique seule, en rouge),
« AVEC MISSION ZERO » (la correction, en vert), « EXEMPLE D'UTILISATION AVEC MISSION ZERO » + sous-titre
« MYTHOZOR ARGUS · surveillance cybersécurité » (l'écran chez le client). Plus de promo « un produit de
CRYPTOR.AGENCY » en bas : on reste sur l'objectif.

## Les scènes du 29 (boutique, correction, ARGUS)
Reprises du storyboard du 29, mais : rien de décalé (chaque texte aligné sur sa boîte ou son rond, le fil qui arrive
exactement au bord), les flèches arrondies, le fil au plus court. Dans la correction, quand le contrôle 3 (le regard)
passe au rouge, le texte explique : « le correctif a altéré le HTML de la page de paiement : il faut le refaire ».
Puis le correctif n°2, les contrôles revalidés, confirmé.

## Légendes (voix)
Des petites phrases espacées : une idée par phrase, un silence entre deux. La voix ne dit que l'essentiel. Sous-titres
anglais incrustés au montage (hors de ce fichier).

## Ce qu'on vérifie avant de montrer au gérant
- Captures headless à plusieurs instants (le fil n'est jamais tracé avant le point ; aucun fil ne traverse un rond ou
  une boîte ; les zooms sont au premier plan et lisibles ; rien de décalé).
- Durée totale lisible dans `#clock` à la fin (`fin · N s`).

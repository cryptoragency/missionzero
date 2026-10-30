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

## Décisions du gérant après le premier lot (30 octobre, 16 h) : « on tient le bon »
1. Boutique SANS MISSION ZERO : « L'équipe » n'est plus un encadré. Juste la silhouette d'un humain (le personnage), avec ses deux
   lignes de texte dessous, sans boîte ni cadre.
2. On REMET les deux modes, partout où on parle d'appliquer : « correction par un humain, ou correction automatique ». Dans
   ARGUS : le bloc « Vous validez · ou automatique » du 29 revient (clic par correctif, ou mode automatique appliqué tout seul,
   vous êtes prévenu, les deux existent, vous choisissez). Dans la correction : « confirmé : un humain applique, ou
   l'automatique ». C'est le gérant qui tranche : GUIDOR ne doit plus retirer ce point.
3. On fait TOUTE la vidéo, sans se préoccuper du temps, au même rythme que le lot validé. Après la sécurité :
   l'écran des choix revient (la sécurité passe « prouvé », le fil va vers L'espace), puis L'ESPACE, puis l'écran des choix
   (espace « prouvé », le fil va vers La médecine), puis LA MÉDECINE, puis la FIN.

## L'espace (reprendre la scène sE du storyboard du 29 : le ciel d'étoiles, le compteur de vitesse, les boîtes à citation)
Phrases courtes, un arrêt par événement, le fil mène à chaque boîte :
- « On va quelque part ? Posée deux fois. »
- AVANT, panneau rouge, le modèle seul : « Douze chiffres, un centime. Quatre sources sur cinq, personne ne peut les ouvrir. »
- AVEC, panneau vert : « Mission Zero : quatre chiffres, un dollar. Chacun avec sa page. »
- Le compteur monte : « Vingt kilomètres par seconde vers Hercule. » « Deux cent trente autour de la galaxie. La NASA, mot pour
  mot. » « Six cent trente et un vers le Grand Attracteur. Caché derrière notre galaxie. On y va. On ne le voit pas. »
- « Mesuré, pas vu, pas tranché. Il n'invente pas la suite. »
Titre en haut : « L'ESPACE · AVEC MISSION ZERO ».

## La médecine (reprendre la scène sM du storyboard du 29 : le fil devient un électrocardiogramme, trois battements)
- AVANT, rouge : « Un chercheur n'a pas le temps de lire cent publications. Une IA lui sort un chiffre, sans page. »
- AVEC, vert : « Mission Zero lit pour lui. » Battement 1 : « Dix millions huit cent mille malades en 2023. » Battement 2,
  rouge : « Un million deux cent cinquante mille morts. » Battement 3, vert : « Quatre-vingt-huit pour cent guéris, quand on
  soigne. Trois pages de l'OMS, mot pour mot. »
- La veille (une courbe simple avec son seuil et un point rouge) : « Chaque semaine, il compare, et ne signale que ce qui bouge.
  Semaine 38 : plus quarante pour cent. Il cite la méthode, et dit qu'aucun commentaire n'existe. »
- Au futur : « Demain, sur les relevés d'un laboratoire. Le chercheur tranche. »
- « On sait soigner. Reste à chercher. »
Titre en haut : « LA MÉDECINE · AVEC MISSION ZERO ».

## La fin
Le point dessine un cercle et se pose au centre (le zéro), silence. Coupure au noir. Gros titre choc, blanc, plein écran :
« WHAT DO YOU NEED ? ». Dessous, plus petit, en majuscules : « CRYPTOR.AGENCY ». Dessous : « MISSION ZERO » en vert néon,
qui s'allume en dernier. Rien d'autre.

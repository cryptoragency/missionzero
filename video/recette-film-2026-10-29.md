# Recette du brouillon vidéo (29 octobre 2026, 21 h)

Brouillon : `video/out/film/mission-zero-film.mp4`, 13 min 22 s, 1280 × 720, voix de synthèse Windows (Hortense), fabriqué par
`video/make-film.cjs` depuis `video/schemas.html`. But : valider le FORMAT. La version finale sera coupée à 3 minutes et tournée
avec la voix du fondateur le 2 ou 3 novembre.

## Avis des agents

**PLUMOR** : relecture faite. Espaces insécables posées (script et légendes). Aucune faute d'orthographe.

**DESIGNOR : pas OK.**
- Textes des boîtes (15 unités = 10,7 px en vidéo, 3 px sur téléphone tenu droit) illisibles sur téléphone ; plancher à 24 unités ;
  citations en anglais en blanc, une par boîte ; pastilles « vérifié / injoignable » à 22 unités sur 44 de haut ; légende sous
  l'écran à 1,6 rem, 60 caractères au plus.
- Le fil : absent dans Constat, point peu visible sur les flèches de Correction et ARGUS (il faut que le point parcoure chaque
  flèche, pas seulement que le trait se dessine).
- Chevauchements : « carte bancaire en clair » sur le bouton Payer ; « jQuery 2012 » sur « jQuery 1.8.3 » ; le point sur
  « Objectif » ; boîte « dossier de preuves » traversée par le trait 3 → 4 ; textes qui sortent des boîtes (médecine, ARGUS, espace).
- Écrans trop vides (début des choix, début d'ARGUS, début de l'espace) ou trop chargés (la boucle avec 6 boîtes, ARGUS, fin de
  l'espace).
- Carte de fin : MISSION ZERO doit primer sur CRYPTOR.AGENCY ; « Preuves, pas promesses » plus grand ; durée 9 s ; le point doit
  glisser dans le zéro.

**TESTOR : OK pour un brouillon, pas OK pour une finale.**
- Vidéo 1280 × 720 h264, audio aac présent (moyenne −22 dB), synchronisation voix / légende vérifiée à 5 instants, 0 erreur
  console en mode enregistrement, pas de débordement horizontal.
- 9 « , et » / « , ou » dans les phrases dites (règle maison) à corriger dans CAP et CH.
- `make-film.cjs` fragile : vérifier la voix fr-FR au départ, ffmpeg au départ, chemin Playwright en dur (essayer `require`, puis
  `MZ_PLAYWRIGHT`), échapper les chemins PowerShell.

**CONFIOR : pas OK.**
- Médecine : tenue chiffre par chiffre (10,8 M, 1,25 M, 88 %, juge 10/10, 5 citations, 25 appels, 10 centimes, 2 min).
  Non tenues : « plus que de toute autre infection » (l'OMS dit « a leading cause… from a single infectious agent ») et
  « soignable depuis 1950 ». « Trois pages » : un seul document, trois passages.
- Espace : « 20 km/s » n'est pas une source primaire (valeur classique, Wikipédia : 13,4 à 20) ; « 230 km/s » est une conversion
  de « 828 000 km/h » (NASA mot pour mot) ; « mesuré par Planck » alors que seule Cambridge est verte ; « vers le Grand
  Attracteur » et « 100 000 galaxies » viennent de Wikipédia (Tully dit « motion of the Local Group of 631 km s⁻¹ ») ; « péage »
  faux (causes : 403 bot challenge, 404, 405, URL absente) ; « 8 références » = 9 ; « 20 secondes » non mesuré ;
  « 4 missions, 20 minutes, 1 $ » = 0,90 $ et 16 min (1,20 $ et 21 min avec le premier essai).
- Tenus : 7 missions 1,49 $ ; juge 3 à 5/10 ; 4 sources sur 5 rouges pour le modèle seul ; 1 centime ; la boucle (10/10,
  6 centimes, 5 fois 10/10, 15 failles / 10 proposés / 5 sous réserve, 7 constats / 5 proposés, 30 leçons, 35 contrôles) ;
  26 sites, 81 % sans CSP (`examples/argus-aggregate.json`). « 8 sites sur 10 » = arrondi du 81 % CSP, à garder avec sa légende.

**LEGIOR : pas OK en l'état, OK avec les ajouts.**
- Carton de sources complet (auteur, titre, année, adresse ; OMS sous CC BY-NC-SA 3.0 IGO) dans la vidéo et la description.
- Non-affiliation : « construit avec Muse Spark (Meta Model API) ; Meta, la NASA, l'OMS et les universités citées ne sont pas
  associées à ce projet ». Aucun logo tiers.
- Comparaison : dire « même modèle des deux côtés » ; remplacer « personne ne peut les ouvrir » par « derrière un abonnement,
  non vérifiable par l'agent ».
- « Rien ne sort » (scène ARGUS) est faux avec l'API Meta : vrai seulement avec le modèle en poids ouverts hébergé chez le client.
- Voix Hortense : brouillon interne seulement, jamais publiée.
- « 81 % sans en-tête CSP, 26 sites, 28/10/2026 » à l'écran avec « 8 sites sur 10 ».
- À faire par un avocat : antériorité du nom « Mission Zero » (INPI, EUIPO, USPTO, classes 9 et 42), règlement du hackathon.

**BUSIOR : pas OK en l'état (13 min, aucun payeur, réglage par rôle absent), OK avec la coupe.**
- Coupe à 3 min 00 : boucle 22 s · choix 5 s · médecine 30 s · retour 3 s · sécurité 75 s (constat 10, Maison Verde 10, F05 rejeté par
  la vision 15, le vrai site et la CSP 18, qui paie 10, confiance 12) · dernier voyage 3 s · espace 36 s (face-à-face 16 s, compteurs
  20 s) · symbole 6 s. Environ 430 mots français.
- Scène la plus vendeuse par critère : impact = médecine ; outils Meta = F05 rejeté par la vision (Muse Spark + SAM) ; profondeur
  = la CSP du vrai site ; démo = le face-à-face sans / avec.
- Accroche du gérant conservée ; en anglais « An AI gives you a number. Mission Zero proves it. »
- Ajouter : une ligne sur qui paie (paiement réel constaté, sinon « dix centimes de calcul par faille, là où une agence facture une
  heure ») et une phrase « Un seul modèle, Muse Spark, réglé rôle par rôle… dix centimes au lieu de quarante-cinq… en poids ouverts,
  le même run reste chez vous ».
- README : « and the film says so » à retirer ou à honorer par un sous-titre.

**SEOR : OK.** Titre FR « Mission Zero | L'IA qui prouve chaque réponse », EN « Mission Zero | AI agent that proves its answers » ;
description avec chapitres (0:00 boucle, 0:35 médecine, 1:10 sécurité, 1:55 espace, 2:45 fin) ; 8 tags ; miniature = le face-à-face
sans / avec, texte « L'IA QUI PROUVE » / « AI THAT PROVES IT » ; balises et JSON-LD VideoObject pour cryptor.agency/mission-zero
(rendu serveur obligatoire). Pas de lien vers le dépôt avant le 4 novembre.

**GUIDOR** : voir ci-dessous.

**GUIDOR : OK pour validation du format.** Les sept avis sont rendus, la vidéo correspond à l'état commité (538b562). Le brouillon se
montre au gérant comme un brouillon de forme (voix de synthèse, 13 min contre 3 visées, chiffres et légal non tenus), jamais hors de
l'agence ; aucun chiffre de l'espace ne se reprend tel quel. Contradictions tranchées : « proves it » (BUSIOR) contre « proves it to
you » (phrase du gérant) : au gérant ; « Rien ne sort » : on garde la promesse en la précisant « en poids ouverts, chez vous ».

## Ordre des corrections

- **(a) Avant de montrer le brouillon** : rien à refaire ; message d'accompagnement avec la coupe minutée de BUSIOR.
- **(b) Avant la coupe à 3 minutes (environ 3 h)** : coupe BUSIOR + ligne « qui paie » + phrase Muse Spark réglé rôle par rôle ;
  corrections CONFIOR (abonnement au lieu de péage, 9 références, 16 min et 0,90 $, « cité par Cambridge », sources primaires ou
  retrait pour 20 km/s, Grand Attracteur, 100 000 galaxies, « plus que toute autre infection », « depuis 1950 », légende 26 sites /
  81 % CSP) ; LEGIOR (« même modèle des deux côtés », « Rien ne sort » précisé) ; DESIGNOR sur les plans gardés (tailles, fil
  visible partout, chevauchements, carte de fin MISSION ZERO d'abord, 9 s) ; PLUMOR (les 9 « , et / , ou »).
- **(c) Avant la version publiée (2 ou 3 novembre)** : voix du gérant ; carton de sources et non-affiliation (LEGIOR) ; banc TESTOR
  sur le fichier final, fabricant rendu indépendant du poste ; métadonnées SEOR, pas de lien dépôt avant le 4 ; sous-titres anglais
  rédigés par le chef ; les sept agents repassent, puis GUIDOR. Antériorité du nom « Mission Zero » : à l'arbitrage du gérant.

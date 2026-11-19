# Brief agent — Escargot Express (titre provisoire)

> Projet autonome. L'agent qui lit ce brief n'a aucun autre contexte : tout ce qui n'est pas écrit ici est hors périmètre.
> Créateur : dev solo, web/TypeScript, PC sans GPU dédié, budget ≈ 0, pas d'UA payante.
> Public cible : adultes 35–55+ (majoritairement femmes), amateurs de puzzles calmes, **anglais + français**.

---

## 1. Objectif et hypothèse

Nous pensons qu'un **puzzle de chemin à tracer (une seule ligne qui couvre toute la grille en passant par des points numérotés dans l'ordre)**, présenté avec **un escargot mignon qui laisse une traînée brillante**, un **défi quotidien** et une **carte de résultat partageable**, atteindra :

| KPI | Kill | Itérer | Investir |
|---|---|---|---|
| Rétention J1 | < 25 % | 25–35 % | ≥ 35 % |
| Rétention J7 | < 6 % | 6–12 % | ≥ 12 % |
| Joueurs qui partagent au moins 1 fois (7 jours) | < 3 % | 3–8 % | ≥ 8 % |

Seuils = **estimation** dérivée des repères GameAnalytics 2026 (D1 médiane ~22 %, top 10 % ~40 % ; D7 médiane ~4 %, top 10 % ~12 %). Le taux de partage est un objectif interne, non sourcé.

Ce build existe **uniquement** pour tester cette hypothèse sur le web (portails) puis Android.

## 2. Hors périmètre (ne PAS construire)

- Comptes utilisateurs, connexion, backend, base de données, sauvegarde cloud
- Classement en ligne, multijoueur, amis
- Boutique, monnaie virtuelle, vrais achats intégrés (les animaux et couleurs du §4 bis se débloquent en jouant, sans achat)
- Vrais SDK publicitaires ou analytics (interfaces + stubs uniquement, cf. §7–8)
- Build iOS
- Éditeur de niveaux dans le jeu
- Notifications push
- Langues autres que anglais et français
- Toute référence à LinkedIn, au nom « Zip » ou à un autre jeu existant (nom, logo, couleurs, textes) — règles de puzzle uniquement, identité 100 % originale

## 3. Règles du jeu (spécification exacte)

### Grille
- Grille carrée **N×N**, N ∈ {5, 6, 7, 8}.
- Chaque case est visitée **exactement une fois**.
- Déplacements **orthogonaux uniquement** (haut, bas, gauche, droite), vers une case adjacente.
- **Murs** : segments optionnels entre deux cases adjacentes ; le chemin ne peut pas les traverser.

### Points de passage (« feuilles »)
- K feuilles numérotées **1 → K**, avec 3 ≤ K ≤ 12.
- La feuille **1** est le départ du chemin, la feuille **K** est l'arrivée.
- Le chemin doit atteindre les feuilles **dans l'ordre croissant**.
- Entrer sur une feuille de numéro > (dernière feuille atteinte + 1) est **refusé** (le chemin ne s'étend pas, feedback « secousse »).

### Victoire
- Toutes les N² cases sont couvertes **et** le chemin finit sur la feuille K.
- Chaque niveau a **une solution unique** (garantie par l'outil, §5).

### Échec
- Pas d'échec forcé (jeu calme). Un niveau est « abandonné » si le joueur quitte ou réinitialise → événement `level_fail` avec `reason`.

### Chronomètre
- Affiché discrètement, **aucune pénalité**. Peut être masqué dans les réglages.

## 4. Contrôles et ressenti

### Entrées (tactile + souris, identiques)
| Geste | Effet |
|---|---|
| Appui sur la feuille 1 (chemin vide) ou sur la **dernière case du chemin**, puis glisser | Étend le chemin case par case en suivant le doigt |
| Glisser en arrière sur l'avant-dernière case | Retire la dernière case (annulation fluide) |
| Appui sur une case déjà dans le chemin | Coupe le chemin à cette case |
| Bouton ↺ | Réinitialise le niveau (confirmation si > 50 % rempli) |
| Bouton Indice | §7 |

- Un glissement rapide qui « saute » des cases est interpolé case par case ; s'arrêter à la première case invalide.
- Zone tactile par case ≥ 44×44 px CSS.

### « Juice » (le clip muet de 3 s en dépend)
1. **Traînée de bave** : ligne épaisse, arrondie, légèrement translucide, avec reflet animé ; dessinée en courbe lissée, pas en segments carrés.
2. **Escargot** : suit la tête du chemin, s'oriente dans la direction du mouvement, petite animation de rebond.
3. **Feuille atteinte** : l'escargot « croque » (pop d'échelle 1 → 1,3 → 1), son court, vibration 15 ms.
4. **Chaque case** : tic sonore très léger + vibration 5 ms (désactivables).
5. **Refus** (mur / mauvais ordre) : secousse horizontale de l'escargot 150 ms, son sourd.
6. **Victoire** : un reflet lumineux parcourt toute la traînée du début à la fin en 0,8 s, puis pluie de petites feuilles, escargot content, puis écran de résultat.

Direction artistique : couleurs douces (vert sauge, crème, touches corail), formes rondes, gros caractères lisibles, rien d'enfantin. Formes vectorielles dessinées en Canvas/SVG par défaut (voir §12).

## 4 bis. Personnalisation (ajout du 19/11/2026)

- **Animaux** (débloqués par la progression en campagne), tous dessinés en vectoriel et animés partie par partie (`src/game/animals.ts`), sans emoji : Escargot (niv. 1), Chenille (10), Tortue (25), Coccinelle (50), Hérisson (80), Lapin (120), Poussin (160). Chaque animal a sa façon de bouger (glisser, se dandiner, sautiller) et sa traînée.
- **Couleur des feuilles** : 7 teintes (vert, corail, bleu, violet, or, rose, nuit), libres dès le départ.
- Choix sauvegardés localement ; menu 🎨 avec aperçu animé.
- Piste de monétisation future : animaux supplémentaires en achat intégré ou débloqués par une pub récompensée.

## 5. Pipeline de contenu (À CONSTRUIRE EN PREMIER, outil séparé)

Dossier `tools/levelgen/`, exécutable en CLI Node (`npm run gen -- --size 6 --count 50 --seed 123`).

### 5.1 Générateur
1. Générer un **chemin hamiltonien aléatoire** sur la grille N×N (algorithme recommandé : marche « backbite » à partir d'un serpentin, ≥ 20·N² itérations), à partir d'une graine (PRNG déterministe, ex. mulberry32).
2. Placer les feuilles : feuille 1 = début du chemin, feuille K = fin, feuilles intermédiaires à des indices du chemin répartis aléatoirement (écart minimal 2 cases).
3. Optionnel : ajouter des murs sur des arêtes **non utilisées** par le chemin.
4. Vérifier l'unicité avec le solveur (§5.2). Si > 1 solution : ajouter une feuille sur une case où les solutions divergent, ou un mur sur une arête utilisée par une autre solution mais pas par la vraie ; recommencer. Abandonner après 50 tentatives et regénérer.

### 5.2 Solveur / validateur
- DFS avec élagage : connexité des cases restantes (flood fill), détection de cases isolées (degré libre < 1, ou = 1 hors extrémité), respect de l'ordre des feuilles, murs.
- Retourne `{ solutions: 0 | 1 | 2+, nodes: number }` (s'arrête dès la 2ᵉ solution).
- Un niveau est **valide** ssi `solutions === 1` et la solution trouvée = chemin généré.

### 5.3 Métrique de difficulté
`difficulty = nodes_explorés_par_solveur_sans_heuristique × (1 / densité_de_feuilles) × facteur_taille` normalisée en score 1–100. Documenter la formule dans le code.

### 5.4 Courbe de progression (campagne de 200 niveaux)
| Niveaux | Taille | Feuilles | Murs |
|---|---|---|---|
| 1–3 (tutoriel) | 5×5 | 6–8 | 0 |
| 4–30 | 5×5 / 6×6 | 5–8 | 0–2 |
| 31–80 | 6×6 | 4–7 | 0–4 |
| 81–140 | 7×7 | 4–8 | 0–6 |
| 141–200 | 8×8 | 6–12 | 0–10 |

> Ajusté pendant M0 : avec 4–9 feuilles et 0–8 murs, un 8×8 à solution unique demandait en moyenne 3,6 s (max 14 s) de génération. Avec 6–12 feuilles et 0–10 murs : ~0,3 s en moyenne, < 1 s au maximum.
Dans chaque tranche, trier par difficulté croissante.

### 5.5 Défis quotidiens
- Prégénérer **730 puzzles** (2 ans) dans `daily.json`, indexés par date `YYYY-MM-DD` (minuit **UTC**).
- Difficulté par jour de la semaine : lundi le plus facile → dimanche le plus difficile.

### 5.6 Format d'export
```json
{
  "id": "c-0042",
  "size": 6,
  "waypoints": [{"n":1,"r":0,"c":0}, {"n":2,"r":3,"c":2}],
  "walls": [{"r":1,"c":1,"side":"E"}],
  "solution": [[0,0],[0,1]],
  "difficulty": 37,
  "seed": 123
}
```
`solution` sert aux indices et aux tests ; ne jamais l'afficher.

### Acceptation M0
`npm run gen` produit **200 niveaux de campagne + 730 quotidiens**, **100 % validés** (solution unique), difficulté moyenne croissante par tranche, temps de génération d'un 8×8 validé < 2 s sur un laptop.

## 6. Systèmes, dans l'ordre de construction

1. **Moteur de règles** (TS pur, sans DOM) — état du chemin, extension/retrait/coupe, détection de victoire. Testé unitairement.
2. **Rendu Canvas 2D + entrée** — grille, feuilles, murs, traînée, escargot, interpolation du glissement.
3. **Écrans** — Accueil (Défi du jour, Campagne, Réglages), Jeu, Résultat.
4. **Progression** — campagne de 200 niveaux, déverrouillage séquentiel, sauvegarde `localStorage` (niveau atteint, meilleur temps, série de jours).
5. **Défi quotidien** — chargement par date, série (streak), un seul « résultat officiel » par jour.
6. **Indices, réinitialisation** — §7.
7. **Carte de résultat partageable** — texte via Web Share API, repli = copie presse-papiers :
   ```
   Escargot Express #123 🐌
   ⏱ 1:42 · 🔥 5 jours
   💡 0 indice
   escargot-express.example
   ```
   Ne révèle jamais la solution.
8. **Juice audio/haptique** — §4 ; sons courts libres de droits (CC0) ; tout désactivable.
9. **Langues EN/FR** — dictionnaire JSON simple, détection de la langue du navigateur, choix manuel dans Réglages. Aucune chaîne en dur.
10. **Stubs pub + analytics** — §7–8.
11. **Emballage Android** — Capacitor (M3 seulement).

## 7. Points de monétisation (stubs)

Interface unique `src/monetization/ads.ts` :
```ts
export interface Ads {
  showRewarded(placement: 'hint' | 'skip_level', onReward: () => void, onClose?: () => void): void;
  showInterstitial(placement: 'between_levels'): void;
}
```
Implémentation MVP = `StubAds` (journalise dans la console, appelle `onReward` après 500 ms).

| Placement | Moment | Règle |
|---|---|---|
| `hint` (rewarded) | bouton Indice | efface jusqu'à la première erreur puis montre les 3 cases suivantes correctes. 1 indice gratuit par niveau, ensuite rewarded |
| `skip_level` (rewarded) | après 3 min sur un niveau de campagne | propose de passer le niveau |
| `between_levels` (interstitiel) | après chaque victoire de campagne à partir du niveau 10 | au maximum 1 toutes les 3 victoires et 1 toutes les 90 s ; **jamais** sur le défi du jour |

Futur achat « Sans pub » : prévoir un booléen `noAds` dans l'état sauvegardé, sans écran d'achat.

## 8. Événements analytics (stubs)

Interface `src/analytics/track.ts` : `track(event: string, params: Record<string, string | number>)`, implémentation stub = console + tampon en mémoire.

| Événement | Paramètres |
|---|---|
| `session_start` / `session_end` | `duration_s` (fin) |
| `level_start` | `level_id`, `mode` (`campaign`/`daily`), `size` |
| `level_complete` | `level_id`, `mode`, `time_s`, `hints_used` |
| `level_fail` | `level_id`, `mode`, `time_s`, `reason` (`reset`/`quit`/`skip`) |
| `booster_used` | `type` (`hint`), `level_id` |
| `ad_rewarded_shown` | `placement` |
| `ad_interstitial_shown` | `placement` |
| `share_clicked` | `mode`, `level_id` |

## 9. Contraintes techniques

- **Stack** : TypeScript (strict), Vite, Canvas 2D, Vitest. **Aucun moteur de jeu**, aucune autre dépendance sans validation (exception prévue en M3 : Capacitor + plugin Haptics).
- **Plateformes** : web (navigateurs mobiles et desktop) en priorité, puis Android via Capacitor.
- **Orientation** : portrait 9:16, responsive de 360×640 à desktop (centré, largeur max 480 px).
- **Performance** : 60 i/s avec CPU ralenti ×4 dans Chrome DevTools ; aucune allocation par frame dans la boucle de rendu (objectif interne).
- **Taille** : build web initial < 5 Mo (objectif interne, à confronter aux exigences des portails au lancement).
- **Hors ligne** : jouable sans réseau une fois chargé.
- **Accessibilité** : texte ≥ 16 px, contraste AA, mode daltonien (feuilles différenciées par numéro et forme, pas seulement la couleur).
- **Vie privée** : aucune donnée personnelle collectée dans le MVP.

## 10. Jalons et critères d'acceptation

| Jalon | Livrable | Vérifiable par une personne |
|---|---|---|
| **M0 — Outil de contenu** | `tools/levelgen` + `levels.json` + `daily.json` | 200 + 730 niveaux, 100 % solution unique, difficulté croissante (rapport imprimé par le CLI) |
| **M1 — Boucle en gris** | Moteur de règles + rendu basique + 10 niveaux | Un niveau se joue du départ à la victoire ; refus correct sur mur / mauvais ordre ; annulation et coupe fonctionnent |
| **M2 — Juice + contenu + stubs** | §4 complet, 200 niveaux, défi du jour, indices, partage, EN/FR, stubs §7–8 | Une capture muette de 10 s d'un niveau 6×6 « ressemble à une pub » ; tous les événements §8 apparaissent en console |
| **M3 — Builds** | Build web + APK Android (Capacitor) | Tournent sur un Android d'entrée de gamme dans le budget §9 ; jouable hors ligne |

## 11. Vérification attendue de l'agent

- **Tests unitaires (Vitest)** : générateur (déterminisme par graine), solveur (cas à 0, 1 et 2+ solutions faits à la main), moteur de règles (extension, retrait, coupe, refus, victoire).
- **Test de cohérence** : pour chaque niveau exporté, rejouer `solution` dans le moteur de règles → victoire.
- **Test d'interface** : script qui simule le glissement sur la solution d'un niveau et vérifie l'écran de résultat.
- **Commandes** : `npm run test`, `npm run gen`, `npm run build`, `npm run preview` ; M3 : `npx cap sync android` puis build Gradle.
- **Preuves** : capture d'écran de chaque écran, capture vidéo muette de 10 s (M2), sortie du CLI (M0).

## 12. Questions ouvertes (avec la valeur par défaut si personne ne répond)

| Question | Par défaut |
|---|---|
| Moteur / stack | TypeScript + Canvas (web-first), comme ci-dessus |
| Source graphique | Formes vectorielles dessinées en code ; remplacer l'escargot par un sprite (SpriteCook ou dessiné) après M2 |
| Nom définitif | « Escargot Express » provisoire ; vérifier la disponibilité (stores, INPI/EUIPO, nom de domaine) avant M3 |
| Fuseau du défi quotidien | Minuit UTC |
| SDK pub/analytics au lancement | Décidé au lancement (CrazyGames SDK ou Playgama Bridge pour le web, AdMob pour Android) |
| Sons | Packs CC0 (par ex. Kenney) |
| Nom anglais | « Snail Trail » à tester face à « Escargot Express » |

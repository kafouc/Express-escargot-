# Escargot Express 🐌

Puzzle de chemin quotidien : guide un escargot à travers le jardin, passe par les feuilles numérotées dans l'ordre et couvre chaque case une seule fois.

- Cahier des charges complet : [`docs/brief.md`](docs/brief.md)
- Plan de lancement : [`docs/plan-lancement.md`](docs/plan-lancement.md)

## Prérequis

- Node.js **22.18 ou plus récent** (exécute directement le TypeScript)

### Avec GitHub Codespaces

Bouton **Code → Codespaces → Create codespace**. Node 22 et les dépendances s'installent automatiquement (`.devcontainer/`).

Pour **jouer** : `npm run dev` dans le terminal, puis ouvre le port **5173** (onglet *Ports* → icône 🌐). Le jeu s'ouvre dans le navigateur.

## Commandes

```bash
npm install          # installe les dépendances
npm run dev          # lance le jeu sur http://localhost:5173
npm run build        # version optimisée dans dist/
npm test             # lance les tests (Vitest)
npm run typecheck    # vérifie les types
npm run gen          # génère levels/campaign.json et levels/daily.json (~4 min)
npm run show -- c-0042               # affiche un niveau dans le terminal
npm run show -- 2026-12-06 --solution
```

### Options du générateur

```bash
npm run gen -- --campaign 200 --daily 730 --daily-start 2026-12-01
npm run gen -- --size 6 --count 50 --seed 123   # lot libre dans levels/batch.json
```

## Structure

```
src/core/        moteur partagé (jeu + outils) : grille, solveur, générateur, difficulté
src/game/        le jeu : règles, rendu canvas, animaux, sons, textes FR/EN, défi du jour, écran, sauvegarde
src/monetization/ pubs (interface + version simulée, règles des interstitiels)
src/analytics/   événements analytics (interface + version simulée)
index.html       page du jeu (Vite)
tools/levelgen/  CLI de génération et de validation des niveaux
levels/          niveaux générés (JSON)
tests/           tests Vitest
docs/            cahier des charges et plan de lancement
```

## Jalons

| Jalon | Contenu | État |
|---|---|---|
| M0 | Outil de contenu : générateur + solveur, 200 + 730 niveaux validés | ✅ fait |
| M1 | Boucle de jeu jouable dans le navigateur | ✅ fait |
| M2 | Effets, sons et vibrations, défi du jour et série, partage, FR/EN, pubs et analytics simulées | ✅ fait |
| M3 | Builds web + Android | à faire |

## Personnalisation

Bouton palette en haut : choix de l'animal et de la couleur des feuilles. Les 7 animaux (escargot, chenille, tortue, coccinelle, hérisson, lapin, poussin) sont dessinés en code dans `src/game/animals.ts` et animés partie par partie ; ils se débloquent en avançant dans la campagne.

## Astuces de test

- `?level=95` ouvre directement le niveau 95, `?all=1` débloque tous les niveaux et tous les animaux.
- `?mode=daily` ouvre le défi du jour (avant le 1er décembre 2026 : aperçu du premier défi).
- `?fast=1` propose « Passer ce niveau » au bout de 5 s au lieu de 3 min.
- Dans la console du navigateur : `__analytics.events` liste tous les événements envoyés.
- Les pubs sont simulées : un message « Publicité simulée » s'affiche à la place.

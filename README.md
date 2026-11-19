# Escargot Express 🐌

Puzzle de chemin quotidien : guide un escargot à travers le jardin, passe par les feuilles numérotées dans l'ordre et couvre chaque case une seule fois.

- Cahier des charges complet : [`docs/brief.md`](docs/brief.md)
- Plan de lancement : [`docs/plan-lancement.md`](docs/plan-lancement.md)

## Prérequis

- Node.js **22.18 ou plus récent** (exécute directement le TypeScript)

## Commandes

```bash
npm install          # installe les dépendances
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
tools/levelgen/  CLI de génération et de validation des niveaux
levels/          niveaux générés (JSON)
tests/           tests Vitest
docs/            cahier des charges et plan de lancement
```

## Jalons

| Jalon | Contenu | État |
|---|---|---|
| M0 | Outil de contenu : générateur + solveur, 200 + 730 niveaux validés | ✅ fait |
| M1 | Boucle de jeu en gris | à faire |
| M2 | Juice, contenu, défi du jour, partage, EN/FR, stubs pub/analytics | à faire |
| M3 | Builds web + Android | à faire |

---
name: frontend-design-direction
description: Fixe une direction de design explicite avant toute décision d'UI/UX ou de réorganisation (navigation, layout, composants) via une grille en 5 axes — Purpose, Audience, Tone, Memorable detail, Constraints. Utiliser avant d'auditer ou de modifier une interface, pour éviter les choix par défaut non justifiés et garder les décisions traçables à un brief explicite.
metadata:
  author: kilio
  version: "1.0.0"
---

# Frontend Design Direction

Avant de proposer ou d'appliquer un changement d'UI/UX, expliciter une direction de design en 5 axes. Ne pas sauter cette étape même pour une évolution qui semble mineure (réordonner une nav, déplacer un item) : la grille sert à distinguer une correction justifiée d'un choix par défaut arbitraire.

## La grille

1. **Purpose** — quel est le job concret de cet écran/flux pour l'utilisateur, ici et maintenant ? Pas une description générique ("permettre de naviguer") mais l'usage réel visé.
2. **Audience** — qui l'utilise, avec quelle fréquence, quel niveau de familiarité ? Un outil mono-utilisateur à usage quotidien n'a pas les mêmes besoins qu'un produit grand public en découverte occasionnelle.
3. **Tone** — quel registre visuel et interactionnel sert ce Purpose/Audience ? (ex. dense et utilitaire vs. spacieux et pédagogique). Le tone contraint les choix de densité, d'animation, de decorum.
4. **Memorable detail** — s'il y a un seul endroit où investir un choix distinctif ou un effort supplémentaire, lequel, et pourquoi celui-là plutôt qu'un autre ? Le reste doit rester discret.
5. **Constraints** — quelles conventions, systèmes ou décisions déjà en place doivent être respectés et non dupliqués (design system existant, mécanismes de personnalisation déjà présents, patterns établis) ?

## Comment l'utiliser

- Écrire les 5 axes explicitement (même en 1-2 lignes chacun) avant de faire des recommandations ou des changements.
- Toute correction proposée doit se justifier par rapport à au moins un axe (ex. "viole Purpose : ajoute 2 taps à un accès quotidien" ou "viole Constraints : duplique un mécanisme existant").
- Les changements structurants (réorganisation profonde, changement des éléments épinglés/mis en avant par défaut) doivent être signalés comme options séparées, pas appliqués unilatéralement, sauf si Purpose/Audience les rend évidents et sans ambiguïté.
- Ne pas ajouter de flourish (animation, ornement, information redondante) qui ne sert aucun des 5 axes.

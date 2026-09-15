---
target: journal-nutrition
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
target_identity: "file:/home/user/kilio/src/app/(app)/nutrition/journal/page.tsx"
target_fingerprint: "sha256:3b148b7114d5528ff957ab9520c51e0a1192417a0992911e799cba6de980b941"
target_path: /home/user/kilio/src/app/(app)/nutrition/journal/page.tsx
timestamp: 2026-09-15T07-36-45Z
slug: src-app-app-nutrition-journal-page-tsx
---
Method: dual-agent (A: a0f41dea95af613a3 · B: a8f099716eeab989e)

## Score de santé design

| # | Heuristique | Score | Point clé |
|---|---|---|---|
| 1 | Visibilité du statut système | 2 | Feedback de sauvegarde/suppression ok (`ObjectifForm.tsx:100`, `useOptimistic`), mais aucun statut pour l'action principale (ajouter un repas) car elle n'a pas d'UI |
| 2 | Correspondance système/monde réel | 3 | Vocabulaire fidèle au quotidien de Vincent (Petit-déj/Déjeuner/Dîner/Collation, Repos/Entraînement) |
| 3 | Contrôle et liberté utilisateur | 1 | Suppression via `window.confirm()` natif sans annulation possible ; aucune liberté d'ajouter/éditer un repas depuis l'écran |
| 4 | Cohérence et standards | 3 | Bonne discipline de tokens (`src/lib/ui.ts`) partout |
| 5 | Prévention des erreurs | 2 | `min="0"` sur les champs objectif mais pas de `max` — cibles absurdes acceptées silencieusement |
| 6 | Reconnaissance plutôt que rappel | 3 | `defaultValue` pré-rempli sur tous les champs d'objectif |
| 7 | Flexibilité et efficacité | 0 | Le produit revendique une saisie rapide "one-handed" — l'écran n'a aucun raccourci et, pire, aucun chemin de saisie du tout |
| 8 | Design esthétique et minimaliste | 4 | Exécution fidèle au "tableau de bord doux" : une ombre, rayons croissants, deux polices |
| 9 | Aide à la reconnaissance/récupération d'erreurs | 2 | Erreurs brutes/génériques, pas de retry actionnable |
| 10 | Aide et documentation | 1 | Aucune aide nulle part, y compris là où elle manquerait le plus (comment logger un repas) |
| **Total** | | **21/40** | **Acceptable — mais tiré vers le bas par un problème bloquant** |

## Verdict de spécificité design

**LLM :** Générique avec une couche de peinture de marque. Structurellement, c'est un clone interchangeable de MyFitnessPal (anneau kcal + 3 barres macro + liste de repas). Les touches Kilio sont réelles (palette OKLCH olive, toggle Repos/Entraînement mappé au modèle `jour_type_ppl`, gestion des aliments "pièce") mais cosmétiques. Le vrai argument différenciant énoncé dans PRODUCT.md — l'intégration native avec le module Recettes — est invisible sur cet écran : aucun raccourci "logger cette recette" nulle part.

**Scan déterministe :** `impeccable detect` sort clean (exit 0) sur le dossier journal et sur `NutritionSubNav.tsx`/`BottomNav.tsx`, avec 7 signalements advisory (règle unique `design-system-font-size`) sur des tailles `text-[…px]` (10px, 10.5px, 11px, 13.5px) hors de la rampe typographique documentée. Ce ne sont probablement pas de vraies dérives : DESIGN.md vient d'être rédigé à partir de ce même code, regroupé en catégories descriptives (Caption 10–12px) plutôt que figé valeur par valeur — le détecteur compare le code à une rampe pas assez granulaire, pas l'inverse. Aucune autre règle (a11y, anti-pattern, erreur) ne s'est déclenchée.

**Preuves navigateur :** la page ne peut pas être rendue dans cet environnement — `createAdminClient()` échoue avec "supabaseKey is required." (pas de `SUPABASE_SERVICE_ROLE_KEY` configurée), dans le layout et dans `JournalPage`. Point positif : l'app intercepte proprement l'erreur via son propre `error.tsx` plutôt que de laisser fuir une stack trace — mais cette critique repose donc sur la lecture du code, pas sur un rendu réel vérifié à l'écran.

## Impression générale

La couche visuelle est soignée et cohérente avec DESIGN.md. Mais l'action d'ajouter un repas n'existe dans l'UI nulle part. `addJournalEntry` (`src/app/actions/journal.ts`) est une Server Action complète et validée, mais n'a aucun appelant dans tout `src/`. PRODUCT.md signalait déjà un doute à ce sujet — la revue le confirme : ce n'est pas un doute, c'est un vide total.

## Points forts

- **`ObjectifForm.tsx:17-26`** — le formulaire d'objectif se replie en simple lien "Modifier l'objectif" une fois une cible définie.
- **`page.tsx:60-76`** — la gestion des aliments à l'unité "pièce" (stockage en grammes, réaffichage "120 g (≈ 2 pièces)") est une vraie attention au modèle mental de Vincent.
- **`JournalEntriesList.tsx:72-86`** — suppression optimiste via `useOptimistic` malgré une page Server Component pilotée par l'URL.

## Problèmes prioritaires

**[P0] Aucune UI pour ajouter un repas n'est reliée au code qui existe pour ça**
- Pourquoi ça compte : logger un repas est la tâche que PRODUCT.md définit comme le "succès" de cet écran.
- Fix : construire un point d'entrée "Ajouter un repas" branché sur `addJournalEntry` — `addCard`/`addCardIcon` existent déjà, inutilisés, dans `src/lib/ui.ts:34-37`. Exposer aussi "Ajouter au journal" depuis la fiche d'une recette.
- Commande suggérée : `/impeccable harden`

**[P1] Le geste de swipe (changement de jour) n'a aucune zone d'exclusion sur la liste/le formulaire**
- Pourquoi ça compte : un drag imprécis peut être lu comme un swipe de jour pendant une suppression ou une saisie.
- Fix : marquer la liste et les champs en `data-swipe-ignore`.
- Commande suggérée : `/impeccable harden`

**[P2] Confirmation de suppression via `window.confirm()` natif**
- Fix : remplacer par une feuille de confirmation stylée avec les tokens existants.
- Commande suggérée : `/impeccable polish`

**[P2] Messages d'erreur bruts et non actionnables**
- Fix : humaniser les messages, ajouter un retry inline sur le toast.
- Commande suggérée : `/impeccable clarify`

**[P3] Style de dépassement d'objectif "alarmant" et non gradué**
- Fix : graduer la sévérité, adoucir la copie, envisager une moyenne glissante sur 7 jours.
- Commande suggérée : `/impeccable delight`

## Signaux d'alerte par persona

**Casey** : rien à taper pour logger un repas (P0) ; swipe de jour peut interrompre une suppression (P1) ; `window.confirm()` natif sans annulation.

**Riley** : état vide sans action malgré le motif `addCard` existant ; pas de `max` sur les champs objectif, et la barre clampée à 100% masque un dépassement réel.

**Sam** : toggle Repos/Entraînement sans `aria-current` ; dépassement de macro communiqué uniquement par couleur ; flèches de navigation 34×34px sous le minimum tactile de 44×44px.

## Observations mineures

- Icône d'état vide générique, sans lien visuel avec "repas".
- Champs `type="number"` sans `inputMode`.
- Date formatée en dur en `fr-FR`.

## Questions à se poser

- À quoi ressemblerait cet écran si logger une recette était à un tap depuis sa fiche ?
- Par quoi le bouton "+" a-t-il été remplacé jusqu'ici, et ce flux réel devrait-il devenir la spec de l'UI ?
- Un cadrage hebdomadaire glissant changerait-il la relation de Vincent à cet écran ?

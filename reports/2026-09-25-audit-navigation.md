# Audit navigation — 2026-09-25

## Direction de design appliquée (`frontend-design-direction`)

- **Purpose** : accès rapide aux modules à usage fréquent au quotidien.
- **Audience** : mono-utilisateur (Vincent), usage répété, pas de découverte occasionnelle.
- **Tone** : dense, calme, utilitaire — pas de flourish décoratif.
- **Memorable detail** : aucun nouveau. Le pill actif de `BottomNav` (déjà existant) reste le seul point d'accent motion ; rien à ajouter par-dessus sans violer le Tone.
- **Constraints** : conventions Kilio existantes ; ne pas dupliquer le système de personnalisation `preferences_navigation` déjà en place (`resolveOrdreGrillePlus` / `resolveModulesBarreBasse`, drag-and-drop dans `NavigationEditContext`).

## 1. Diagnostic chiffré

### Registre (`src/lib/navigation/registry.ts`)

13 items au total. 4 épinglés par défaut en barre du bas (`DEFAULT_MODULES_BARRE_BASSE`) : Accueil (`/`), Nutrition, Tâches, Habitudes. Les 9 autres (Agenda, Courses, Budget, Objectifs, Collection, Notes, Réglages, Carburants, Documents) sont accessibles via `/plus` (`ModulesGrid`), dans l'ordre du registre par défaut, réordonnable par Vincent.

### Taps jusqu'au contenu réellement utile (pas juste la racine)

Pour les 9 modules non épinglés, le chemin est identique : **Accueil → tap "Plus" (1) → tap la tuile du module (2)**. Vérification faite sur chaque `page.tsx` racine, pas seulement son existence :

| Module | Racine = contenu utile ? | Taps jusqu'au contenu utile |
|---|---|---|
| Agenda | Oui — vue calendrier directement | **2** |
| Courses | Oui — liste de courses directement | **2** |
| Budget | Oui — résumé du mois + suivi catégories directement (sous-vues `calendrier`/`categories`/`comptes`/`recurrentes`/`statistiques`/`transactions` sont des extras, pas le contenu de base) | **2** |
| Objectifs | Racine = liste des objectifs (contenu utile en soi, comme Tâches) ; ouvrir un objectif précis (`/objectifs/[id]`) | **2** (liste) / **3** (un objectif précis) |
| Collection | Racine = liste des collections ; ouvrir une collection (`/collection/[id]`) | **2** (liste) / **3** (une collection précise) |
| Notes | Oui — liste de notes directement | **2** |
| Réglages | Oui — les réglages sont sur la racine | **2** |
| Carburants | Oui — vue directement | **2** |
| Documents | Racine = liste des documents ; ouvrir un document (`/documents/[id]`) ou les étiquettes (`/documents/etiquettes`) | **2** (liste) / **3** (un document ou les étiquettes) |

**Constat** : aucune incohérence structurante entre modules — le coût d'accès (2 taps pour l'écran utile, 3 pour un item précis dans les 3 modules à drill-down) est uniforme. Le "Purpose" (accès rapide au quotidien) n'est donc pas cassé par la profondeur d'un module en particulier ; la vraie friction est ailleurs (voir §2).

### Découvrabilité du système de personnalisation

`preferences_navigation` (drag-and-drop pour réordonner la grille "Plus" et pour épingler en barre du bas, appui long ~400ms pour entrer en mode édition — voir `NavigationEditContext.tsx`) n'est mentionné **nulle part dans l'UI** :
- Aucune indication sur `/plus` (page vérifiée : titre + bouton "Terminé" qui n'apparaît qu'une fois déjà en train d'éditer).
- Aucune mention dans `/reglages` (profil, apparence, notifications, nettoyage auto — rien sur la navigation).
- Aucun onboarding, tooltip ou première-utilisation.

**Verdict : le système existe et fonctionne, mais il est totalement enterré.** Le seul moyen de le découvrir est de faire un appui long par hasard sur une tuile.

## 2. Corrections sûres appliquées

**Une seule correction**, strictement conforme à la grille (Purpose : rendre le mécanisme existant utilisable sans qu'il faille le découvrir par hasard ; Constraints : ne duplique rien, ajoute juste un indice textuel sur un mécanisme déjà en place) :

- `src/app/(app)/plus/page.tsx` : ajout d'une ligne de texte discrète (style `eyebrow`, cohérent avec le Tone dense/utilitaire — aucune nouvelle couleur, animation ou composant) sous le titre "Plus" : *"Appui long sur une tuile pour la réorganiser ou l'épingler en barre du bas"*.

Aucune autre modification de code. Aucun des 4 modules épinglés par défaut n'a été touché. Aucune réorganisation de `NAV_ITEMS` n'a été appliquée (voir §3 — signalé comme option, pas tranché).

Je n'ai pas trouvé de preuve solide d'un "item mal placé" dans la grille "Plus" qui soit une friction évidente et sûre à corriger unilatéralement (voir option 2 ci-dessous pour la piste identifiée mais non tranchée).

## 3. Propositions structurantes identifiées, non appliquées

Classées par ordre de priorité, la plus probable en premier :

1. **(Le plus probable) Ajouter un raccourci "Personnaliser la navigation" visible dans Réglages**, en plus de l'indice ajouté sur `/plus` — par exemple une ligne dans `/reglages` qui renvoie vers `/plus` avec un court texte explicatif. Ça ne duplique rien (même mécanisme, juste un second point d'entrée découvrable), mais c'est un changement d'UI un peu plus visible qu'un simple texte, donc je le signale plutôt que de l'appliquer seul.
2. **Réordonner `NAV_ITEMS` pour sortir "Réglages" du milieu de la grille "Plus"** (aujourd'hui il est mélangé entre Notes et Carburants/Documents, alors qu'il est de nature différente — configuration système, pas contenu à usage quotidien). Le déplacer en toute dernière position rendrait le balayage visuel plus cohérent (regrouper "contenu" vs "système"). Non appliqué : c'est un changement de l'ordre par défaut, potentiellement déjà supplanté par un ordre personnalisé sauvegardé par Vincent en base — risque de changement invisible ou, à l'inverse, de changement perçu comme arbitraire sans qu'il l'ait demandé.
3. **(Structurant, nécessite validation explicite) Remplacer un module épinglé par défaut.** Si l'usage réel de Vincent diffère de l'hypothèse par défaut (ex. Budget consulté plus souvent qu'Habitudes), épingler Budget à la place d'Habitudes réduirait son coût d'accès de 2 à 1 tap. Je n'ai aucune donnée d'usage réel pour trancher ça, et la consigne est explicite : ne pas le faire sans validation de Vincent. Le système de personnalisation permet déjà de le faire soi-même (glisser une tuile de `/plus` sur un des 4 emplacements de la barre du bas) — ce qui renforce d'ailleurs la priorité de l'option 1 (rendre ce geste découvrable) avant d'en décider à la place de Vincent.

## 4. Vérifications (Phase 3)

- `npx tsc --noEmit` : ✅ aucune erreur.
- `npm run lint` (ESLint) : ✅ aucune erreur.
- `npm run build` : ⚠️ échoue sur `/budget/comptes` avec `Error: supabaseKey is required` — confirmé **pré-existant et sans rapport avec ce changement** (même échec reproduit sur `origin/kilio` avant toute modification, via `git stash`). Cause : `SUPABASE_SERVICE_ROLE_KEY` absente de cet environnement sandbox, pas un problème de code.

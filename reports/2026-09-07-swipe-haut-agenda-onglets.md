# Agenda — swipe entre onglets épinglés via une bande dédiée en haut d'écran — 2026-09-07

## Contexte

`git fetch origin kilio && git reset --hard origin/kilio` : mise à jour effectuée avant modification (la branche locale précédente avait divergé de `origin/kilio`, `origin/kilio` fait foi). Nouvelle branche `claude/agenda-top-swipe-tabs-9m0h7e` créée depuis `origin/kilio` (`346cbbc`).

## Problème initial

`/agenda` est exclu du swipe entre onglets épinglés (`ROUTES_SWIPE_INTERNE` dans `TabSwipeWrapper.tsx`) car il possède son propre swipe horizontal interne (changement de jour/semaine/mois, attaché sur un `<div>` dans `AgendaView.tsx`, sous le sélecteur de vues). Attacher les deux détections sur `<main>` en même temps aurait fait entrer les deux gestes en conflit.

Conséquence : sur `/agenda`, aucun moyen de swiper directement vers un onglet voisin — il fallait passer par la barre de navigation du bas.

## Vérification des hypothèses de la Phase 1

Toutes confirmées exactes dans le code avant implémentation :
- `TabSwipeWrapper` enrobe `<main>` (`paddingTop: calc(env(safe-area-inset-top) + 64px)`), et n'attache `useSwipeHorizontal` sur `<main>` que si l'onglet courant est épinglé **et** hors `ROUTES_SWIPE_INTERNE` (variable `actif`).
- `/agenda` étant dans `ROUTES_SWIPE_INTERNE`, `<main>` n'avait aucun handler de swipe sur cette route — la bande de padding top y était une zone morte.
- Le swipe interne jour/semaine/mois est attaché sur un `<div>` interne à `AgendaView.tsx`, sous le sélecteur de vues, jamais sur la bande top.

Aucun écart constaté par rapport à ces hypothèses.

## Solution

Dans `src/components/TabSwipeWrapper.tsx` :

1. **Constante partagée `HAUTEUR_ZONE_HAUT_PX = 64`** : extrait la valeur `64px`, auparavant en dur dans le `paddingTop` de `<main>`, réutilisée aussi pour la hauteur de la nouvelle zone — plus de risque de divergence entre les deux.

2. **Nouvelle zone de swipe dédiée** : un `<div>` `fixed`, `inset-x-0 top-0`, hauteur `calc(env(safe-area-inset-top) + 64px)` (exactement la bande vide au-dessus du sélecteur de vues Jour/Semaine/Mois/Liste, jamais sur le corps du calendrier). Rendue uniquement quand `ROUTES_SWIPE_INTERNE.includes(pathname) && modulesBarreBasse.includes(pathname)` — l'inverse exact de la condition `actif` qui désactive le swipe sur `<main>` sur ces routes. Comme `<main>` n'a alors aucun handler attaché, pas de risque de double détection.
   - Réutilise une seconde instance de `useSwipeHorizontal(handleSwipe)` (même `handleSwipe` que celui de `<main>` — pas de duplication de la logique de navigation).
   - `z-30`, sous le `ThemeToggle` (`z-40`, `fixed` en haut à droite dans `layout.tsx`) : le bouton reste cliquable par-dessus.
   - Transparente, aucun contenu visuel, aucun `preventDefault` (hérité de `useSwipeHorizontal`, qui ne bloque jamais le scroll vertical).

3. **Bug détecté et corrigé en cours d'implémentation** : `handleSwipe` avait initialement un garde `if (!actif) return;`. Or `actif` vaut `false` sur `/agenda` par construction (c'est précisément ce qui désactive le swipe sur `<main>` sur cette route) — appeler `handleSwipe` depuis la nouvelle zone y aurait donc toujours été un no-op silencieux. Le garde a été changé pour `if (indexOngletActif === -1) return;`, qui capture la seule condition réellement nécessaire à la navigation (l'onglet courant doit être dans `modulesBarreBasse`), vraie aussi bien pour `<main>` (`actif`) que pour la nouvelle zone (`zoneSwipeHautActive`).

4. **Aucune modification** de `AgendaView.tsx`, `WeekView.tsx`, `DayView.tsx`, `MonthView.tsx`, `ListView.tsx` : la nouvelle zone vit dans `TabSwipeWrapper` (au-dessus/en dehors d'`AgendaView`), donc automatiquement présente sur les 4 vues sans dépendre de l'état `view` interne à l'agenda.

5. **Commentaire au-dessus de `ROUTES_SWIPE_INTERNE`** mis à jour pour documenter la bande top comme porte de sortie du conflit décrit.

## Fichiers touchés

- `src/components/TabSwipeWrapper.tsx` (seul fichier modifié)

## Vérifications (Phase 3)

- `npx tsc --noEmit` : ✅ aucune erreur (après un premier run ayant révélé que `node_modules` n'était pas installé dans cet environnement frais — `npm install` effectué — puis qu'une erreur `Cannot find name 'LayoutProps'` sur `src/app/layout.tsx` était due à l'absence des types de routes générés par Next.js tant qu'aucun `next build`/`next dev` n'avait tourné ; sans lien avec ce changement, résolue par le build).
- `npx eslint .` : ✅ aucune erreur.
- `npm run build` : ✅ build de production réussi (Next.js 16.3.3 / Turbopack), toutes les routes compilées y compris `/agenda`.

## Écarts par rapport aux hypothèses de la Phase 1

Aucun écart sur les hypothèses elles-mêmes. Le seul point non anticipé dans la Phase 1 est le bug de garde sur `handleSwipe` (`actif` vs `indexOngletActif`), détecté et corrigé pendant l'implémentation avant de lancer les vérifications.

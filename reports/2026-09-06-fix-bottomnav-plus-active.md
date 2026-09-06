# Correction : le bouton "Plus" ne s'allumait pas sur /plus

## Contexte

Dans `BottomNav.tsx`, le bouton "Plus" doit s'allumer (fond `ActivePill`,
couleur `var(--accent-kcal)`, label en gras) chaque fois qu'on se trouve sur
un onglet qui n'est pas l'un des 4 modules épinglés en barre du bas. Ce
comportement fonctionnait pour un onglet non épinglé comme `/agenda`, mais
pas pour `/plus` elle-même : en y naviguant, le bouton restait gris
(`var(--ink-3)`), sans `ActivePill` ni label en gras.

## Cause racine

`plusActive` dépendait uniquement de :

```tsx
const activeItemHref = resolveActiveHref(pathname);
const plusActive = activeItemHref !== null && !modulesBarreBasse.includes(activeItemHref);
```

`resolveActiveHref` (`src/lib/navigation/registry.ts`) résout un pathname en
cherchant une correspondance dans `NAV_ITEMS`, le registre des 11 modules
navigables (Accueil, Nutrition, Tâches, Habitudes, Agenda, Courses, Budget,
Objectifs, Collection, Notes, Réglages). `/plus` n'est **pas** un item de ce
registre — c'est la page qui liste tous les modules non épinglés — donc
`resolveActiveHref("/plus")` renvoie toujours `null`. Or `plusActive` exige
`activeItemHref !== null`, ce qui le forçait à `false` précisément sur la
page `/plus`.

## Correctif

Dans `BottomNav.tsx`, `plusActive` est désormais vrai soit quand `pathname`
correspond à `/plus` (ou une sous-route), soit dans le cas déjà géré
(onglet résolu non épinglé) :

```tsx
const plusActive =
  pathname === "/plus" ||
  pathname.startsWith("/plus/") ||
  (activeItemHref !== null && !modulesBarreBasse.includes(activeItemHref));
```

`ordreVisuel` / `indexVisuel` (qui déterminent le sens du slide lors de la
navigation) n'ont pas été modifiés : ils dépendent de `activeItemHref`, qui
reste `null` sur `/plus` exactement comme avant — `indexVisuel(null)`
retourne déjà l'index de `/plus` (dernier de `ordreVisuel`), donc le calcul
de direction et l'animation `layoutId` du pill (`ACTIVE_PILL_LAYOUT_ID`)
restent inchangés lors d'une navigation vers/depuis `/plus`.

## Fichiers modifiés

- `src/components/BottomNav.tsx` (calcul de `plusActive`)

## Vérifications (Phase 3)

- `npx tsc --noEmit` : aucune erreur (après un premier `next build` qui
  régénère les types Next.js sous `.next/types`, requis avant toute
  vérification `tsc` isolée dans un environnement fraîchement cloné).
- `npx eslint src/components/BottomNav.tsx` : aucune erreur, aucun warning.
- `npm run build` (`next build`, Turbopack) : build de production réussi,
  compilation et vérification TypeScript intégrées passées sans erreur, 27
  routes générées normalement (dont `/plus`).
- Test manuel : le serveur de dev (`next dev`) n'a pas pu atteindre
  Supabase depuis cet environnement sandbox distant (« Host not in
  allowlist: *.supabase.co »), ce qui empêche tout rendu de page nécessitant
  des données (y compris `/`, `/agenda`, `/plus` via le layout qui charge
  `preferences_navigation`). Un test visuel dans un vrai navigateur n'a donc
  pas pu être effectué dans cette session. À la place, la logique de
  `plusActive` a été extraite et rejouée isolément (script Node autonome,
  sans dépendance React/Supabase) sur 8 cas couvrant : `/plus`, une
  sous-route `/plus/...`, un onglet non épinglé (`/agenda`, `/reglages`),
  l'accueil et un onglet épinglés, une sous-route d'un onglet épinglé, et
  un onglet réépinglé dynamiquement (`/agenda` remplaçant `/nutrition`) —
  tous les cas produisent le résultat attendu, y compris le cas du bug
  (`/plus` → `true`) et l'absence de régression sur les cas déjà corrects.
  Une vérification visuelle réelle sur `/plus` reste recommandée dès que
  l'app est testée dans un environnement avec accès réseau à Supabase (ex.
  déploiement Vercel preview).

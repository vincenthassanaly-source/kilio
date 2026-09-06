# Widget météo dans le header de l'accueil — 2026-09-06

## Constats de la Phase 1

- `git fetch origin kilio && git reset --hard origin/kilio` : session synchronisée sur `origin/kilio` (`da24daf`, transitions directionnelles + restauration du scroll + optimistic UI Objectifs), aucun rattrapage nécessaire.
- Relecture de `src/app/(app)/page.tsx` : header rendu de façon statique et instantanée par `DashboardPage` (non `async`, aucun `await` avant le retour du JSX), conformément au commentaire en tête de fichier et à `reports/2026-09-04-dashboard-streaming-par-section.md`.
- Relecture de `DashboardView.tsx`, `DashboardTachesCard.tsx`/`DashboardTachesSection.tsx` : pattern Card (Server Component `async` indépendant, un par section, wrappé dans son propre `<Suspense>`) / Section (Client Component si interaction nécessaire). Les cartes existantes utilisent `@tanstack/react-query` pour l'hydratation ; ce n'était pas pertinent ici car il n'y a ni mutation ni besoin de refetch côté client — le widget météo suit un flux plus simple : `MeteoHeaderCard` (Server, `async`) appelle directement `getMeteoJour()` et passe le résultat en props à `MeteoHeaderWidget` (Client).
- Relecture de `src/components/Modal.tsx` : réutilisé tel quel (`title`, `onClose`, `children`), aucune modification.
- Relecture de `src/lib/ui.ts` : `pillTag` et `eyebrow` réutilisés pour rester visuellement cohérent avec le reste du dashboard.
- Feature de lecture externe pure (Open-Meteo), aucune écriture Supabase : pas de migration, pas de vérification MCP Supabase nécessaire.

## Fichiers créés

- **`src/lib/meteo/compute.ts`** : `interpreterCodeMeteo(code)`, fonction pure mappant un code météo WMO vers `{ label, icone }` (pattern du module `src/lib/nutrition/compute.ts`, aucune dépendance externe, testable isolément).
- **`src/app/actions/meteo.ts`** (`"use server"`) : `getMeteoJour()`, fetch vers Open-Meteo (Marseille, coordonnées en dur), `fetch(url, { next: { revalidate: 1800 } })` pour un cache 30 min côté Next.js. Parse la réponse et renvoie un objet `MeteoJour` typé (température actuelle, min/max du jour, ressenti min/max, code météo courant, vent, humidité, 8 prochaines heures de prévisions). Toute erreur (réseau, réponse non-`ok`, JSON malformé) est interceptée par un `try/catch` global qui renvoie `null`.
- **`src/app/(app)/MeteoHeaderCard.tsx`** : Server Component `async` indépendant, appelle `getMeteoJour()` ; renvoie `null` si l'appel échoue (le header reste fonctionnel sans météo), sinon délègue l'affichage à `MeteoHeaderWidget`.
- **`src/app/(app)/MeteoHeaderWidget.tsx`** (`"use client"`) : pilule compacte (`pillTag`) affichant icône + `min°/max°`, `onClick` ouvre `MeteoDetailModal` via un state local `isOpen`.
- **`src/app/(app)/MeteoDetailModal.tsx`** (`"use client"`) : réutilise `Modal` (`title="Météo — Marseille"`) ; affiche condition + température actuelle, ressenti min/max, vent, humidité (grille de 3 cartes), puis une liste défilante horizontalement des prévisions horaires (icône + heure + température par créneau).

## Fichier modifié

- **`src/app/(app)/page.tsx`** : ajout d'un `<Suspense fallback={<Skeleton className="h-6 w-20 rounded-full" />}><MeteoHeaderCard /></Suspense>` à côté du `dateLabel`, dans une nouvelle `<div className="flex items-center gap-2">` englobant date + pilule météo. `DashboardPage` reste une fonction **non-`async`**, sans aucun `await` avant le `return` : seul le widget météo, isolé dans son propre `<Suspense>`, peut suspendre — le reste du header (date, salutation) et le reste de la page restent instantanés, exactement comme avant.

## Choix de cache

`revalidate: 1800` (30 min) sur le `fetch` Open-Meteo : la météo n'a pas besoin d'être temps réel à la seconde, et ça limite le nombre d'appels à l'API externe (gratuite mais sans SLA) tout en gardant l'affichage raisonnablement à jour dans la journée.

## Mapping des codes météo (WMO → français)

| Code(s) | Libellé | Icône |
|---|---|---|
| 0 | Ciel dégagé | ☀️ |
| 1, 2 | Peu nuageux | 🌤️ |
| 3 | Couvert | ☁️ |
| 45, 48 | Brouillard | 🌫️ |
| 51, 53, 55 | Bruine | 🌦️ |
| 61, 63, 65 | Pluie | 🌧️ |
| 71, 73, 75, 77 | Neige | 🌨️ |
| 80, 81, 82 | Averses | 🌦️ |
| 95, 96, 99 | Orage | ⛈️ |
| autre | Météo indisponible | 🌡️ |

## Comportement en cas d'échec de l'API Open-Meteo

`getMeteoJour()` retourne `null` dans tous les cas d'échec (erreur réseau, timeout, réponse HTTP non-`ok`, JSON invalide) grâce à un `try/catch` englobant. `MeteoHeaderCard` renvoie alors `null` : aucune pilule météo ne s'affiche à côté de la date, mais le reste du header (date, salutation) et la page entière restent parfaitement fonctionnels — aucune erreur ne remonte, aucun crash du dashboard.

## Vérification (Phase 3)

- `npm install` : dépendances absentes dans l'environnement de session, installées avant vérification (394 paquets, 0 vulnérabilité).
- `npx tsc --noEmit` : avant tout build, une seule erreur préexistante et non liée (`src/app/layout.tsx(41,50): Cannot find name 'LayoutProps'`), confirmée identique sur `HEAD` avant modification (via `git stash`) — type généré par `next build`/`next dev`, absent tant qu'aucun build n'a eu lieu dans l'environnement. Après `npm run build` (qui régénère les types Next.js), `npx tsc --noEmit` ne renvoie plus aucune erreur.
- `npx eslint .` : aucune erreur, aucun avertissement.
- `npm run build` : build de production réussi (Turbopack), toutes les routes générées sans erreur, y compris `/` (dynamique, comme attendu).
- Vérification du pattern de streaming : `DashboardPage` dans `page.tsx` reste une fonction synchrone, sans `async` ni `await` avant son `return` — seul `MeteoHeaderCard`, wrappé dans son propre `<Suspense>`, est `async` et peut suspendre pendant l'appel à Open-Meteo, sans bloquer le rendu du reste du header ni de la page.

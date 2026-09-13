# Recherche insensible aux accents + persistance renforcée du thème

Date : 2026-09-13

Deux correctifs demandés par Vincent : la recherche texte qui ratait les
recettes accentuées (« crepe » ne trouvait pas « crêpe »), et le thème
sombre qui repassait parfois en clair de façon imprévisible sur la PWA
installée (Android).

## A. Recherche insensible aux accents

Ajout de `src/lib/normalize.ts` :

```ts
export function normalizeSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
```

`NFD` décompose les caractères accentués en lettre de base + diacritique
combinant (`é` → `e` + `´`), et le `replace` retire ensuite ces
diacritiques (plage Unicode `U+0300`–`U+036F`).

Appliqué à la comparaison `term`/champ recherché (au lieu du simple
`.toLowerCase()`) dans les quatre écrans qui font une recherche texte
100 % client par `.includes()` :

- `src/app/(app)/nutrition/recettes/RecettesList.tsx` — nom + texte des
  ingrédients (`r.ingredientsText`, déjà construit en minuscule dans
  `page.tsx`, désormais aussi passé par `normalizeSearch`).
- `src/app/(app)/taches/TachesView.tsx` — titre + notes de la tâche.
- `src/app/(app)/documents/DocumentsBrowser.tsx` — nom, notes, catégorie,
  étiquette.
- `src/app/(app)/notes/NotesGrid.tsx` — titre, contenu, libellés des
  items de checklist, tags.

Le module Courses (`CoursesList.tsx`) n'a pas ce pattern de recherche
client, et le module Placard a été retiré du repo (cf.
`RAPPORT-suppression-aliments-placard-courses-2026-08-28.md`) — rien à
modifier de ce côté.

`src/app/actions/recherche.ts` (recherche globale, `GlobalSearchBar`)
fait une recherche **serveur** via `ilike` Postgres, pas un `.includes()`
JS : hors périmètre de ce correctif (nécessiterait un traitement au
niveau SQL, ex. extension `unaccent`) — non touché, conformément à la
consigne de ne pas étendre le scope.

Vérifié : `normalizeSearch("crepe")` correspond bien à
`normalizeSearch("Crêpe au sucre")`.

## B. Persistance du thème renforcée (cookie + localStorage)

Hypothèse retenue : en PWA installée sur Android, Chrome peut purger le
`localStorage` d'une app peu prioritaire sous pression de stockage, et le
script anti-flash ne s'exécute qu'aux cold starts — d'où des retours
imprévisibles en thème clair malgré un choix « sombre » actif.

- `src/lib/theme.ts` — ajout de `THEME_COOKIE_KEY` (`"kilio-theme"`) et
  `THEME_COOKIE_MAX_AGE` (1 an). `themeInitScript` vérifie désormais la
  présence du cookie (`document.cookie`) avant d'agir : si le cookie est
  présent, la classe `dark` a déjà été posée côté serveur (SSR) et le
  script ne fait rien ; sinon il retombe sur `localStorage`, puis sur
  `prefers-color-scheme`. Ordre de priorité : cookie (SSR) >
  `localStorage` > préférence système.
- `src/components/ThemeToggle.tsx` — `toggleTheme()` écrit désormais la
  valeur choisie à la fois dans `localStorage` (inchangé) et dans un
  cookie `kilio-theme` (`path=/`, `max-age=31536000`, `SameSite=Lax`).
- `src/app/layout.tsx` — `RootLayout` devient async, lit le cookie via
  `cookies()` de `next/headers` et applique directement la classe `dark`
  sur `<html>` en SSR quand `kilio-theme=dark` est présent. Supprime le
  flash même sans attendre l'exécution du script inline (utile au retour
  au premier plan de la PWA, cas où le script anti-flash ne se
  ré-exécute pas).

Un cookie `SameSite=Lax` posé côté client (pas `httpOnly`) est lisible
par `cookies()` côté serveur sur la même requête suivante — comportement
standard, pas de configuration supplémentaire nécessaire.

`suppressHydrationWarning` sur `<html>` (déjà présent) couvre le seul
mismatch possible : le cookie appliqué en SSR peut différer de la
préférence système que le navigateur utiliserait par défaut avant tout
choix utilisateur. Confirmé par un build propre (`next build`) sans
avertissement d'hydratation ni erreur TypeScript.

## Vérification

- `npx tsc --noEmit` : aucune erreur.
- `npm run lint` (ESLint) : aucune erreur.
- `npm run build` (`next build`, Turbopack) : build réussi. Les routes
  (dont `/`) sont désormais toutes marquées dynamiques (`ƒ`), cohérent
  avec la lecture de `cookies()` dans le layout racine — l'app était déjà
  entièrement dynamique côté données (Supabase), aucun changement de
  comportement de rendu perceptible.
- Logique de normalisation vérifiée en isolation (Node) :
  `normalizeSearch("crepe")` est bien inclus dans
  `normalizeSearch("Crêpe au sucre")`.
- Test manuel dans un navigateur non disponible dans cet environnement ;
  le comportement recherche et la persistance du thème sont à confirmer
  par Vincent une fois déployé (notamment le scénario PWA Android en
  arrière-plan prolongé).

# Correction visuelle — sélection de collection dans /collection/partage/choisir — 2026-09-12

## Contexte du bug

Bug UX signalé par Vincent : sur `/collection/partage/choisir` (partage TikTok/photo vers une collection), la carte d'une collection existante (ex. « Déco appartement ») ressemblait visuellement à un champ déjà rempli, alors que c'est un bouton non encore sélectionné. Il fallait taper dessus avant de cliquer sur « Ajouter », sinon la Server Action refusait avec « Choisis une collection ou crée-en une nouvelle. » (`rattacherPhotoACollection`, `src/app/actions/collections.ts`) — comportement du formulaire correct, seul le style de l'état "non sélectionné" prêtait à confusion dans `ChoisirCollectionForm.tsx`.

Avant correction, la carte non sélectionnée réutilisait simplement `card` (`rounded-[22px] border border-line bg-surface p-4 shadow-card`), sans aucun indice visuel de sélectionnabilité, texte en couleur pleine (`text-ink` par défaut du `card`) — un rendu proche d'une valeur déjà renseignée plutôt que d'un bouton à activer.

## Choix retenu

Correction purement visuelle, comme demandé par Vincent : **pas de présélection automatique**, uniquement rendre évident que la carte est un bouton à taper tant qu'elle n'est pas sélectionnée. Aucune modification de la logique de state (`collectionId`, `nouvelleCollection`) ni de la Server Action.

Deux leviers combinés dans le bloc `collections.map(...)` :

1. **Icône de sélectionnabilité explicite** : cercle à droite de chaque carte, réutilisant la classe `checkCircle` déjà définie dans `src/lib/ui.ts` (`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2`) — jusqu'ici définie mais inutilisée. Le rendu du cercle et du check SVG à l'intérieur reprend fidèlement le pattern déjà établi par le composant `CheckToggle` (`src/components/CheckToggle.tsx`, utilisé dans Tâches/Courses/Notes/Objectifs) : contour vide (`border-line`, fond transparent) à l'état non sélectionné, cercle plein `bg-kcal`/`border-kcal` avec check blanc à l'état sélectionné. `CheckToggle` lui-même n'a pas pu être réutilisé tel quel (il rend son propre `<button>`, ce qui aurait imbriqué un bouton dans le bouton-carte existant) ; le même visuel a donc été reproduit en `<span>` inerte, sans dupliquer la logique de toggle (le clic reste géré par le `<button>` de la carte, inchangé).
2. **Contraste renforcé état sélectionné / non sélectionné** : la classe `border-kcal bg-kcal-soft` de l'état sélectionné est conservée telle quelle. L'état non sélectionné passe de `card` nu à `card` + `bg-background text-ink-2` — `bg-background` est le fond de page (distinct à la fois de `bg-surface` du `card` et de `bg-surface-alt` utilisé par le champ `input`, cf. `globals.css`), et `text-ink-2` atténue le texte par rapport au texte plein (`text-ink`, en gras) appliqué uniquement quand la collection est sélectionnée.

Résultat : à l'état non sélectionné, fond neutre légèrement distinct du champ texte du dessous, texte moins contrasté, cercle vide à droite — clairement "cliquable mais pas actif". À l'état sélectionné : fond teinté `kcal-soft`, bordure `kcal`, texte plein en gras, cercle plein coché — sans ambiguïté avec le champ « Nouvelle collection » juste en dessous (qui garde son style `input` inchangé, `bg-surface-alt`).

## Fichier modifié

`src/app/collection/partage/choisir/ChoisirCollectionForm.tsx` — uniquement le rendu JSX/Tailwind du bloc `collections.map(...)` :

```diff
-import { card, errorText, input, label as labelClass, primaryButton } from "@/lib/ui";
+import { card, checkCircle, errorText, input, label as labelClass, primaryButton } from "@/lib/ui";
...
-            {collections.map((collection) => (
-              <button
-                key={collection.id}
-                type="button"
-                onClick={() => {
-                  setCollectionId(collection.id);
-                  setNouvelleCollection("");
-                }}
-                className={`${card} w-full text-left transition-colors ${
-                  collectionId === collection.id ? "border-kcal bg-kcal-soft" : ""
-                }`}
-              >
-                {collection.nom}
-              </button>
-            ))}
+            {collections.map((collection) => {
+              const selected = collectionId === collection.id;
+              return (
+                <button
+                  key={collection.id}
+                  type="button"
+                  onClick={() => {
+                    setCollectionId(collection.id);
+                    setNouvelleCollection("");
+                  }}
+                  className={`${card} flex w-full items-center justify-between gap-3 text-left transition-colors ${
+                    selected ? "border-kcal bg-kcal-soft" : "bg-background text-ink-2"
+                  }`}
+                >
+                  <span className={selected ? "font-semibold text-ink" : ""}>{collection.nom}</span>
+                  <span
+                    className={`${checkCircle} ${
+                      selected ? "border-kcal bg-kcal" : "border-line bg-transparent"
+                    }`}
+                  >
+                    {selected && (
+                      <svg width={11} height={11} viewBox="0 0 12 12" fill="none">
+                        <path d="M1 6l3.2 3.2L11 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
+                      </svg>
+                    )}
+                  </span>
+                </button>
+              );
+            })}
```

Aucun autre fichier modifié. Ni `collections.ts` (Server Action), ni la logique de state du formulaire, ni le champ « Nouvelle collection » n'ont été touchés.

## Phase 3 — Vérification

- `npm install` : `node_modules` absent au démarrage de la session, dépendances installées (409 paquets, 0 vulnérabilité).
- `npx tsc --noEmit` : aucune erreur liée au fichier modifié. La seule erreur retournée (`Cannot find name 'LayoutProps'` dans `src/app/layout.tsx`) est due à l'absence de `.next/types` (aucun build préalable) — confirmée pré-existante et indépendante de la modification via `git stash` (même erreur sur `origin/kilio` sans le changement).
- `npx eslint src/app/collection/partage/choisir/ChoisirCollectionForm.tsx` : aucune erreur.
- `npm run build` : le build Next.js échoue en pré-rendu de la page `/agenda` (`Error: supabaseKey is required` dans `src/lib/supabase/admin.ts`, `SUPABASE_SERVICE_ROLE_KEY` non défini dans cet environnement). L'étape `Running TypeScript ... Finished TypeScript` du build passe sans erreur avant cet échec de pré-rendu. **Échec confirmé pré-existant et indépendant du changement** : reproduit à l'identique avec `git stash` (code de base `origin/kilio`).

## Écarts par rapport au prompt

Aucun sur le code. Le build complet (`npm run build`) ne peut pas être validé de bout en bout dans cet environnement faute de secret `SUPABASE_SERVICE_ROLE_KEY` configuré — limitation d'environnement documentée ci-dessus, sans lien avec cette correction visuelle.

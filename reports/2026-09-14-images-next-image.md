# Migration `<img>` → `next/image`

Remplacement des 5 balises `<img>` brutes identifiées par le composant `Image` de `next/image`, sans changement de logique métier.

## Fichiers modifiés

- `src/app/(app)/taches/TasksList.tsx`
- `src/app/(app)/taches/AddTaskForm.tsx`
- `src/app/(app)/documents/DocumentCard.tsx`
- `src/app/(app)/documents/[id]/DocumentDetail.tsx`
- `src/app/(app)/documents/DocumentForm.tsx`

## Détail par image

### `TasksList.tsx` — `TacheImagesRow`

Vignette d'image de tâche dans un bouton `h-14 w-14 overflow-hidden` (56×56px, carré fixe).

- **Avant** : `<img src={image.url} alt="" className="h-full w-full object-cover" />`
- **Après** : `<Image src={image.url} alt="" width={56} height={56} className="h-full w-full object-cover" />`
- **Stratégie** : `width`/`height` explicites (56×56) — la taille du conteneur est fixe et connue, pas besoin de `fill`. La classe `h-full w-full` continue de contrôler le rendu réel (l'attribut `width`/`height` ne sert qu'à l'aspect ratio intrinsèque).
- `alt=""` conservé : image décorative dans un bouton déjà pourvu d'un `aria-label="Agrandir l'image"`.

### `AddTaskForm.tsx` — `ImageThumb`

Vignette dans un conteneur `<div className="relative h-14 w-14 shrink-0">` (déjà positionné en `relative` pour le bouton de suppression superposé).

- **Avant** : `<img src={src} alt="" className="h-14 w-14 rounded-2xl border border-line object-cover" />`
- **Après** : `<Image src={src} alt="" width={56} height={56} className="h-14 w-14 rounded-2xl border border-line object-cover" />`
- **Stratégie** : `width`/`height` explicites (56×56), taille fixe.
- **Cas particulier** : `src` peut être une URL `blob:` (aperçu local via `URL.createObjectURL` avant upload) ou une URL Supabase Storage existante. `next/image` détecte automatiquement les préfixes `data:`/`blob:` et bascule en mode non optimisé (`unoptimized`) sans passer par `remotePatterns` ni nécessiter de config supplémentaire — vérifié dans `node_modules/next/dist/shared/lib/get-img-props.js:279`. Aucune modification de `next.config.ts` requise pour ce cas.

### `DocumentCard.tsx`

Aperçu de document (premier fichier image) dans un bouton `h-14 w-14 overflow-hidden`, avec un `viewTransitionName` pour l'animation de transition vers la page de détail.

- **Avant** : `<img src={apercu.url} alt="" style={{ viewTransitionName: ... }} className="h-full w-full object-cover" />`
- **Après** : `<Image src={apercu.url} alt="" width={56} height={56} style={{ viewTransitionName: ... }} className="h-full w-full object-cover" />`
- **Stratégie** : `width`/`height` explicites (56×56). Le `style` (view transition) est passé tel quel au composant `Image`, qui le transmet à l'élément `<img>` sous-jacent.

### `DocumentDetail.tsx`

Grille de fichiers du document (`grid grid-cols-2 gap-2`), chaque case étant un bouton `relative aspect-square w-full overflow-hidden` — taille **responsive** (dépend de la largeur du viewport / de la colonne de la grille).

- **Avant** : `<img src={fichier.url} alt="" style={...} className="h-full w-full object-cover" />`
- **Après** : `<Image src={fichier.url} alt="" fill sizes="(max-width: 640px) 45vw, 300px" style={...} className="object-cover" />`
- **Stratégie** : `fill` + `sizes`, car la taille finale de l'image dépend du layout en grille responsive (2 colonnes) et non d'une dimension fixe connue à l'avance. Le conteneur (`button`) est déjà `position: relative` (classe `relative` présente), condition requise par `fill`. La classe `h-full w-full` a été retirée car redondante avec `fill` (qui positionne l'image en `absolute` et l'étire au conteneur) ; `object-cover` est conservée.

### `DocumentForm.tsx` — `FichierThumb`

Vignette de fichier (recto/verso ou liste générique) dans un conteneur `<div className="relative h-14 w-14 shrink-0">`.

- **Avant** : `<img src={src} alt="" className="h-14 w-14 rounded-2xl border border-line object-cover" />`
- **Après** : `<Image src={src} alt="" width={56} height={56} className="h-14 w-14 rounded-2xl border border-line object-cover" />`
- **Stratégie** : `width`/`height` explicites (56×56), taille fixe. Même cas `blob:`/Supabase que dans `AddTaskForm.tsx`.

## `next.config.ts`

Aucune modification nécessaire. Toutes les images « réelles » (fichiers uploadés) proviennent exclusivement du bucket Supabase Storage déjà autorisé par `remotePatterns` (`vsmtkopkqasrdnjceegp.supabase.co/storage/v1/object/public/**`). Les aperçus locaux avant upload (`AddTaskForm`, `DocumentForm`) utilisent des URLs `blob:`, que `next/image` traite nativement en mode non optimisé sans passer par `remotePatterns`.

## Vérifications

- `npx tsc --noEmit` : une seule erreur préexistante et non liée (`src/app/layout.tsx(41,50): Cannot find name 'LayoutProps'`), confirmée présente avant toute modification (`git stash` + re-run). Le typecheck intégré à `next build` (qui utilise le contexte de types généré par Next.js) passe sans erreur.
- `npm run lint` : aucune erreur, aucun avertissement (les commentaires `eslint-disable-next-line @next/next/no-img-element` ont été supprimés puisqu'ils ne sont plus nécessaires).
- `npm run build` : la compilation et le typecheck Next.js passent (`✓ Compiled successfully`, `Finished TypeScript`). L'étape de génération statique échoue en revanche sur des pages non liées à cette migration (`/carburants`, `/collection`, etc.), à cause de secrets Supabase absents et d'un accès réseau sortant restreint dans cet environnement d'exécution (`Host not in allowlist: vsmtkopkqasrdnjceegp.supabase.co`) — limitation de l'environnement de build, pas du code modifié.
- Vérification structurelle du JSX : aucune balise `<img>` ne subsiste dans les 5 fichiers (`grep` confirmé). Les dimensions (`width`/`height` fixes ou `fill`+`sizes`) reproduisent exactement les classes Tailwind existantes (`h-14 w-14`, `aspect-square`), donc aucun saut de layout (CLS) introduit.

## Cas particuliers rencontrés

1. **URLs `blob:` locales** (aperçus avant upload dans `AddTaskForm` et `DocumentForm`) : gérées nativement par `next/image` (mode non optimisé automatique), pas d'entrée `remotePatterns` à ajouter.
2. **Un seul domaine distant** : toutes les images uploadées viennent du même bucket Supabase Storage déjà couvert par la configuration existante — aucune extension de `remotePatterns` nécessaire.
3. **`viewTransitionName` en `style`** : préservé tel quel sur le composant `Image` (transmis à l'élément `<img>` sous-jacent), condition nécessaire au bon fonctionnement des View Transitions déjà en place entre `DocumentCard` et `DocumentDetail`.

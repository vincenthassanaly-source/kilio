# Modal `role="dialog"` + `transition-all` ciblées + typographie « … »

Trois correctifs ponctuels issus d'une review UI (skill `web-design-guidelines`) : accessibilité de la modale, transitions CSS scopées aux propriétés réellement animées, et remplacement des points de suspension littéraux (`...`) par le caractère typographique `…`.

## Fichiers modifiés

- `src/components/Modal.tsx`
- `src/app/(app)/QuickAddFab.tsx`
- `src/app/(app)/objectifs/[id]/ObjectifSuiviValeur.tsx`
- `src/app/(app)/reglages/NotificationsRow.tsx`
- `src/app/(app)/reglages/NettoyageAutoRow.tsx`
- `src/app/(app)/collection/[id]/AddPhotoButton.tsx`
- `src/app/(app)/budget/categories/CategorieProgressCard.tsx`

## 1. `Modal.tsx` — accessibilité lecteur d'écran

Le `<motion.div>` racine (backdrop `fixed inset-0 ...`) n'exposait aucune sémantique de dialogue. Le panneau du bottom sheet (le `<motion.div>` interne portant `className="flex max-h-[85vh] w-full max-w-md ..."`) est maintenant annoncé comme une boîte de dialogue modale liée à son titre.

- **Avant** :
  ```tsx
  <motion.div
    ...
    className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-[22px] ..."
    onClick={(e) => e.stopPropagation()}
    ...
  >
    ...
    <span className="text-[15px] font-bold text-ink">{title}</span>
  ```
- **Après** :
  ```tsx
  <motion.div
    ...
    className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-[22px] ..."
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    onClick={(e) => e.stopPropagation()}
    ...
  >
    ...
    <span id="modal-title" className="text-[15px] font-bold text-ink">{title}</span>
  ```

Le backdrop, la logique de fermeture, les animations et l'absence de focus trap n'ont pas été touchés (hors périmètre).

## 2. `transition-all` → propriété(s) explicite(s)

### `QuickAddFab.tsx` (3 occurrences — boutons « Courses », « Tâches », « Notes »)

Seules `opacity` et `transform` (translateY) sont animées via `style` sur ces boutons.

- **Avant** : `className="flex items-center gap-2 transition-all duration-200 ease-out"`
- **Après** : `className="flex items-center gap-2 transition-[opacity,transform] duration-200 ease-out"`

### `ObjectifSuiviValeur.tsx` (barre de progression)

Seule `width` est animée via `style`.

- **Avant** : `className="h-full rounded-full bg-kcal transition-all"`
- **Après** : `className="h-full rounded-full bg-kcal transition-[width]"`

### `NotificationsRow.tsx` et `NettoyageAutoRow.tsx` (pastille de toggle)

Seule `left` est animée via `style`, dans les deux fichiers.

- **Avant** : `className="absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white transition-all"`
- **Après** : `className="absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white transition-[left]"`

Aucune migration vers `transform`/`translateX` n'a été faite (changement plus large, hors périmètre). `CategorieProgressCard.tsx` avait déjà `transition-[width]` sur sa propre barre de progression — rien à faire de ce côté pour ce fichier.

## 3. `"..."` littéral → `"…"`

### `AddPhotoButton.tsx`

- Label du bouton de soumission : `{tiktokPending ? "..." : "OK"}` → `{tiktokPending ? "…" : "OK"}`
- Placeholder du champ URL TikTok : `placeholder="https://www.tiktok.com/..."` → `placeholder="https://www.tiktok.com/…"`

### `CategorieProgressCard.tsx`

- Label du bouton de soumission : `{pending ? "..." : "Définir"}` → `{pending ? "…" : "Définir"}`

## Vérifications

- `npx tsc --noEmit` : une seule erreur préexistante et non liée (`src/app/layout.tsx(41,56): Cannot find name 'LayoutProps'`), confirmée présente sur le HEAD non modifié (`git stash` + re-run). Le typecheck intégré à `next build` passe sans erreur.
- `npx eslint .` : aucune erreur, aucun avertissement.
- `npx next build` : compilation, typecheck et génération des 24 routes réussis (`✓ Compiled successfully`, `Finished TypeScript`, `Generating static pages (24/24)`). Le défaut `supabaseKey is required.` documenté pour `/carburants` et `/agenda` ne s'est pas manifesté dans cette exécution.

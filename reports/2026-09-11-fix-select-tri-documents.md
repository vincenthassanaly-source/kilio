# Documents — débordement du sélecteur de tri sur mobile

## Problème constaté

Sur `/documents`, à côté du champ de recherche (`flex-1`), le `<select>` de tri porte
`w-auto shrink-0` : sa largeur intrinsèque dépend du libellé le plus long affiché dans ses
`<option>`. Avec des libellés verbeux (ex. "Échéance la plus proche", "Ajout le plus récent"),
cette largeur pousse l'ensemble hors du viewport visible sur les largeurs d'écran mobile
standard (~360-390px), la ligne `input + select` ne tenant plus dans le conteneur.

## Fichier modifié

`src/app/(app)/documents/DocumentsBrowser.tsx` — uniquement la constante `TRI_LABELS`
(lignes ~14-19). Aucune logique de tri touchée : le `useMemo` de tri (ligne ~89) et le type
`TriCle` sont inchangés, seuls les libellés affichés dans les `<option>` ont changé.

## Avant / après des libellés

| Clé (`TriCle`) | Avant                    | Après            |
|-----------------|--------------------------|------------------|
| `echeance`      | Échéance la plus proche  | Échéance ↑       |
| `nom`           | Nom (A → Z)              | Nom A→Z          |
| `recent`        | Ajout le plus récent     | Récent           |
| `etiquette`     | Étiquette (A → Z)        | Étiquette A→Z    |

Aucune classe CSS du `<select>` n'a dû être ajoutée : avec ces libellés raccourcis, le
`max-w-[9.5rem] truncate` de sécurité prévu en filet n'était pas nécessaire (voir vérification
visuelle ci-dessous).

## Vérification

- **Rendu visuel** : les vrais styles Tailwind du projet (classe `input` de `src/lib/ui.ts` :
  `rounded-2xl border border-line bg-surface-alt px-3.5 py-2.5 text-[15px]`) ont été reproduits
  dans une page de test isolée (Playwright + Tailwind Play CDN) pour mesurer précisément la
  largeur du `<select>` avec les nouveaux libellés, aux côtés du champ recherche en `flex-1`,
  sur trois largeurs de viewport mobile courantes.
  - 360px : select ≈ 148px, recherche ≈ 168px, **aucun débordement** (`scrollWidth` = largeur du
    viewport).
  - 375px et 390px : mêmes largeurs, toujours aucun débordement.
  - Capture d'écran à 360px confirmant visuellement une seule ligne sans coupure ni scroll
    horizontal.
- `npx tsc --noEmit` : ✅ aucune erreur liée au fichier modifié. Une erreur préexistante
  (`src/app/layout.tsx(41,50): Cannot find name 'LayoutProps'`) a été confirmée non liée à cette
  correction — reproduite à l'identique sur la branche avant modification (le type `LayoutProps`
  n'est généré que par `next build`/`next dev`, absent tant qu'aucun build n'a tourné dans cet
  environnement fraîchement cloné).
- `npx eslint "src/app/(app)/documents/DocumentsBrowser.tsx"` : ✅ aucune erreur ni avertissement.
- `npm run build` : ✅ build de production réussi (Next.js 16, Turbopack), toutes les routes
  générées y compris `/documents`, `tsc` interne au build passé sans erreur.

## Limitations connues

- Vérification faite via une reproduction fidèle des classes Tailwind du composant (mêmes
  valeurs de padding/font-size/bordure que `src/lib/ui.ts`), pas via un rendu live de la page
  `/documents` elle-même : aucune variable d'environnement Supabase n'est configurée dans cet
  environnement pour lancer `next dev` avec de vraies données. Le rendu réel du `<select>` par le
  navigateur ne dépend toutefois que des classes CSS et du texte des `<option>`, tous deux
  reproduits à l'identique.
- Non testé sur un device physique ni dans un navigateur autre que Chromium.

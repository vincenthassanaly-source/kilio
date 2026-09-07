# Bouton retour — fenêtre météo détaillée

## Le trou identifié

`MeteoDetailModal` (ouverte depuis `MeteoHeaderWidget` dans le header, module Météo) n'était pas câblée sur `useBackClose`. Le bouton retour matériel/OS ne fermait donc pas cette fenêtre — il naviguait en arrière ou quittait l'app, contrairement aux 17 autres composants déjà branchés (`Add*Toggle`, `QuickAddFab`, `AgendaView`, `NoteCard`, `ImageLightbox`).

Comme pour les `Add*Toggle`, le state d'ouverture (`isOpen`/`setIsOpen`) vit dans le composant parent `MeteoHeaderWidget`, pas dans `MeteoDetailModal` lui-même — c'est donc dans `MeteoHeaderWidget` que le hook devait être appelé.

## Correctif appliqué

Dans `src/app/(app)/MeteoHeaderWidget.tsx` :
- Import de `useBackClose` depuis `@/hooks/useBackClose`.
- Ajout de `useBackClose(isOpen, () => setIsOpen(false));` juste après `const [isOpen, setIsOpen] = useState(false);`.

`MeteoDetailModal.tsx` n'a pas été modifié, conformément au pattern des `Add*Toggle`.

## Autres overlays vérifiés

Recherche exhaustive des composants avec état d'ouverture local et overlay (`<Modal>`, `fixed inset-0`, `role="dialog"`, `backdrop`) non câblés sur `useBackClose` :

- Tous les usages de `<Modal>` (`AgendaView.tsx`, `QuickAddFab.tsx`, `MeteoDetailModal.tsx`) sont soit déjà câblés côté parent, soit — pour `MeteoDetailModal` — corrigés ci-dessus.
- Tous les overlays `fixed inset-0` (`ImageLightbox.tsx`, `Modal.tsx` le composant de base, `QuickAddFab.tsx`) sont déjà couverts.
- `BottomNav.tsx` utilise `fixed` mais ce n'est pas un overlay/fenêtre (barre de navigation persistante) — non concerné.

Aucun autre trou trouvé. `MeteoDetailModal` était le seul cas manquant.

## Vérifications

- `npx tsc --noEmit` : une erreur pré-existante et sans rapport avec ce changement (`src/app/layout.tsx(41,50): error TS2304: Cannot find name 'LayoutProps'`), due au fait que ce type est généré par Next.js au build/dev (`.next/types`) et n'existe pas lors d'un `tsc` isolé sans build préalable. Confirmé par le `build` ci-dessous, qui exécute le typecheck Next.js et passe sans erreur.
- `npx eslint . --ext .ts,.tsx` : aucune erreur.
- `npm run build` : succès (`✓ Compiled successfully`, `Finished TypeScript` sans erreur, génération statique des 22 pages OK).

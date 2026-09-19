# Agenda — Lot 2 : lisibilité et accessibilité

Date : 2026-09-19
Base : `kilio` @ `0a41d87` (lot 1 déjà mergé/présent, aucun commit à rebaser). Aucune migration, aucune nouvelle dépendance, aucune écriture en base.

## Synthèse

- **A — Texte sur fond agenda** : nouveau token `--on-agenda` (blanc en clair, encre très sombre `oklch(0.16 0.02 230)` en sombre) + mapping `--color-on-agenda` dans `@theme inline`. Utilisé via `text-on-agenda` sur le segment actif du sélecteur de vues (AgendaView) et l'icône du FAB (remplace les deux usages de `text-white`, seuls points de l'Agenda où du texte/une icône reposaient directement sur `--accent-agenda`).
- **B — Blocs par priorité** : le texte des blocs (`TacheBlock`) passe en `text-ink` (fini `text-agenda`/`text-carbs`/`text-alert` sur fond teinté à 15%, qui donnait ~3,8:1). La priorité est maintenant portée par une bordure gauche colorée de 3px (`border-l-agenda`/`border-l-carbs`/`border-l-alert`, `border-l-line` pour « aucune ») **plus** un marqueur non chromatique (glyphe `●` pour moyenne, `▲` pour haute, préfixé au libellé) pour les deux priorités qui doivent rester repérables même sans perception des couleurs. L'`aria-label` du bloc annonce la priorité en toutes lettres (« …, priorité haute »).
- **C — Micro-textes** : les deux `text-[9.5px]` de `WeekView` (chips « sans heure » + « +N ») passent à `text-[10px]`, dans la rampe Caption (10–12px) de DESIGN.md. `grep -n "text-\[" "src/app/(app)/agenda"` ne remonte plus aucune valeur sous 10px (le seul `text-[9px]` restant est une mention dans un commentaire de `TimeGrid.tsx`, pas une classe appliquée).
- **D — Accessibilité** : `aria-label` par case de `MonthView` (« <jour> <date>, <N> tâche(s)[, jour travaillé] »), `aria-current="date"` sur la case d'aujourd'hui (MonthView) et sur l'en-tête du jour courant (WeekView), `aria-pressed` sur chacun des 4 boutons du sélecteur de vues (AgendaView).

Vérifié : `npx tsc --noEmit` (0 erreur), `npm run lint` (0 erreur), `npm run build` (réussi, 24 routes). Script de contraste WCAG temporaire exécuté (voir tableau ci-dessous), non commité. **Le rendu n'a pas pu être vérifié visuellement dans un navigateur** : mêmes limites que le lot 1, `node_modules` absent en début de session (réinstallé via `npm install`) et aucune variable Supabase configurée dans cet environnement.

## Fichiers modifiés

- `src/app/globals.css` : ajout de `--on-agenda` (`:root` et `:root.dark`) et de `--color-on-agenda` dans `@theme inline`.
- `src/app/(app)/agenda/AgendaView.tsx` : `text-white` → `text-on-agenda` (FAB, segment actif), `aria-pressed` sur les boutons de vue.
- `src/app/(app)/agenda/TacheBlock.tsx` : `PRIORITE_BLOCK_CLASS` remplacé par `PRIORITE_STYLE` (bg / bordure / marqueur / libellé a11y), texte en `text-ink`, bordure gauche 3px, marqueur préfixé au libellé affiché, priorité ajoutée à l'`aria-label`.
- `src/app/(app)/agenda/WeekView.tsx` : `text-[9.5px]` → `text-[10px]` (×2), `aria-current="date"` sur l'en-tête du jour courant.
- `src/app/(app)/agenda/MonthView.tsx` : nouvelle fonction `monthCellAriaLabel`, `aria-label` + `aria-current="date"` sur chaque case.

## Tableau des ratios de contraste (avant / après)

Calculés par un script Node temporaire (conversion oklch → sRGB linéaire → luminance relative WCAG → ratio, formules OKLab de Björn Ottosson). Fonds réels utilisés : blend alpha 15% de la couleur d'accent sur `--surface` (le bloc de tâche est rendu sur un fond `bg-surface`, cf. conteneurs de `DayView`/`WeekView`).

### A. Texte/icône sur `--accent-agenda`

| Thème | Avant (`text-white`) | Après (`text-on-agenda`) |
|---|---|---|
| Clair | blanc sur agenda clair : **4,53:1** (déjà conforme) | inchangé, blanc conservé : **4,53:1** |
| Sombre | blanc sur agenda sombre : **~2,4:1** ❌ | encre `oklch(0.16 0.02 230)` sur agenda sombre : **8,04:1** ✅ |

Cible ≥4,5:1 (texte) et ≥3:1 (icône FAB) atteinte dans les deux thèmes, avec une marge confortable en sombre.

### B. Texte des blocs de priorité (`text-ink` sur fond teinté 15%)

| Priorité | Avant (texte coloré, ~10–12px) | Après — clair (`text-ink` / fond blend) | Après — sombre (`text-ink` / fond blend) |
|---|---|---|---|
| aucune | `text-ink` sur `surface-alt` (déjà conforme) | **14,32:1** | **12,90:1** |
| basse | `text-agenda` sur agenda/15 : **~3,8:1** ❌ | **13,94:1** ✅ | **11,63:1** ✅ |
| moyenne | `text-carbs` sur carbs/15 : **~3,8:1** ❌ | **14,16:1** ✅ | **11,56:1** ✅ |
| haute | `text-alert` sur alert/15 : **~3,8:1** ❌ | **13,50:1** ✅ | **12,39:1** ✅ |

Les 8 combinaisons (4 priorités × 2 thèmes) dépassent largement le seuil de 4,5:1 une fois le texte passé en `text-ink` — la marge est volontairement large puisque `ink` est quasi opaque (0.22/0.95 de luminosité selon le thème) sur un fond à peine teinté.

## Décisions

- **Marqueur non chromatique choisi** : glyphes unicode (`●` moyenne, `▲` haute) préfixés au libellé visible, plutôt qu'un motif de hachures ou une icône SVG dédiée — évite d'alourdir `TacheBlock` (déjà rendu des dizaines de fois par vue) avec un composant/SVG supplémentaire, reste lisible à 10–12px, et se distingue clairement à la forme (rond vs triangle) même en niveaux de gris. « aucune » et « basse » n'ont pas de marqueur : la bordure colorée (ou neutre `--line` pour « aucune ») suffit à les distinguer de « moyenne »/« haute », qui sont les deux priorités où l'escalade doit rester perceptible sans couleur.
- **Bordure toujours présente (y compris « aucune »)** : plutôt que de réserver la barre latérale aux tâches priorisées, une bordure neutre (`border-l-line`) est posée sur « aucune » pour garder un rythme visuel cohérent (même géométrie de bloc quelle que soit la priorité) — décision de cohérence visuelle, pas une exigence explicite du prompt.
- **`--on-agenda` clair = blanc pur** : `oklch(1 0 0)` plutôt qu'un blanc cassé — le ratio mesuré (4,53:1) passe déjà tout juste la cible 4,5:1 avec du blanc pur ; un blanc légèrement teinté réduirait cette marge sans bénéfice visuel notable, et le reste du système (boutons primaires) utilise déjà `#ffffff` plein sur des accents de luminosité comparable (`--accent-kcal` à L=0.55).
- **`--on-agenda` sombre = `oklch(0.16 0.02 230)`** : teinte 230 (celle d'agenda) à faible chroma pour rester perçu comme une « encre » plutôt qu'un noir pur importé d'un autre système de couleurs — cohérent avec le principe DESIGN.md « aucun neutre n'est gris pur ». L=0.16 a été choisi parmi 5 valeurs testées (0.12 à 0.20) comme un compromis offrant une marge large (8,04:1) sans être aussi extrême que L=0.12 (8,42:1, quasi noir).
- **Pas de changement des tokens `--accent-*`** : conformément à la contrainte, `--accent-agenda`, `--accent-carbs`, `--accent-alert` sont inchangés dans les deux thèmes ; seul un nouveau token dédié au texte (`--on-agenda`) a été ajouté, et les blocs de priorité gardent leurs teintes de fond à 15% (désormais purement décoratives, la lisibilité du texte ne dépendant plus d'elles).
- **`prefers-reduced-motion`** : aucune animation ajoutée ou modifiée dans ce lot ; les règles existantes de `globals.css` restent inchangées et couvrent toujours les mêmes animations.

## Écarts avec le prompt

Aucun écart fonctionnel identifié. Seule liberté d'implémentation : le format de `monthCellAriaLabel` utilise « aucune tâche » / « 1 tâche » / « N tâches » (accord singulier/pluriel) plutôt que de coller littéralement à l'exemple « 3 tâches » du prompt pour tous les cas, ce qui semble être l'intention (éviter « 1 tâches »).

## Vérifié

- `npx tsc --noEmit` : 0 erreur (après `npm install`, `node_modules` étant absent en début de session, et un `npm run build` pour générer les types Next.js `LayoutProps` consommés par `src/app/layout.tsx` — fichier non touché par ce lot, mais nécessaire pour que `tsc` passe).
- `npm run lint` (ESLint) : 0 erreur.
- `npm run build` (`next build`, Turbopack) : compile et génère les 24 routes sans erreur.
- Script de contraste WCAG (conversion oklch → sRGB → ratio, créé puis non commité) : les 8 combinaisons priorité × thème pour le texte des blocs, le texte/l'icône sur `--accent-agenda` dans les deux thèmes. Tous les ratios calculés dépassent les seuils demandés (détail ci-dessus).
- `grep -n "text-\[" "src/app/(app)/agenda"` : plus aucune valeur sous 10px en dehors d'un commentaire.

## Non vérifié

- **Rendu visuel réel** : impossible de lancer l'app avec des données (pas de variables Supabase dans cet environnement) ni de l'ouvrir dans un navigateur. L'apparence exacte de la bordure de 3px, du marqueur `●`/`▲` dans un bloc compact de 10px, et le rendu du token `--on-agenda` en thème sombre n'ont donc été vérifiés que par lecture de code et par le calcul de contraste — pas observés à l'écran.
- **Lecteur d'écran réel** : les nouveaux `aria-label`/`aria-current`/`aria-pressed` n'ont pas été entendus avec un lecteur d'écran (VoiceOver/NVDA) ; leur formulation a été vérifiée par lecture de code uniquement.
- **Daltonisme** : le choix des glyphes (rond/triangle) repose sur un raisonnement de conception (formes distinctes, pas seulement une distinction de couleur) mais n'a pas été testé avec un simulateur de daltonisme.

# Nettoyage des branches — 2026-09-26

## Résumé

Analyse de nettoyage des branches Git du repo `kilio` (locales et distantes). **Aucune branche locale à nettoyer** : seule `kilio` existe en local, avec la branche de session active `claude/kilio-branch-cleanup-c53ihe`. Le nettoyage porte uniquement sur les **133 branches distantes** (`origin/claude/*`).

**Vincent a validé l'option : « Supprimer mergées + anciennes/inactives » → 111 branches candidates.**

**⚠️ Suppression NON effectuée** : chaque tentative de `git push origin --delete <branche>` (y compris testée isolément) échoue avec une erreur **HTTP 403**, indépendante de la branche ciblée. Ce n'est pas une protection de branche GitHub — c'est une restriction du credential Git utilisé par cette session cloud (l'app GitHub connectée semble autorisée à pousser des commits mais pas à supprimer des refs distantes). Aucun outil de l'API GitHub disponible dans cette session ne permet non plus la suppression de ref. Voir section « Action requise » ci-dessous.

## Méthodologie

1. `git fetch origin --prune` puis `git branch -a` → 133 branches distantes + `kilio`.
2. `git branch -r --merged origin/kilio` / `--no-merged` → statut de merge de chaque branche.
3. `git log -1 --format="%ci" <branche>` → date du dernier commit, pour chaque branche.
4. GitHub MCP `list_pull_requests` (state=open) → **0 PR ouverte** sur le repo entier.
5. Vercel MCP `get_project` sur le projet `kilio` → seule la branche `kilio` est liée au déploiement de production actif (domaine `kilio-git-kilio-kila4.vercel.app`). Aucune autre branche n'a de lien avec le déploiement Vercel.
6. Seuil retenu pour « ancienne/inactive » : dernier commit antérieur au **12 septembre 2026** (14 jours avant l'exécution).

## Exclusions systématiques (jamais candidates)

- `kilio` — branche de production, déployée sur Vercel.
- `main` / `master` — inexistantes dans ce repo.
- Toute branche avec PR ouverte — aucune trouvée (0 PR ouverte au total).
- Toute branche liée au déploiement Vercel actif — seule `kilio` correspond.

## Branches conservées par prudence (hors listes de suppression)

**16 branches non mergées mais récentes (< 14 jours)** — ni mergées, ni "anciennes", donc conservées sans être proposées à la suppression :

- claude/agenda-lot-1-fiabilite-7kcq3u
- claude/animations-objectifs-documents-a9788a
- claude/awesome-goodall-80k0wp
- claude/courses-archived-section-gwfbf9
- claude/gallant-cori-5wywst
- claude/intelligent-knuth-jebtuz
- claude/intelligent-wright-0fae6i
- claude/kilio-dashboard-audit-g0cdtm
- claude/kilio-react-performance-audit-g7408t
- claude/kilio-search-theme-fixes-r1d060
- claude/kilio-select-ingredient-default-vvqbk2
- claude/kilio-supabase-audit-xk9n1u
- claude/kilio-task-edit-deformation-6piizy
- claude/push-subscriptions-rls-fix-qx4qvw
- claude/taches-programme-jour-j1ntp0
- claude/trusting-clarke-p6uh5u

## Liste 1 — Branches mergées dans `kilio` (10)

| Branche | Dernier commit | PR ouverte |
|---|---|---|
| claude/agenda-lot-2-accessibility-04d6tm | 2026-09-19 | non |
| claude/agenda-lot-3-navigation-9b3gjm | 2026-09-19 | non |
| claude/collection-youtube-support-bwtuei | 2026-09-22 | non |
| claude/courses-lot-a-saisie-99grgb | 2026-09-19 | non |
| claude/courses-lot-b-magasin-0rueo9 | 2026-09-19 | non |
| claude/festive-fermat-bsf2ij | 2026-09-25 | non |
| claude/kilio-ui-polish-audit-lxwl0y | 2026-09-26 | non |
| claude/kilio-vague-1-audit-f8uyhg | 2026-09-25 | non |
| claude/ui-polish-interfaces-yfg5ai | 2026-09-26 | non |
| claude/vitest-rtl-setup-1pxzc8 | 2026-09-26 | non |

## Liste 2 — Branches distantes anciennes/inactives, non mergées (101)

Toutes non mergées dans `kilio`, dernier commit antérieur au 12/09/2026, aucune PR ouverte.

| Branche | Dernier commit |
|---|---|
| claude/nutricio-rebrand-logo-d1atps | 2026-08-27 |
| claude/nutrition-app-design-9g3v3s | 2026-08-27 |
| claude/add-nutrition-database-foods-90hkwk | 2026-08-28 |
| claude/aliments-piece-grammes-logging-em410j | 2026-08-28 |
| claude/claude-md-auto-commit-ljguq0 | 2026-08-28 |
| claude/remove-nutrition-sections-bqtd9b | 2026-08-28 |
| claude/journal-empty-after-meal-ai-a4xbql | 2026-08-29 |
| claude/journal-empty-on-launch-tedl4w | 2026-08-29 |
| claude/kilio-modular-nutrition-tiles-yowtlx | 2026-08-29 |
| claude/nutricio-kilio-rebrand-e9jpno | 2026-08-29 |
| claude/nutricio-notes-module-d2pkfv | 2026-08-29 |
| claude/nutricio-remove-auth-mmve51 | 2026-08-29 |
| claude/nutrition-app-init-nohn5u | 2026-08-29 |
| claude/agenda-calendar-module-tuepjf | 2026-08-30 |
| claude/app-design-update-2jmglw | 2026-08-30 |
| claude/budget-subcategories-transfers-p4tfzc | 2026-08-30 |
| claude/habitudes-module-rwfyel | 2026-08-30 |
| claude/kilio-budget-module-p2b5fh | 2026-08-30 |
| claude/kilio-logo-olive-gradient-niy8te | 2026-08-30 |
| claude/kilio-module-taches-jubjwz | 2026-08-30 |
| claude/module-courses-mhgwgl | 2026-08-30 |
| claude/module-objectifs-k3bzu6 | 2026-08-30 |
| claude/taches-ticktick-refactor-dg03s4 | 2026-08-30 |
| claude/floating-add-button-home-49ismr | 2026-08-31 |
| claude/generalize-back-button-close-q00z3h | 2026-08-31 |
| claude/kilio-global-search-l33ufe | 2026-08-31 |
| claude/kilio-overflow-task-title-ange26 | 2026-08-31 |
| claude/kilio-speed-dial-back-4xwvib | 2026-08-31 |
| claude/kilio-taches-archivage-ffvmvb | 2026-08-31 |
| claude/quickaddfab-labels-courses-6110aa | 2026-08-31 |
| claude/recettes-filtres-ingredients-gpawyl | 2026-08-31 |
| claude/recettes-hellofresh-adapter-0vkx6o | 2026-08-31 |
| claude/taches-default-view-vhusf6 | 2026-08-31 |
| claude/agenda-time-grid-horaires-2p97zs | 2026-09-01 |
| claude/kilio-planning-creneaux-oanmej | 2026-09-01 |
| claude/kilio-task-reminders-we44c0 | 2026-09-01 |
| claude/sticky-add-task-button-72co8d | 2026-09-01 |
| claude/taches-images-full-title-xzrd7r | 2026-09-01 |
| claude/agenda-pinch-zoom-7jd2ef | 2026-09-02 |
| claude/agenda-swipe-navigation-6m8pc5 | 2026-09-02 |
| claude/collection-share-target-mae69x | 2026-09-02 |
| claude/kilio-back-close-modales-tori15 | 2026-09-02 |
| claude/kilio-badge-download-t7h453 | 2026-09-02 |
| claude/kilio-pwa-shortcuts-h13sin | 2026-09-02 |
| claude/kilio-taches-latency-xrhcmc | 2026-09-02 |
| claude/kilio-textarea-titre-dq7e7l | 2026-09-02 |
| claude/kilio-ux-fluidite-xb5rul | 2026-09-02 |
| claude/notes-keep-redesign-ryprp9 | 2026-09-02 |
| claude/swipe-journal-historique-toe8ws | 2026-09-02 |
| claude/dashboard-hydration-tanstack-2n70kz | 2026-09-03 |
| claude/kilio-haptics-offline-queue-v8t9we | 2026-09-03 |
| claude/kilio-lazy-load-forms-jqne2t | 2026-09-03 |
| claude/nutrition-journal-server-error-cz7vha | 2026-09-03 |
| claude/dashboard-habitudes-spacing-label-ycdrc1 | 2026-09-04 |
| claude/dashboard-streaming-sections-qgsyfa | 2026-09-04 |
| claude/design-changes-rwx2xf | 2026-09-04 |
| claude/kilio-autofocus-titre-6nylyq | 2026-09-04 |
| claude/kilio-navigation-fluidity-rq3qnh | 2026-09-04 |
| claude/swipe-filtres-taches-fix-ku85h4 | 2026-09-04 |
| claude/agenda-archive-completed-tasks-dhqcq8 | 2026-09-05 |
| claude/bottom-nav-animated-pill-wipeg5 | 2026-09-05 |
| claude/fix-reorder-tasks-status-en4ubq | 2026-09-05 |
| claude/kilio-drag-preview-tvljia | 2026-09-05 |
| claude/kilio-navigation-customization-n51bsc | 2026-09-05 |
| claude/kilio-task-card-colors-1a8kc3 | 2026-09-05 |
| claude/planning-travail-exceptions-zp1xks | 2026-09-05 |
| claude/swipe-onglets-dynamique-ykhqxf | 2026-09-05 |
| claude/weekview-taches-alignment-uyfg8s | 2026-09-05 |
| claude/agenda-creneaux-horaires-bk3fz2 | 2026-09-06 |
| claude/bottomnav-plus-active-fix-mmf55k | 2026-09-06 |
| claude/collection-morph-transition-3xtgur | 2026-09-06 |
| claude/collection-next-image-migration-01wui1 | 2026-09-06 |
| claude/dashboard-taches-hide-done-tj26zw | 2026-09-06 |
| claude/fix-drag-drop-snapback-taches-erv1nn | 2026-09-06 |
| claude/generalize-transition-link-8zilgk | 2026-09-06 |
| claude/haptic-feedback-extend-1mo0ug | 2026-09-06 |
| claude/kilio-add-form-animations-e0zhm6 | 2026-09-06 |
| claude/kilio-drag-stretch-fix-qhijzb | 2026-09-06 |
| claude/kilio-error-boundaries-loading-v3fjo7 | 2026-09-06 |
| claude/kilio-transitions-scroll-optimistic-10ah7u | 2026-09-06 |
| claude/module-foot-resultats-elm77f | 2026-09-06 |
| claude/pull-to-refresh-pages-uz9448 | 2026-09-06 |
| claude/workhoursband-label-position-tvhvdv | 2026-09-06 |
| claude/agenda-top-swipe-tabs-9m0h7e | 2026-09-07 |
| claude/agenda-worktime-gutter-marks-m38b0e | 2026-09-07 |
| claude/dayview-unscheduled-tasks-6yx59u | 2026-09-07 |
| claude/meteo-modal-back-close-sgt1nx | 2026-09-07 |
| claude/rappels-taches-1h-veille-lbkg3i | 2026-09-07 |
| claude/root-module-navigation-ff7h8d | 2026-09-07 |
| claude/taches-search-bar-ipucmv | 2026-09-07 |
| claude/task-edit-back-button-wmexex | 2026-09-07 |
| claude/carburants-pull-refresh-bug-tdg7tm | 2026-09-08 |
| claude/courses-mobile-loading-perf-8maauc | 2026-09-09 |
| claude/new-session-maerr7 | 2026-09-09 |
| claude/remove-meteo-widget-cx30bm | 2026-09-09 |
| claude/kilio-documents-module-ucf0z5 | 2026-09-10 |
| claude/fix-select-tri-documents-w77azs | 2026-09-11 |
| claude/kilio-nav-timeout-freeze-rfnec6 | 2026-09-11 |
| claude/collection-selection-visual-ohdokk | 2026-09-12 |
| claude/navigation-bloquee-investigation-nyaw0n | 2026-09-12 |
| claude/taches-vue-en-retard-w8gb0x | 2026-09-12 |

## Action requise (blocage technique)

La suppression distante a échoué pour les 111 branches ci-dessus avec :

```
error: RPC failed; HTTP 403 curl 22 The requested URL returned error: 403
send-pack: unexpected disconnect while reading sideband packet
fatal: the remote end hung up unexpectedly
```

Testé isolément sur une seule branche (`claude/festive-fermat-bsf2ij`) → même erreur. Ce n'est donc pas lié à une protection spécifique d'une branche, mais à une restriction globale du token/app GitHub utilisé par cette session cloud pour la suppression de refs.

**Pour finaliser le nettoyage, deux options :**

1. **Vincent exécute lui-même** les commandes suivantes (depuis un poste avec les droits d'écriture complets sur le repo) :
   ```bash
   git push origin --delete \
     claude/agenda-lot-2-accessibility-04d6tm \
     claude/agenda-lot-3-navigation-9b3gjm \
     claude/collection-youtube-support-bwtuei \
     claude/courses-lot-a-saisie-99grgb \
     claude/courses-lot-b-magasin-0rueo9 \
     claude/festive-fermat-bsf2ij \
     claude/kilio-ui-polish-audit-lxwl0y \
     claude/kilio-vague-1-audit-f8uyhg \
     claude/ui-polish-interfaces-yfg5ai \
     claude/vitest-rtl-setup-1pxzc8
   # ... + les 101 branches de la Liste 2 (voir tableau ci-dessus)
   ```
   Ou via l'interface GitHub (onglet "Branches" du repo, bouton corbeille sur chaque branche non protégée).

2. **Ajuster les permissions de l'app GitHub** connectée à cette session (droits de suppression de branches), puis relancer la demande de nettoyage dans une nouvelle session pour que je puisse exécuter les suppressions.

## Vérification

Aucune suppression n'ayant pu être effectuée, `kilio` reste inchangée sur le plan du code (seul ce rapport a été ajouté).

```bash
git checkout kilio
git status   # clean, aligné sur origin/kilio avant ajout du rapport
npm install
npm run build
```

- Compilation : **OK** (`✓ Compiled successfully in 11.3s`)
- TypeScript : **OK** (`Finished TypeScript in 11.1s`)
- Pré-rendu statique : **échec** sur `/budget/comptes` avec `Error: supabaseKey is required` (`src/lib/supabase/admin.ts:5`) — dû à l'absence des variables d'environnement Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) dans ce container de session, **sans lien avec le rapport ajouté** (qui ne touche aucun fichier de code). Ce comportement est attendu dans un environnement sans secrets configurés et se produirait de façon identique sans ce commit.

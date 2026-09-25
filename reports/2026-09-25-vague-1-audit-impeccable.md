# Vague 1 de l'audit impeccable : les bloquants (données et tâche principale)

Suite de `reports/2026-09-25-audit-impeccable-kilio.md` (§5, Vague 1). Les 5 points sont traités. Quelques éléments restent en suspens (voir §7).

## 0. Point de départ et écarts à connaître

- **Base de travail : `f8c2618` et non `origin/kilio`.** Le prompt demandait `git reset --hard origin/kilio`. Or `origin/kilio` (`1ececd4`) est un **ancêtre** de la branche de l'audit. Il lui manque 13 commits : Cache Components, Partial Prefetching, rapport `dff981e` et rapport d'audit `f8c2618`. Sur `origin/kilio`, le rapport d'audit n'existe pas et les lignes citées ne correspondent pas. J'ai donc développé sur `claude/kilio-vague-1-audit-f8uyhg`, en partant de `f8c2618`. Si cette branche est poussée sur `kilio`, l'historique avance en fast-forward et les 13 commits arrivent avec elle.
- **Questions `/impeccable shape` (Journal) posées à Vincent :**
  - ajout dans une feuille en bas d'écran ;
  - moment pré-rempli selon l'heure ;
  - type de jour mémorisé par date, en base.
- **Migration appliquée sur Supabase** (`vsmtkopkqasrdnjceegp`) : `journal_jours`, uniquement additive.
- **Budget :** j'ai choisi une confirmation explicite qui détaille la cascade, plutôt que l'archivage. L'archivage aurait demandé une colonne `archive` et un filtre dans tous les sélecteurs. Le texte de confirmation propose de modifier le compte plutôt que de le supprimer.

## 1. Saisie de repas dans le Journal Nutrition (bloquant n°1)

**Constat :** `addJournalEntry` n'avait aucun appelant. Il en a maintenant deux : `AjoutRepasPanneau.tsx:261` et `RecetteMacros.tsx:80`.

| Élément | Où |
|---|---|
| Bouton flottant « Ajouter un repas » dans la zone du pouce, à l'emplacement du « + » du dashboard, en dehors du conteneur animé. Variante « carte » dans l'état vide. | `nutrition/journal/AjoutRepasBouton.tsx:37`, `JournalJour.tsx` (état vide, fin du rendu) |
| Feuille en deux temps. **Choisir :** moment en contrôle segmenté, pré-rempli selon l'heure ; recherche aliment/recette insensible aux accents ; **récents** avec la dernière quantité. **Doser :** g/ml, pièces ou portions ; pas-à-pas −/+ ; raccourcis 50/100/150/200 ; champ `inputMode="decimal"` qui accepte « 1,5 » ; aperçu kcal et macros ; bouton « Ajouter au déjeuner ». | `nutrition/journal/AjoutRepasPanneau.tsx:418` (panneau), `:136` (choix), `:238` (quantité) |
| Fonctions pures : `momentParDefaut`, `extraireRecents`, `rechercherCatalogue`, `saisieParDefaut`, `nutritionSaisie`, `AJOUT_LABELS` | `lib/nutrition/compute.ts:98-260` |
| Catalogue : 245 aliments et 49 recettes en base, donc recherche côté client. Les récents sont les 80 dernières entrées, dédoublonnées. | `actions/journal.ts:120` (`getCatalogueJournal`) |
| Fiche recette : le compteur « Portions consommées » est relié au Journal. Moment pré-rempli, « Ajouter au journal », toast avec action « Voir ». Boutons −/+ passés de 30 à 44 px. | `nutrition/recettes/[id]/RecetteMacros.tsx:74-100,141-175`, `page.tsx:50` |
| Raccourci « Repas » dans la QuickAddFab, en premier, au plus près du « + ». Sans date : le jour courant côté serveur. | `QuickAddFab.tsx` (entrée de menu, `:245`) |
| `addJournalEntry` : date facultative (jour courant côté serveur) et validée au format ISO. Message d'erreur lisible au lieu du message Postgres brut. `revalidatePath("/")` en plus. | `actions/journal.ts:178` |

**Type de jour repos/entraînement (J-P1-1) : fait**
- **Migration :** `scripts/migration-journal-jours-2026-09-25.sql` (et `-revert.sql`). Une table `journal_jours(date pk, jour_type jour_type_ppl)` ; le trigger réutilise `set_updated_at()`, sans la recréer.
- **Écriture :** la bascule mémorise le choix via `setJourTypeJournal` (`actions/journal.ts:97`), appelée par `nutrition/journal/JourTypeBascule.tsx`. `?jour=` n'est plus qu'une surcharge immédiate.
- **Lecture :** `lireJourJournal` (`jour.ts:23`) lit le type mémorisé quand `?jour=` est absent.
- **Navigation :** les liens ‹ › et le swipe ne propagent plus `&jour=` (`JournalNavigationJour.tsx`, `JournalSwipeWrapper.tsx`). Chaque jour applique donc son propre type.
- **Dashboard :** `getResumeNutritionJour(date)` (`actions/journal.ts:48`) lit le type mémorisé. La carte affiche « · Entraînement ».
- **Clé de cache :** `queryKeys.resumeNutrition(date)` remplace `objectifNutritionnel("repos")`.

**Corrigés au passage :**
- **J-P1-5 :** plus de `entry.recette!` sur une entrée orpheline. Plus de cible inventée à 2100 kcal : sans objectif, la carte affiche « objectif à définir » (`DashboardNutritionSection.tsx`).

## 2. Garde-fous de suppression (T2)

| Module | Avant | Après | Où |
|---|---|---|---|
| Budget, compte | `confirm("Supprimer le compte « X » ? ")` | Dialogue qui compte ce qui sera effacé en cascade : N transactions, dont M virements avec un autre compte (« dont le solde changera »), et K récurrences. Bouton « Supprimer le compte et N transactions », « Garder » en premier. | `actions/comptes.ts:86` (`getImpactSuppressionCompte`), `budget/comptes/ComptesList.tsx:28-47,92` |
| Collection, photo | `×` de 28 px, suppression immédiate du Storage | Photo masquée, toast « Annuler » pendant 6 s. L'appel serveur n'a lieu qu'à l'expiration : **« Annuler » n'a rien à restaurer**. Zone de tap de 44 px. | `collection/[id]/PhotosGrid.tsx:62-90` |
| Objectifs, champ vide | `Number("") === 0` écrasait la mesure | Champ vide refusé en ligne (`role="alert"`, focus). La valeur brute part au serveur, qui refuse aussi le vide. Nouveau bouton « Supprimer la mesure du … ». | `objectifs/[id]/ObjectifSuiviValeur.tsx:105-140`, `actions/objectifs.ts:280` (`enregistrerEntreeObjectif`), `:306` (`supprimerEntreeObjectif`) |
| Documents, fichier | `×` de 20 px, retrait immédiat du Storage | Même suppression différée annulable. Cible de 44 px. | `documents/DocumentForm.tsx:225-250` |
| Tâches, sous-tâche | `×` nu, suppression immédiate | Suppression différée annulable. ↑ ↓ × passés à 44 px de haut, `aria-label` nommant la sous-tâche. | `taches/TasksList.tsx:110-236` |
| Réglages, nettoyage auto | Activé en un tap, sans explication | Explication permanente sous l'interrupteur. Avant activation, un dialogue liste ce qui sera supprimé chaque jour (aligné sur `TABLES` de `supabase/functions/nettoyage-auto`). La désactivation reste directe. | `reglages/NettoyageAutoRow.tsx:43-80,118-140` |

**Briques partagées :**
- `lib/actions/suppressionDifferee.ts:23` (`supprimerAvecAnnulation`).
- `components/ConfirmDialog.tsx:21` : rendu en portal, pour ne pas être déformé par l'`active:scale` d'une ligne de liste.
- **`ToastHost` généralisé :** le libellé visible de l'action n'est plus « Annuler » codé en dur. `label` est le texte visible, `ariaLabel` le libellé avec contexte (`toast-store.ts`, `ToastHost.tsx`). Les deux appelants Courses sont mis à jour.

## 3. Contrat d'erreur des Server Actions (T1)

**Socle :**
- **`lib/actions/result.ts` :** type `ActionResult<T>` = `{ ok, data } | { ok: false, error }`, avec `ok()` et `fail()`.
- **`lib/actions/runAction.ts:33` :** wrapper client. Il accepte une action qui respecte le contrat **ou** une action historique qui lève. Dans les deux cas :
  - il normalise l'échec ;
  - il affiche un toast `role="alert"` (`showErrorToast`, `toast-store.ts:34`, pictogramme et bordure alerte) ;
  - il appelle `onError` pour restaurer la saisie.

  Une erreur réseau donne « Pas de connexion : rien n'a été enregistré… ».
- **Pourquoi les actions retournent l'erreur :** Next masque en production le message d'une exception de Server Action, alors qu'un message retourné arrive intact.

**Actions converties au retour `{ ok, error }` :**
- Tâches : `createSousTache`, `toggleSousTache`, `updateSousTache`, `deleteSousTache`, `reordonnerSousTaches` (`actions/taches.ts:865-960`).
- Journal : `setJourTypeJournal`.
- Objectifs : `enregistrerEntreeObjectif`, `supprimerEntreeObjectif`.
- Budget :
  - `supprimerCategorie` (`actions/categories-budget.ts:74`) : une catégorie utilisée (code `23503`) renvoie « « X » est encore utilisée… : réaffecte-les avant de la supprimer. » ;
  - `supprimerCompte`, `getImpactSuppressionCompte`, `supprimerTransaction`, `supprimerRecurrence`, `basculerActive`, `supprimerBudget`.
- Réglages : `updateReglagesNettoyage`.
- Collection : `televerserPhotosPartagees`.

**Appels clients sécurisés :**
- **Tâches :** sous-tâches (P0). Le champ n'est vidé qu'après un succès.
  - `ListesManager` (`reordonnerListes`) ;
  - `TagsManager` (`deleteTag`).
- **Habitudes :** `HabitudeCard.tsx:95`.
  - `enregistrerValeur` : hors ligne, mise en file comme le toggle ; sinon un toast.
  - `supprimer` : ne relance plus l'erreur.
- **Objectifs :**
  - changement de statut (`ObjectifHeader.tsx`) ;
  - ajout d'étape : la saisie n'est plus vidée sur échec (`ObjectifSuiviEtapes.tsx`).
- **Notes :** toutes les écritures de l'éditeur d'items (`NoteForm.tsx:41`, `executer`).
- **Budget :** transactions, catégories (2 composants), récurrences, comptes.
- **Recherche globale du dashboard :** l'erreur s'affiche dans la liste déroulante, en ligne et en `role="alert"` (`GlobalSearchBar.tsx:56`).
- **Documents :**
  - suppression depuis la liste (`DocumentCard.tsx`) ;
  - formulaire : exception réseau ou 413 → message dans le formulaire.

**Non converties, volontairement :** les actions rejouées par la file hors ligne (`lib/offline/queue.ts` : `toggleTache`, `deleteTache`, `toggleNoteItem`, `enregistrerEntreeHabitude`, etc.). La file s'appuie sur l'exception pour décider d'un rejeu. `runAction` les enveloppe côté client quand c'est nécessaire.

## 4. Recherche de transactions Budget (optimize)

- **`TransactionsFilters.tsx` réécrit.** Le champ n'est plus contrôlé par l'URL : état local, debounce de 250 ms (`:51`), `router.replace` dans `startTransition` (`:47`), indicateur « Recherche… » en `aria-live`. L'état se resynchronise pendant le rendu, sans effet, si l'URL change ailleurs (lien « Effacer », retour). Les `select` et le mois passent aussi par `replace`.
- **Plus d'écriture en base par lettre tapée.** `genererOccurrencesDues` ne s'exécute plus quand `?q=` est présent (`budget/transactions/page.tsx:95`). Seule la frappe produit ce paramètre, et l'ouverture de l'écran a déjà généré les occurrences du jour.

## 5. Uploads (harden)

**Utilitaire unique : `lib/images/compression.ts`.**
- `compresserImage` (`:63`) utilise `createImageBitmap` avec l'orientation EXIF.
- Il redimensionne à 2048 px au plus grand côté et encode en JPEG qualité 0,82, via `OffscreenCanvas` ou `<canvas>`.
- Il laisse passer tels quels :
  - les fichiers de moins de 800 Ko ;
  - les PDF, GIF et SVG ;
  - un HEIC que le navigateur ne sait pas décoder ;
  - tout résultat plus lourd que l'original.

Le module fournit aussi `repartirEnLots` (budget de 3,6 Mo par requête), `fichiersTropLourds` et `compresserFormData` (`:133`).

**Où il est branché :**
- **Collection :** compression puis envoi par lots, avec progression « Envoi 1/2… ». Les photos encore trop lourdes après compression sont signalées. Messages lisibles (`collection/[id]/AddPhotoButton.tsx:76`).
- **Documents :** le `FormData` du formulaire est compressé avant l'action (`DocumentForm.tsx:171`). S'il dépasse encore le budget, message explicite (« ajoute-les en plusieurs fois, ou réduis la taille des PDF ») au lieu d'un 413.
- **Partage natif (Web Share Target) :** l'OS poste directement au Route Handler, sans JS client.
  1. Le service worker intercepte ce POST (`public/sw.js:45`, `mettreDeCotePartage`) et met les photos de côté dans Cache Storage (`kilio-partage-en-attente`, exclu du nettoyage à l'activation).
  2. Il transmet seulement le texte ou le lien au Route Handler (`route.ts`, paramètres `attente`/`nb`).
  3. La page de choix lit les photos, les compresse avec **le même utilitaire**, les envoie par lots via `televerserPhotosPartagees` (`actions/collections.ts:298`), puis affiche le formulaire habituel (`choisir/PhotosPartageesEnAttente.tsx:45`, bouton « Réessayer » en cas d'échec).

  Sans service worker actif (premier lancement), l'ancien envoi direct reste le chemin de secours.
- **`bodySizeLimit: "4mb"` (`next.config.ts:38`) est conservé.** Il ne peut pas monter utilement : Vercel plafonne les fonctions à 4,5 Mo. La compression et les lots font passer chaque requête sous cette limite.

## 6. Vérification

- **`tsc --noEmit` :** 0 erreur. Seule reste `LayoutProps` dans `src/app/layout.tsx`, un type généré par `next typegen`, préexistant et hors build.
- **ESLint (`src` et `e2e`) :** 0 avertissement.
- **`next build` :** OK, avec le faux Supabase du rig. Toutes les routes gardent leur mode de rendu : Journal et Budget en ◐, `/collection/partage` en ƒ.
- **e2e (rig instant, `next start`) :** 152/156 au premier passage. Les 3 échecs concernaient le comportement volontairement changé : ‹ › et le swipe ne propagent plus `?jour=`. Tests mis à jour (`e2e/parite-journal-budget.spec.ts`), plus un contrôle d'écriture dans `journal_jours`. Nouveau fichier `e2e/journal-saisie.spec.ts` :
  - Journal : rechercher, doser, ajouter au dîner, puis vérifier l'insertion `quantite=150, moment=diner` et le toast ;
  - fiche recette : 2 portions au déjeuner.

  Relance ciblée : **21 passés, 1 ignoré** (swipe en desktop, par conception).
- **Passe visuelle groupée** sur Journal, feuille (choix et quantité), fiche recette et menu de la FAB, en mobile (Pixel 7) et desktop, thèmes clair et sombre. Aucun défaut de mise en page.
- **Détecteur `impeccable detect`** sur les fichiers UI modifiés : 3 avertissements consultatifs `design-system-font-size`, sur des lignes préexistantes (13,5 / 10 / 14 px, même famille que les faux positifs de l'annexe A de l'audit).
- **Grep des constats du rapport :**
  - `addJournalEntry` a 2 appelants ;
  - `TransactionsFilters` ne fait plus de `router.push` ;
  - `ComptesList` ne fait plus de `confirmDelete` ;
  - `PhotosGrid` n'a plus de `deleteMutation` immédiate ;
  - `ObjectifSuiviValeur` ne fait plus de `Number(valeurInputRef…)` ;
  - les actions de sous-tâches n'ont plus de `throw` ;
  - `ToastHost` n'a plus « Annuler » codé en dur.

## 7. Reste en suspens

- **Uploads à confirmer sur appareil :**
  - taille réelle après compression d'une photo de téléphone ;
  - HEIC sur iOS ;
  - partage natif Android par le service worker. Le rig ne sait pas simuler un Web Share Target, et une mise à jour du SW est nécessaire : le navigateur le récupère au prochain chargement.
- **Suppression différée :** si l'app est fermée pendant les 6 s du toast, la suppression n'a pas lieu et l'élément réapparaît. Ce sens a été choisi pour ne jamais perdre de données.
- **Uploads d'images de Tâches** (`createTache`/`uploadTacheImages`) : ils peuvent réutiliser `compresserFormData` en une ligne, mais sont hors du périmètre demandé.
- **Journal :**
  - pas d'édition d'une entrée existante (tap pour changer la quantité) ;
  - `window.confirm()` sur la suppression d'un repas. Les deux sont des P1/P2 de l'audit, hors Vague 1.
- **Hors vague, repéré en chemin :** après une erreur de validation, React 19 réinitialise le `<form action>` de `DocumentForm`, donc les fichiers choisis sont perdus. Le comportement préexistait. À traiter en Vague 2 avec T11.
- **Contraste blanc sur `--accent-kcal` en sombre (T4) :** les nouveaux boutons pleins héritent du problème existant. Il se corrigera à la source avec `--on-kcal` (Vague 2).
- **T3 (date « du jour » en UTC) :** volontairement exclu. Le Journal, la fiche recette et la FAB utilisent le même « aujourd'hui » serveur, donc restent cohérents entre eux.

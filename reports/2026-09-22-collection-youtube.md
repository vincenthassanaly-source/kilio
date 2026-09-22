# Collection : support des liens YouTube (2026-09-22)

Ajout de YouTube au module Collection, sur le modèle exact de TikTok, avec un
**champ unique** qui détecte automatiquement la plateforme côté serveur, et le
partage natif Android (Web Share Target) étendu à YouTube.

## Base de données

Contrainte constatée en Phase 1 (projet `vsmtkopkqasrdnjceegp`) :

| conname | définition |
|---|---|
| `collection_items_type_check` | `CHECK ((type = ANY (ARRAY['photo'::text, 'tiktok'::text])))` |

Migration **appliquée** (`scripts/migration-collection-youtube-2026-09-22.sql`,
migration Supabase `collection_youtube_2026_09_22`) :

```sql
alter table collection_items
  drop constraint collection_items_type_check,
  add constraint collection_items_type_check check (type in ('photo', 'tiktok', 'youtube'));
```

Revert : `scripts/migration-collection-youtube-2026-09-22-revert.sql` (remet
`('photo', 'tiktok')`. Il échoue tant qu'il reste des items `youtube`).
`thumbnail_url` est inchangée. `collection_items.type` est typé `string` dans
`src/lib/supabase/types.ts`, donc aucune régénération des types n'est nécessaire.

## Fichiers créés

- `src/lib/collection/youtube.ts` : `estHoteYoutube`, `extraireIdVideoYoutube`
  (`/watch?v=`, `/shorts/<id>`, `/embed/<id>`, `/live/<id>`, `youtu.be/<id>`),
  `recupererMetadonneesYoutube` (oEmbed `format=json`, ne lève jamais),
  `YOUTUBE_URL_IN_TEXT_PATTERN`.
- `src/lib/collection/video.ts` : `TypeVideo`, `estTypeVideo`,
  `detecterTypeVideo`, `MetadonneesVideo`, `recupererMetadonneesVideo`,
  `extraireLienVideoDuTexte` (regex fusionnée TikTok + YouTube).
- `src/components/YoutubeLightbox.tsx` : iframe
  `https://www.youtube.com/embed/<id>?autoplay=1`, `useBackClose`.
- Les deux scripts de migration ci-dessus.

## Fichiers modifiés

- `src/lib/collection/tiktok.ts` : `estHoteTiktok` et
  `TIKTOK_URL_IN_TEXT_PATTERN` sont maintenant **exportés** (pour le
  dispatcher). La logique interne n'a pas changé.
- `src/app/actions/collections.ts` : `ajouterLienTiktok` devient `ajouterLienVideo`
  (`type: metadonnees.type`, message « Lien TikTok ou YouTube invalide ou
  introuvable. »), `recupererLienTiktokPartage` devient `recupererLienVideoPartage`,
  et `rattacherPhotoACollection` lit `video_url` / `video_thumbnail` /
  `video_titre` / `video_type`.
- `src/app/collection/partage/route.ts` : `extraireLienVideoDuTexte` et
  `recupererLienVideoPartage`, avec les query params `video_*` + `video_type`.
  Le commentaire de tête a été mis à jour.
- `src/app/collection/partage/choisir/page.tsx` : lit les params `video_*`.
  Le badge affiche « TikTok » ou « YouTube ».
- `src/app/collection/partage/choisir/ChoisirCollectionForm.tsx` : la prop
  `tiktok` devient `video` (avec `type`), et les champs cachés deviennent `video_*`.
- `src/app/(app)/collection/[id]/AddPhotoButton.tsx` : bouton « Lien vidéo »
  avec une icône play neutre, qui appelle `ajouterLienVideo`. Le placeholder est
  `https://www.tiktok.com/… ou https://youtube.com/…`.
- `src/app/(app)/collection/[id]/PhotosGrid.tsx` : `estVideo`,
  `VideoBadge({ type })` (icône TikTok ou nouvelle icône YouTube), un lightbox
  choisi selon le type, et un `aria-label` dynamique.
- `src/app/(app)/collection/CollectionMosaic.tsx` : `unoptimized` est calculé
  pour TikTok **et** YouTube (6 occurrences).

`public/manifest.json` n'a pas changé : le `share_target` accepte déjà `text` et
`url`.

## Vérifications

- `next build` passe.
- `tsc --noEmit` ne signale aucune erreur (après génération des types Next par le build).
- ESLint passe sur tous les fichiers touchés.
- Aucune référence résiduelle à `ajouterLienTiktok`, `recupererLienTiktokPartage`
  ou aux params `tiktok_*`. `extraireLienTiktokDuTexte` reste défini dans
  `tiktok.ts`, mais n'est plus importé nulle part.
- Test ad hoc (tsx) de l'extraction d'id : les formes watch, youtu.be (avec
  `?si=`), shorts et embed fonctionnent. Une URL de chaîne est rejetée, et un
  hôte non-YouTube n'est pas détecté. Un lien est bien repéré au milieu d'un
  texte, pour YouTube comme pour TikTok.
- **Non vérifié ici** : l'appel oEmbed réel. La politique réseau du sandbox
  bloque `www.youtube.com` et `www.tiktok.com`. À tester sur l'appli déployée
  (ajout inline + partage depuis l'app YouTube).

## Écarts par rapport au prompt

- **Branche** : le travail a été fait sur `claude/collection-youtube-support-bwtuei`.
  Cette branche est au même commit que `origin/kilio` (`040e92e`), donc son
  point de départ est identique à celui de `kilio`.
- **`CollectionMosaic` / `PhotosGrid`** : j'ai utilisé le helper
  `estTypeVideo(type)` de `video.ts` au lieu d'écrire
  `type === "tiktok" || type === "youtube"` à chaque endroit. Le comportement est
  identique, et la liste des plateformes n'existe qu'à un seul endroit.
- **`rattacherPhotoACollection`** : il valide `video_type` avec `estTypeVideo`
  et renvoie « Type de vidéo inconnu. » si un `video_url` arrive sans type valide.
  Il n'insère donc jamais un type arbitraire, que la contrainte DB rejetterait de
  toute façon.
- **`YoutubeLightbox`** : l'id est extrait de façon **synchrone**, car aucune
  redirection n'est à résoudre. Il n'y a donc pas d'état « Chargement… » ni de
  `useEffect`. Le cadre est au format `aspect-video` (16:9, jusqu'à 960 px de
  large) au lieu du format vertical de TikTok (420 px).
- **`extraireIdVideoYoutube`** accepte aussi `/live/<id>` et
  `music.youtube.com`, deux formes courantes de partage.
- Input du formulaire : ajout de `type="url"`, `inputMode="url"`,
  `aria-label` et `min-w-0`, pour un meilleur clavier mobile et pour éviter un
  débordement avec le placeholder plus long.

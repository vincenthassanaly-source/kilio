-- Champs dynamiques selon l'étiquette choisie à la création d'un document :
-- une étiquette porte désormais un `type_champs` qui détermine quels champs
-- supplémentaires le formulaire affiche (cf. le pattern déjà utilisé par
-- objectifs.type_suivi pour changer les champs de suivi affichés).
--
-- - 'standard' (défaut) : comportement actuel, aucun champ supplémentaire.
-- - 'recto_verso' : deux emplacements de fichier dédiés (Recto/Verso) au
--   lieu du sélecteur générique multi-fichiers — utile pour les pièces
--   d'identité, permis, cartes.
-- - 'periode_mensuelle' : un champ "mois concerné" en plus (documents.
--   periode_mois), pour les documents mensuels (bulletins de salaire,
--   factures, quittances...).

alter table etiquettes
  add column type_champs text not null default 'standard'
  check (type_champs in ('standard', 'recto_verso', 'periode_mensuelle'));

update etiquettes set type_champs = 'recto_verso' where nom in (
  'Carte d''identité',
  'Passeport',
  'Permis de conduire',
  'Carte vitale',
  'Carte grise',
  'Carte de mutuelle',
  'Titre de séjour'
);

update etiquettes set type_champs = 'periode_mensuelle' where nom in (
  'Quittance de loyer',
  'Facture d''électricité',
  'Facture de gaz',
  'Facture d''eau',
  'Facture internet / téléphone',
  'Bulletin de salaire',
  'Relevé bancaire'
);

-- Étiquette générique pour une facture qui ne correspond à aucun type
-- spécifique déjà présent (électricité/gaz/eau/internet).
insert into etiquettes (nom, type_champs)
values ('Facture', 'periode_mensuelle')
on conflict (nom) do nothing;

-- Support du champ "mois concerné" (type_champs = 'periode_mensuelle') :
-- stocké comme le 1er jour du mois (ex. 2026-09-01 pour "septembre 2026").
alter table documents
  add column periode_mois date null;

-- Support du type_champs 'recto_verso' : étiquette le fichier comme recto
-- ou verso plutôt qu'un simple élément d'une liste générique.
alter table document_fichiers
  add column role text null check (role in ('recto', 'verso'));

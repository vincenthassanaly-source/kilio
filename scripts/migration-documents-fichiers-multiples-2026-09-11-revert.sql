-- Revert de migration-documents-fichiers-multiples-2026-09-11.sql
--
-- Restaure fichier_url/fichier_type sur documents à partir du premier
-- fichier (ordre le plus bas) de chaque document, puis supprime
-- document_fichiers. Un document ayant plusieurs fichiers perd les autres
-- (recto/verso, etc.) : ce revert est destructif au-delà du fichier
-- restauré, comme pour toute réduction de cardinalité 1→N vers 1→1.

alter table documents
  add column fichier_url text,
  add column fichier_type text check (fichier_type is null or fichier_type in ('image', 'pdf'));

update documents d
set fichier_url = f.url,
    fichier_type = f.fichier_type
from (
  select distinct on (document_id) document_id, url, fichier_type
  from document_fichiers
  order by document_id, ordre asc
) f
where f.document_id = d.id;

alter table documents
  alter column fichier_url set not null,
  alter column fichier_type set not null;

drop table if exists document_fichiers;

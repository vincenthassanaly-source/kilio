"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { recupererMetadonneesTiktok } from "@/lib/collection/tiktok";
import { createClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/lib/supabase/types";

const COLLECTION_IMAGES_BUCKET = "collection-images";
const COLLECTION_IMAGE_MAX_DIMENSION = 1600;
const COLLECTION_IMAGE_JPEG_QUALITY = 75;

// Nombre de vignettes affichées dans la mosaïque de couverture d'une
// collection (grille façon Pinterest sur /collection).
const APERCU_PHOTOS_LIMIT = 4;

function revalidateCollectionsPaths(collectionId?: string) {
  revalidatePath("/collection");
  if (collectionId) revalidatePath(`/collection/${collectionId}`);
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Compresse et upload chaque fichier (même pattern que uploadTacheImages
// dans src/app/actions/taches.ts). Le chemin de stockage n'est pas préfixé
// par un id de collection : réutilisé tel quel par la réception de partage
// (route.ts), où la collection de destination n'est pas encore connue.
async function compresserEtUploaderPhoto(supabase: SupabaseClient, fichier: File): Promise<string> {
  const buffer = Buffer.from(await fichier.arrayBuffer());
  const compresse = await sharp(buffer)
    .rotate()
    .resize(COLLECTION_IMAGE_MAX_DIMENSION, COLLECTION_IMAGE_MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: COLLECTION_IMAGE_JPEG_QUALITY })
    .toBuffer();

  const chemin = `${crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(COLLECTION_IMAGES_BUCKET)
    .upload(chemin, compresse, { contentType: "image/jpeg" });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from(COLLECTION_IMAGES_BUCKET).getPublicUrl(chemin);

  return publicUrl;
}

// Chemin de stockage attendu : `${uuid}.jpg`, sous
// `/storage/v1/object/public/collection-images/`. Même logique que
// extraireCheminStorage dans src/app/actions/taches.ts.
function extraireCheminStorage(url: string): string | null {
  const marqueur = `/${COLLECTION_IMAGES_BUCKET}/`;
  const index = url.indexOf(marqueur);
  if (index === -1) return null;
  return url.slice(index + marqueur.length);
}

// --- Collections ---

export type ApercuItem = { url: string; type: string };

export type CollectionAvecApercu = Tables<"collections"> & {
  photos_apercu: ApercuItem[];
  nb_photos: number;
};

export async function getCollectionsAvecApercu(): Promise<CollectionAvecApercu[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_items(url, thumbnail_url, type, ordre)")
    .order("ordre", { ascending: true })
    .order("created_at", { ascending: false })
    .order("ordre", { referencedTable: "collection_items", ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map(({ collection_items, ...collection }) => ({
    ...collection,
    photos_apercu: collection_items.slice(0, APERCU_PHOTOS_LIMIT).map((item) => ({
      url: item.thumbnail_url ?? item.url,
      type: item.type,
    })),
    nb_photos: collection_items.length,
  }));
}

export type CollectionAvecPhotos = Tables<"collections"> & {
  photos: Tables<"collection_items">[];
};

export async function getCollectionAvecPhotos(id: string): Promise<CollectionAvecPhotos | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_items(*)")
    .eq("id", id)
    .order("ordre", { referencedTable: "collection_items", ascending: true })
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { collection_items, ...collection } = data;
  return { ...collection, photos: collection_items };
}

async function creerCollection(supabase: SupabaseClient, nom: string): Promise<string> {
  const { data: derniere } = await supabase
    .from("collections")
    .select("ordre")
    .order("ordre", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("collections")
    .insert({ nom, ordre: (derniere?.ordre ?? -1) + 1 })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export type CollectionFormState = { error: string | null };

export async function createCollection(
  _prevState: CollectionFormState,
  formData: FormData
): Promise<CollectionFormState> {
  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return { error: "Le nom est requis." };

  const supabase = await createClient();

  try {
    await creerCollection(supabase, nom);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur lors de la création." };
  }

  revalidateCollectionsPaths();
  return { error: null };
}

export async function renameCollection(id: string, nom: string) {
  const trimmed = nom.trim();
  if (!trimmed) throw new Error("Le nom est requis.");

  const supabase = await createClient();
  const { error } = await supabase.from("collections").update({ nom: trimmed }).eq("id", id);

  if (error) throw new Error(error.message);

  revalidateCollectionsPaths(id);
}

export async function deleteCollection(id: string) {
  const supabase = await createClient();

  const { data: photos, error: fetchError } = await supabase
    .from("collection_items")
    .select("url")
    .eq("collection_id", id);
  if (fetchError) throw new Error(fetchError.message);

  const chemins = (photos ?? [])
    .map((p) => extraireCheminStorage(p.url))
    .filter((c): c is string => c !== null);
  if (chemins.length > 0) {
    const { error: removeError } = await supabase.storage.from(COLLECTION_IMAGES_BUCKET).remove(chemins);
    if (removeError) throw new Error(removeError.message);
  }

  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateCollectionsPaths();
}

// --- Photos (depuis la vue d'une collection) ---

export async function uploadCollectionPhotos(collectionId: string, formData: FormData) {
  const fichiers = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (fichiers.length === 0) return;

  const supabase = await createClient();

  const { data: derniere } = await supabase
    .from("collection_items")
    .select("ordre")
    .eq("collection_id", collectionId)
    .order("ordre", { ascending: false })
    .limit(1)
    .maybeSingle();

  let ordre = (derniere?.ordre ?? -1) + 1;

  for (const fichier of fichiers) {
    const url = await compresserEtUploaderPhoto(supabase, fichier);

    const { error: insertError } = await supabase
      .from("collection_items")
      .insert({ collection_id: collectionId, url, ordre });
    if (insertError) throw new Error(insertError.message);

    ordre++;
  }

  revalidateCollectionsPaths(collectionId);
}

// Ajoute un lien vidéo TikTok à une collection : récupère ses métadonnées
// (miniature, titre) via oEmbed puis insère un collection_items de type
// 'tiktok'. Suit le même pattern (throw + gestion d'erreur côté composant)
// que uploadCollectionPhotos, plutôt qu'un useActionState : c'est le champ
// d'ajout inline le plus proche dans AddPhotoButton.
export async function ajouterLienTiktok(collectionId: string, url: string) {
  const lien = url.trim();
  if (!lien) throw new Error("Le lien est requis.");

  const metadonnees = await recupererMetadonneesTiktok(lien);
  if (!metadonnees) throw new Error("Lien TikTok invalide ou introuvable.");

  const supabase = await createClient();

  const { data: derniere } = await supabase
    .from("collection_items")
    .select("ordre")
    .eq("collection_id", collectionId)
    .order("ordre", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("collection_items").insert({
    collection_id: collectionId,
    type: "tiktok",
    url: metadonnees.url,
    thumbnail_url: metadonnees.thumbnailUrl,
    titre: metadonnees.titre || null,
    ordre: (derniere?.ordre ?? -1) + 1,
  });
  if (error) throw new Error(error.message);

  revalidateCollectionsPaths(collectionId);
}

export async function deleteCollectionItem(itemId: string) {
  const supabase = await createClient();

  const { data: item, error: fetchError } = await supabase
    .from("collection_items")
    .select("url, collection_id")
    .eq("id", itemId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const chemin = extraireCheminStorage(item.url);
  if (chemin) {
    const { error: removeError } = await supabase.storage.from(COLLECTION_IMAGES_BUCKET).remove([chemin]);
    if (removeError) throw new Error(removeError.message);
  }

  const { error } = await supabase.from("collection_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidateCollectionsPaths(item.collection_id);
}

// --- Web Share Target ---

// Reçoit les fichiers déjà uploadés (sans collection) depuis
// src/app/collection/partage/route.ts, compresse et stocke chaque photo
// dans le bucket, sans les rattacher à une collection.
export async function uploaderPhotosPartagees(fichiers: File[]): Promise<string[]> {
  const supabase = await createClient();
  const urls: string[] = [];
  for (const fichier of fichiers) {
    urls.push(await compresserEtUploaderPhoto(supabase, fichier));
  }
  return urls;
}

// Équivalent de uploaderPhotosPartagees pour un lien TikTok partagé : récupère
// ses métadonnées immédiatement (sans les rattacher à une collection), pour
// que route.ts les propage en query params vers /collection/partage/choisir.
export async function recupererLienTiktokPartage(url: string) {
  return recupererMetadonneesTiktok(url);
}

export type RattacherPhotoFormState = { error: string | null };

// Rattache une ou plusieurs photos et/ou un lien TikTok déjà résolus
// (partage natif) à une collection existante ou à une nouvelle collection
// créée à la volée, puis redirige vers la vue de la collection. Signature
// (prevState, formData) pour être pilotée par useActionState, comme le reste
// du repo (cf. createCollection/createNote) : redirect() est appelé après la
// mutation et n'a donc jamais besoin de renvoyer un état de succès.
export async function rattacherPhotoACollection(
  _prevState: RattacherPhotoFormState,
  formData: FormData
): Promise<RattacherPhotoFormState> {
  const collectionIdChoisie = String(formData.get("collection_id") ?? "").trim();
  const nouvelleCollectionNom = String(formData.get("nouvelle_collection") ?? "").trim();
  const urls = formData.getAll("url").map(String).filter(Boolean);
  const tiktokUrl = String(formData.get("tiktok_url") ?? "").trim();
  const tiktokThumbnail = String(formData.get("tiktok_thumbnail") ?? "").trim();
  const tiktokTitre = String(formData.get("tiktok_titre") ?? "").trim();

  if (urls.length === 0 && !tiktokUrl) return { error: "Rien à rattacher." };
  if (!collectionIdChoisie && !nouvelleCollectionNom) {
    return { error: "Choisis une collection ou crée-en une nouvelle." };
  }

  const supabase = await createClient();
  let collectionId: string;

  try {
    collectionId = collectionIdChoisie || (await creerCollection(supabase, nouvelleCollectionNom));

    const { data: derniere } = await supabase
      .from("collection_items")
      .select("ordre")
      .eq("collection_id", collectionId)
      .order("ordre", { ascending: false })
      .limit(1)
      .maybeSingle();

    let ordre = (derniere?.ordre ?? -1) + 1;

    const items: TablesInsert<"collection_items">[] = urls.map((url) => ({
      collection_id: collectionId,
      url,
      ordre: ordre++,
    }));

    if (tiktokUrl) {
      items.push({
        collection_id: collectionId,
        type: "tiktok",
        url: tiktokUrl,
        thumbnail_url: tiktokThumbnail || null,
        titre: tiktokTitre || null,
        ordre: ordre++,
      });
    }

    const { error } = await supabase.from("collection_items").insert(items);
    if (error) throw new Error(error.message);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur lors de l'ajout." };
  }

  revalidateCollectionsPaths(collectionId);
  redirect(`/collection/${collectionId}`);
}

export async function getCollections(): Promise<Tables<"collections">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .order("ordre", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

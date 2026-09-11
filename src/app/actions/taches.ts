"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { aujourdhuiISO, calculerProchaineOccurrence } from "@/lib/budget/compute";
import type { Enums, Tables } from "@/lib/supabase/types";

export type TacheFormState = { error: string | null };

const PRIORITES: readonly Enums<"priorite_tache">[] = ["aucune", "basse", "moyenne", "haute"];
const FREQUENCES: readonly Enums<"frequence_recurrence">[] = [
  "quotidien",
  "hebdomadaire",
  "mensuel",
  "annuel",
];

const HEURE_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const RAPPEL_MINUTES_VALEURS = [5, 15, 30, 60, 1440] as const;

function revalidateTachesPaths() {
  revalidatePath("/taches");
  revalidatePath("/agenda");
  revalidatePath("/");
}

type TacheInput = {
  titre: string;
  echeance: string | null;
  heure: string | null;
  heure_fin: string | null;
  liste_id: string;
  notes: string | null;
  priorite: Enums<"priorite_tache">;
  recurrence_frequence: Enums<"frequence_recurrence"> | null;
  recurrence_fin: string | null;
  toute_la_journee: boolean;
  rappel_minutes: number | null;
};

type ParseResult = { ok: true; value: TacheInput } | { ok: false; error: string };

function parseTacheInput(formData: FormData): ParseResult {
  const titre = String(formData.get("titre") ?? "").trim();
  const echeance = String(formData.get("echeance") ?? "").trim();
  const heure = String(formData.get("heure") ?? "").trim();
  const heure_fin = String(formData.get("heure_fin") ?? "").trim();
  const liste_id = String(formData.get("liste_id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const priorite = String(formData.get("priorite") ?? "aucune");
  const recurrence_frequence = String(formData.get("recurrence_frequence") ?? "").trim();
  const recurrence_fin = String(formData.get("recurrence_fin") ?? "").trim();
  const toute_la_journee = formData.get("toute_la_journee") === "on";
  const rappel_minutes_brut = String(formData.get("rappel_minutes") ?? "").trim();

  if (!titre) return { ok: false, error: "Le titre est requis." };
  if (!liste_id) return { ok: false, error: "La liste est requise." };
  if (heure && !HEURE_REGEX.test(heure)) {
    return { ok: false, error: "Heure invalide (format HH:MM)." };
  }
  if (heure_fin && !HEURE_REGEX.test(heure_fin)) {
    return { ok: false, error: "Heure de fin invalide (format HH:MM)." };
  }
  if (heure && heure_fin && heure_fin <= heure) {
    return { ok: false, error: "L'heure de fin doit être après l'heure de début." };
  }
  if (!PRIORITES.includes(priorite as Enums<"priorite_tache">)) {
    return { ok: false, error: "Priorité invalide." };
  }
  if (recurrence_frequence && !FREQUENCES.includes(recurrence_frequence as Enums<"frequence_recurrence">)) {
    return { ok: false, error: "Fréquence de récurrence invalide." };
  }

  const frequence = recurrence_frequence
    ? (recurrence_frequence as Enums<"frequence_recurrence">)
    : null;

  // Un rappel n'a de sens qu'avec une heure précise (ou, pour une tâche
  // toute la journée, avec la valeur 1440 ancrée sur 18h la veille) : toute
  // autre valeur (y compris vide) est silencieusement ramenée à null,
  // plutôt que rejetée comme une erreur de formulaire.
  const rappel_minutes_parse = Number(rappel_minutes_brut);
  const rappel_minutes_valide =
    rappel_minutes_brut &&
    RAPPEL_MINUTES_VALEURS.includes(rappel_minutes_parse as (typeof RAPPEL_MINUTES_VALEURS)[number])
      ? rappel_minutes_parse
      : null;
  // Toute la journée : seule 1440 (la veille) a un sens sans heure précise —
  // jamais de défaut automatique, Vincent la sélectionne manuellement.
  // Avec heure précise : rappel n'a de sens que si heure est renseignée,
  // même si le client envoyait une valeur (défensif, la même règle que
  // toute_la_journee ci-dessous pour heure/heure_fin).
  const rappel_minutes = toute_la_journee
    ? rappel_minutes_valide === 1440
      ? 1440
      : null
    : heure
      ? rappel_minutes_valide
      : null;

  return {
    ok: true,
    value: {
      titre,
      // "Toute la journée" et une heure précise sont mutuellement
      // exclusives : le serveur force heure/rappel_minutes à null plutôt que
      // de faire confiance au client, qui masque déjà ces champs.
      echeance: echeance || null,
      heure: toute_la_journee ? null : heure || null,
      heure_fin: toute_la_journee ? null : heure_fin || null,
      liste_id,
      notes: notes || null,
      priorite: priorite as Enums<"priorite_tache">,
      recurrence_frequence: frequence,
      // La date de fin de récurrence n'a de sens qu'accompagnée d'une
      // fréquence : silencieusement ignorée sinon (même logique que
      // unite/valeur_cible pour les objectifs de type "valeur").
      recurrence_fin: frequence && recurrence_fin ? recurrence_fin : null,
      toute_la_journee,
      rappel_minutes,
    },
  };
}

type SupabaseClient = ReturnType<typeof createAdminClient>;

async function resolveTagIds(
  supabase: SupabaseClient,
  tagIds: string[],
  nouveauxNoms: string[]
): Promise<string[]> {
  const ids = new Set(tagIds);

  if (nouveauxNoms.length > 0) {
    // upsert sur le nom (unique) : si le tag existe déjà, on récupère son id
    // au lieu d'en recréer un, pour permettre la "création à la volée" sans
    // dupliquer un tag déjà présent.
    const { data, error } = await supabase
      .from("tags")
      .upsert(
        nouveauxNoms.map((nom) => ({ nom })),
        { onConflict: "nom" }
      )
      .select("id");

    if (error) throw new Error(error.message);
    for (const tag of data ?? []) ids.add(tag.id);
  }

  return [...ids];
}

function parseTagFields(formData: FormData): { tagIds: string[]; nouveauxNoms: string[] } {
  const tagIds = formData.getAll("tag_ids").map(String).filter(Boolean);
  const nouveauxNoms = [
    ...new Set(
      String(formData.get("nouveaux_tags") ?? "")
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean)
    ),
  ];
  return { tagIds, nouveauxNoms };
}

async function syncTachesTags(supabase: SupabaseClient, tacheId: string, tagIds: string[]) {
  const { error: deleteError } = await supabase.from("taches_tags").delete().eq("tache_id", tacheId);
  if (deleteError) throw new Error(deleteError.message);

  if (tagIds.length > 0) {
    const { error: insertError } = await supabase
      .from("taches_tags")
      .insert(tagIds.map((tag_id) => ({ tache_id: tacheId, tag_id })));
    if (insertError) throw new Error(insertError.message);
  }
}

export async function createTache(
  _prevState: TacheFormState,
  formData: FormData
): Promise<TacheFormState> {
  const parsed = parseTacheInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = createAdminClient();

  const { data: derniere } = await supabase
    .from("taches")
    .select("ordre")
    .eq("liste_id", parsed.value.liste_id)
    .order("ordre", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: tache, error } = await supabase
    .from("taches")
    .insert({ ...parsed.value, ordre: (derniere?.ordre ?? -1) + 1 })
    .select("id")
    .single();

  if (error) return { error: error.message };

  try {
    const { tagIds, nouveauxNoms } = parseTagFields(formData);
    const resolvedTagIds = await resolveTagIds(supabase, tagIds, nouveauxNoms);
    await syncTachesTags(supabase, tache.id, resolvedTagIds);
  } catch (tagError) {
    return { error: tagError instanceof Error ? tagError.message : "Erreur lors des tags." };
  }

  try {
    await uploadTacheImages(tache.id, formData);
  } catch (imageError) {
    return {
      error: imageError instanceof Error ? imageError.message : "Erreur lors de l'envoi des images.",
    };
  }

  revalidateTachesPaths();
  return { error: null };
}

export async function updateTache(
  _prevState: TacheFormState,
  formData: FormData
): Promise<TacheFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Tâche introuvable." };

  const parsed = parseTacheInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = createAdminClient();

  const { data: existante, error: fetchError } = await supabase
    .from("taches")
    .select("echeance, heure, rappel_minutes")
    .eq("id", id)
    .single();
  if (fetchError) return { error: fetchError.message };

  // Un rappel déjà envoyé ne doit pas rester "acquis" si la tâche est
  // déplacée à une nouvelle heure : sans ça, une tâche repoussée ne
  // renverrait plus jamais de rappel.
  const rappelObsolete =
    existante.echeance !== parsed.value.echeance ||
    existante.heure !== parsed.value.heure ||
    existante.rappel_minutes !== parsed.value.rappel_minutes;

  const { error } = await supabase
    .from("taches")
    .update(rappelObsolete ? { ...parsed.value, rappel_envoye_le: null } : parsed.value)
    .eq("id", id);

  if (error) return { error: error.message };

  try {
    const { tagIds, nouveauxNoms } = parseTagFields(formData);
    const resolvedTagIds = await resolveTagIds(supabase, tagIds, nouveauxNoms);
    await syncTachesTags(supabase, id, resolvedTagIds);
  } catch (tagError) {
    return { error: tagError instanceof Error ? tagError.message : "Erreur lors des tags." };
  }

  try {
    await uploadTacheImages(id, formData);
  } catch (imageError) {
    return {
      error: imageError instanceof Error ? imageError.message : "Erreur lors de l'envoi des images.",
    };
  }

  revalidateTachesPaths();
  return { error: null };
}

// --- Images ---

const TACHE_IMAGES_BUCKET = "tache-images";
const TACHE_IMAGE_MAX_DIMENSION = 1600;
const TACHE_IMAGE_JPEG_QUALITY = 75;

// Chemin de stockage attendu : `${tacheId}/${uuid}.jpg`, sous
// `/storage/v1/object/public/tache-images/`. On extrait ce chemin depuis
// l'URL publique stockée en base pour pouvoir supprimer l'objet Storage
// correspondant (le chemin lui-même n'est pas persisté séparément).
function extraireCheminStorage(url: string): string | null {
  const marqueur = `/${TACHE_IMAGES_BUCKET}/`;
  const index = url.indexOf(marqueur);
  if (index === -1) return null;
  return url.slice(index + marqueur.length);
}

// Compresse et upload chaque fichier envoyé sous la clé "images" du
// formData, puis insère une ligne tache_images par fichier. Ne fait rien si
// aucun fichier n'est fourni (cas normal : la plupart des soumissions du
// formulaire n'ajoutent pas d'image).
export async function uploadTacheImages(tacheId: string, formData: FormData) {
  const fichiers = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (fichiers.length === 0) return;

  const supabase = createAdminClient();

  const { data: derniere } = await supabase
    .from("tache_images")
    .select("ordre")
    .eq("tache_id", tacheId)
    .order("ordre", { ascending: false })
    .limit(1)
    .maybeSingle();

  let ordre = (derniere?.ordre ?? -1) + 1;

  for (const fichier of fichiers) {
    const buffer = Buffer.from(await fichier.arrayBuffer());
    const compresse = await sharp(buffer)
      .rotate()
      .resize(TACHE_IMAGE_MAX_DIMENSION, TACHE_IMAGE_MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: TACHE_IMAGE_JPEG_QUALITY })
      .toBuffer();

    const chemin = `${tacheId}/${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(TACHE_IMAGES_BUCKET)
      .upload(chemin, compresse, { contentType: "image/jpeg" });
    if (uploadError) throw new Error(uploadError.message);

    const {
      data: { publicUrl },
    } = supabase.storage.from(TACHE_IMAGES_BUCKET).getPublicUrl(chemin);

    const { error: insertError } = await supabase
      .from("tache_images")
      .insert({ tache_id: tacheId, url: publicUrl, ordre });
    if (insertError) throw new Error(insertError.message);

    ordre++;
  }

  revalidateTachesPaths();
}

export async function deleteTacheImage(imageId: string) {
  const supabase = createAdminClient();

  const { data: image, error: fetchError } = await supabase
    .from("tache_images")
    .select("url")
    .eq("id", imageId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const chemin = extraireCheminStorage(image.url);
  if (chemin) {
    const { error: removeError } = await supabase.storage.from(TACHE_IMAGES_BUCKET).remove([chemin]);
    if (removeError) throw new Error(removeError.message);
  }

  const { error } = await supabase.from("tache_images").delete().eq("id", imageId);
  if (error) throw new Error(error.message);

  revalidateTachesPaths();
}

// Option A (validée) : quand une tâche récurrente est cochée, elle repart
// non cochée avec l'échéance suivante au lieu de rester "faite". Si la date
// de fin de récurrence est dépassée par la nouvelle échéance, la récurrence
// s'arrête et la tâche reste cochée.
export async function toggleTache(id: string) {
  const supabase = createAdminClient();

  const { data, error: fetchError } = await supabase
    .from("taches")
    .select("fait, echeance, recurrence_frequence, recurrence_fin")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const fait = !data.fait;

  if (fait && data.recurrence_frequence) {
    const base = data.echeance ?? aujourdhuiISO();
    const prochaine = calculerProchaineOccurrence(base, data.recurrence_frequence);
    const recurrenceTerminee = data.recurrence_fin !== null && prochaine > data.recurrence_fin;

    const { error } = await supabase
      .from("taches")
      .update(recurrenceTerminee ? { fait: true } : { fait: false, echeance: prochaine })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("taches").update({ fait }).eq("id", id);
    if (error) throw new Error(error.message);
  }

  revalidateTachesPaths();
}

export async function deleteTache(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("taches").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidateTachesPaths();
}

// Persiste un nouvel ordre pour les tâches actives, après un drag & drop
// dans TasksList (remplace l'ancien système de flèches ↑/↓ par échange de
// voisin, cf. historique git : ambigu dès que le voisin visuel n'était pas
// le voisin logique, ex. tâche archivée masquée). Le client recalcule déjà
// l'ordre séquentiel par liste_id à partir de la position visuelle post-drop
// (voir TasksList.tsx) et ne transmet que les tâches dont l'ordre a
// effectivement changé.
export async function enregistrerOrdreTaches(updates: { id: string; ordre: number }[]) {
  if (updates.length === 0) return;

  const supabase = createAdminClient();

  const results = await Promise.all(
    updates.map(({ id, ordre }) => supabase.from("taches").update({ ordre }).eq("id", id))
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  revalidateTachesPaths();
}

export type TacheAvecRelations = Tables<"taches"> & {
  liste: Pick<Tables<"listes_taches">, "id" | "nom" | "couleur"> | null;
  sous_taches: Tables<"sous_taches">[];
  tags: Tables<"tags">[];
  images: Tables<"tache_images">[];
};

export async function getTachesAvecRelations(): Promise<TacheAvecRelations[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("taches")
    .select(
      "*, liste:listes_taches(id, nom, couleur), sous_taches(id, tache_id, titre, fait, termine_le, ordre, created_at), taches_tags(tag:tags(id, nom, couleur)), tache_images(id, tache_id, url, ordre, created_at)"
    )
    .order("fait", { ascending: true })
    .order("ordre", { ascending: true })
    .order("echeance", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("ordre", { referencedTable: "sous_taches", ascending: true })
    .order("ordre", { referencedTable: "tache_images", ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map(({ taches_tags, tache_images, ...tache }) => ({
    ...tache,
    tags: taches_tags.map((tt) => tt.tag).filter((tag): tag is Tables<"tags"> => tag !== null),
    images: tache_images,
  }));
}

// --- Listes ---

export type ListeFormState = { error: string | null };

export async function createListe(
  _prevState: ListeFormState,
  formData: FormData
): Promise<ListeFormState> {
  const nom = String(formData.get("nom") ?? "").trim();
  const couleur = String(formData.get("couleur") ?? "").trim();
  if (!nom) return { error: "Le nom est requis." };

  const supabase = createAdminClient();

  const { data: derniere } = await supabase
    .from("listes_taches")
    .select("ordre")
    .order("ordre", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("listes_taches").insert({
    nom,
    couleur: couleur || null,
    ordre: (derniere?.ordre ?? -1) + 1,
  });

  if (error) return { error: error.message };

  revalidatePath("/taches");
  return { error: null };
}

export async function updateListe(
  _prevState: ListeFormState,
  formData: FormData
): Promise<ListeFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Liste introuvable." };

  const nom = String(formData.get("nom") ?? "").trim();
  const couleur = String(formData.get("couleur") ?? "").trim();
  if (!nom) return { error: "Le nom est requis." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("listes_taches")
    .update({ nom, couleur: couleur || null })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/taches");
  return { error: null };
}

// La liste "Général", créée par la migration, est la liste par défaut de
// secours : comme taches.liste_id est not null, la supprimer casserait
// toute tâche qui y est encore rattachée. Non supprimable, à l'image des
// catégories prédéfinies du budget (cf. supprimerCategorie).
export async function deleteListe(id: string) {
  const supabase = createAdminClient();

  const { data: liste, error: fetchError } = await supabase
    .from("listes_taches")
    .select("nom")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!liste) return;
  if (liste.nom === "Général") {
    throw new Error('La liste "Général" ne peut pas être supprimée.');
  }

  const { error } = await supabase.from("listes_taches").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateTachesPaths();
}

export async function reordonnerListes(id: string, direction: "haut" | "bas") {
  const supabase = createAdminClient();

  const { data: listes, error } = await supabase
    .from("listes_taches")
    .select("id, ordre")
    .order("ordre", { ascending: true });

  if (error) throw new Error(error.message);
  if (!listes) return;

  const index = listes.findIndex((l) => l.id === id);
  if (index === -1) return;

  const voisinIndex = direction === "haut" ? index - 1 : index + 1;
  if (voisinIndex < 0 || voisinIndex >= listes.length) return;

  const actuelle = listes[index];
  const voisine = listes[voisinIndex];

  const [{ error: err1 }, { error: err2 }] = await Promise.all([
    supabase.from("listes_taches").update({ ordre: voisine.ordre }).eq("id", actuelle.id),
    supabase.from("listes_taches").update({ ordre: actuelle.ordre }).eq("id", voisine.id),
  ]);

  if (err1) throw new Error(err1.message);
  if (err2) throw new Error(err2.message);

  revalidatePath("/taches");
}

export async function getListes(): Promise<Tables<"listes_taches">[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listes_taches")
    .select("*")
    .order("ordre", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// --- Tags ---

export type TagFormState = { error: string | null };

export async function createTag(
  _prevState: TagFormState,
  formData: FormData
): Promise<TagFormState> {
  const nom = String(formData.get("nom") ?? "").trim();
  const couleur = String(formData.get("couleur") ?? "").trim();
  if (!nom) return { error: "Le nom est requis." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("tags").insert({ nom, couleur: couleur || null });

  if (error) return { error: error.message };

  revalidatePath("/taches");
  return { error: null };
}

export async function deleteTag(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("tags").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidateTachesPaths();
}

export async function associerTag(tacheId: string, tagId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("taches_tags").insert({ tache_id: tacheId, tag_id: tagId });

  if (error) throw new Error(error.message);

  revalidateTachesPaths();
}

export async function dissocierTag(tacheId: string, tagId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("taches_tags")
    .delete()
    .eq("tache_id", tacheId)
    .eq("tag_id", tagId);

  if (error) throw new Error(error.message);

  revalidateTachesPaths();
}

export async function getTags(): Promise<Tables<"tags">[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("tags").select("*").order("nom", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// --- Sous-tâches ---

export async function createSousTache(tacheId: string, titre: string) {
  const trimmed = titre.trim();
  if (!trimmed) throw new Error("Le titre de la sous-tâche est requis.");

  const supabase = createAdminClient();

  const { data: derniere } = await supabase
    .from("sous_taches")
    .select("ordre")
    .eq("tache_id", tacheId)
    .order("ordre", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("sous_taches").insert({
    tache_id: tacheId,
    titre: trimmed,
    ordre: (derniere?.ordre ?? -1) + 1,
  });

  if (error) throw new Error(error.message);

  revalidateTachesPaths();
}

export async function toggleSousTache(id: string, fait: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("sous_taches").update({ fait }).eq("id", id);

  if (error) throw new Error(error.message);

  revalidateTachesPaths();
}

export async function updateSousTache(id: string, titre: string) {
  const trimmed = titre.trim();
  if (!trimmed) throw new Error("Le titre de la sous-tâche est requis.");

  const supabase = createAdminClient();
  const { error } = await supabase.from("sous_taches").update({ titre: trimmed }).eq("id", id);

  if (error) throw new Error(error.message);

  revalidateTachesPaths();
}

export async function deleteSousTache(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("sous_taches").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidateTachesPaths();
}

export async function reordonnerSousTaches(
  tacheId: string,
  id: string,
  direction: "haut" | "bas"
) {
  const supabase = createAdminClient();

  const { data: sousTaches, error } = await supabase
    .from("sous_taches")
    .select("id, ordre")
    .eq("tache_id", tacheId)
    .order("ordre", { ascending: true });

  if (error) throw new Error(error.message);
  if (!sousTaches) return;

  const index = sousTaches.findIndex((s) => s.id === id);
  if (index === -1) return;

  const voisinIndex = direction === "haut" ? index - 1 : index + 1;
  if (voisinIndex < 0 || voisinIndex >= sousTaches.length) return;

  const actuelle = sousTaches[index];
  const voisine = sousTaches[voisinIndex];

  const [{ error: err1 }, { error: err2 }] = await Promise.all([
    supabase.from("sous_taches").update({ ordre: voisine.ordre }).eq("id", actuelle.id),
    supabase.from("sous_taches").update({ ordre: actuelle.ordre }).eq("id", voisine.id),
  ]);

  if (err1) throw new Error(err1.message);
  if (err2) throw new Error(err2.message);

  revalidateTachesPaths();
}

"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  createTache,
  deleteTacheImage,
  updateTache,
  type TacheAvecRelations,
  type TacheFormState,
} from "@/app/actions/taches";
import type { Enums, Tables } from "@/lib/supabase/types";
import { FREQUENCE_LABELS } from "@/lib/budget/compute";
import { errorText, input, label as labelClass, primaryButton } from "@/lib/ui";

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M3.8 16.5l5-5a1.8 1.8 0 0 1 2.5 0l3.4 3.4M14.5 12.7l1.4-1.4a1.8 1.8 0 0 1 2.5 0l2.4 2.4" />
    </svg>
  );
}

function ImageThumb({
  src,
  onRemove,
  removeLabel,
  disabled,
}: {
  src: string;
  onRemove: () => void;
  removeLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative h-14 w-14 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- vignettes issues d'URLs blob locales ou du bucket Storage, pas d'un domaine unique configurable dans next/image */}
      <img src={src} alt="" className="h-14 w-14 rounded-2xl border border-line object-cover" />
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-alert text-[11px] font-bold text-white disabled:opacity-60"
      >
        ×
      </button>
    </div>
  );
}

const initialState: TacheFormState = { error: null };
const FREQUENCES = Object.keys(FREQUENCE_LABELS) as Enums<"frequence_recurrence">[];
const TITRE_MAX_HEIGHT_PX = 160; // ~8-9 lignes avant de passer en scroll interne

const PRIORITES: { value: Enums<"priorite_tache">; label: string; activeClassName: string }[] = [
  { value: "aucune", label: "Aucune", activeClassName: "bg-ink-3 text-white" },
  { value: "basse", label: "Basse", activeClassName: "bg-agenda text-white" },
  { value: "moyenne", label: "Moyenne", activeClassName: "bg-carbs text-white" },
  { value: "haute", label: "Haute", activeClassName: "bg-alert text-white" },
];

export function AddTaskForm({
  tache,
  listes,
  tags,
  defaultListeId,
  defaultEcheance,
  defaultHeure,
  onDone,
}: {
  tache?: TacheAvecRelations;
  listes: Tables<"listes_taches">[];
  tags: Tables<"tags">[];
  defaultListeId?: string;
  defaultEcheance?: string;
  defaultHeure?: string;
  onDone?: () => void;
}) {
  const action = tache ? updateTache : createTache;
  const [state, formAction, pending] = useActionState(action, initialState);
  const prevPending = useRef(pending);

  const [titre, setTitre] = useState(tache?.titre ?? "");
  const titreRef = useRef<HTMLTextAreaElement>(null);

  const [priorite, setPriorite] = useState<Enums<"priorite_tache">>(tache?.priorite ?? "aucune");
  const [frequence, setFrequence] = useState<string>(tache?.recurrence_frequence ?? "");
  const [tagIds, setTagIds] = useState<string[]>(tache?.tags.map((t) => t.id) ?? []);
  const [touteLaJournee, setTouteLaJournee] = useState(tache?.toute_la_journee ?? false);
  const [heure, setHeure] = useState(tache?.heure?.slice(0, 5) ?? defaultHeure ?? "");
  const [heureFin, setHeureFin] = useState(tache?.heure_fin?.slice(0, 5) ?? "");
  const [rappelMinutes, setRappelMinutes] = useState(
    tache?.rappel_minutes != null ? String(tache.rappel_minutes) : ""
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const previews = useMemo(() => selectedFiles.map((file) => URL.createObjectURL(file)), [selectedFiles]);
  const [existingImages, setExistingImages] = useState<Tables<"tache_images">[]>(tache?.images ?? []);
  const [isDeletingImage, startImageTransition] = useTransition();

  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      onDone?.();
    }
    prevPending.current = pending;
  }, [pending, state.error, onDone]);

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  useEffect(() => {
    const textarea = titreRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, TITRE_MAX_HEIGHT_PX) + "px";
  }, [titre]);

  // Autofocus uniquement en création : ne vole pas le focus quand le formulaire sert à éditer une tâche existante.
  useEffect(() => {
    if (!tache) titreRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne doit s'exécuter qu'au montage
  }, []);

  function toggleTag(id: string) {
    setTagIds((ids) => (ids.includes(id) ? ids.filter((t) => t !== id) : [...ids, id]));
  }

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(Array.from(e.target.files ?? []));
  }

  function removeSelectedFile(index: number) {
    const next = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(next);
    // Reconstruit le FileList de l'input à partir du tableau filtré : un
    // FileList n'est pas modifiable directement, DataTransfer est le
    // mécanisme standard pour repasser une sélection modifiée à l'input.
    const dataTransfer = new DataTransfer();
    next.forEach((file) => dataTransfer.items.add(file));
    if (fileInputRef.current) fileInputRef.current.files = dataTransfer.files;
  }

  function removeExistingImage(imageId: string) {
    startImageTransition(async () => {
      await deleteTacheImage(imageId);
      setExistingImages((imgs) => imgs.filter((img) => img.id !== imageId));
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {tache && <input type="hidden" name="id" value={tache.id} />}
      {tagIds.map((id) => (
        <input key={id} type="hidden" name="tag_ids" value={id} />
      ))}
      <input type="hidden" name="priorite" value={priorite} />

      <div className="flex flex-col gap-1">
        <label htmlFor="titre" className={labelClass}>
          Titre
        </label>
        <textarea
          id="titre"
          name="titre"
          required
          rows={1}
          ref={titreRef}
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          className={`${input} resize-none overflow-y-auto max-h-40`}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="liste_id" className={labelClass}>
          Liste
        </label>
        <select
          id="liste_id"
          name="liste_id"
          defaultValue={tache?.liste_id ?? defaultListeId ?? listes[0]?.id ?? ""}
          className={input}
        >
          {listes.map((liste) => (
            <option key={liste.id} value={liste.id}>
              {liste.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Priorité</span>
        <div className="flex rounded-xl border border-line p-1">
          {PRIORITES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriorite(p.value)}
              className={`flex-1 rounded-lg py-1.5 text-[12.5px] font-semibold transition-colors ${
                priorite === p.value ? p.activeClassName : "text-ink-2"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="echeance" className={labelClass}>
          Échéance (optionnel)
        </label>
        <input
          id="echeance"
          name="echeance"
          type="date"
          defaultValue={tache?.echeance ?? defaultEcheance ?? ""}
          className={input}
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          name="toute_la_journee"
          checked={touteLaJournee}
          onChange={(e) => setTouteLaJournee(e.target.checked)}
          className="h-4 w-4 rounded border-line"
        />
        Toute la journée
      </label>

      {!touteLaJournee && (
        <div className="flex flex-col gap-1">
          <label htmlFor="heure" className={labelClass}>
            Heure (optionnel)
          </label>
          <input
            id="heure"
            name="heure"
            type="time"
            value={heure}
            onChange={(e) => {
              const nextHeure = e.target.value;
              if (!heure && nextHeure && rappelMinutes === "") setRappelMinutes("5");
              setHeure(nextHeure);
            }}
            className={input}
          />
        </div>
      )}

      {!touteLaJournee && heure && (
        <div className="flex flex-col gap-1">
          <label htmlFor="heure_fin" className={labelClass}>
            Heure de fin (optionnel)
          </label>
          <input
            id="heure_fin"
            name="heure_fin"
            type="time"
            value={heureFin}
            onChange={(e) => setHeureFin(e.target.value)}
            className={input}
          />
        </div>
      )}

      {!touteLaJournee && heure && (
        <div className="flex flex-col gap-1">
          <label htmlFor="rappel_minutes" className={labelClass}>
            Rappel
          </label>
          <select
            id="rappel_minutes"
            name="rappel_minutes"
            value={rappelMinutes}
            onChange={(e) => setRappelMinutes(e.target.value)}
            className={input}
          >
            <option value="">Aucun</option>
            <option value="5">5 min avant</option>
            <option value="15">15 min avant</option>
            <option value="30">30 min avant</option>
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className={labelClass}>
          Notes (optionnel)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={tache?.notes ?? ""}
          className={input}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Images (optionnel)</span>
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="tache-images"
            className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-2xl border-[1.5px] border-dashed border-line text-ink-2 transition-colors hover:bg-surface-alt"
            aria-label="Ajouter des images"
          >
            <ImageIcon />
          </label>
          <input
            ref={fileInputRef}
            type="file"
            id="tache-images"
            name="images"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesChange}
          />

          {existingImages.map((image) => (
            <ImageThumb
              key={image.id}
              src={image.url}
              onRemove={() => removeExistingImage(image.id)}
              removeLabel="Supprimer cette image"
              disabled={isDeletingImage}
            />
          ))}

          {selectedFiles.map(
            (file, index) =>
              previews[index] && (
                <ImageThumb
                  key={`${file.name}-${index}`}
                  src={previews[index]}
                  onRemove={() => removeSelectedFile(index)}
                  removeLabel="Retirer cette image de la sélection"
                />
              )
          )}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className={labelClass}>Tags</span>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                  tagIds.includes(tag.id) ? "bg-kcal text-white" : "bg-surface-alt text-ink-2"
                }`}
              >
                #{tag.nom}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="nouveaux_tags" className={labelClass}>
          Nouveaux tags (optionnel, séparés par une virgule)
        </label>
        <input id="nouveaux_tags" name="nouveaux_tags" placeholder="urgent, maison" className={input} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="recurrence_frequence" className={labelClass}>
          Récurrence (optionnel)
        </label>
        <select
          id="recurrence_frequence"
          name="recurrence_frequence"
          value={frequence}
          onChange={(e) => setFrequence(e.target.value)}
          className={input}
        >
          <option value="">Aucune récurrence</option>
          {FREQUENCES.map((f) => (
            <option key={f} value={f}>
              {FREQUENCE_LABELS[f]}
            </option>
          ))}
        </select>
      </div>

      {frequence && (
        <div className="flex flex-col gap-1">
          <label htmlFor="recurrence_fin" className={labelClass}>
            Fin de la récurrence (optionnel)
          </label>
          <input
            id="recurrence_fin"
            name="recurrence_fin"
            type="date"
            defaultValue={tache?.recurrence_fin ?? ""}
            className={input}
          />
        </div>
      )}

      <div
        className="sticky bottom-0 z-10 flex flex-col items-center gap-2 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        {state.error && (
          <p className={`${errorText} rounded-xl bg-surface px-3 py-1.5 shadow-card`} role="alert">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className={`${primaryButton} shadow-card`}>
          {pending ? "Enregistrement..." : tache ? "Enregistrer" : "Créer"}
        </button>
      </div>
    </form>
  );
}

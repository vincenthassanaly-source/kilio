"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  createDocument,
  deleteDocumentFichier,
  updateDocument,
  type DocumentAvecFichiers,
  type DocumentFormState,
} from "@/app/actions/documents";
import type { Tables } from "@/lib/supabase/types";
import { errorText, input, label as labelClass, primaryButton } from "@/lib/ui";

const initialState: DocumentFormState = { error: null };

const CATEGORIES = ["Identité", "Véhicule", "Logement", "Santé", "Assurance", "Autre"] as const;

function FichierIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M3.8 16.5l5-5a1.8 1.8 0 0 1 2.5 0l3.4 3.4M14.5 12.7l1.4-1.4a1.8 1.8 0 0 1 2.5 0l2.4 2.4" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3.5h9l3 3V19a1.5 1.5 0 0 1-1.5 1.5h-10.5A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5z" />
      <path d="M9 13h6M9 16.5h4" />
    </svg>
  );
}

function FichierThumb({
  src,
  estImage,
  onRemove,
  removeLabel,
  disabled,
}: {
  src: string;
  estImage: boolean;
  onRemove: () => void;
  removeLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative h-14 w-14 shrink-0">
      {estImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- vignette issue d'une URL blob locale ou du bucket Storage, pas d'un domaine unique configurable dans next/image
        <img src={src} alt="" className="h-14 w-14 rounded-2xl border border-line object-cover" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface-alt text-ink-2">
          <PdfIcon />
        </div>
      )}
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

// Un emplacement de fichier dédié (Recto ou Verso), pour les étiquettes de
// type "recto_verso". L'input file reste toujours monté (avec son `name`)
// pour faire partie du FormData soumis, seul son affichage change selon
// qu'un fichier existant, une sélection locale en attente, ou rien n'est
// présent.
function RectoVersoSlot({
  label,
  name,
  existing,
  onRemoveExisting,
  removingExisting,
}: {
  label: string;
  name: "fichier_recto" | "fichier_verso";
  existing: Tables<"document_fichiers"> | null;
  onRemoveExisting: () => void;
  removingExisting: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function removeSelection() {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <input
        ref={inputRef}
        type="file"
        id={name}
        name={name}
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      {existing ? (
        <FichierThumb
          src={existing.url}
          estImage={existing.fichier_type === "image"}
          onRemove={onRemoveExisting}
          removeLabel={`Supprimer le ${label.toLowerCase()}`}
          disabled={removingExisting}
        />
      ) : file && preview ? (
        <FichierThumb
          src={preview}
          estImage={file.type.startsWith("image/")}
          onRemove={removeSelection}
          removeLabel={`Retirer le ${label.toLowerCase()}`}
        />
      ) : (
        <label
          htmlFor={name}
          className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl border-[1.5px] border-dashed border-line text-ink-2 transition-colors hover:bg-surface-alt"
          aria-label={`Ajouter le ${label.toLowerCase()}`}
        >
          <FichierIcon />
        </label>
      )}
      <span className="text-xs text-ink-3">{label}</span>
    </div>
  );
}

export function DocumentForm({
  document,
  etiquettes,
  onDone,
}: {
  document?: DocumentAvecFichiers;
  etiquettes: Tables<"etiquettes">[];
  onDone?: () => void;
}) {
  const action = document ? updateDocument : createDocument;
  const [state, formAction, pending] = useActionState(action, initialState);
  const prevPending = useRef(pending);

  const [etiquetteId, setEtiquetteId] = useState(document?.etiquette?.id ?? "");
  const typeChamps = etiquettes.find((e) => e.id === etiquetteId)?.type_champs ?? "standard";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const previews = useMemo(() => selectedFiles.map((file) => URL.createObjectURL(file)), [selectedFiles]);
  const [existingFichiers, setExistingFichiers] = useState<Tables<"document_fichiers">[]>(
    document?.fichiers ?? []
  );
  const [isDeletingFichier, startFichierTransition] = useTransition();

  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      onDone?.();
    }
    prevPending.current = pending;
  }, [pending, state.error, onDone]);

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

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

  function removeExistingFichier(fichierId: string) {
    startFichierTransition(async () => {
      await deleteDocumentFichier(fichierId);
      setExistingFichiers((fs) => fs.filter((f) => f.id !== fichierId));
    });
  }

  const existingRecto = existingFichiers.find((f) => f.role === "recto") ?? null;
  const existingVerso = existingFichiers.find((f) => f.role === "verso") ?? null;
  // Fichiers "orphelins" d'un rôle recto/verso si l'étiquette a été changée
  // après coup : gardés visibles (pas perdus) via la liste générique.
  const existingHorsRectoVerso = existingFichiers.filter((f) => f.role !== "recto" && f.role !== "verso");

  const aucunFichier =
    !document && existingFichiers.length === 0 && selectedFiles.length === 0 && !existingRecto && !existingVerso;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {document && <input type="hidden" name="id" value={document.id} />}

      <div className="flex flex-col gap-1">
        <label htmlFor="nom" className={labelClass}>
          Nom
        </label>
        <input id="nom" name="nom" required defaultValue={document?.nom} className={input} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="etiquette_id" className={labelClass}>
          Étiquette (optionnel)
        </label>
        <select
          id="etiquette_id"
          name="etiquette_id"
          value={etiquetteId}
          onChange={(e) => setEtiquetteId(e.target.value)}
          className={input}
        >
          <option value="">—</option>
          {etiquettes.map((etiquette) => (
            <option key={etiquette.id} value={etiquette.id}>
              {etiquette.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="categorie" className={labelClass}>
            Catégorie (optionnel)
          </label>
          <select id="categorie" name="categorie" defaultValue={document?.categorie ?? ""} className={input}>
            <option value="">—</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="date_echeance" className={labelClass}>
            Échéance (optionnel)
          </label>
          <input
            id="date_echeance"
            name="date_echeance"
            type="date"
            defaultValue={document?.date_echeance ?? ""}
            className={input}
          />
        </div>
      </div>

      {typeChamps === "periode_mensuelle" && (
        <div className="flex flex-col gap-1">
          <label htmlFor="periode_mois" className={labelClass}>
            Mois concerné
          </label>
          <input
            id="periode_mois"
            name="periode_mois"
            type="month"
            defaultValue={document?.periode_mois ? document.periode_mois.slice(0, 7) : ""}
            className={input}
          />
        </div>
      )}

      {typeChamps === "recto_verso" ? (
        <div className="flex flex-col gap-1">
          <span className={labelClass}>Recto / Verso</span>
          <div className="flex flex-wrap items-start gap-4">
            <RectoVersoSlot
              label="Recto"
              name="fichier_recto"
              existing={existingRecto}
              onRemoveExisting={() => removeExistingFichier(existingRecto!.id)}
              removingExisting={isDeletingFichier}
            />
            <RectoVersoSlot
              label="Verso"
              name="fichier_verso"
              existing={existingVerso}
              onRemoveExisting={() => removeExistingFichier(existingVerso!.id)}
              removingExisting={isDeletingFichier}
            />
          </div>
          {existingHorsRectoVerso.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {existingHorsRectoVerso.map((fichier) => (
                <FichierThumb
                  key={fichier.id}
                  src={fichier.url}
                  estImage={fichier.fichier_type === "image"}
                  onRemove={() => removeExistingFichier(fichier.id)}
                  removeLabel="Supprimer ce fichier"
                  disabled={isDeletingFichier}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <span className={labelClass}>
            {document ? "Fichiers (photos ou PDF)" : "Fichiers (photos ou PDF)"}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="document-fichiers"
              className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-2xl border-[1.5px] border-dashed border-line text-ink-2 transition-colors hover:bg-surface-alt"
              aria-label="Ajouter des fichiers"
            >
              <FichierIcon />
            </label>
            <input
              ref={fileInputRef}
              type="file"
              id="document-fichiers"
              name="fichiers"
              accept="image/*,application/pdf"
              multiple
              required={aucunFichier}
              className="hidden"
              onChange={handleFilesChange}
            />

            {existingFichiers.map((fichier) => (
              <FichierThumb
                key={fichier.id}
                src={fichier.url}
                estImage={fichier.fichier_type === "image"}
                onRemove={() => removeExistingFichier(fichier.id)}
                removeLabel="Supprimer ce fichier"
                disabled={isDeletingFichier}
              />
            ))}

            {selectedFiles.map(
              (file, index) =>
                previews[index] && (
                  <FichierThumb
                    key={`${file.name}-${index}`}
                    src={previews[index]}
                    estImage={file.type.startsWith("image/")}
                    onRemove={() => removeSelectedFile(index)}
                    removeLabel="Retirer ce fichier de la sélection"
                  />
                )
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className={labelClass}>
          Notes (optionnel)
        </label>
        <textarea id="notes" name="notes" rows={3} defaultValue={document?.notes ?? ""} className={input} />
      </div>

      {state.error && (
        <p className={errorText} role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Enregistrement..." : document ? "Enregistrer" : "Ajouter le document"}
      </button>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { rattacherPhotoACollection, type RattacherPhotoFormState } from "@/app/actions/collections";
import type { Tables } from "@/lib/supabase/types";
import { card, checkCircle, errorText, input, label as labelClass, primaryButton } from "@/lib/ui";

const initialState: RattacherPhotoFormState = { error: null };

export function ChoisirCollectionForm({
  collections,
  photos,
  tiktok,
}: {
  collections: Tables<"collections">[];
  photos: string[];
  tiktok?: { url: string; thumbnailUrl: string; titre: string } | null;
}) {
  const [state, formAction, pending] = useActionState(rattacherPhotoACollection, initialState);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [nouvelleCollection, setNouvelleCollection] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {photos.map((url) => (
        <input key={url} type="hidden" name="url" value={url} />
      ))}
      {tiktok && (
        <>
          <input type="hidden" name="tiktok_url" value={tiktok.url} />
          <input type="hidden" name="tiktok_thumbnail" value={tiktok.thumbnailUrl} />
          <input type="hidden" name="tiktok_titre" value={tiktok.titre} />
        </>
      )}
      <input type="hidden" name="collection_id" value={collectionId ?? ""} />

      {collections.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Collection existante</span>
          <div className="flex flex-col gap-1.5">
            {collections.map((collection) => {
              const selected = collectionId === collection.id;
              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => {
                    setCollectionId(collection.id);
                    setNouvelleCollection("");
                  }}
                  className={`${card} flex w-full items-center justify-between gap-3 text-left transition-colors ${
                    selected ? "border-kcal bg-kcal-soft" : "bg-background text-ink-2"
                  }`}
                >
                  <span className={selected ? "font-semibold text-ink" : ""}>{collection.nom}</span>
                  <span
                    className={`${checkCircle} ${
                      selected ? "border-kcal bg-kcal" : "border-line bg-transparent"
                    }`}
                  >
                    {selected && (
                      <svg width={11} height={11} viewBox="0 0 12 12" fill="none">
                        <path
                          d="M1 6l3.2 3.2L11 2"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nouvelle_collection" className={labelClass}>
          Nouvelle collection
        </label>
        <input
          id="nouvelle_collection"
          name="nouvelle_collection"
          value={nouvelleCollection}
          onChange={(e) => {
            setNouvelleCollection(e.target.value);
            setCollectionId(null);
          }}
          placeholder="Nom de la collection"
          className={input}
        />
      </div>

      {state.error && (
        <p className={errorText} role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Ajout..." : "Ajouter"}
      </button>
    </form>
  );
}

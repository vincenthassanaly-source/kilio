"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  addNoteItem,
  createNote,
  deleteNoteItem,
  reorderNoteItems,
  toggleNoteItem,
  updateNote,
  updateNoteItemLibelle,
  type NoteAvecRelations,
  type NoteFormState,
} from "@/app/actions/notes";
import { queryKeys } from "@/lib/query/keys";
import type { Enums, Tables } from "@/lib/supabase/types";
import { NOTE_PALETTE, estCouleurValide, type NoteCouleur } from "@/lib/notes/palette";
import { CheckToggle } from "@/components/CheckToggle";
import { errorText, ghostButton, input, label as labelClass, primaryButton } from "@/lib/ui";

const initialState: NoteFormState = { error: null };

// Éditeur d'items persistés en direct (note existante, id déjà connu) :
// chaque action (toggle/renommer/réordonner/supprimer) part immédiatement
// via startTransition, indépendamment du bouton "Enregistrer" du formulaire
// — même pattern que SousTachesList dans src/app/(app)/taches/TasksList.tsx.
function NoteItemsEditor({ noteId, items }: { noteId: string; items: Tables<"note_items">[] }) {
  const [nouvelItem, setNouvelItem] = useState("");
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.notes });
  }

  function ajouter() {
    const trimmed = nouvelItem.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await addNoteItem(noteId, trimmed);
      invalidate();
    });
    setNouvelItem("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <CheckToggle
            checked={item.coche}
            onToggle={() =>
              startTransition(async () => {
                await toggleNoteItem(item.id, !item.coche);
                invalidate();
              })
            }
            label={item.coche ? "Décocher l'item" : "Cocher l'item"}
            size={20}
            // `flex flex-col gap-1.5` (6px) entre lignes : hitSlop réduit, voir
            // reports/2026-09-16-fix-dashboard-audit-constats-1-2.md.
            hitSlop={2}
          />
          <input
            defaultValue={item.libelle}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value && value !== item.libelle) {
                startTransition(async () => {
                  await updateNoteItemLibelle(item.id, value);
                  invalidate();
                });
              }
            }}
            className={`${input} flex-1 py-1.5 ${item.coche ? "text-ink-3 line-through" : ""}`}
          />
          <button
            type="button"
            disabled={isPending || index === 0}
            onClick={() =>
              startTransition(async () => {
                await reorderNoteItems(noteId, item.id, "haut");
                invalidate();
              })
            }
            className={`${ghostButton} disabled:opacity-30`}
            aria-label="Monter l'item"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={isPending || index === items.length - 1}
            onClick={() =>
              startTransition(async () => {
                await reorderNoteItems(noteId, item.id, "bas");
                invalidate();
              })
            }
            className={`${ghostButton} disabled:opacity-30`}
            aria-label="Descendre l'item"
          >
            ↓
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await deleteNoteItem(item.id);
                invalidate();
              })
            }
            className={ghostButton}
            aria-label="Supprimer l'item"
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          value={nouvelItem}
          onChange={(e) => setNouvelItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ajouter();
            }
          }}
          placeholder="Ajouter un item…"
          className={`${input} flex-1 py-1.5`}
        />
        <button type="button" onClick={ajouter} className={ghostButton}>
          Ajouter
        </button>
      </div>
    </div>
  );
}

// Éditeur d'items locaux (création : pas encore d'id de note pour appeler
// addNoteItem) — soumis avec le formulaire via des inputs cachés
// "item_libelle", insérés en base par createNote au submit.
function NoteItemsDraft({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [nouvelItem, setNouvelItem] = useState("");

  function ajouter() {
    const trimmed = nouvelItem.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setNouvelItem("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((libelle, index) => (
        <div key={index} className="flex items-center gap-2">
          <input type="hidden" name="item_libelle" value={libelle} />
          <span className="flex-1 text-sm text-ink">{libelle}</span>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            className={ghostButton}
            aria-label="Retirer l'item"
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          value={nouvelItem}
          onChange={(e) => setNouvelItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ajouter();
            }
          }}
          placeholder="Ajouter un item…"
          className={`${input} flex-1 py-1.5`}
        />
        <button type="button" onClick={ajouter} className={ghostButton}>
          Ajouter
        </button>
      </div>
    </div>
  );
}

export function NoteForm({
  note,
  tags,
  onDone,
}: {
  note?: NoteAvecRelations;
  tags: Tables<"tags">[];
  onDone?: () => void;
}) {
  const action = note ? updateNote : createNote;
  const [state, formAction, pending] = useActionState(action, initialState);
  const prevPending = useRef(pending);

  const [type, setType] = useState<Enums<"note_type">>(note?.type ?? "texte");
  const [couleur, setCouleur] = useState<NoteCouleur | null>(
    note?.couleur && estCouleurValide(note.couleur) ? note.couleur : null
  );
  const [tagIds, setTagIds] = useState<string[]>(note?.tags.map((t) => t.id) ?? []);
  const [draftItems, setDraftItems] = useState<string[]>([]);

  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      onDone?.();
    }
    prevPending.current = pending;
  }, [pending, state.error, onDone]);

  function toggleTag(id: string) {
    setTagIds((ids) => (ids.includes(id) ? ids.filter((t) => t !== id) : [...ids, id]));
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {note && <input type="hidden" name="id" value={note.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="couleur" value={couleur ?? ""} />
      {tagIds.map((id) => (
        <input key={id} type="hidden" name="tag_ids" value={id} />
      ))}

      {!note && (
        <div className="flex rounded-xl border border-line p-1">
          <button
            type="button"
            onClick={() => setType("texte")}
            className={`flex-1 rounded-lg py-1.5 text-[12.5px] font-semibold transition-colors ${
              type === "texte" ? "bg-kcal text-white" : "text-ink-2"
            }`}
          >
            Texte
          </button>
          <button
            type="button"
            onClick={() => setType("checklist")}
            className={`flex-1 rounded-lg py-1.5 text-[12.5px] font-semibold transition-colors ${
              type === "checklist" ? "bg-kcal text-white" : "text-ink-2"
            }`}
          >
            Checklist
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="titre" className={labelClass}>
          Titre
        </label>
        <input id="titre" name="titre" required defaultValue={note?.titre} className={input} />
      </div>

      {type === "texte" ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="contenu" className={labelClass}>
            Contenu
          </label>
          <textarea
            id="contenu"
            name="contenu"
            rows={5}
            defaultValue={note?.contenu}
            className={input}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <span className={labelClass}>Items</span>
          {note ? (
            <NoteItemsEditor noteId={note.id} items={note.items} />
          ) : (
            <NoteItemsDraft items={draftItems} onChange={setDraftItems} />
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Couleur</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCouleur(null)}
            aria-label="Aucune couleur"
            className={`h-7 w-7 rounded-full border-2 bg-surface ${
              couleur === null ? "border-kcal" : "border-line"
            }`}
          />
          {NOTE_PALETTE.map((c) => (
            <button
              key={c.cle}
              type="button"
              onClick={() => setCouleur(c.cle)}
              aria-label={c.label}
              className={`h-7 w-7 rounded-full border-2 ${
                couleur === c.cle ? "border-kcal" : "border-transparent"
              }`}
              style={{ backgroundColor: `var(--note-${c.cle})` }}
            />
          ))}
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
        <input id="nouveaux_tags" name="nouveaux_tags" placeholder="perso, idées" className={input} />
      </div>

      {state.error && (
        <p className={errorText} role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Enregistrement..." : note ? "Enregistrer" : "Créer la note"}
      </button>
    </form>
  );
}

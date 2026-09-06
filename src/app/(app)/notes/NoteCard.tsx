"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteNote, toggleEpingle, toggleNoteItem, type NoteAvecRelations } from "@/app/actions/notes";
import { queryKeys } from "@/lib/query/keys";
import { showToast } from "@/components/toast/toast-store";
import { noteBackgroundStyle } from "@/lib/notes/palette";
import { CheckToggle } from "@/components/CheckToggle";
import { useBackClose } from "@/hooks/useBackClose";
import type { Tables } from "@/lib/supabase/types";
import { card, dangerButton, ghostButton, nameText, pillTag } from "@/lib/ui";
import { vibrate } from "@/lib/haptics";
import { enqueueAction, isNetworkError } from "@/lib/offline/queue";

const NoteForm = dynamic(() => import("./NoteForm").then((m) => m.NoteForm), { ssr: false });

const ITEMS_PREVIEW_LIMIT = 6;

function couleurTagStyle(couleur: string | null) {
  if (!couleur) return undefined;
  return { backgroundColor: `${couleur}1a`, color: couleur };
}

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l1.8 5.9L19.5 9l-4.3 3.8.6 6.2-3.8-3.3-3.8 3.3.6-6.2L4.5 9l5.7-1.1z" />
    </svg>
  );
}

export function NoteCard({ note, tags }: { note: NoteAvecRelations; tags: Tables<"tags">[] }) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();
  useBackClose(editing, () => setEditing(false));

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.notes });
  }

  // Épingler et cocher un item de checklist sont les actions les plus
  // fréquentes sur une note existante : mise à jour optimiste du cache,
  // rollback silencieux + toast discret en cas d'échec serveur.
  const pinMutation = useMutation({
    mutationFn: () => {
      vibrate();
      return toggleEpingle(note.id, !note.epingle);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notes });
      const previous = queryClient.getQueryData<NoteAvecRelations[]>(queryKeys.notes);
      queryClient.setQueryData<NoteAvecRelations[]>(queryKeys.notes, (old) =>
        old?.map((n) => (n.id === note.id ? { ...n, epingle: !n.epingle } : n))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.notes, context.previous);
      showToast("Impossible de mettre à jour la note.");
    },
    onSettled: invalidate,
  });

  const itemMutation = useMutation({
    mutationFn: async ({ itemId, coche }: { itemId: string; coche: boolean }) => {
      vibrate();
      try {
        await toggleNoteItem(itemId, coche);
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        await enqueueAction("notes", "toggleNoteItem", [itemId, coche]);
        showToast("Enregistré, sera synchronisé à la reconnexion");
      }
    },
    onMutate: async ({ itemId, coche }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notes });
      const previous = queryClient.getQueryData<NoteAvecRelations[]>(queryKeys.notes);
      queryClient.setQueryData<NoteAvecRelations[]>(queryKeys.notes, (old) =>
        old?.map((n) =>
          n.id === note.id
            ? { ...n, items: n.items.map((i) => (i.id === itemId ? { ...i, coche } : i)) }
            : n
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.notes, context.previous);
      showToast("Impossible de mettre à jour l'item.");
    },
    onSettled: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      try {
        await deleteNote(note.id);
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        await enqueueAction("notes", "deleteNote", [note.id]);
        showToast("Enregistré, sera synchronisé à la reconnexion");
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notes });
      const previous = queryClient.getQueryData<NoteAvecRelations[]>(queryKeys.notes);
      queryClient.setQueryData<NoteAvecRelations[]>(queryKeys.notes, (old) =>
        old?.filter((n) => n.id !== note.id)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.notes, context.previous);
      showToast("Impossible de supprimer la note.");
    },
    onSettled: invalidate,
  });

  if (editing) {
    return (
      <li className={`${card} mb-3 break-inside-avoid`}>
        <NoteForm
          note={note}
          tags={tags}
          onDone={() => {
            setEditing(false);
            invalidate();
          }}
        />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="mt-2 text-sm text-ink-2 underline"
        >
          Annuler
        </button>
      </li>
    );
  }

  const itemsCoches = note.items.filter((i) => i.coche).length;
  const progression = note.items.length > 0 ? Math.round((itemsCoches / note.items.length) * 100) : 0;
  const itemsAffiches = note.items.slice(0, ITEMS_PREVIEW_LIMIT);
  const itemsRestants = note.items.length - itemsAffiches.length;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.18 }}
      className={`${card} mb-3 flex flex-col gap-2 break-inside-avoid`}
      style={noteBackgroundStyle(note.couleur)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={nameText}>{note.titre}</p>
        <button
          type="button"
          disabled={pinMutation.isPending}
          onClick={() => pinMutation.mutate()}
          aria-label={note.epingle ? "Désépingler" : "Épingler"}
          className={`shrink-0 ${note.epingle ? "text-kcal" : "text-ink-3"}`}
        >
          <PinIcon filled={note.epingle} />
        </button>
      </div>

      {note.type === "texte" ? (
        note.contenu && <p className="line-clamp-6 whitespace-pre-wrap text-sm text-ink-2">{note.contenu}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {note.items.length > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
              <div className="h-full rounded-full bg-kcal" style={{ width: `${progression}%` }} />
            </div>
          )}
          {itemsAffiches.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <CheckToggle
                checked={item.coche}
                onToggle={() => itemMutation.mutate({ itemId: item.id, coche: !item.coche })}
                label={item.coche ? "Décocher l'item" : "Cocher l'item"}
                size={18}
              />
              <span className={`text-sm ${item.coche ? "text-ink-3 line-through" : "text-ink-2"}`}>
                {item.libelle}
              </span>
            </div>
          ))}
          {itemsRestants > 0 && <p className="text-xs text-ink-3">+{itemsRestants} autres</p>}
        </div>
      )}

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {note.tags.map((tag) => (
            <span key={tag.id} className={pillTag} style={couleurTagStyle(tag.couleur)}>
              #{tag.nom}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditing(true)} className={ghostButton}>
          Modifier
        </button>
        <button
          type="button"
          disabled={deleteMutation.isPending}
          onClick={() => deleteMutation.mutate()}
          className={dangerButton}
        >
          Suppr.
        </button>
      </div>
    </motion.li>
  );
}

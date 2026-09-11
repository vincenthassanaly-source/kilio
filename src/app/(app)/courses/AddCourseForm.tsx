"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCourseItem } from "@/app/actions/courses";
import { queryKeys } from "@/lib/query/keys";
import { showToast } from "@/components/toast/toast-store";
import type { Tables } from "@/lib/supabase/types";
import { errorText, input, primaryButton } from "@/lib/ui";
import { enqueueAction, isNetworkError } from "@/lib/offline/queue";

// Ajouter un article est l'action la plus fréquente du module Courses :
// insertion optimiste immédiate dans la liste (item temporaire, id local),
// remplacée par la ligne réelle au refetch ; rollback silencieux + toast
// discret si l'insertion serveur échoue.
export function AddCourseForm({ onDone }: { onDone?: () => void }) {
  const [libelle, setLibelle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (value: string) => {
      try {
        await createCourseItem(value);
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        await enqueueAction("courses", "createCourseItem", [value]);
        showToast("Enregistré, sera synchronisé à la reconnexion");
      }
    },
    onMutate: async (value) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.courses });
      const previous = queryClient.getQueryData<Tables<"courses_items">[]>(queryKeys.courses);
      const now = new Date().toISOString();
      const optimiste: Tables<"courses_items"> = {
        id: `temp-${crypto.randomUUID()}`,
        libelle: value,
        coche: false,
        termine_le: null,
        created_at: now,
        updated_at: now,
      };
      queryClient.setQueryData<Tables<"courses_items">[]>(queryKeys.courses, (old) => [
        optimiste,
        ...(old ?? []),
      ]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.courses, context.previous);
      setError("Erreur lors de l'ajout.");
      showToast("Impossible d'ajouter l'article.");
    },
    onSuccess: () => {
      setLibelle("");
      onDone?.();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.courses }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = libelle.trim();
    if (!trimmed) {
      setError("Le libellé est requis.");
      return;
    }
    setError(null);
    mutation.mutate(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        name="libelle"
        autoFocus
        value={libelle}
        onChange={(e) => setLibelle(e.target.value)}
        placeholder="Ex. Pâtes, 2 avocats..."
        className={input}
      />

      {error && (
        <p className={errorText} role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={mutation.isPending} className={primaryButton}>
        {mutation.isPending ? "Ajout..." : "Ajouter"}
      </button>
    </form>
  );
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { deleteCourseItem, toggleCourseItem } from "@/app/actions/courses";
import { queryKeys } from "@/lib/query/keys";
import { showToast } from "@/components/toast/toast-store";
import type { Tables } from "@/lib/supabase/types";
import { dangerButton, listCard, nameText } from "@/lib/ui";
import { confirmDelete } from "@/lib/confirm";
import { CheckToggle } from "@/components/CheckToggle";
import { vibrate } from "@/lib/haptics";
import { enqueueAction, isNetworkError } from "@/lib/offline/queue";

// Extrait de CoursesList pour être réutilisé tel quel par
// ArchivedCoursesSection (mêmes mutations optimistes toggle/suppression pour
// les articles archivés), sans import circulaire entre les deux fichiers.
export function CourseItemRow({ item }: { item: Tables<"courses_items"> }) {
  const queryClient = useQueryClient();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.courses });
  }

  // Cocher un article est l'action la plus fréquente du module : optimiste,
  // rollback silencieux + toast discret si le serveur échoue.
  const toggleMutation = useMutation({
    mutationFn: async () => {
      vibrate();
      try {
        await toggleCourseItem(item.id, !item.coche);
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        await enqueueAction("courses", "toggleCourseItem", [item.id, !item.coche]);
        showToast("Enregistré, sera synchronisé à la reconnexion");
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.courses });
      const previous = queryClient.getQueryData<Tables<"courses_items">[]>(queryKeys.courses);
      queryClient.setQueryData<Tables<"courses_items">[]>(queryKeys.courses, (old) =>
        old?.map((i) => (i.id === item.id ? { ...i, coche: !i.coche } : i))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.courses, context.previous);
      showToast("Impossible de mettre à jour l'article.");
    },
    onSettled: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      try {
        await deleteCourseItem(item.id);
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        await enqueueAction("courses", "deleteCourseItem", [item.id]);
        showToast("Enregistré, sera synchronisé à la reconnexion");
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.courses });
      const previous = queryClient.getQueryData<Tables<"courses_items">[]>(queryKeys.courses);
      queryClient.setQueryData<Tables<"courses_items">[]>(queryKeys.courses, (old) =>
        old?.filter((i) => i.id !== item.id)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.courses, context.previous);
      showToast("Impossible de supprimer l'article.");
    },
    onSettled: invalidate,
  });

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className={listCard}
    >
      <div className="flex items-center gap-3">
        <CheckToggle
          checked={item.coche}
          disabled={toggleMutation.isPending}
          onToggle={() => toggleMutation.mutate()}
          color="var(--accent-courses)"
          label={item.coche ? "Décocher l'article" : "Cocher l'article"}
        />
        <p className={`flex-1 ${nameText} ${item.coche ? "text-ink-2 line-through" : ""}`}>
          {item.libelle}
        </p>
        <button
          type="button"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (!confirmDelete(`Supprimer « ${item.libelle} » de la liste de courses ?`)) return;
            deleteMutation.mutate();
          }}
          className={dangerButton}
        >
          Suppr.
        </button>
      </div>
    </motion.li>
  );
}

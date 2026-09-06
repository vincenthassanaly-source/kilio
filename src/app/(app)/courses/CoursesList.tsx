"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { deleteCourseItem, getCoursesItems, toggleCourseItem } from "@/app/actions/courses";
import { queryKeys } from "@/lib/query/keys";
import { showToast } from "@/components/toast/toast-store";
import type { Tables } from "@/lib/supabase/types";
import { dangerButton, errorText, listCard, nameText } from "@/lib/ui";
import { CheckToggle } from "@/components/CheckToggle";
import { ListItemSkeletonGroup } from "@/components/skeletons/ListItemSkeleton";
import { vibrate } from "@/lib/haptics";
import { enqueueAction, isNetworkError } from "@/lib/offline/queue";

function CourseItemRow({ item }: { item: Tables<"courses_items"> }) {
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
          onClick={() => deleteMutation.mutate()}
          className={dangerButton}
        >
          Suppr.
        </button>
      </div>
    </motion.li>
  );
}

export function CoursesList() {
  const { data: items, isLoading, isError } = useQuery({
    queryKey: queryKeys.courses,
    queryFn: getCoursesItems,
  });

  if (isLoading) return <ListItemSkeletonGroup count={4} />;
  if (isError) return <p className={errorText}>Erreur de chargement des courses. Réessaie.</p>;
  if (!items || items.length === 0) {
    return <p className="text-ink-2">Aucun article pour l&apos;instant.</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <CourseItemRow key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </ul>
  );
}

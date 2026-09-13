"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { getCoursesItems } from "@/app/actions/courses";
import { queryKeys } from "@/lib/query/keys";
import { errorText } from "@/lib/ui";
import { ListItemSkeletonGroup } from "@/components/skeletons/ListItemSkeleton";
import { grouperItemsCourses } from "@/lib/courses/compute";
import { CourseItemRow } from "./CourseItemRow";
import { ArchivedCoursesSection } from "./ArchivedCoursesSection";

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

  const { actifs, archives } = grouperItemsCourses(items);

  return (
    <div className="flex flex-col gap-2.5">
      {actifs.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {actifs.map((item) => (
              <CourseItemRow key={item.id} item={item} />
            ))}
          </AnimatePresence>
        </ul>
      )}
      <ArchivedCoursesSection items={archives} />
    </div>
  );
}

import { CardSkeleton } from "@/components/skeletons/CardSkeleton";
import { ListItemSkeletonGroup } from "@/components/skeletons/ListItemSkeleton";

// Extrait de l'ancien loading.tsx du Journal : objectif/résumé puis repas.
export function JournalJourSkeleton() {
  return (
    <>
      <CardSkeleton withRing={false} />
      <ListItemSkeletonGroup count={4} />
    </>
  );
}

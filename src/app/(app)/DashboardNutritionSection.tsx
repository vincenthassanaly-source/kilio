"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getResumeNutritionJour } from "@/app/actions/journal";
import { queryKeys } from "@/lib/query/keys";
import { card } from "@/lib/ui";
import { ProgressRing } from "@/components/ProgressRing";
import { CardSkeleton } from "@/components/skeletons/CardSkeleton";

const MACRO_COLORS = { proteines: "var(--accent-protein)", glucides: "var(--accent-carbs)", lipides: "var(--accent-fat)" };
const MACRO_LABELS = { proteines: "P", glucides: "G", lipides: "L" };

export function DashboardNutritionSection({ today }: { today: string }) {
  const { data: resume, isLoading } = useQuery({
    queryKey: queryKeys.objectifNutritionnel("repos"),
    queryFn: () => getResumeNutritionJour(today, "repos"),
  });

  if (isLoading) return <CardSkeleton />;

  const kcalGoal = resume?.kcalGoal ?? 2100;
  const kcalPct = resume ? (kcalGoal > 0 ? resume.consomme.kcal / kcalGoal : 0) : 0;
  const macros = resume
    ? [
        { key: "proteines" as const, value: resume.consomme.proteines, goal: resume.macroGoals.proteines },
        { key: "glucides" as const, value: resume.consomme.glucides, goal: resume.macroGoals.glucides },
        { key: "lipides" as const, value: resume.consomme.lipides, goal: resume.macroGoals.lipides },
      ]
    : [];

  return (
    <motion.div whileTap={{ scale: 0.98 }}>
      <Link href="/nutrition/journal" className={`${card} flex items-center gap-3.5`}>
        <ProgressRing size={60} strokeWidth={6.5} pct={kcalPct} color="var(--accent-kcal)">
          <span className="font-display text-[12.5px] font-bold text-ink">{Math.round(kcalPct * 100)}%</span>
        </ProgressRing>
        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          <span
            className="text-[14px] font-semibold text-ink"
            style={{ viewTransitionName: "nutrition-titre-dashboard" }}
          >
            Nutrition
          </span>
          <span className="text-[12.5px] font-medium text-ink-2">
            {Math.round(resume?.consomme.kcal ?? 0)} / {kcalGoal} kcal
          </span>
          <div className="flex gap-2">
            {macros.map((m) => (
              <div key={m.key} className="flex flex-1 flex-col gap-0.5">
                <div className="h-1 overflow-hidden rounded-full bg-surface-alt">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, m.goal > 0 ? Math.round((m.value / m.goal) * 100) : 0)}%`,
                      background: MACRO_COLORS[m.key],
                    }}
                  />
                </div>
                <span className="text-[9.5px] font-semibold text-ink-3">{MACRO_LABELS[m.key]}</span>
              </div>
            ))}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

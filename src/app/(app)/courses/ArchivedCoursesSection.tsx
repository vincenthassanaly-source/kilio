"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Tables } from "@/lib/supabase/types";
import { CourseItemRow } from "./CourseItemRow";
import { card, sectionTitle } from "@/lib/ui";

export function ArchivedCoursesSection({ items }: { items: Tables<"courses_items">[] }) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className={card}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2"
        aria-expanded={open}
      >
        <span className={sectionTitle}>Articles archivés ({items.length})</span>
        <span
          className={`text-ink-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="mt-2.5 flex flex-col gap-2.5">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <CourseItemRow key={item.id} item={item} />
                ))}
              </AnimatePresence>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

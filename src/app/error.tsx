"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ErrorState";

// Error boundary racine : couvre tout ce qui est hors du groupe (app),
// notamment le flux de partage natif Android (/collection/partage/*).
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="flex-1 overflow-y-auto px-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 24px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
      }}
    >
      <ErrorState reset={reset} />
    </div>
  );
}

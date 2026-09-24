import { BottomNav } from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Providers } from "@/app/providers";
import { TabSwipeWrapper } from "@/components/TabSwipeWrapper";
import { NavigationEditProvider } from "@/lib/navigation/NavigationEditContext";
import { getPreferencesNavigationResolues } from "@/app/actions/preferences-navigation";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// Server Component : lit les préférences de navigation une seule fois par
// requête et les passe en props à NavigationEditProvider, qui les garde en
// state client (mises à jour ensuite via les Server Actions
// updateOrdreGrillePlus / updateModulesBarreBasse). ModulesGrid et BottomNav
// vivent dans deux sous-arbres différents de ce layout (children vs. rendu
// direct) mais partagent ce même Provider, seul point commun des deux —
// voir reports/2026-09-04-preferences-navigation.md.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ordreGrillePlus, modulesBarreBasse } = await getPreferencesNavigationResolues();

  return (
    <Providers>
      <NavigationEditProvider initialOrdreGrillePlus={ordreGrillePlus} initialModulesBarreBasse={modulesBarreBasse}>
        <div className="relative flex h-full flex-1 flex-col bg-background">
          <div className="fixed right-4 z-40" style={{ top: "calc(env(safe-area-inset-top) + 14px)" }}>
            <ThemeToggle />
          </div>
          <TabSwipeWrapper>{children}</TabSwipeWrapper>
          <BottomNav />
        </div>
      </NavigationEditProvider>
    </Providers>
  );
}

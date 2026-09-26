import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TasksList } from "./TasksList";
import { queryKeys } from "@/lib/query/keys";
import { makeTache } from "@/test/fixtures";
import type { DragEndEvent } from "@dnd-kit/core";
import type { ReactNode } from "react";

vi.mock("@/app/actions/taches", () => ({
  createSousTache: vi.fn(),
  deleteSousTache: vi.fn(),
  deleteTache: vi.fn(),
  enregistrerOrdreTaches: vi.fn(),
  reordonnerSousTaches: vi.fn(),
  toggleSousTache: vi.fn(),
  setTacheFait: vi.fn(),
}));

// dnd-kit s'appuie sur PointerEvent / getBoundingClientRect réels pour ses
// capteurs, indisponibles en jsdom. On isole donc `handleDragEnd` (la
// logique métier testée ici) du moteur de drag lui-même : DndContext/
// SortableContext sont remplacés par de simples passe-plats qui exposent
// `onDragEnd`, capturé et appelé directement avec un DragEndEvent construit
// à la main.
let capturedOnDragEnd: ((event: DragEndEvent) => void) | undefined;

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: ({ children, onDragEnd }: { children: ReactNode; onDragEnd: (e: DragEndEvent) => void }) => {
      capturedOnDragEnd = onDragEnd;
      return children;
    },
  };
});

vi.mock("@dnd-kit/sortable", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/sortable")>();
  return {
    ...actual,
    SortableContext: ({ children }: { children: ReactNode }) => children,
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
  };
});

import { enregistrerOrdreTaches } from "@/app/actions/taches";
import { showToast } from "@/components/toast/toast-store";

vi.mock("@/components/toast/toast-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/toast/toast-store")>();
  return { ...actual, showToast: vi.fn() };
});

function buildDragEndEvent(activeId: string, overId: string): DragEndEvent {
  return {
    active: { id: activeId, data: { current: undefined }, rect: { current: { initial: null, translated: null } } },
    over: { id: overId, rect: {} as DOMRect, disabled: false, data: { current: undefined } },
    activatorEvent: new Event("pointerdown"),
    collisions: null,
    delta: { x: 0, y: 0 },
  } as unknown as DragEndEvent;
}

describe("TasksList.SortableTachesList.handleDragEnd (CLICK-PATH-303)", () => {
  beforeEach(() => {
    capturedOnDragEnd = undefined;
    vi.clearAllMocks();
  });

  it("annule les requêtes en vol (cancelQueries) avant d'écrire l'ordre optimiste, puis invalide dans un `finally` même en cas d'échec serveur", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const tacheA = makeTache({ id: "a", ordre: 0, liste_id: "liste-1" });
    const tacheB = makeTache({ id: "b", ordre: 1, liste_id: "liste-1" });
    client.setQueryData(queryKeys.taches, [tacheA, tacheB]);

    const calls: string[] = [];
    vi.spyOn(client, "cancelQueries").mockImplementation(async () => {
      calls.push("cancelQueries");
    });
    const originalSetQueryData = client.setQueryData.bind(client);
    vi.spyOn(client, "setQueryData").mockImplementation((...args: Parameters<typeof originalSetQueryData>) => {
      calls.push("setQueryData");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (originalSetQueryData as any)(...args);
    });
    vi.spyOn(client, "invalidateQueries").mockImplementation(async () => {
      calls.push("invalidateQueries");
    });
    vi.mocked(enregistrerOrdreTaches).mockImplementation(async () => {
      calls.push("enregistrerOrdreTaches");
      throw new Error("réseau indisponible");
    });

    render(
      <QueryClientProvider client={client}>
        <TasksList taches={[tacheA, tacheB]} listes={[]} tags={[]} reordonnable />
      </QueryClientProvider>
    );

    expect(capturedOnDragEnd).toBeDefined();
    await capturedOnDragEnd!(buildDragEndEvent("a", "b"));

    expect(calls).toEqual(["cancelQueries", "setQueryData", "enregistrerOrdreTaches", "invalidateQueries"]);
    expect(showToast).toHaveBeenCalledWith("Échec de la réorganisation, réessaie.");
  });

  it("invalide aussi dans le `finally` quand l'enregistrement serveur réussit", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const tacheA = makeTache({ id: "a", ordre: 0, liste_id: "liste-1" });
    const tacheB = makeTache({ id: "b", ordre: 1, liste_id: "liste-1" });
    client.setQueryData(queryKeys.taches, [tacheA, tacheB]);

    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    vi.mocked(enregistrerOrdreTaches).mockResolvedValue(undefined);

    render(
      <QueryClientProvider client={client}>
        <TasksList taches={[tacheA, tacheB]} listes={[]} tags={[]} reordonnable />
      </QueryClientProvider>
    );

    await capturedOnDragEnd!(buildDragEndEvent("a", "b"));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.taches });
  });
});

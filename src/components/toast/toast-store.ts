// Petit pub-sub sans dépendance : sert uniquement à signaler un échec de
// mutation optimiste (rollback silencieux côté cache + toast discret côté
// UI), pas un système de notifications complet. Un seul flux global suffit
// pour une app mono-utilisateur.
export type ToastMessage = { id: number; text: string };

type Listener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener(toasts);
}

// `dureeMs` : durée d'affichage, 3,2 s par défaut ; à allonger pour un
// message long (avertissement de plus d'une ligne).
export function showToast(text: string, dureeMs = 3200) {
  const id = nextId++;
  toasts = [...toasts, { id, text }];
  emit();
  setTimeout(() => dismissToast(id), dureeMs);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): ToastMessage[] {
  return toasts;
}

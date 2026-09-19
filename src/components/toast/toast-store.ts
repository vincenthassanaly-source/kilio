// Petit pub-sub sans dépendance : sert uniquement à signaler un échec de
// mutation optimiste (rollback silencieux côté cache + toast discret côté
// UI), pas un système de notifications complet. Un seul flux global suffit
// pour une app mono-utilisateur.
export type ToastAction = { label: string; onAction: () => void };
export type ToastMessage = { id: number; text: string; action?: ToastAction };

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

// Durée par défaut d'un toast à action : plus longue qu'un toast simple
// (3,2 s) pour laisser le temps de repérer et presser « Annuler » — 6 s,
// cohérent avec le pattern undo-toast usuel (Gmail, Android).
const DUREE_ACTION_MS = 6000;

// Toast avec une action explicite (ex. « Annuler » après une suppression) :
// brique nouvelle, sans équivalent ailleurs dans Kilio avant le lot B
// Courses. `label` sert à la fois de texte visible du bouton et de base de
// son `aria-label` (le composant hôte, ToastHost, y ajoute le contexte
// nécessaire si l'appelant ne l'a pas déjà inclus dans `label` lui-même).
// Plusieurs toasts d'action peuvent coexister : chacun a son propre `id` et
// son propre timer, comme les toasts simples.
export function showActionToast(
  text: string,
  { label, onAction, dureeMs = DUREE_ACTION_MS }: { label: string; onAction: () => void; dureeMs?: number }
) {
  const id = nextId++;
  toasts = [...toasts, { id, text, action: { label, onAction } }];
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

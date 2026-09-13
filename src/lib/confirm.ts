// Confirmation native avant une action destructive (suppression) déclenchée
// par `dangerButton` (voir lib/ui.ts) : évite qu'un tap accidentel supprime
// définitivement une donnée sans étape intermédiaire. `message` peut être
// personnalisé par l'appelant pour nommer l'élément concerné (ex. « Supprimer
// la note « Courses » ? »), sinon un texte générique est utilisé.
export function confirmDelete(message = "Supprimer définitivement ?"): boolean {
  return window.confirm(message);
}

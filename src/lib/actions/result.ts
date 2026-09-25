// Contrat d'erreur unique des Server Actions appelées hors `useActionState`
// (constat T1 de l'audit du 2026-09-25) : une action **retourne** son échec
// au lieu de lever une exception. Une exception levée dans un
// `startTransition(async …)` remonte en React 19 jusqu'à `(app)/error.tsx`,
// qui remplace tout l'écran (saisie en cours comprise) — et Next masque en
// production le message d'une exception de Server Action, alors qu'un
// message retourné arrive intact jusqu'au toast.
//
// Module neutre (ni "use server" ni "use client") : importé à la fois par
// les fichiers d'actions et par le wrapper client `runAction`.
export type ActionResult<T = undefined> =
  | { ok: true; data: T; error?: undefined }
  | { ok: false; error: string; data?: undefined };

export function ok(): ActionResult<undefined>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function isActionFailure(value: unknown): value is { ok: false; error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { ok?: unknown }).ok === false &&
    typeof (value as { error?: unknown }).error === "string"
  );
}

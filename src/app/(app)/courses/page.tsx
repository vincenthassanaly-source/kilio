import { CoursesView } from "./CoursesView";
import { screenTitle } from "@/lib/ui";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default function CoursesPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle}>Courses</h1>
      <CoursesView />
    </div>
  );
}

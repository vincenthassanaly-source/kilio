import { CoursesView } from "./CoursesView";
import { screenTitle } from "@/lib/ui";

export default function CoursesPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle}>Courses</h1>
      <CoursesView />
    </div>
  );
}

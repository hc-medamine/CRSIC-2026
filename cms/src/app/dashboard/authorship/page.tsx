import { redirect } from "next/navigation";
import { requireReviewerOrSuperAdmin } from "@/lib/users";

/** Align lives on Desks (`/dashboard/editors`). */
export default async function AuthorshipRedirectPage() {
  await requireReviewerOrSuperAdmin();
  redirect("/dashboard/editors");
}

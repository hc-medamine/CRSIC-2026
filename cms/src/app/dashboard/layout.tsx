import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { SessionTouch } from "./session-touch";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireUser();
  } catch {
    redirect("/login");
  }
  return (
    <>
      <SessionTouch />
      {children}
    </>
  );
}

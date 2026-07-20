import { redirect } from "next/navigation";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";

export default async function Home() {
  const session = await getSession();
  const now = Date.now();
  if (
    session.user &&
    session.lastActivityAt &&
    now - session.lastActivityAt <= sessionTimeoutMs()
  ) {
    redirect("/dashboard");
  }
  redirect("/login");
}

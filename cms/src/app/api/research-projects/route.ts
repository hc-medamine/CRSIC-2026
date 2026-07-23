import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  createResearchProject,
  listResearchProjectsForUser,
  type ResearchProjectInput,
} from "@/lib/content/researchProjects";

export const runtime = "nodejs";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

function serialize(item: Awaited<ReturnType<typeof listResearchProjectsForUser>>[number]) {
  return {
    ...item,
    published_at: item.published_at?.toISOString() ?? null,
    created_at: item.created_at.toISOString(),
    updated_at: item.updated_at.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  // orgUnitId is accepted for a future org-scoped picker; project listing is by-user for now.
  void request.nextUrl.searchParams.get("orgUnitId");
  const items = await listResearchProjectsForUser(user);
  return NextResponse.json({ ok: true, items: items.map(serialize) });
}

export async function POST(request: NextRequest) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  try {
    const body = (await request.json()) as ResearchProjectInput;
    const item = await createResearchProject(user, body);
    return NextResponse.json({ ok: true, item: serialize(item) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

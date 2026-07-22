import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import { createPartner, listPartnersForUser, type PartnerInput } from "@/lib/content/partners";

export const runtime = "nodejs";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

function serialize(item: Awaited<ReturnType<typeof listPartnersForUser>>[number]) {
  return {
    ...item,
    published_at: item.published_at?.toISOString() ?? null,
    created_at: item.created_at.toISOString(),
    updated_at: item.updated_at.toISOString(),
  };
}

export async function GET() {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  const items = await listPartnersForUser(user);
  return NextResponse.json({ ok: true, items: items.map(serialize) });
}

export async function POST(request: NextRequest) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  try {
    const body = (await request.json()) as PartnerInput;
    const item = await createPartner(user, body);
    return NextResponse.json({ ok: true, item: serialize(item) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

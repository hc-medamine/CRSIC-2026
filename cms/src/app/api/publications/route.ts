import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  createPublication,
  listPublicationsForUser,
  type PublicationInput,
  type PublicationItem,
} from "@/lib/content/publications";
import { listQueryFromSearchParams } from "@/lib/content/listPagination";

export const runtime = "nodejs";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

function serialize(item: PublicationItem) {
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
  const result = await listPublicationsForUser(
    user,
    listQueryFromSearchParams(request.nextUrl.searchParams),
  );
  return NextResponse.json({
    ok: true,
    items: result.items.map(serialize),
    hasMore: result.hasMore,
    page: result.page,
  });
}

export async function POST(request: NextRequest) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  try {
    const body = (await request.json()) as PublicationInput;
    const item = await createPublication(user, body);
    return NextResponse.json({ ok: true, item: serialize(item) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

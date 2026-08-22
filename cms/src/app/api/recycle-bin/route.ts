import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  emptyRecycleBin,
  listRecycleBin,
  purgeRecycledItem,
  purgeStaleRecycleBin,
  restoreRecycledItem,
  toRecycleBinClientRows,
} from "@/lib/content/recycleBin";

export const runtime = "nodejs";

async function requireSuperAdminApi() {
  const session = await getSession();
  const user = session.user;
  if (!user || user.role !== "super_admin" || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return user;
}

function payloadFrom(items: Awaited<ReturnType<typeof listRecycleBin>>) {
  return {
    ok: true as const,
    items: toRecycleBinClientRows(items.items),
    staleIds: items.staleIds,
  };
}

export async function GET() {
  const admin = await requireSuperAdminApi();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  try {
    const listed = await listRecycleBin(admin);
    return NextResponse.json(payloadFrom(listed));
  } catch (err) {
    const message = err instanceof Error ? err.message : "List failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireSuperAdminApi();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { action?: string; id?: string };
    switch (body.action) {
      case "restore":
        if (!body.id) throw new Error("id required");
        await restoreRecycledItem(admin, body.id);
        break;
      case "purge":
        if (!body.id) throw new Error("id required");
        await purgeRecycledItem(admin, body.id);
        break;
      case "empty":
        await emptyRecycleBin(admin);
        break;
      case "purge-stale":
        await purgeStaleRecycleBin(admin);
        break;
      default:
        throw new Error("Unknown action");
    }
    const listed = await listRecycleBin(admin);
    return NextResponse.json(payloadFrom(listed));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    const status =
      message.includes("Super Admin role required") || message.includes("Forbidden")
        ? 403
        : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

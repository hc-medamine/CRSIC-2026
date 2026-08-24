import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs, type SessionUser } from "@/lib/auth/session";
import {
  canManageRecycleBin,
  canOpenRecycleBin,
  emptyRecycleBin,
  listRecycleBin,
  purgeRecycledItem,
  purgeStaleRecycleBin,
  restoreRecycledItem,
  toRecycleBinClientRows,
} from "@/lib/content/recycleBin";

export const runtime = "nodejs";

async function requireBinUser(): Promise<SessionUser | null> {
  const session = await getSession();
  const user = session.user;
  if (!user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  if (!canOpenRecycleBin(user)) return null;
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
  const user = await requireBinUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  try {
    const listed = await listRecycleBin(user);
    return NextResponse.json(payloadFrom(listed));
  } catch (err) {
    const message = err instanceof Error ? err.message : "List failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireBinUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { action?: string; id?: string };
    switch (body.action) {
      case "restore":
        if (!body.id) throw new Error("id required");
        await restoreRecycledItem(user, body.id);
        break;
      case "purge":
      case "empty":
      case "purge-stale":
        if (!canManageRecycleBin(user)) {
          return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
        }
        if (body.action === "purge") {
          if (!body.id) throw new Error("id required");
          await purgeRecycledItem(user, body.id);
        } else if (body.action === "empty") {
          await emptyRecycleBin(user);
        } else {
          await purgeStaleRecycleBin(user);
        }
        break;
      default:
        throw new Error("Unknown action");
    }
    const listed = await listRecycleBin(user);
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

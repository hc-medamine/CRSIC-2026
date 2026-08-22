import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { listEligiblePublishers, setItemPublisher } from "@/lib/content/alignAuthorship";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "super_admin" && user.role !== "reviewer") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const orgUnitId = request.nextUrl.searchParams.get("orgUnitId");
    if (!orgUnitId) {
      return NextResponse.json({ ok: false, error: "orgUnitId required" }, { status: 400 });
    }
    const users = await listEligiblePublishers(orgUnitId);
    return NextResponse.json({ ok: true, users });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      contentItemId?: string;
      publisherId?: string | null;
    };
    if (!body.contentItemId) throw new Error("contentItemId required");
    const publisherId =
      body.publisherId === "" || body.publisherId === undefined ? null : body.publisherId;
    const result = await setItemPublisher(user, body.contentItemId, publisherId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status =
      message === "Forbidden" || message.includes("role required") ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

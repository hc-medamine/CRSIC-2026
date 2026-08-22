import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import {
  applyAlign,
  previewAlign,
  retryAlignRebuild,
  serializeAlignPreview,
} from "@/lib/content/alignAuthorship";

export const runtime = "nodejs";

function forbidUnlessAlignRole(role: string) {
  return role !== "super_admin" && role !== "reviewer";
}

export async function GET() {
  try {
    const user = await requireUser();
    if (forbidUnlessAlignRole(user.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const preview = serializeAlignPreview(await previewAlign(user));
    return NextResponse.json({ ok: true, preview });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (forbidUnlessAlignRole(user.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const body = (await req.json()) as { action?: string };
    if (body.action === "rebuild") {
      const result = await retryAlignRebuild(user);
      return NextResponse.json({
        ok: !result.error,
        rebuild: result.rebuild,
        error: result.error,
      });
    }
    if (body.action === "apply") {
      const result = await applyAlign(user, { notify: true, rebuild: true });
      return NextResponse.json({
        ok: true,
        preview: serializeAlignPreview(result),
        applied: result.applied,
        rebuildError: result.rebuildError,
      });
    }
    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status =
      message.includes("role required") || message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  canManageMediaAsset,
  getMediaById,
  replaceMediaUpload,
} from "@/lib/media/store";

export const runtime = "nodejs";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

function serialize(asset: NonNullable<Awaited<ReturnType<typeof getMediaById>>>) {
  return {
    id: asset.id,
    bucket: asset.bucket,
    originalFilename: asset.original_filename,
    mimeType: asset.mime_type,
    byteSize: asset.byte_size,
    extension: asset.extension,
    publicPath: asset.public_path,
    replacedAt: asset.replaced_at?.toISOString() ?? null,
    createdAt: asset.created_at.toISOString(),
    updatedAt: asset.updated_at.toISOString(),
  };
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;
  const asset = await getMediaById(id);
  if (!asset || !canManageMediaAsset(user, asset)) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, asset: serialize(asset) });
}

/** Replace file at the same public_path (stable URL). Same extension required. */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  const { id } = await params;

  try {
    const form = await request.formData();
    const file = form.get("file");
    const imagesOnly = String(form.get("imagesOnly") ?? "") === "1";
    if (!(file instanceof File)) throw new Error("file is required");

    const asset = await replaceMediaUpload(user, id, file, { imagesOnly });
    return NextResponse.json({ ok: true, asset: serialize(asset) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Replace failed";
    const status =
      message.includes("not found") || message.includes("No permission") ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

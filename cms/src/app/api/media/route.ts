import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import { createMediaUpload } from "@/lib/media/store";

export const runtime = "nodejs";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

function serialize(asset: Awaited<ReturnType<typeof createMediaUpload>>) {
  return {
    id: asset.id,
    bucket: asset.bucket,
    originalFilename: asset.original_filename,
    mimeType: asset.mime_type,
    byteSize: asset.byte_size,
    extension: asset.extension,
    publicPath: asset.public_path,
    createdAt: asset.created_at.toISOString(),
    updatedAt: asset.updated_at.toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    const bucket = String(form.get("bucket") ?? "");
    const imagesOnly = String(form.get("imagesOnly") ?? "") === "1";

    if (!(file instanceof File)) throw new Error("file is required");

    const asset = await createMediaUpload(user, file, bucket, { imagesOnly });
    return NextResponse.json({ ok: true, asset: serialize(asset) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

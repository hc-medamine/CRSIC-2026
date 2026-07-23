import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import {
  canAccessMediaBucket,
  ensurePublicMediaFile,
  getMediaByPublicPath,
} from "@/lib/media/store";
import { isMediaBucket } from "@/lib/media/config";

export const runtime = "nodejs";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

const ALLOWED_EXT = /\.(jpe?g|png|webp|gif|pdf)$/i;

/**
 * Safe repo-relative path under img/ (CMS uploads or legacy SPA assets like img/covers/).
 */
function safeImgPath(raw: string | null): string | null {
  const path = (raw ?? "").trim().replace(/^\/+/, "");
  if (!path.startsWith("img/")) return null;
  if (path.includes("..") || path.includes("\\")) return null;
  if (!ALLOWED_EXT.test(path)) return null;
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return path;
}

function mimeFor(path: string, fallback = "application/octet-stream"): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return fallback;
}

/**
 * Stream an image/PDF from the public repo `img/` tree for authenticated CMS users.
 * Query: ?path=img/cms/{bucket}/{file} | img/covers/{file} | …
 */
export async function GET(request: NextRequest) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  const path = safeImgPath(request.nextUrl.searchParams.get("path"));
  if (!path) {
    return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
  }

  // CMS upload buckets keep content-type ACL; legacy img/covers etc. = any signed-in user.
  if (path.startsWith("img/cms/")) {
    const bucket = path.split("/")[2];
    if (!bucket || !isMediaBucket(bucket)) {
      return NextResponse.json({ ok: false, error: "Invalid bucket" }, { status: 400 });
    }
    if (!(await canAccessMediaBucket(user, bucket))) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
  }

  const asset = path.startsWith("img/cms/") ? await getMediaByPublicPath(path) : null;
  let abs: string;
  let mime = "application/octet-stream";

  if (asset) {
    try {
      ensurePublicMediaFile(asset);
    } catch {
      /* fall through to direct read */
    }
    mime = asset.mime_type || mime;
    abs = join(process.cwd(), "..", ...asset.public_path.split("/"));
    if (!existsSync(abs)) {
      abs = join(process.cwd(), "uploads", `${asset.id}.${asset.extension}`);
    }
  } else {
    abs = join(process.cwd(), "..", ...path.split("/"));
  }

  if (!existsSync(abs)) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  mime = mimeFor(path, mime);
  const body = readFileSync(abs);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, max-age=300",
      "Content-Length": String(body.byteLength),
    },
  });
}

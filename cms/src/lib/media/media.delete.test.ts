/**
 * Integration tests for media DELETE (approved design D1–D5=A).
 * Run: npm test  (from cms/, requires DATABASE_URL)
 */
import assert from "node:assert/strict";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import {
  createMediaUpload,
  deleteMediaAsset,
  getMediaById,
  MediaInUseError,
} from "@/lib/media/store";
import { listMediaReferences } from "@/lib/media/references";
import { createNews, updateNewsDraft } from "@/lib/content/news";

const ORG = "centre_wide";
const createdMedia: { id: string; publicPath: string; extension: string }[] = [];
const createdNewsIds: string[] = [];

function unlinkIfExists(absPath: string): void {
  try {
    if (existsSync(absPath)) unlinkSync(absPath);
  } catch {
    /* best-effort leftover cleanup */
  }
}

/** Minimal valid 1×1 PNG */
function tinyPngFile(name = "test.png"): File {
  const bytes = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
  return new File([bytes], name, { type: "image/png" });
}

async function loadSuperAdmin(): Promise<SessionUser> {
  const result = await query<{
    id: string;
    email: string;
    display_name: string;
  }>(
    `SELECT id, email, display_name FROM users
     WHERE role = 'super_admin' AND is_active = TRUE
     ORDER BY created_at ASC LIMIT 1`,
  );
  const row = result.rows[0];
  if (!row) throw new Error("No active Super Admin");
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: "super_admin",
  };
}

describe("media delete", () => {
  let sa: SessionUser;

  before(async () => {
    sa = await loadSuperAdmin();
  });

  after(async () => {
    for (const id of createdNewsIds) {
      await query(`DELETE FROM content_items WHERE id = $1`, [id]);
    }
    for (const asset of createdMedia) {
      unlinkIfExists(join(process.cwd(), "uploads", `${asset.id}.${asset.extension}`));
      unlinkIfExists(join(process.cwd(), "..", ...asset.publicPath.split("/")));
      await query(`DELETE FROM media_assets WHERE id = $1`, [asset.id]);
    }
  });

  it("deletes unreferenced asset (row + both files)", async () => {
    const asset = await createMediaUpload(sa, tinyPngFile("orphan.png"), "news");
    createdMedia.push({ id: asset.id, publicPath: asset.public_path, extension: asset.extension });

    const staging = join(process.cwd(), "uploads", `${asset.id}.${asset.extension}`);
    const publicAbs = join(process.cwd(), "..", ...asset.public_path.split("/"));
    assert.equal(existsSync(staging), true);
    assert.equal(existsSync(publicAbs), true);

    const result = await deleteMediaAsset(sa, asset.id);
    assert.equal(result.publicPath, asset.public_path);
    assert.equal(await getMediaById(asset.id), null);
    assert.equal(existsSync(staging), false);
    assert.equal(existsSync(publicAbs), false);
  });

  it("blocks delete when image_path / attachments reference the asset", async () => {
    const asset = await createMediaUpload(sa, tinyPngFile("used.png"), "news");
    createdMedia.push({ id: asset.id, publicPath: asset.public_path, extension: asset.extension });

    const news = await createNews(sa, {
      orgUnitId: ORG,
      titleAr: `حذف وسائط ${Date.now()}`,
      labelAr: "اختبار",
      summaryAr: "ملخص",
      bodyAr: "<p>نص</p>",
      imagePath: asset.public_path,
      imageAltAr: "alt",
      attachments: [{ kind: "image", src: asset.public_path, alt: "alt" }],
    });
    createdNewsIds.push(news.id);

    const refs = await listMediaReferences(asset.public_path);
    assert.ok(refs.some((r) => r.source === "image_path" || r.source === "attachments"));

    await assert.rejects(
      () => deleteMediaAsset(sa, asset.id),
      (err: unknown) => {
        assert.ok(err instanceof MediaInUseError);
        assert.equal(err.code, "MEDIA_IN_USE");
        assert.ok(err.references.length >= 1);
        return true;
      },
    );
    assert.ok(await getMediaById(asset.id));
  });

  it("blocks delete when only a revision snapshot still references the path", async () => {
    const asset = await createMediaUpload(sa, tinyPngFile("rev.png"), "news");
    createdMedia.push({ id: asset.id, publicPath: asset.public_path, extension: asset.extension });

    const news = await createNews(sa, {
      orgUnitId: ORG,
      titleAr: `مراجعة وسائط ${Date.now()}`,
      labelAr: "اختبار",
      summaryAr: "ملخص",
      bodyAr: "<p>نص</p>",
      imagePath: asset.public_path,
      imageAltAr: "alt",
      attachments: [{ kind: "image", src: asset.public_path }],
    });
    createdNewsIds.push(news.id);

    // Clear current fields — Created revision still holds the path (D2=A).
    await updateNewsDraft(sa, news.id, {
      orgUnitId: ORG,
      titleAr: news.title_ar,
      labelAr: news.label_ar ?? "اختبار",
      summaryAr: news.summary_ar ?? "ملخص",
      bodyAr: news.body_ar ?? "<p>نص</p>",
      imagePath: "",
      imageAltAr: "",
      attachments: [],
    });

    const refs = await listMediaReferences(asset.public_path);
    assert.ok(
      refs.some((r) => r.source === "revision"),
      "expected revision reference after clearing draft fields",
    );

    await assert.rejects(() => deleteMediaAsset(sa, asset.id), MediaInUseError);
  });
});

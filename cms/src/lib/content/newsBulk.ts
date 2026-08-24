import type { SessionUser } from "@/lib/auth/session";
import { captureLiveState, restoreLiveState, type LiveState } from "@/lib/publish/safeRebuild";
import { rebuildPublicNewsJson } from "@/lib/publish/newsJson";
import { pruneFeaturedNewsItem } from "@/lib/content/featuredNews";
import { recycleContentItem } from "@/lib/content/recycleBin";
import { getNewsById, unpublishNews } from "@/lib/content/news";

export const NEWS_BULK_MAX_IDS = 200;

export type NewsBulkAction = "unpublish" | "recycle";

export type NewsBulkSkipReason =
  | "not_found"
  | "four_eyes"
  | "not_published"
  | "away"
  | "reviewer_required"
  | "not_sa"
  | "not_author"
  | "wrong_status"
  | "already_binned"
  | "too_many"
  | "other";

export type NewsBulkItemRef = { id: string; title: string };

export type NewsBulkSkip = NewsBulkItemRef & {
  reason: NewsBulkSkipReason;
  detail?: string;
};

export type NewsBulkResult = {
  done: NewsBulkItemRef[];
  skipped: NewsBulkSkip[];
};

export type NewsBulkRow = { id: string; title: string; status: string };

export type NewsBulkDeps = {
  role: SessionUser["role"];
  loadNews: (id: string) => Promise<NewsBulkRow | null>;
  unpublishSilent: (id: string) => Promise<NewsBulkItemRef>;
  recycle: (id: string) => Promise<void>;
  rebuildNewsJson: () => Promise<void>;
  restoreUnpublished?: () => Promise<void>;
  pruneFeatured?: (id: string) => Promise<void>;
};

const SA_RECYCLE_ELIGIBLE = new Set(["unpublished", "rejected"]);
const EDITOR_RECYCLE_ELIGIBLE = new Set(["draft", "rejected"]);

export function isNewsBulkAction(value: unknown): value is NewsBulkAction {
  return value === "unpublish" || value === "recycle";
}

export function skipReasonFromError(err: unknown): { reason: NewsBulkSkipReason; detail: string } {
  const detail = err instanceof Error ? err.message : "Action failed";
  if (detail.includes("Four-eyes")) return { reason: "four_eyes", detail };
  if (detail.includes("Away (OOO)")) return { reason: "away", detail };
  if (detail === "Reviewer role required") return { reason: "reviewer_required", detail };
  if (detail === "Super Admin role required") return { reason: "not_sa", detail };
  if (detail.includes("Only the author")) return { reason: "not_author", detail };
  if (detail === "Item is not published") return { reason: "not_published", detail };
  if (detail.includes("already in the recycle bin")) return { reason: "already_binned", detail };
  if (detail.includes("Only unpublished or rejected")) return { reason: "wrong_status", detail };
  if (detail.includes("Only draft or rejected")) return { reason: "wrong_status", detail };
  if (detail === "Not found") return { reason: "not_found", detail };
  return { reason: "other", detail };
}

export function parseNewsBulkIds(raw: unknown): { ids: string[]; skipped: NewsBulkSkip[] } {
  if (!Array.isArray(raw)) throw new Error("ids required");
  const skipped: NewsBulkSkip[] = [];
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const id = typeof entry === "string" ? entry.trim() : "";
    if (!id) {
      skipped.push({ id: "", title: "", reason: "not_found" });
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    if (ids.length >= NEWS_BULK_MAX_IDS) {
      skipped.push({ id, title: "", reason: "too_many" });
      continue;
    }
    ids.push(id);
  }
  return { ids, skipped };
}

export async function executeNewsBulk(
  action: NewsBulkAction,
  rawIds: unknown,
  deps: NewsBulkDeps,
): Promise<NewsBulkResult> {
  const { ids, skipped } = parseNewsBulkIds(rawIds);
  const done: NewsBulkItemRef[] = [];
  const unpublishedIds: string[] = [];

  if (ids.length === 0) return { done, skipped };

  if (action === "unpublish" && deps.role === "editor") {
    for (const id of ids) {
      const row = await deps.loadNews(id);
      skipped.push({ id, title: row?.title ?? "", reason: "reviewer_required" });
    }
    return { done, skipped };
  }

  if (action === "recycle" && deps.role === "reviewer") {
    for (const id of ids) {
      const row = await deps.loadNews(id);
      skipped.push({ id, title: row?.title ?? "", reason: "not_sa" });
    }
    return { done, skipped };
  }

  if (action === "recycle" && deps.role === "editor") {
    const toRecycle: NewsBulkItemRef[] = [];
    for (const id of ids) {
      const row = await deps.loadNews(id);
      if (!row) {
        skipped.push({ id, title: "", reason: "not_found" });
        continue;
      }
      if (EDITOR_RECYCLE_ELIGIBLE.has(row.status)) {
        toRecycle.push({ id: row.id, title: row.title });
        continue;
      }
      skipped.push({ id, title: row.title, reason: "wrong_status" });
    }
    for (const item of toRecycle) {
      try {
        await deps.recycle(item.id);
        done.push(item);
      } catch (err) {
        skipped.push({ id: item.id, title: item.title, ...skipReasonFromError(err) });
      }
    }
    return { done, skipped };
  }

  const toRecycle: NewsBulkItemRef[] = [];

  for (const id of ids) {
    if (action === "unpublish") {
      const row = await deps.loadNews(id);
      if (!row) {
        skipped.push({ id, title: "", reason: "not_found" });
        continue;
      }
      try {
        const item = await deps.unpublishSilent(id);
        done.push(item);
        unpublishedIds.push(id);
      } catch (err) {
        const mapped = skipReasonFromError(err);
        skipped.push({ id, title: row.title, ...mapped });
      }
      continue;
    }

    const row = await deps.loadNews(id);
    if (!row) {
      skipped.push({ id, title: "", reason: "not_found" });
      continue;
    }
    if (row.status === "published") {
      try {
        await deps.unpublishSilent(id);
        unpublishedIds.push(id);
        toRecycle.push({ id: row.id, title: row.title });
      } catch (err) {
        skipped.push({ id, title: row.title, ...skipReasonFromError(err) });
      }
      continue;
    }
    if (SA_RECYCLE_ELIGIBLE.has(row.status)) {
      toRecycle.push({ id: row.id, title: row.title });
      continue;
    }
    skipped.push({ id, title: row.title, reason: "wrong_status" });
  }

  if (unpublishedIds.length > 0) {
    try {
      await deps.rebuildNewsJson();
      if (deps.pruneFeatured) {
        for (const id of unpublishedIds) {
          await deps.pruneFeatured(id);
        }
      }
    } catch (err) {
      if (deps.restoreUnpublished) await deps.restoreUnpublished();
      throw err;
    }
  }

  if (action === "recycle") {
    for (const item of toRecycle) {
      try {
        await deps.recycle(item.id);
        done.push(item);
      } catch (err) {
        skipped.push({ id: item.id, title: item.title, ...skipReasonFromError(err) });
      }
    }
  }

  return { done, skipped };
}

export async function bulkNewsActions(
  user: SessionUser,
  action: NewsBulkAction,
  rawIds: unknown,
): Promise<NewsBulkResult> {
  const snapshots = new Map<string, LiveState>();
  return executeNewsBulk(action, rawIds, {
    role: user.role,
    loadNews: async (id) => {
      const item = await getNewsById(id);
      if (!item) return null;
      return { id: item.id, title: item.title_ar, status: item.status };
    },
    unpublishSilent: async (id) => {
      const before = await captureLiveState(id);
      const item = await unpublishNews(user, id, { notify: false, rebuild: false, prune: false });
      snapshots.set(id, before);
      return { id: item.id, title: item.title_ar };
    },
    recycle: async (id) => {
      await recycleContentItem(user, id);
    },
    rebuildNewsJson: rebuildPublicNewsJson,
    pruneFeatured: pruneFeaturedNewsItem,
    restoreUnpublished: async () => {
      for (const [id, state] of snapshots) {
        await restoreLiveState(id, state);
      }
    },
  });
}

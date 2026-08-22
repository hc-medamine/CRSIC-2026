import type { SessionUser } from "@/lib/auth/session";
import { captureLiveState, restoreLiveState, type LiveState } from "@/lib/publish/safeRebuild";
import { recycleContentItem } from "@/lib/content/recycleBin";
import { getEventById, unpublishEvent } from "@/lib/content/events";
import { getPublicationById, unpublishPublication } from "@/lib/content/publications";
import { rebuildPublicEventsJson } from "@/lib/publish/eventsJson";
import { rebuildPublicPublicationsJson } from "@/lib/publish/publicationsJson";
import {
  executeNewsBulk,
  type NewsBulkAction,
  type NewsBulkResult,
} from "@/lib/content/newsBulk";

type LoadRow = { id: string; title: string; status: string } | null;

async function bulkListActions(
  user: SessionUser,
  action: NewsBulkAction,
  rawIds: unknown,
  opts: {
    load: (id: string) => Promise<LoadRow>;
    unpublishSilent: (id: string) => Promise<{ id: string; title: string }>;
    rebuild: () => Promise<unknown>;
  },
): Promise<NewsBulkResult> {
  const snapshots = new Map<string, LiveState>();
  return executeNewsBulk(action, rawIds, {
    role: user.role,
    loadNews: opts.load,
    unpublishSilent: async (id) => {
      const before = await captureLiveState(id);
      const item = await opts.unpublishSilent(id);
      snapshots.set(id, before);
      return item;
    },
    recycle: async (id) => {
      await recycleContentItem(user, id);
    },
    rebuildNewsJson: async () => {
      await opts.rebuild();
    },
    restoreUnpublished: async () => {
      for (const [id, state] of snapshots) {
        await restoreLiveState(id, state);
      }
    },
  });
}

export async function bulkEventActions(
  user: SessionUser,
  action: NewsBulkAction,
  rawIds: unknown,
): Promise<NewsBulkResult> {
  return bulkListActions(user, action, rawIds, {
    load: async (id) => {
      const item = await getEventById(id);
      if (!item) return null;
      return { id: item.id, title: item.title_ar, status: item.status };
    },
    unpublishSilent: async (id) => {
      const item = await unpublishEvent(user, id, { notify: false, rebuild: false });
      return { id: item.id, title: item.title_ar };
    },
    rebuild: rebuildPublicEventsJson,
  });
}

export async function bulkPublicationActions(
  user: SessionUser,
  action: NewsBulkAction,
  rawIds: unknown,
): Promise<NewsBulkResult> {
  return bulkListActions(user, action, rawIds, {
    load: async (id) => {
      const item = await getPublicationById(id);
      if (!item) return null;
      return { id: item.id, title: item.title_ar, status: item.status };
    },
    unpublishSilent: async (id) => {
      const item = await unpublishPublication(user, id, { notify: false, rebuild: false });
      return { id: item.id, title: item.title_ar };
    },
    rebuild: rebuildPublicPublicationsJson,
  });
}

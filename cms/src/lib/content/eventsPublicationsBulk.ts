import type { SessionUser } from "@/lib/auth/session";
import { captureLiveState, restoreLiveState, type LiveState } from "@/lib/publish/safeRebuild";
import { recycleContentItem } from "@/lib/content/recycleBin";
import { getEventById, unpublishEvent } from "@/lib/content/events";
import { getPublicationById, unpublishPublication } from "@/lib/content/publications";
import { rebuildPublicEventsJson } from "@/lib/publish/eventsJson";
import { rebuildPublicPublicationsJson } from "@/lib/publish/publicationsJson";
import { getPartnerById, unpublishPartner } from "@/lib/content/partners";
import { getAlertById, unpublishAlert } from "@/lib/content/alerts";
import { getLawById, unpublishLaw } from "@/lib/content/laws";
import { getPlatformById, unpublishPlatform } from "@/lib/content/platforms";
import { getResearchGroupById, unpublishResearchGroup } from "@/lib/content/researchGroups";
import { getResearchProjectById, unpublishResearchProject } from "@/lib/content/researchProjects";
import { rebuildPublicPartnersJson } from "@/lib/publish/partnersJson";
import { rebuildPublicAlertsJson } from "@/lib/publish/alertsJson";
import { rebuildPublicLawsJson } from "@/lib/publish/lawsJson";
import { rebuildPublicPlatformsJson } from "@/lib/publish/platformsJson";
import { rebuildPublicResearchGroupsJson } from "@/lib/publish/researchGroupsJson";
import { rebuildPublicResearchProjectsJson } from "@/lib/publish/researchProjectsJson";
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

function rowFrom(item: { id: string; title_ar: string; status: string } | null): LoadRow {
  if (!item) return null;
  return { id: item.id, title: item.title_ar, status: item.status };
}

export async function bulkPartnerActions(user: SessionUser, action: NewsBulkAction, rawIds: unknown) {
  return bulkListActions(user, action, rawIds, {
    load: async (id) => rowFrom(await getPartnerById(id)),
    unpublishSilent: async (id) => {
      const item = await unpublishPartner(user, id, { notify: false, rebuild: false });
      return { id: item.id, title: item.title_ar };
    },
    rebuild: rebuildPublicPartnersJson,
  });
}

export async function bulkAlertActions(user: SessionUser, action: NewsBulkAction, rawIds: unknown) {
  return bulkListActions(user, action, rawIds, {
    load: async (id) => rowFrom(await getAlertById(id)),
    unpublishSilent: async (id) => {
      const item = await unpublishAlert(user, id, { notify: false, rebuild: false });
      return { id: item.id, title: item.title_ar };
    },
    rebuild: rebuildPublicAlertsJson,
  });
}

export async function bulkLawActions(user: SessionUser, action: NewsBulkAction, rawIds: unknown) {
  return bulkListActions(user, action, rawIds, {
    load: async (id) => rowFrom(await getLawById(id)),
    unpublishSilent: async (id) => {
      const item = await unpublishLaw(user, id, { notify: false, rebuild: false });
      return { id: item.id, title: item.title_ar };
    },
    rebuild: rebuildPublicLawsJson,
  });
}

export async function bulkPlatformActions(user: SessionUser, action: NewsBulkAction, rawIds: unknown) {
  return bulkListActions(user, action, rawIds, {
    load: async (id) => rowFrom(await getPlatformById(id)),
    unpublishSilent: async (id) => {
      const item = await unpublishPlatform(user, id, { notify: false, rebuild: false });
      return { id: item.id, title: item.title_ar };
    },
    rebuild: rebuildPublicPlatformsJson,
  });
}

export async function bulkResearchGroupActions(user: SessionUser, action: NewsBulkAction, rawIds: unknown) {
  return bulkListActions(user, action, rawIds, {
    load: async (id) => rowFrom(await getResearchGroupById(id)),
    unpublishSilent: async (id) => {
      const item = await unpublishResearchGroup(user, id, { notify: false, rebuild: false });
      return { id: item.id, title: item.title_ar };
    },
    rebuild: rebuildPublicResearchGroupsJson,
  });
}

export async function bulkResearchProjectActions(user: SessionUser, action: NewsBulkAction, rawIds: unknown) {
  return bulkListActions(user, action, rawIds, {
    load: async (id) => rowFrom(await getResearchProjectById(id)),
    unpublishSilent: async (id) => {
      const item = await unpublishResearchProject(user, id, { notify: false, rebuild: false });
      return { id: item.id, title: item.title_ar };
    },
    rebuild: rebuildPublicResearchProjectsJson,
  });
}

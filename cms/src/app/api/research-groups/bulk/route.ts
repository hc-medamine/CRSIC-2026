import { createBulkPostHandler } from "@/lib/content/bulkHttp";
import { bulkResearchGroupActions } from "@/lib/content/eventsPublicationsBulk";

export const runtime = "nodejs";

export const POST = createBulkPostHandler(bulkResearchGroupActions);

import { createBulkPostHandler } from "@/lib/content/bulkHttp";
import { bulkAlertActions } from "@/lib/content/eventsPublicationsBulk";

export const runtime = "nodejs";

export const POST = createBulkPostHandler(bulkAlertActions);

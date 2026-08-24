import { createBulkPostHandler } from "@/lib/content/bulkHttp";
import { bulkPublicationActions } from "@/lib/content/eventsPublicationsBulk";

export const runtime = "nodejs";

export const POST = createBulkPostHandler(bulkPublicationActions, "publication");

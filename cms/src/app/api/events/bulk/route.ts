import { createBulkPostHandler } from "@/lib/content/bulkHttp";
import { bulkEventActions } from "@/lib/content/eventsPublicationsBulk";

export const runtime = "nodejs";

export const POST = createBulkPostHandler(bulkEventActions);

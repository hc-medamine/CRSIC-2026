import { createBulkPostHandler } from "@/lib/content/bulkHttp";
import { bulkPlatformActions } from "@/lib/content/eventsPublicationsBulk";

export const runtime = "nodejs";

export const POST = createBulkPostHandler(bulkPlatformActions, "platform");

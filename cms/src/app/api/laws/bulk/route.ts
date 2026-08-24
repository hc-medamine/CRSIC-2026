import { createBulkPostHandler } from "@/lib/content/bulkHttp";
import { bulkLawActions } from "@/lib/content/eventsPublicationsBulk";

export const runtime = "nodejs";

export const POST = createBulkPostHandler(bulkLawActions, "law");

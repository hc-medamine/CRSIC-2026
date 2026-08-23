import { createBulkPostHandler } from "@/lib/content/bulkHttp";
import { bulkPartnerActions } from "@/lib/content/eventsPublicationsBulk";

export const runtime = "nodejs";

export const POST = createBulkPostHandler(bulkPartnerActions, "partner");

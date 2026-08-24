import { createBulkPostHandler } from "@/lib/content/bulkHttp";
import { bulkResearchProjectActions } from "@/lib/content/eventsPublicationsBulk";

export const runtime = "nodejs";

export const POST = createBulkPostHandler(bulkResearchProjectActions, "research_project");

import { createBulkPostHandler } from "@/lib/content/bulkHttp";
import { bulkNewsActions } from "@/lib/content/newsBulk";

export const runtime = "nodejs";

export const POST = createBulkPostHandler(bulkNewsActions);

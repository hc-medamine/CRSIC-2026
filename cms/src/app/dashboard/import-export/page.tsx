import { requireSuperAdmin } from "@/lib/users";
import { ImportExportClient } from "./import-export-client";

export default async function ImportExportPage() {
  await requireSuperAdmin();
  return <ImportExportClient />;
}

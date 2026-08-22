import { requireSuperAdmin } from "@/lib/users";
import { listRecycleBin, toRecycleBinClientRows } from "@/lib/content/recycleBin";
import { RecycleBinClient } from "./recycle-bin-client";

export default async function RecycleBinPage() {
  const user = await requireSuperAdmin();
  const listed = await listRecycleBin(user);

  return (
    <RecycleBinClient
      initialItems={toRecycleBinClientRows(listed.items)}
      initialStaleIds={listed.staleIds}
    />
  );
}

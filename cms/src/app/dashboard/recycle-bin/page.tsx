import { requireEditorOrSuperAdmin } from "@/lib/users";
import { canManageRecycleBin, listRecycleBin, toRecycleBinClientRows } from "@/lib/content/recycleBin";
import { RecycleBinClient } from "./recycle-bin-client";

export default async function RecycleBinPage() {
  const user = await requireEditorOrSuperAdmin();
  const listed = await listRecycleBin(user);
  const canManage = canManageRecycleBin(user);

  return (
    <RecycleBinClient
      initialItems={toRecycleBinClientRows(listed.items)}
      initialStaleIds={canManage ? listed.staleIds : []}
      canManageBin={canManage}
    />
  );
}

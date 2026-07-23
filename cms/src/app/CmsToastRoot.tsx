"use client";

import { CmsToastHost } from "@/app/dashboard/cms-toast";

/** Client boundary so the root layout can mount the toast host. */
export function CmsToastRoot() {
  return <CmsToastHost />;
}

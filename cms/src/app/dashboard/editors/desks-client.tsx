"use client";

import { useState } from "react";
import { EditorsScopeManager } from "./editors-scope-manager";
import { AuthorshipClient, type AlignPreviewView } from "@/app/dashboard/authorship/authorship-client";
import { t } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";
import type { EditorContentTypeClaim, ManagedUser, OrgUnit } from "@/lib/users";

type Props = {
  initialEditors: ManagedUser[];
  initialOrgUnits: OrgUnit[];
  initialClaims: EditorContentTypeClaim[];
  actorRole: "reviewer" | "super_admin";
  initialAlign: AlignPreviewView;
};

function StepHeading({
  step,
  title,
  hint,
}: {
  step: number;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crs-primary text-xs font-semibold text-white">
        {step}
      </span>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-crs-ink">{title}</h2>
        <p className="mt-0.5 text-sm text-crs-muted">{hint}</p>
      </div>
    </div>
  );
}

export function DesksClient({
  initialEditors,
  initialOrgUnits,
  initialClaims,
  actorRole,
  initialAlign,
}: Props) {
  const lang = useCmsLang();
  const [desksDirty, setDesksDirty] = useState(false);
  const [align, setAlign] = useState(initialAlign);
  const [alignEpoch, setAlignEpoch] = useState(0);

  async function reloadAlign() {
    const res = await fetch("/api/authorship");
    const data = (await res.json()) as { ok: boolean; preview?: AlignPreviewView };
    if (data.ok && data.preview) {
      setAlign(data.preview);
      setAlignEpoch((n) => n + 1);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <StepHeading
          step={1}
          title={t("desksSectionDesks", lang)}
          hint={t("desksSectionDesksHint", lang)}
        />
        <EditorsScopeManager
          initialEditors={initialEditors}
          initialOrgUnits={initialOrgUnits}
          initialClaims={initialClaims}
          actorRole={actorRole}
          onDirtyChange={setDesksDirty}
          onSaved={reloadAlign}
        />
      </section>

      <section className="flex flex-col gap-4">
        <StepHeading
          step={2}
          title={t("desksSectionAlign", lang)}
          hint={t("desksSectionAlignHint", lang)}
        />
        <AuthorshipClient key={alignEpoch} initial={align} desksDirty={desksDirty} />
      </section>
    </div>
  );
}

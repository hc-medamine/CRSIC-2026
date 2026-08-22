"use client";

import { useEffect, useState } from "react";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { useRouter } from "next/navigation";
import { t, localizedDisplayName, roleLabel } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

type Eligible = {
  id: string;
  display_name: string;
  name_ar: string | null;
  name_en: string | null;
  email: string;
  role: string;
};

type Props = {
  contentItemId: string;
  orgUnitId: string;
  currentPublisherId: string | null;
  currentPublisherName: string | null;
  canEdit: boolean;
};

export function PublisherPanel({
  contentItemId,
  orgUnitId,
  currentPublisherId,
  currentPublisherName,
  canEdit,
}: Props) {
  const lang = useCmsLang();
  const router = useRouter();
  const [users, setUsers] = useState<Eligible[]>([]);
  const [target, setTarget] = useState(currentPublisherId ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canEdit) return;
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/content/publisher?orgUnitId=${encodeURIComponent(orgUnitId)}`);
      const data = (await res.json()) as { ok: boolean; users?: Eligible[] };
      if (!cancelled && data.ok && data.users) setUsers(data.users);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [canEdit, orgUnitId]);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/content/publisher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentItemId,
          publisherId: target || null,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; rebuildError?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? t("publisherSaveFailed", lang);
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      if (data.rebuildError) {
        setError(data.rebuildError);
        cmsToast.error(data.rebuildError);
      } else {
        cmsToast.success(t("publisherSaved", lang));
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-2 rounded-2xl border border-crs-border bg-crs-surface p-5 shadow-[var(--crs-shadow-soft)]">
      <h2 className="text-lg font-medium text-crs-ink">{t("publisherTitle", lang)}</h2>
      <p className="text-xs text-crs-muted">{t("publisherHint", lang)}</p>
      <p className="text-sm text-crs-ink/90">
        {t("publisherCurrent", lang)}: <strong>{currentPublisherName ?? t("publisherFallbackName", lang)}</strong>
      </p>
      {users.length === 0 ? <p className="text-sm text-crs-muted">{t("publisherEmptyEligible", lang)}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
          >
            <option value="">{t("publisherUseFallback", lang)}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {localizedDisplayName(
                  { displayName: u.display_name, nameAr: u.name_ar, nameEn: u.name_en },
                  lang,
                )}{" "}
                ({roleLabel(u.role, lang)})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending}
            onClick={() => void save()}
            className="inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-60"
          >
            {pending ? t("actionSaving", lang) : t("publisherSave", lang)}
          </button>
        </div>
      ) : null}
    </section>
  );
}

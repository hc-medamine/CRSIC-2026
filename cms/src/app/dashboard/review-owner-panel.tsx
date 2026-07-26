"use client";

import { useCallback, useEffect, useState } from "react";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { useRouter } from "next/navigation";
import { t, tf, localizedDisplayName, roleLabel } from "@/lib/i18n/labels";
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
  canPropose: boolean;
  canConfirm: boolean;
  reviewOwnerName: string | null;
  proposedOwnerName: string | null;
  proposedByName: string | null;
};

export function ReviewOwnerPanel({
  contentItemId,
  canPropose,
  canConfirm,
  reviewOwnerName,
  proposedOwnerName,
  proposedByName,
}: Props) {
  const lang = useCmsLang();
  const router = useRouter();
  const [users, setUsers] = useState<Eligible[]>([]);
  const [target, setTarget] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canPropose && !canConfirm) return;
    const res = await fetch("/api/content/review-owner?kind=eligible");
    const data = (await res.json()) as { ok: boolean; users?: Eligible[] };
    if (data.ok && data.users) setUsers(data.users);
  }, [canPropose, canConfirm]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: string, extra?: Record<string, unknown>) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/content/review-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, contentItemId, ...extra }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? t("actionFailedShort", lang);
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      const msg =
        action === "propose" ? t("reviewOwnerProposedOk", lang) : t("reviewOwnerSaved", lang);
      setMessage(msg);
      cmsToast.success(msg);
      setTarget("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!canPropose && !canConfirm && !reviewOwnerName && !proposedOwnerName) {
    return null;
  }

  return (
    <section className="grid gap-2 rounded-2xl border border-crs-border bg-crs-surface p-4 shadow-sm">
      <h2 className="text-lg font-medium text-crs-ink">{t("reviewOwnerTitle", lang)}</h2>
      <p className="text-xs text-crs-muted">{t("reviewOwnerHint", lang)}</p>
      <p className="text-sm text-crs-ink/90">
        {t("reviewOwnerCurrent", lang)}: <strong>{reviewOwnerName ?? "—"}</strong>
        {proposedOwnerName ? (
          <>
            {" "}
            · {t("reviewOwnerPending", lang)}: <strong>{proposedOwnerName}</strong>
            {proposedByName ? ` (${tf("reviewOwnerBy", lang, { name: proposedByName })})` : ""}
          </>
        ) : null}
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}

      {canPropose ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
          >
            <option value="">{t("reviewOwnerSelect", lang)}</option>
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
            disabled={pending || !target}
            onClick={() => void run("propose", { newOwnerId: target })}
            className="inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-60"
          >
            {pending
              ? t("actionSaving", lang)
              : canConfirm
                ? t("reviewOwnerSet", lang)
                : t("reviewOwnerPropose", lang)}
          </button>
        </div>
      ) : null}

      {canConfirm && proposedOwnerName ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => void run("confirm")}
            className="rounded-lg bg-crs-primary hover:bg-crs-secondary px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {t("reviewOwnerConfirm", lang)}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void run("reject")}
            className="inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-60"
          >
            {t("reviewOwnerReject", lang)}
          </button>
        </div>
      ) : null}
    </section>
  );
}

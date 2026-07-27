"use client";

import { useEffect, useState } from "react";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { useRouter } from "next/navigation";
import { t, localizedDisplayName, roleLabel } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

type ContentType =
  | "news"
  | "event"
  | "publication"
  | "partner"
  | "alert"
  | "research_group"
  | "research_project"
  | "law"
  | "platform";

type AssignableUser = {
  id: string;
  display_name: string;
  name_ar: string | null;
  name_en: string | null;
  email: string;
  role: string;
};

type Props = {
  contentItemId: string;
  contentType: ContentType;
  currentAuthorId: string;
};

function apiSegment(type: ContentType): string {
  if (type === "news") return "news";
  if (type === "event") return "events";
  if (type === "publication") return "publications";
  if (type === "partner") return "partners";
  if (type === "research_group") return "research-groups";
  if (type === "research_project") return "research-projects";
  return "alerts";
}

export function ReassignAuthor({ contentItemId, contentType, currentAuthorId }: Props) {
  const lang = useCmsLang();
  const router = useRouter();
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [target, setTarget] = useState<string>("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/content/assignable-users");
      const data = (await res.json()) as { ok: boolean; users?: AssignableUser[] };
      if (!cancelled && data.ok && data.users) setUsers(data.users);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function reassign() {
    if (!target) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/${apiSegment(contentType)}/${contentItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reassign", newUserId: target }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? t("reassignFailed", lang);
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      setMessage(t("reassignSuccess", lang));
      cmsToast.success(t("reassignSuccess", lang));
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-2 rounded-2xl border border-crs-border bg-crs-surface p-4 shadow-sm">
      <h2 className="text-lg font-medium text-crs-ink">{t("reassignAuthor", lang)}</h2>
      <p className="text-xs text-crs-muted">{t("reassignHint", lang)}</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
        >
          <option value="">{t("reassignSelectUser", lang)}</option>
          {users.map((u) => (
            <option key={u.id} value={u.id} disabled={u.id === currentAuthorId}>
              {localizedDisplayName(
                { displayName: u.display_name, nameAr: u.name_ar, nameEn: u.name_en },
                lang,
              )}{" "}
              ({roleLabel(u.role, lang)})
              {u.id === currentAuthorId ? t("reassignCurrentSuffix", lang) : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending || !target}
          onClick={() => void reassign()}
          className="inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-60"
        >
          {pending ? t("reassignPending", lang) : t("reassignAction", lang)}
        </button>
      </div>
    </section>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { FormBanner } from "@/app/dashboard/form-ux";

type Props = {
  initial: {
    email: string;
    displayName: string;
    nameAr: string;
    nameEn: string;
    role: string;
  };
};

export function ProfileForm({ initial }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [nameAr, setNameAr] = useState(initial.nameAr);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, nameAr, nameEn }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? "Update failed";
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      setMessage("Profile saved.");
      cmsToast.success("Profile saved.");
      router.refresh();
    } catch {
      setError("Network error");
      cmsToast.error("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="cms-form flex flex-col gap-4 rounded-2xl border border-crs-border bg-crs-surface p-6 shadow-sm"
    >
      <label className="text-sm">
        <span className="font-medium text-crs-ink">Email (login — read only)</span>
        <input
          value={initial.email}
          readOnly
          className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-bg px-3 py-2 text-crs-muted"
        />
      </label>
      <label className="text-sm">
        <span className="font-medium text-crs-ink">Role (read only)</span>
        <input
          value={initial.role}
          readOnly
          className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-bg px-3 py-2 text-crs-muted"
        />
      </label>
      <label className="text-sm">
        <span className="font-medium text-crs-ink">Display name</span>
        <input
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-crs-ink"
        />
      </label>
      <label className="text-sm">
        <span className="font-medium text-crs-ink">Name (AR)</span>
        <input
          dir="rtl"
          value={nameAr}
          onChange={(e) => setNameAr(e.target.value)}
          className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-crs-ink"
        />
      </label>
      <label className="text-sm">
        <span className="font-medium text-crs-ink">Name (EN)</span>
        <input
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-crs-ink"
        />
      </label>

      {error ? <FormBanner kind="error">{error}</FormBanner> : null}
      {message ? <FormBanner kind="success">{message}</FormBanner> : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-fit items-center rounded-xl bg-crs-primary px-4 py-2 text-sm font-medium text-white hover:bg-crs-secondary disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

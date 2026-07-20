"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
        setError(data.error ?? "Update failed");
        return;
      }
      setMessage("Profile saved.");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <label className="text-sm">
        <span className="font-medium text-zinc-700">Email (login — read only)</span>
        <input
          value={initial.email}
          readOnly
          className="mt-1 w-full rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-600"
        />
      </label>
      <label className="text-sm">
        <span className="font-medium text-zinc-700">Role (read only)</span>
        <input
          value={initial.role}
          readOnly
          className="mt-1 w-full rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-600"
        />
      </label>
      <label className="text-sm">
        <span className="font-medium text-zinc-700">Display name</span>
        <input
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="text-sm">
        <span className="font-medium text-zinc-700">Name (AR)</span>
        <input
          dir="rtl"
          value={nameAr}
          onChange={(e) => setNameAr(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="text-sm">
        <span className="font-medium text-zinc-700">Name (EN)</span>
        <input
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

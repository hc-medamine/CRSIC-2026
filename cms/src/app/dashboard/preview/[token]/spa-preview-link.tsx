"use client";

import { useEffect, useState } from "react";

type Props = {
  spaUrl: string;
};

/** Only show the SPA preview link when the public origin responds. */
export function SpaPreviewLink({ spaUrl }: Props) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const origin = (() => {
      try {
        return new URL(spaUrl).origin;
      } catch {
        return null;
      }
    })();
    if (!origin) {
      setOk(false);
      return;
    }

    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 1500);

    fetch(origin + "/", { method: "GET", mode: "no-cors", signal: ctrl.signal })
      .then(() => {
        if (!cancelled) setOk(true);
      })
      .catch(() => {
        if (!cancelled) setOk(false);
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      cancelled = true;
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [spaUrl]);

  if (ok !== true) {
    if (ok === false) {
      return (
        <p className="text-xs text-crs-muted">
          Public site not running at this origin. Start the SPA (e.g.{" "}
          <code className="text-[11px]">npm run spa</code> from the repo root) to use the SPA tab.
        </p>
      );
    }
    return null;
  }

  return (
    <a
      href={spaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-xs text-crs-ink hover:bg-crs-bg"
    >
      Open on public site
    </a>
  );
}

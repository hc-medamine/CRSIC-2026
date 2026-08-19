"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import { t, type CmsLang } from "@/lib/i18n/labels";

type FlagStore = {
  subscribe: (cb: () => void) => () => void;
  getSnapshot: () => boolean;
  set: (next: boolean) => void;
};

function makeFlagStore(read: () => boolean): FlagStore {
  const listeners = new Set<() => void>();
  let value: boolean | null = null;
  return {
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnapshot() {
      if (value === null) value = read();
      return value;
    },
    set(next) {
      value = next;
      listeners.forEach((cb) => cb());
    },
  };
}

function sessionFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** Session-scoped toggle — the onboarding can be shown again, it is never permanently dismissed. */
const ONBOARDING_KEY = "cms_onboarding_hidden";

const ONBOARDING_STORE = makeFlagStore(() => sessionFlag(ONBOARDING_KEY));

function useFlag(store: FlagStore): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(store.subscribe, store.getSnapshot, () => false);
  return [value, store.set];
}

export function HomeOnboarding({ lang }: { lang: CmsLang }) {
  const [hidden, setHidden] = useFlag(ONBOARDING_STORE);

  if (hidden) {
    return (
      <button
        type="button"
        className="self-start text-xs text-crs-muted underline hover:text-crs-ink"
        onClick={() => {
          try {
            sessionStorage.removeItem(ONBOARDING_KEY);
          } catch {
            /* ignore */
          }
          setHidden(false);
        }}
      >
        {t("onboardingShow", lang)}
      </button>
    );
  }

  return (
    <section className="rounded-2xl border border-crs-primary/20 bg-gradient-to-br from-crs-primary/10 via-crs-surface to-crs-accent/10 p-5 shadow-[var(--crs-shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-crs-ink">{t("onboardingTitle", lang)}</h2>
          <p className="mt-1 text-sm text-crs-muted">{t("onboardingSubtitle", lang)}</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-xl border border-crs-primary/30 bg-crs-surface px-4 py-2 text-sm font-medium text-crs-primary hover:bg-crs-bg"
          onClick={() => {
            try {
              sessionStorage.setItem(ONBOARDING_KEY, "1");
            } catch {
              /* ignore */
            }
            setHidden(true);
          }}
        >
          {t("onboardingGotIt", lang)}
        </button>
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-3">
        {[t("onboardingStep1", lang), t("onboardingStep2", lang), t("onboardingStep3", lang)].map(
          (step, i) => (
            <li
              key={step}
              className="cms-row-enter flex items-center gap-3 rounded-xl border border-crs-border bg-crs-surface/80 px-4 py-3 text-sm text-crs-ink"
              style={{ "--row-delay": `${i * 90}ms` } as CSSProperties}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-crs-primary/15 text-xs font-semibold text-crs-primary">
                {i + 1}
              </span>
              {step}
            </li>
          ),
        )}
      </ol>
    </section>
  );
}

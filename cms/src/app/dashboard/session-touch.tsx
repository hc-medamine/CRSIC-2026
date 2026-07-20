"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Keeps idle timeout fresh; cookie writes must happen in a Route Handler. */
export function SessionTouch() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function touch() {
      const res = await fetch("/api/auth/touch", { method: "POST" });
      if (cancelled) return;
      if (res.status === 401) {
        router.replace("/login");
      }
    }

    void touch();
    const id = window.setInterval(() => void touch(), 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [router]);

  return null;
}

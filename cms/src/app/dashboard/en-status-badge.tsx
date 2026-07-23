/** Visual EN pending / ready badge (PRD D — authoring quality pack). */
export function EnStatusBadge({
  status,
}: {
  status: "pending" | "ready" | string | null | undefined;
}) {
  if (!status) return null;
  const pending = status === "pending";
  return (
    <span
      className={
        pending
          ? "inline-flex rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-900"
          : "inline-flex rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-900"
      }
    >
      {pending ? "EN pending" : "EN ready"}
    </span>
  );
}

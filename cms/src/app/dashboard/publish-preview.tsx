"use client";

/**
 * Read-only preview of the P1 public card fields, shown near the Publish button so the
 * reviewer sees exactly what will be written to the public JSON.
 */

type NewsPreview = { kind: "news"; img: string; label: string; title: string };
type EventPreview = {
  kind: "event";
  day: string;
  month: string;
  year: string;
  title: string;
  type: string;
  status: string;
  img?: string;
};
type PublicationPreview = {
  kind: "publication";
  cover: string;
  title: string;
  type: string;
  dept: string;
  desc: string;
};

type Props = NewsPreview | EventPreview | PublicationPreview;

function Thumb({ path, alt }: { path: string; alt: string }) {
  if (!path) {
    return (
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded bg-zinc-100 text-[10px] text-zinc-400">
        no image
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/${path.replace(/^\/+/, "")}`}
      alt={alt}
      className="h-24 w-24 shrink-0 rounded object-cover ring-1 ring-zinc-200"
      onError={(e) => {
        const el = e.currentTarget;
        el.style.display = "none";
        el.insertAdjacentHTML(
          "afterend",
          `<div class="flex h-24 w-24 shrink-0 items-center justify-center rounded bg-zinc-100 text-[10px] text-zinc-400 text-center px-1">${path}</div>`,
        );
      }}
    />
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}: </span>
      <span dir="auto" className="text-zinc-800">
        {value || "—"}
      </span>
    </div>
  );
}

export function PublishPreview(props: Props) {
  return (
    <section className="grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
      <p className="text-sm font-medium text-emerald-900">Public card preview (P1)</p>

      {props.kind === "news" ? (
        <div className="flex gap-3">
          <Thumb path={props.img} alt={props.title} />
          <div className="grid gap-1">
            <Field label="label" value={props.label || "خبر"} />
            <Field label="title" value={props.title} />
          </div>
        </div>
      ) : null}

      {props.kind === "event" ? (
        <div className="flex gap-3">
          {props.img ? <Thumb path={props.img} alt={props.title} /> : null}
          <div className="grid gap-1">
            <Field label="date" value={`${props.day} ${props.month} ${props.year}`.trim()} />
            <Field label="title" value={props.title} />
            <Field label="type" value={props.type} />
            <Field label="status" value={props.status} />
          </div>
        </div>
      ) : null}

      {props.kind === "publication" ? (
        <div className="flex gap-3">
          <Thumb path={props.cover} alt={props.title} />
          <div className="grid gap-1">
            <Field label="title" value={props.title} />
            <Field label="type" value={props.type} />
            <Field label="dept" value={props.dept} />
            <Field label="desc" value={props.desc} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

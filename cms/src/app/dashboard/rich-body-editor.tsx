"use client";

import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import { bodyHtmlForEditor, sanitizeBodyHtml } from "@/lib/content/sanitizeBody";

type Props = {
  label: string;
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  dir?: "rtl" | "ltr" | "auto";
};

/**
 * Minimal rich body editor (PRD B — H1 allowlist).
 * Toolbar uses document.execCommand; server sanitizes on save.
 */
export function RichBodyEditor({ label, value, onChange, disabled, dir = "auto" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);
  const [htmlMode, setHtmlMode] = useState(false);
  const [source, setSource] = useState(value);
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (!ref.current || htmlMode) return;
    if (!seeded.current) {
      ref.current.innerHTML = bodyHtmlForEditor(value);
      seeded.current = true;
      return;
    }
    // External value reset (e.g. form remount / clear)
    if (value !== lastEmitted.current) {
      ref.current.innerHTML = bodyHtmlForEditor(value);
      lastEmitted.current = value;
    }
  }, [value, htmlMode]);

  function emitFromEditable() {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastEmitted.current = html;
    onChange(html);
  }

  function onPaste(e: ClipboardEvent<HTMLDivElement>) {
    if (disabled) return;
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    if (html) {
      document.execCommand("insertHTML", false, sanitizeBodyHtml(html) || "");
    } else {
      document.execCommand("insertText", false, text);
    }
    emitFromEditable();
  }

  function run(cmd: string, arg?: string) {
    if (disabled || htmlMode) return;
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emitFromEditable();
  }

  function insertLink() {
    if (disabled || htmlMode) return;
    const url = window.prompt("Link URL (https://…)");
    if (!url?.trim()) return;
    run("createLink", url.trim());
  }

  function toggleHtmlMode() {
    if (htmlMode) {
      lastEmitted.current = source;
      onChange(source);
      seeded.current = false;
      setHtmlMode(false);
    } else {
      const html = ref.current?.innerHTML ?? value;
      setSource(html);
      setHtmlMode(true);
    }
  }

  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{label}</span>
        <button
          type="button"
          disabled={disabled}
          onClick={toggleHtmlMode}
          className="text-xs underline disabled:opacity-50"
        >
          {htmlMode ? "Visual" : "HTML"}
        </button>
      </div>
      {!htmlMode ? (
        <div className="mt-1 overflow-hidden rounded border border-zinc-300 bg-white">
          <div className="flex flex-wrap gap-1 border-b border-zinc-200 bg-zinc-50 px-2 py-1">
            <ToolbarBtn disabled={disabled} onClick={() => run("bold")} label="B" title="Bold" />
            <ToolbarBtn disabled={disabled} onClick={() => run("italic")} label="I" title="Italic" />
            <ToolbarBtn
              disabled={disabled}
              onClick={() => run("insertUnorderedList")}
              label="• List"
              title="Bullet list"
            />
            <ToolbarBtn
              disabled={disabled}
              onClick={() => run("insertOrderedList")}
              label="1. List"
              title="Numbered list"
            />
            <ToolbarBtn disabled={disabled} onClick={insertLink} label="Link" title="Insert link" />
            <ToolbarBtn
              disabled={disabled}
              onClick={() => run("removeFormat")}
              label="Clear"
              title="Clear formatting"
            />
          </div>
          <div
            ref={ref}
            dir={dir}
            contentEditable={!disabled}
            suppressContentEditableWarning
            className="min-h-[8rem] px-3 py-2 outline-none"
            onInput={emitFromEditable}
            onBlur={emitFromEditable}
            onPaste={onPaste}
          />
        </div>
      ) : (
        <textarea
          dir={dir}
          disabled={disabled}
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            lastEmitted.current = e.target.value;
            onChange(e.target.value);
          }}
          className="mt-1 w-full rounded border px-3 py-2 font-mono text-xs"
          rows={8}
        />
      )}
      <p className="mt-1 text-xs text-zinc-500">
        Allowed: paragraphs, bold/italic, lists, links. Scripts and other tags are stripped on save.
      </p>
    </div>
  );
}

function ToolbarBtn({
  label,
  title,
  onClick,
  disabled,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
    >
      {label}
    </button>
  );
}

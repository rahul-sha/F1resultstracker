"use client";

import { useEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { ShareIcon, DownloadIcon, CopyIcon } from "./nav-icons";

type Status = { kind: "idle" } | { kind: "busy" } | { kind: "done"; message: string } | { kind: "error"; message: string };

// Everything inside the captured section gets rendered as-is, except any
// node carrying this attribute (the share button and its menu) — without
// excluding it, the button would capture itself.
const IGNORE_ATTR = "data-share-ignore";

async function captureSection(targetId: string): Promise<Blob> {
  const node = document.getElementById(targetId);
  if (!node) throw new Error("Could not find that section on the page.");

  const surface = getComputedStyle(document.documentElement).getPropertyValue("--surface-1").trim() || "#ffffff";

  const blob = await toBlob(node, {
    backgroundColor: surface,
    pixelRatio: 2,
    filter: (domNode) => !(domNode instanceof Element && domNode.hasAttribute(IGNORE_ATTR)),
  });
  if (!blob) throw new Error("Could not create an image from that section.");
  return blob;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ShareButton({
  targetId,
  fileName,
  label,
}: {
  /** id of the element to capture — the section/graphic this button sits beside. */
  targetId: string;
  /** file name to save as, without extension. */
  fileName: string;
  /** short description of the graphic, used in the button's aria-label and share text. */
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [canCopyImages, setCanCopyImages] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Feature support varies by browser; only shown once we know it'll work,
    // same mount-detection pattern used by the theme/accent toggles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShareFiles(
      typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [new File([], "test.png", { type: "image/png" })] }),
    );
    setCanCopyImages(typeof window !== "undefined" && "ClipboardItem" in window && !!navigator.clipboard?.write);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (status.kind !== "done" && status.kind !== "error") return;
    const timer = setTimeout(() => setStatus({ kind: "idle" }), 2500);
    return () => clearTimeout(timer);
  }, [status]);

  async function handleSave() {
    setStatus({ kind: "busy" });
    try {
      const blob = await captureSection(targetId);
      downloadBlob(blob, `${fileName}.png`);
      setStatus({ kind: "done", message: "Saved" });
    } catch {
      setStatus({ kind: "error", message: "Couldn't save the image" });
    }
  }

  async function handleCopy() {
    setStatus({ kind: "busy" });
    try {
      const blob = await captureSection(targetId);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setStatus({ kind: "done", message: "Copied" });
    } catch {
      setStatus({ kind: "error", message: "Couldn't copy — try Save instead" });
    }
  }

  async function handleShare() {
    setStatus({ kind: "busy" });
    try {
      const blob = await captureSection(targetId);
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });
      await navigator.share({ files: [file], title: label, text: label });
      setStatus({ kind: "idle" });
    } catch (err) {
      // The share sheet being dismissed by the person throws an AbortError — not a failure.
      if (err instanceof Error && err.name === "AbortError") {
        setStatus({ kind: "idle" });
      } else {
        setStatus({ kind: "error", message: "Couldn't open the share sheet" });
      }
    }
  }

  return (
    <div ref={containerRef} {...{ [IGNORE_ATTR]: "true" }} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Share ${label}`}
        aria-expanded={open}
        className="flex items-center justify-center rounded-full"
        style={{ background: "var(--surface-3)", color: "var(--text-secondary)", width: 30, height: 30 }}
      >
        <ShareIcon />
      </button>

      {open && (
        <div
          className="absolute top-9 right-0 z-10 flex flex-col gap-0.5 rounded-2xl p-1.5"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border-hairline)", boxShadow: "0 8px 24px rgba(0,0,0,0.25)", width: 190 }}
        >
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs"
            style={{ color: "var(--text-primary)" }}
          >
            <DownloadIcon size={15} />
            Save image
          </button>

          {canCopyImages && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs"
              style={{ color: "var(--text-primary)" }}
            >
              <CopyIcon size={15} />
              Copy image
            </button>
          )}

          {canShareFiles && (
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs"
              style={{ color: "var(--text-primary)" }}
            >
              <ShareIcon size={15} />
              Share…
            </button>
          )}

          {status.kind === "done" && (
            <div className="px-2.5 py-1 text-xs" style={{ color: "var(--accent)" }}>
              {status.message}
            </div>
          )}
          {status.kind === "error" && (
            <div className="px-2.5 py-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              {status.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

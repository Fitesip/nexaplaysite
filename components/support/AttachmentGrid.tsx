import type { Attachment } from "./types";

/** Renders a message's media attachments (images inline, everything else as a download chip). */
export default function AttachmentGrid({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((a, i) =>
        a.mime.startsWith("image/") ? (
          <a key={i} href={a.url} target="_blank" rel="noreferrer" className="block h-20 w-20 shrink-0 overflow-hidden border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.url}
              alt={a.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </a>
        ) : a.mime.startsWith("video/") ? (
          <video key={i} src={a.url} controls preload="metadata" className="h-32 max-w-full border border-white/10" />
        ) : (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 border border-white/10 bg-black/20 px-2.5 py-1.5 text-[11px] text-cyan-300 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5 shrink-0">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="max-w-[10rem] truncate">{a.name}</span>
          </a>
        )
      )}
    </div>
  );
}

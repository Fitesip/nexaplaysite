import type { ReactNode } from "react";

/** Small labeled-field wrapper used throughout the admin forms (catalog/news editors). */
export default function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-[var(--color-mist)]">{label}</span>
      {children}
    </label>
  );
}

/**
 * Distinct backdrop for the admin/helper panel: a calm slate/emerald "dashboard" look —
 * fine technical grid plus slowly drifting soft glow orbs. Deliberately a different visual
 * language from `PixelBackground`'s violet/cyan drifting cubes, so staff mode still reads
 * as a separate control surface at a glance, without the harsher red radar-sweep motif.
 */
export default function AdminBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[var(--color-void)]">
      {/* faint technical grid, slate/emerald instead of the site's violet/cyan */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(52,211,153,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.5) 1px, transparent 1px)",
          backgroundSize: "38px 38px",
        }}
      />

      {/* slowly drifting soft glow orbs that also cycle color via hue-rotate */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: "48vmax",
          height: "48vmax",
          left: "-10vmax",
          top: "-14vmax",
          background: "radial-gradient(circle, rgba(16,185,129,0.16), transparent 70%)",
          animation: "adminDrift1 22s ease-in-out infinite, adminHue1 36s linear infinite",
        }}
      />
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: "40vmax",
          height: "40vmax",
          right: "-8vmax",
          bottom: "-10vmax",
          background: "radial-gradient(circle, rgba(100,116,139,0.18), transparent 70%)",
          animation: "adminDrift2 26s ease-in-out infinite, adminHue2 44s linear infinite",
        }}
      />
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: "30vmax",
          height: "30vmax",
          left: "35vmax",
          top: "20vmax",
          background: "radial-gradient(circle, rgba(45,212,191,0.12), transparent 70%)",
          animation: "adminDrift3 30s ease-in-out infinite, adminHue3 50s linear infinite",
        }}
      />

      <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-void" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/40 via-transparent to-emerald-950/20" />
    </div>
  );
}

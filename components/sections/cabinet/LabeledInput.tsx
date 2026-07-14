/**
 * A plain text/password/email input with a label above it, styled to match the
 * site's form fields. Shared by the auth forms and the change-password form so
 * the look stays consistent without repeating the markup everywhere.
 */
export default function LabeledInput({
  label,
  name,
  type = "text",
  required,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-[var(--color-mist)]">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        className="border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors duration-300 focus:border-cyan-400/60"
      />
    </div>
  );
}

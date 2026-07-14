"use client";

import { useState, FormEvent } from "react";
import LabeledInput from "./LabeledInput";

/**
 * Collapsible "Сменить пароль" card. Closed by default; expanding it reveals a
 * small form that posts current + new password to /api/auth/change-password.
 */
export default function ChangePasswordForm() {
  const [openForm, setOpenForm] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setError("");
    const form = e.currentTarget;
    const currentPassword = (form.elements.namedItem("currentPassword") as HTMLInputElement).value;
    const newPassword = (form.elements.namedItem("newPassword") as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

    if (newPassword !== confirmPassword) {
      setStatus("error");
      setError("Новые пароли не совпадают");
      return;
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  return (
    <div className="glass-panel pixel-corner mt-6 p-6">
      <button onClick={() => setOpenForm((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="font-[var(--font-display)] text-base font-semibold text-white">Сменить пароль</span>
        <span
          className={`font-[var(--font-mono)] text-xl text-cyan-300 transition-transform duration-500 ${
            openForm ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>

      {/* grid-rows trick animates height between 0 and auto without knowing the content's height */}
      <div
        className="grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateRows: openForm ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <form onSubmit={submit} className="mt-5 flex flex-col gap-4 text-left">
            <LabeledInput label="Текущий пароль" name="currentPassword" type="password" required minLength={6} />
            <LabeledInput label="Новый пароль" name="newPassword" type="password" required minLength={6} />
            <LabeledInput label="Повторите новый пароль" name="confirmPassword" type="password" required minLength={6} />

            {error && <p className="text-sm text-rose-400">{error}</p>}
            {status === "success" && <p className="text-sm text-cyan-300">Пароль успешно изменён!</p>}

            <button
              disabled={status === "loading"}
              className="pixel-corner mt-1 bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.02] disabled:opacity-60"
            >
              {status === "loading" ? "Сохраняем…" : "Сохранить новый пароль"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

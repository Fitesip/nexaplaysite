"use client";

import { useState, FormEvent } from "react";
import Captcha from "@/components/Captcha";
import LabeledInput from "./LabeledInput";
import type { AuthMode, User } from "./types";

/**
 * Shown instead of the profile card when nobody is logged in. Lets the visitor
 * switch between "Вход" (sign in) and "Регистрация" (sign up) with an animated
 * toggle, and posts to /api/auth/login or /api/auth/register accordingly.
 *
 * If the page was opened with a `?ref=<code>` query param (a referral link),
 * it defaults to the registration form and forwards the code to the API.
 */
export default function AuthPanel({ onAuthed }: { onAuthed: (u: User) => void }) {
  const [mode, setMode] = useState<AuthMode>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("ref")
      ? "register"
      : "login"
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  // bumping this remounts <Captcha>, forcing a fresh challenge after each attempt
  const [captchaKey, setCaptchaKey] = useState(0);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const payload: Record<string, string | boolean> = {
      username: (form.elements.namedItem("username") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
    };
    if (mode === "register") {
      payload.email = (form.elements.namedItem("email") as HTMLInputElement).value;
      payload.captchaAnswer = (form.elements.namedItem("captchaAnswer") as HTMLInputElement).value;
      payload.captchaToken = (form.elements.namedItem("captchaToken") as HTMLInputElement).value;
      payload.consent = consent;
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref) payload.ref = ref;
    }

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      onAuthed(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
      if (mode === "register") setCaptchaKey((k) => k + 1);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="glass-panel pixel-corner relative overflow-hidden p-8">
        {/* toggle switch between "Вход" and "Регистрация" */}
        <div className="relative mx-auto mb-8 flex w-full max-w-xs border border-white/10">
          <div
            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-violet-600 to-cyan-500 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: mode === "login" ? "translateX(0%)" : "translateX(100%)" }}
          />
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`relative z-10 flex-1 py-2 text-sm font-medium transition-colors duration-300 ${
              mode === "login" ? "text-white" : "text-[var(--color-mist)]"
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`relative z-10 flex-1 py-2 text-sm font-medium transition-colors duration-300 ${
              mode === "register" ? "text-white" : "text-[var(--color-mist)]"
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* animated form swap: re-keying on `mode` retriggers the fade/slide-in */}
        <div className="relative">
          <div key={mode} className="section-enter flex flex-col gap-4">
            <h3 className="text-center font-[var(--font-display)] text-xl font-bold text-white">
              {mode === "login" ? "С возвращением" : "Создать аккаунт"}
            </h3>

            <form onSubmit={submit} className="flex flex-col gap-4">
              <LabeledInput label="Никнейм" name="username" required minLength={3} />
              {mode === "register" && <LabeledInput label="Email" name="email" type="email" required />}
              <LabeledInput label="Пароль" name="password" type="password" required minLength={6} />
              {mode === "register" && <Captcha resetSignal={captchaKey} />}

              {mode === "register" && (
                <label className="flex items-start gap-2 text-xs leading-relaxed text-[var(--color-mist)]">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                    className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-500"
                  />
                  <span>
                    Я согласен(на) на обработку персональных данных в соответствии с{" "}
                    <button
                      type="button"
                      onClick={() => {
                        window.location.hash = "privacy";
                      }}
                      className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
                    >
                      Политикой конфиденциальности
                    </button>
                  </span>
                </label>
              )}

              {error && <p className="text-sm text-rose-400">{error}</p>}

              <button
                disabled={loading || (mode === "register" && !consent)}
                className="pixel-corner mt-2 bg-gradient-to-r from-violet-600 to-cyan-500 py-3 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.02] disabled:opacity-60"
              >
                {loading ? "Подождите…" : mode === "login" ? "Войти" : "Зарегистрироваться"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

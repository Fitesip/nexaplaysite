"use client";

/** "Связь" section: a contact form that posts to /api/contact and stores the message in MySQL. */
import { useState, FormEvent } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setError("");
    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      topic: (form.elements.namedItem("topic") as HTMLSelectElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Не удалось отправить сообщение");
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="font-[var(--font-display)] text-4xl font-bold">
        Обратная <span className="grad-text">связь</span>
      </h2>
      <p className="mt-3 text-[var(--color-mist)]">
        Жалобы, идеи, вопросы по донату — напишите нам, отвечаем в течение суток.
      </p>

      <form onSubmit={submit} className="glass-panel pixel-corner mt-8 flex flex-col gap-5 p-6">
        <Field label="Ваш ник или имя" name="name" required />
        <Field label="Email" name="email" type="email" required />
        <div className="flex flex-col gap-2">
          <label className="text-sm text-[var(--color-mist)]">Тема</label>
          <select
            name="topic"
            required
            defaultValue=""
            className="border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors duration-300 focus:border-cyan-400/60"
          >
            <option value="" disabled>
              Выберите тему
            </option>
            <option value="support">Техническая проблема</option>
            <option value="donate">Вопрос по донату</option>
            <option value="report">Жалоба на игрока</option>
            <option value="idea">Предложение / идея</option>
            <option value="other">Другое</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-[var(--color-mist)]">Сообщение</label>
          <textarea
            name="message"
            required
            minLength={10}
            rows={5}
            className="resize-none border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors duration-300 focus:border-cyan-400/60"
            placeholder="Опишите подробно, чтобы мы могли помочь быстрее"
          />
        </div>

        <button
          disabled={status === "loading"}
          className="pixel-corner mt-2 bg-gradient-to-r from-violet-600 to-cyan-500 py-3 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-violet)] transition-transform duration-300 hover:scale-[1.02] disabled:opacity-60"
        >
          {status === "loading" ? "Отправка..." : "Отправить сообщение"}
        </button>

        <div
          className="grid transition-all duration-500"
          style={{ gridTemplateRows: status === "success" || status === "error" ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            {status === "success" && (
              <p className="pt-1 text-sm text-cyan-300">Сообщение отправлено — спасибо, мы скоро ответим!</p>
            )}
            {status === "error" && <p className="pt-1 text-sm text-rose-400">{error}</p>}
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-[var(--color-mist)]">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors duration-300 focus:border-cyan-400/60"
      />
    </div>
  );
}

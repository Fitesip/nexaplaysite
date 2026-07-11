"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { MinecraftText, ampersandToSectionSign, COLOR_CODE_ENTRIES, FORMAT_CODE_ENTRIES } from "@/lib/minecraft-colors";

type Line = { text: string; kind: "input" | "output" | "error" };

const QUICK_COMMANDS = ["list", "say Привет с сайта!", "whitelist list", "tps"];

export default function AdminRcon() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [command, setCommand] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number | null>(null);
  const [showCodes, setShowCodes] = useState(false);
  const [tps, setTps] = useState<{ tps: number } | null>(null);
  const [tpsError, setTpsError] = useState("");
  const [tpsLoading, setTpsLoading] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch("/api/admin/rcon")
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((d) => setConfigured(Boolean(d.configured)))
      .catch(() => setConfigured(false));
  }, []);

  // Загружаем сохранённую историю консоли этого пользователя один раз при открытии вкладки —
  // у каждого сотрудника своя история, она хранится на сервере per user_id.
  useEffect(() => {
    fetch("/api/admin/rcon/history", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { lines: [] }))
      .then((d) => {
        const loaded: Line[] = (d.lines ?? []).map((l: { kind: Line["kind"]; body: string }) => ({
          text: l.body,
          kind: l.kind,
        }));
        setLines(loaded);
        setHistory(loaded.filter((l) => l.kind === "input").map((l) => l.text).slice(-50));
      })
      .catch(() => {})
      .finally(() => setHistoryLoaded(true));
  }, []);

  const clearHistory = async () => {
    if (!confirm("Очистить историю консоли? Действие необратимо.")) return;
    setLines([]);
    setHistory([]);
    try {
      await fetch("/api/admin/rcon/history", { method: "DELETE" });
    } catch {
      // локально всё равно очищено — история просто пересоздастся на сервере со следующей командой
    }
  };

  const loadTps = async () => {
    try {
      const res = await fetch("/api/admin/rcon/tps", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setTps(null);
        setTpsError(data.error ?? "Не удалось получить TPS");
      } else {
        setTps({ tps: data.tps });
        setTpsError("");
      }
    } catch {
      setTps(null);
      setTpsError("Ошибка сети");
    } finally {
      setTpsLoading(false);
    }
  };

  // Автообновление TPS каждые 5 секунд, пока вкладка открыта и RCON настроен.
  useEffect(() => {
    if (configured !== true) return;
    loadTps();
    const t = setInterval(loadTps, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  const run = async (raw: string) => {
    const typed = raw.trim();
    if (!typed || sending) return;
    // "&" -> "§" so admins can type codes with a normal keyboard; server always sees the real code.
    const cmd = ampersandToSectionSign(typed);
    setLines((l) => [...l, { text: cmd, kind: "input" }]);
    setHistory((h) => [...h.filter((c) => c !== typed).slice(-49), typed]);
    setHistoryIdx(null);
    setCommand("");
    setSending(true);
    try {
      const res = await fetch("/api/admin/rcon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLines((l) => [...l, { text: data.error ?? "Ошибка выполнения команды", kind: "error" }]);
        if (res.status === 503) setConfigured(false);
      } else {
        setConfigured(true);
        setLines((l) => [...l, { text: data.output, kind: "output" }]);
      }
    } catch {
      setLines((l) => [...l, { text: "Не удалось отправить команду — проверьте соединение с сайтом", kind: "error" }]);
    } finally {
      setSending(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(command);
  };

  const insertCode = (code: string) => {
    const input = inputRef.current;
    const token = `&${code}`;
    if (!input) {
      setCommand((c) => c + token);
      return;
    }
    const start = input.selectionStart ?? command.length;
    const end = input.selectionEnd ?? command.length;
    const next = command.slice(0, start) + token + command.slice(end);
    setCommand(next);
    requestAnimationFrame(() => {
      input.focus();
      const caret = start + token.length;
      input.setSelectionRange(caret, caret);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (history.length === 0) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIdx = historyIdx === null ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setCommand(history[nextIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx === null) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= history.length) {
        setHistoryIdx(null);
        setCommand("");
      } else {
        setHistoryIdx(nextIdx);
        setCommand(history[nextIdx]);
      }
    }
  };

  return (
    <div className="glass-panel pixel-corner p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-[var(--font-display)] text-lg font-semibold text-white">RCON-консоль</h3>
          <p className="mt-1 text-sm text-[var(--color-mist)]">
            Выполняйте команды на Minecraft-сервере прямо с сайта.
          </p>
        </div>
        <span
          className={`shrink-0 border px-3 py-1.5 text-xs font-medium ${
            configured === null
              ? "border-white/15 text-[var(--color-mist)]"
              : configured
                ? "border-emerald-400/40 text-emerald-300"
                : "border-rose-400/40 text-rose-300"
          }`}
        >
          {configured === null ? "Проверка подключения…" : configured ? "RCON подключён" : "RCON не настроен"}
        </span>
      </div>

      {configured === false && (
        <p className="mt-4 border border-rose-400/30 bg-rose-500/5 p-3 text-sm text-rose-200">
          Добавьте <code className="font-[var(--font-mono)]">RCON_HOST</code>,{" "}
          <code className="font-[var(--font-mono)]">RCON_PORT</code> и{" "}
          <code className="font-[var(--font-mono)]">RCON_PASSWORD</code> в <code className="font-[var(--font-mono)]">.env</code>{" "}
          сайта, а на Minecraft-сервере включите <code className="font-[var(--font-mono)]">enable-rcon=true</code> и
          укажите <code className="font-[var(--font-mono)]">rcon.password</code> в{" "}
          <code className="font-[var(--font-mono)]">server.properties</code>, затем перезапустите сервер.
        </p>
      )}

      {configured === true && (
        <div className="mt-4 flex flex-wrap items-center gap-4 border border-white/10 bg-black/20 p-4">
          <div>
            <div className="text-xs text-[var(--color-mist)]">TPS сервера</div>
            <div
              className={`font-[var(--font-display)] text-3xl font-bold ${
                tpsLoading || !tps
                  ? "text-[var(--color-mist)]"
                  : tps.tps >= 18
                    ? "text-emerald-400"
                    : tps.tps >= 15
                      ? "text-amber-400"
                      : "text-rose-400"
              }`}
            >
              {tpsLoading ? "…" : tps ? tps.tps.toFixed(1) : "—"}
            </div>
          </div>
          <div className="min-w-0 flex-1 text-xs text-[var(--color-mist)]">
            {tps ? "Обновляется автоматически каждые 5 секунд" : tpsError || "Получаем данные…"}
          </div>
          <button
            type="button"
            onClick={loadTps}
            className="shrink-0 border border-white/15 px-3 py-1.5 text-xs text-[var(--color-mist)] transition-colors duration-300 hover:border-cyan-400/50 hover:text-white"
          >
            Обновить
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_COMMANDS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => run(c)}
            disabled={sending}
            className="border border-white/10 px-3 py-1.5 font-[var(--font-mono)] text-xs text-[var(--color-mist)] transition-colors duration-300 hover:border-cyan-400/50 hover:text-white disabled:opacity-50"
          >
            /{c}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={clearHistory}
            disabled={lines.length === 0}
            className="border border-white/10 px-3 py-1.5 font-[var(--font-mono)] text-xs text-[var(--color-mist)] transition-colors duration-300 hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-40"
          >
            Очистить историю
          </button>
          <button
            type="button"
            onClick={() => setShowCodes((v) => !v)}
            className={`border px-3 py-1.5 font-[var(--font-mono)] text-xs transition-colors duration-300 ${
              showCodes
                ? "border-cyan-400/50 text-white"
                : "border-white/10 text-[var(--color-mist)] hover:border-cyan-400/40 hover:text-white"
            }`}
          >
            §a Коды цвета {showCodes ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {showCodes && (
        <div className="mt-3 border border-white/10 bg-black/30 p-4">
          <p className="text-xs text-[var(--color-mist)]">
            Наберите <code className="font-[var(--font-mono)] text-white">&amp;</code> + код (например{" "}
            <code className="font-[var(--font-mono)] text-white">&amp;c</code>) — при отправке он автоматически
            превратится в <code className="font-[var(--font-mono)] text-white">§</code>. Клик по плашке вставит код в
            поле ввода.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4 md:grid-cols-8">
            {COLOR_CODE_ENTRIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => insertCode(c.code)}
                title={`&${c.code} — ${c.label}`}
                className="flex items-center gap-1.5 border border-white/10 px-2 py-1.5 text-left text-xs text-[#c9c6dd] transition-colors duration-300 hover:border-cyan-400/50 hover:text-white"
              >
                <span
                  className="h-3 w-3 shrink-0 border border-white/20"
                  style={{ backgroundColor: c.hex }}
                  aria-hidden
                />
                <span className="font-[var(--font-mono)]">&amp;{c.code}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-6">
            {FORMAT_CODE_ENTRIES.map((f) => (
              <button
                key={f.code}
                type="button"
                onClick={() => insertCode(f.code)}
                title={`&${f.code} — ${f.label}`}
                className="flex items-center justify-between gap-1.5 border border-white/10 px-2 py-1.5 text-left text-xs text-[#c9c6dd] transition-colors duration-300 hover:border-cyan-400/50 hover:text-white"
              >
                <span className="font-[var(--font-mono)]">&amp;{f.code}</span>
                <span className="truncate text-[10px] text-[var(--color-mist)]">{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        ref={listRef}
        className="mt-4 h-72 overflow-y-auto border border-white/10 bg-black/40 p-4 font-[var(--font-mono)] text-sm"
      >
        {!historyLoaded ? (
          <p className="text-[var(--color-mist)]/60">Загрузка истории…</p>
        ) : (
          lines.length === 0 && (
            <p className="text-[var(--color-mist)]/60">Введите команду ниже, например: say &cПривет!</p>
          )
        )}
        {lines.map((line, idx) => (
          <p
            key={idx}
            className={`whitespace-pre-wrap ${
              line.kind === "input" ? "text-cyan-300" : line.kind === "error" ? "text-rose-400" : "text-[#c9c6dd]"
            }`}
          >
            {line.kind === "input" ? "> " : ""}
            {line.kind === "output" ? <MinecraftText text={line.text} /> : line.text}
          </p>
        ))}
        {sending && <p className="text-[var(--color-mist)]/60">Выполняется…</p>}
      </div>

      <form onSubmit={submit} className="mt-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Введите команду, например: say &cПривет!"
            autoComplete="off"
            disabled={sending}
            className="min-w-0 flex-1 border border-white/10 bg-black/30 px-3 py-2 font-[var(--font-mono)] text-sm text-white outline-none transition-colors duration-300 focus:border-cyan-400/60 disabled:opacity-60"
          />
          <button
            disabled={sending || !command.trim()}
            className="pixel-corner shrink-0 bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.03] disabled:opacity-60"
          >
            Отправить
          </button>
        </div>

        {/* Live colored preview of what's being typed */}
        <div className="mt-2 min-h-[1.5rem] border border-white/5 bg-black/20 px-3 py-1.5 font-[var(--font-mono)] text-sm">
          {command ? (
            <MinecraftText text={command} />
          ) : (
            <span className="text-[var(--color-mist)]/40">Предпросмотр цвета появится здесь…</span>
          )}
        </div>
      </form>
    </div>
  );
}

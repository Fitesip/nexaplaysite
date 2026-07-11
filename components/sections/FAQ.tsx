"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "Какая версия Minecraft поддерживается?",
    a: "Java Edition, актуальная релизная версия. Точный номер всегда указан в статусе сервера на главной странице.",
  },
  {
    q: "Есть ли вайпы карты?",
    a: "Полный вайп карты происходит только при смене сезона — об этом всегда заранее сообщается в разделе «Новости».",
  },
  {
    q: "Донат даёт преимущество в бою?",
    a: "Нет. Привилегии влияют только на удобство и косметику: команды, /home, частицы. Баланс PvP и экономики не затрагивается.",
  },
  {
    q: "Как попасть в личный кабинет?",
    a: "Нажмите «Кабинет» в шапке сайта и зарегистрируйтесь или войдите под тем же ником, что и на сервере.",
  },
  {
    q: "Что делать, если забанили несправедливо?",
    a: "Опишите ситуацию в разделе «Связь» с темой «Жалоба на игрока» — модераторы разберут обращение и ответят в течение суток.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div>
      <h2 className="font-[var(--font-display)] text-4xl font-bold">
        Частые <span className="grad-text">вопросы</span>
      </h2>
      <p className="mt-3 max-w-2xl text-[var(--color-mist)]">
        Не нашли ответ? Загляните в раздел «Связь» — мы читаем каждое сообщение.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className="glass-panel pixel-corner overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-[var(--font-display)] text-base font-medium text-white">{item.q}</span>
                <span
                  className={`shrink-0 font-[var(--font-mono)] text-xl text-cyan-300 transition-transform duration-500 ${
                    isOpen ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </button>
              <div
                className="grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-relaxed text-[var(--color-mist)]">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const SECRET = process.env.CAPTCHA_SECRET ?? process.env.JWT_SECRET ?? "dev-secret-change-me";

// Ambiguous characters (0/O, 1/I/l) are excluded so people can actually read it.
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCaptchaText(length = 5) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARSET[crypto.randomInt(0, CHARSET.length)];
  }
  return out;
}

function normalize(answer: string) {
  return answer.trim().toUpperCase();
}

function hashAnswer(answer: string) {
  return crypto.createHash("sha256").update(normalize(answer)).digest("hex");
}

export function signCaptchaToken(text: string) {
  return jwt.sign({ h: hashAnswer(text) }, SECRET, { expiresIn: "5m" });
}

export function verifyCaptchaToken(token: string | undefined, answer: string | undefined) {
  if (!token || !answer) return false;
  try {
    const payload = jwt.verify(token, SECRET) as { h: string };
    return payload.h === hashAnswer(answer);
  } catch {
    return false;
  }
}

/** Renders the captcha text as a hand-noisy SVG in the site's violet/cyan palette. */
export function renderCaptchaSvg(text: string) {
  const width = 180;
  const height = 60;
  const rand = (min: number, max: number) => Math.random() * (max - min) + min;

  const pixels = Array.from({ length: 14 })
    .map(() => {
      const x = rand(0, width);
      const y = rand(0, height);
      const s = rand(2, 5);
      const hue = Math.random() < 0.5 ? 275 : 190;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(
        1
      )}" fill="hsla(${hue},85%,65%,0.35)" />`;
    })
    .join("");

  const lines = Array.from({ length: 3 })
    .map(() => {
      const y1 = rand(6, height - 6);
      const y2 = rand(6, height - 6);
      const hue = rand(190, 290);
      return `<path d="M0 ${y1.toFixed(1)} Q ${width / 2} ${rand(0, height).toFixed(1)} ${width} ${y2.toFixed(
        1
      )}" stroke="hsla(${hue.toFixed(0)},80%,60%,0.35)" stroke-width="1.5" fill="none" />`;
    })
    .join("");

  const glyphWidth = width / text.length;
  const glyphs = text
    .split("")
    .map((ch, i) => {
      const cx = glyphWidth * i + glyphWidth / 2;
      const cy = height / 2;
      const rotate = rand(-22, 22).toFixed(1);
      const dx = rand(-4, 4).toFixed(1);
      const dy = rand(-4, 4).toFixed(1);
      const size = rand(24, 30).toFixed(0);
      const hue = rand(190, 290).toFixed(0);
      return `<text x="${cx}" y="${cy}" dx="${dx}" dy="${dy}" transform="rotate(${rotate} ${cx} ${cy})"
        font-family="'JetBrains Mono', monospace" font-weight="700" font-size="${size}"
        fill="hsla(${hue},90%,72%,0.95)" text-anchor="middle" dominant-baseline="middle">${ch}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Капча">
    <rect width="${width}" height="${height}" fill="#0a0714" />
    ${pixels}
    ${lines}
    ${glyphs}
  </svg>`;
}

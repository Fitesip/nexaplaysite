import { NextResponse } from "next/server";
import { generateCaptchaText, renderCaptchaSvg, signCaptchaToken } from "@/lib/captcha";

export async function GET() {
  const text = generateCaptchaText();
  const svg = renderCaptchaSvg(text);
  const token = signCaptchaToken(text);
  return NextResponse.json({ svg, token });
}

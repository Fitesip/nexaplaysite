/** Robokassa SuccessURL — browser return after successful payment. */
import { NextRequest, NextResponse } from "next/server";
import { getRobokassaConfig, isRobokassaConfigured, verifySuccessSignature } from "@/lib/robokassa";

async function readParams(req: NextRequest): Promise<URLSearchParams> {
  if (req.method === "POST") {
    const form = await req.formData();
    const params = new URLSearchParams();
    for (const [key, value] of form.entries()) params.set(key, String(value));
    return params;
  }
  return req.nextUrl.searchParams;
}

function value(params: URLSearchParams, key: string): string {
  return params.get(key) ?? params.get(key.toLowerCase()) ?? "";
}

async function handle(req: NextRequest) {
  const params = await readParams(req);
  const outSum = value(params, "OutSum");
  const invId = Number(value(params, "InvId"));
  const signature = value(params, "SignatureValue");
  const shp = Object.fromEntries([...params.entries()].filter(([key]) => key.toLowerCase().startsWith("shp_")));
  const cfg = getRobokassaConfig();
  const valid =
    isRobokassaConfigured(cfg) &&
    outSum &&
    Number.isInteger(invId) &&
    signature &&
    verifySuccessSignature(cfg, outSum, invId, signature, shp);
  const url = new URL("/", req.url);
  url.searchParams.set("payment", valid ? "success" : "invalid");
  if (Number.isInteger(invId)) url.searchParams.set("order", String(invId));
  url.hash = "cabinet";
  return NextResponse.redirect(url, 303);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
